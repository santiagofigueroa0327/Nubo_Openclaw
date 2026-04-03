/**
 * Gateway Sync Service
 *
 * Bridges OpenClaw gateway sessions with Mission Control tasks.
 * Uses `openclaw sessions --all-agents --json` CLI to poll session state
 * and automatically creates/updates tasks in SQLite.
 *
 * Design:
 * - Polls every SYNC_INTERVAL_MS (default 10s)
 * - Maps session keys to task IDs via a mapping table
 * - Detects new sessions → creates tasks
 * - Detects ended/idle sessions → marks tasks as completed
 * - Singleton: only one sync loop runs at a time
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

const OPENCLAW_BIN =
  process.env.OPENCLAW_BIN || "/home/moltbot/.npm-global/bin/openclaw";
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || "10000", 10);
// Sessions idle longer than this are considered "ended"
const SESSION_IDLE_THRESHOLD_MS = parseInt(
  process.env.SESSION_IDLE_THRESHOLD_MS || "300000",
  10
); // 5 min

interface OpenClawSession {
  key: string;
  updatedAt: number;
  ageMs: number;
  sessionId: string;
  model: string;
  modelProvider?: string;
  agentId: string;
  kind: string;
  totalTokens: number | null;
  inputTokens?: number;
  outputTokens?: number;
  abortedLastRun?: boolean;
  systemSent?: boolean;
}

interface SessionsResponse {
  count: number;
  sessions: OpenClawSession[];
}

// ── Schema migration (session mapping table) ─────────────────────────────────

function ensureSyncSchema(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_task_map (
      sessionKey TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      agentId TEXT NOT NULL,
      lastSeenAt INTEGER NOT NULL,
      sessionUpdatedAt INTEGER NOT NULL,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_stm_taskId ON session_task_map(taskId);
  `);
}

// ── Fetch sessions from gateway CLI ──────────────────────────────────────────

async function fetchSessions(): Promise<OpenClawSession[]> {
  try {
    const { stdout } = await execFileAsync(
      OPENCLAW_BIN,
      ["sessions", "--all-agents", "--json"],
      { timeout: 15000, env: { ...process.env, NODE_NO_WARNINGS: "1" } }
    );
    const data: SessionsResponse = JSON.parse(stdout);
    return data.sessions || [];
  } catch (err) {
    logger.error("Gateway sync: failed to fetch sessions", {
      message: String(err),
    });
    return [];
  }
}

// ── Derive a human-readable title from session key ───────────────────────────

function sessionTitle(key: string, agentId: string): string {
  // Examples:
  //   "agent:zenith:job-20260304-debugcriticalv2" → "debugcriticalv2"
  //   "agent:main:telegram:direct:1211573593" → "Telegram DM 1211573593"
  //   "agent:main:cron:..." → "Cron job"
  const parts = key.split(":");

  if (key.includes(":job-")) {
    const jobPart = parts.find((p) => p.startsWith("job-"));
    const label = jobPart?.replace(/^job-\d+-?/, "") || "job";
    return `[${agentId}] ${label}`;
  }
  if (key.includes(":cron:")) {
    return `[${agentId}] Cron task`;
  }
  if (key.includes(":telegram:direct:")) {
    const userId = parts[parts.length - 1];
    return `[${agentId}] Telegram DM ${userId}`;
  }
  if (key.includes(":telegram:group:")) {
    const groupId = parts[parts.length - 1];
    return `[${agentId}] Telegram group ${groupId}`;
  }
  if (key.includes(":slack:")) {
    return `[${agentId}] Slack conversation`;
  }
  // Fallback: last meaningful segment
  const last = parts[parts.length - 1];
  return `[${agentId}] ${last}`;
}

// ── Determine source channel from session key ────────────────────────────────

function inferChannel(key: string): string {
  if (key.includes(":telegram:")) return "telegram";
  if (key.includes(":slack:")) return "slack";
  if (key.includes(":cron:")) return "cron";
  return "agent";
}

// ── Filter: which sessions should be tracked as tasks? ───────────────────────

function shouldTrackSession(session: OpenClawSession): boolean {
  // Skip cron run duplicates (they have :run: in the key)
  if (session.key.includes(":run:")) return false;
  // Skip slash command sessions
  if (session.key.includes(":slash:")) return false;
  // Track everything else (jobs, DMs, groups, cron)
  return true;
}

// ── Core sync logic ──────────────────────────────────────────────────────────

function syncOnce(sessions: OpenClawSession[]): void {
  const db = getDb();
  const now = Date.now();

  ensureSyncSchema();

  const trackable = sessions.filter(shouldTrackSession);

  // Build a set of active session keys
  const activeKeys = new Set(trackable.map((s) => s.key));

  // 1. Upsert tasks for active sessions
  const upsertMap = db.prepare(
    `INSERT INTO session_task_map (sessionKey, taskId, agentId, lastSeenAt, sessionUpdatedAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(sessionKey) DO UPDATE SET lastSeenAt = ?, sessionUpdatedAt = ?`
  );

  const insertTask = db.prepare(
    `INSERT OR IGNORE INTO tasks (id, title, status, sourceChannel, sourceUser, primaryAgent, model, receivedAt, startedAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const updateTaskActivity = db.prepare(
    `UPDATE tasks SET updatedAt = ?, model = ? WHERE id = ? AND status = 'running'`
  );

  const getMapping = db.prepare(
    `SELECT taskId FROM session_task_map WHERE sessionKey = ?`
  );

  const insertEvent = db.prepare(
    `INSERT INTO events (id, taskId, ts, type, summary, dataJson) VALUES (?, ?, ?, ?, ?, ?)`
  );

  const syncBatch = db.transaction(() => {
    for (const session of trackable) {
      const existing = getMapping.get(session.key) as
        | { taskId: string }
        | undefined;

      if (!existing) {
        // New session → create task
        const taskId = randomUUID();
        const title = sessionTitle(session.key, session.agentId);
        const channel = inferChannel(session.key);
        const model = session.model || "";

        insertTask.run(
          taskId,
          title,
          "running",
          channel,
          "",
          session.agentId,
          model,
          session.updatedAt - session.ageMs, // receivedAt ≈ creation time
          now, // startedAt
          now // updatedAt
        );

        upsertMap.run(
          session.key,
          taskId,
          session.agentId,
          now,
          session.updatedAt,
          now,
          session.updatedAt
        );

        insertEvent.run(
          randomUUID(),
          taskId,
          now,
          "status_change",
          "Task detected from gateway session",
          JSON.stringify({
            from: null,
            to: "running",
            sessionKey: session.key,
          })
        );

        logger.info("Gateway sync: new task created", {
          taskId: taskId.substring(0, 8),
          sessionKey: session.key,
        });
      } else {
        // Existing session → update activity timestamp
        const model = session.model || "";
        updateTaskActivity.run(now, model, existing.taskId);
        upsertMap.run(
          session.key,
          existing.taskId,
          session.agentId,
          now,
          session.updatedAt,
          now,
          session.updatedAt
        );
      }
    }
  });

  syncBatch();

  // 2. Detect sessions that went idle → mark tasks as completed
  const staleMappings = db
    .prepare(
      `SELECT stm.sessionKey, stm.taskId, stm.sessionUpdatedAt, t.status
       FROM session_task_map stm
       JOIN tasks t ON t.id = stm.taskId
       WHERE t.status = 'running'`
    )
    .all() as Array<{
    sessionKey: string;
    taskId: string;
    sessionUpdatedAt: number;
    status: string;
  }>;

  const completeTask = db.prepare(
    `UPDATE tasks SET status = 'completed', finishedAt = ?, updatedAt = ?,
     finalOutput = 'Session ended (auto-detected)' WHERE id = ?`
  );

  const completeBatch = db.transaction(() => {
    for (const mapping of staleMappings) {
      // Session disappeared from gateway → it's done
      if (!activeKeys.has(mapping.sessionKey)) {
        completeTask.run(now, now, mapping.taskId);
        insertEvent.run(
          randomUUID(),
          mapping.taskId,
          now,
          "status_change",
          "Session no longer active — task auto-completed",
          JSON.stringify({ from: "running", to: "completed" })
        );
        logger.info("Gateway sync: task completed (session gone)", {
          taskId: mapping.taskId.substring(0, 8),
        });
        continue;
      }

      // Session exists but hasn't updated in a while → might be idle
      const sessionData = trackable.find(
        (s) => s.key === mapping.sessionKey
      );
      if (sessionData) {
        const idleMs = now - sessionData.updatedAt;
        if (idleMs > SESSION_IDLE_THRESHOLD_MS) {
          // Don't auto-complete DMs or groups — they're long-lived
          if (
            mapping.sessionKey.includes(":direct:") ||
            mapping.sessionKey.includes(":group:")
          ) {
            continue;
          }
          completeTask.run(now, now, mapping.taskId);
          insertEvent.run(
            randomUUID(),
            mapping.taskId,
            now,
            "status_change",
            `Session idle for ${Math.round(idleMs / 60000)}m — task auto-completed`,
            JSON.stringify({ from: "running", to: "completed", idleMs })
          );
          logger.info("Gateway sync: task completed (idle)", {
            taskId: mapping.taskId.substring(0, 8),
            idleMs,
          });
        }
      }
    }
  });

  completeBatch();
}

// ── Singleton sync loop ──────────────────────────────────────────────────────

let syncInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

export function startGatewaySync(): void {
  if (syncInterval) return; // Already running

  logger.info("Gateway sync: starting", {
    intervalMs: SYNC_INTERVAL_MS,
    idleThresholdMs: SESSION_IDLE_THRESHOLD_MS,
  });

  ensureSyncSchema();

  // Run immediately, then on interval
  runSyncCycle();

  syncInterval = setInterval(runSyncCycle, SYNC_INTERVAL_MS);
}

async function runSyncCycle(): Promise<void> {
  if (isRunning) return; // Skip if previous cycle still running
  isRunning = true;
  try {
    const sessions = await fetchSessions();
    if (sessions.length > 0) {
      syncOnce(sessions);
    }
  } catch (err) {
    logger.error("Gateway sync: cycle failed", { message: String(err) });
  } finally {
    isRunning = false;
  }
}

export function stopGatewaySync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    logger.info("Gateway sync: stopped");
  }
}
