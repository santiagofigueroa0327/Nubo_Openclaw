/**
 * Stagnation detection & auto-archive background job.
 * Runs every 60s to:
 * 1. Archive completed tasks older than ARCHIVE_AFTER_MS
 * 2. Move queued tasks stuck for STUCK_QUEUE_MS → blocked
 * 3. Move running tasks with no recent log activity for NO_ACTIVITY_MS → blocked
 */
import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { logger } from "./logger";

const ARCHIVE_AFTER_MS = Number(process.env.ARCHIVE_AFTER_MS ?? 600_000);   // 10 min
const STUCK_QUEUE_MS   = Number(process.env.STUCK_QUEUE_MS   ?? 1_800_000); // 30 min
const NO_ACTIVITY_MS   = Number(process.env.NO_ACTIVITY_MS   ?? 600_000);   // 10 min
const CHECK_INTERVAL   = Number(process.env.STAGNATION_INTERVAL_MS ?? 60_000); // 1 min

let _interval: ReturnType<typeof setInterval> | null = null;
let _running = false;

export async function runStagnationCheck(): Promise<{ archived: number; stuck: number; noActivity: number }> {
  if (_running) return { archived: 0, stuck: 0, noActivity: 0 };
  _running = true;
  const db = getDb();
  const now = Date.now();
  let archived = 0, stuck = 0, noActivity = 0;

  try {
    // 1. Auto-archive completed tasks
    const toArchive = db
      .prepare(`SELECT id FROM tasks WHERE status = 'completed' AND archivedAt IS NULL AND finishedAt IS NOT NULL AND finishedAt < ?`)
      .all(now - ARCHIVE_AFTER_MS) as { id: string }[];

    for (const { id } of toArchive) {
      db.prepare(`UPDATE tasks SET archivedAt = ?, updatedAt = ? WHERE id = ?`).run(now, now, id);
      archived++;
    }

    // 2. Stuck in queue
    const stuckQueued = db
      .prepare(`SELECT id FROM tasks WHERE status = 'queued' AND archivedAt IS NULL AND receivedAt < ?`)
      .all(now - STUCK_QUEUE_MS) as { id: string }[];

    for (const { id } of stuckQueued) {
      const reason = `Stuck in queue for ${Math.round(STUCK_QUEUE_MS / 60000)} minutes`;
      db.transaction(() => {
        db.prepare(`UPDATE tasks SET status = 'blocked', stuckReason = ?, updatedAt = ? WHERE id = ?`)
          .run(reason, now, id);
        db.prepare(`INSERT INTO events (id, taskId, ts, type, summary, dataJson) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(randomUUID(), id, now, "status_change", reason, JSON.stringify({ from: "queued", to: "blocked", reason }));
      })();
      stuck++;
    }

    // 3. Running but no recent log activity
    const runningTasks = db
      .prepare(`SELECT id FROM tasks WHERE status = 'running' AND archivedAt IS NULL`)
      .all() as { id: string }[];

    for (const { id } of runningTasks) {
      const lastLog = db
        .prepare(`SELECT ts FROM task_logs WHERE taskId = ? ORDER BY ts DESC LIMIT 1`)
        .get(id) as { ts: number } | undefined;
      const lastEvent = db
        .prepare(`SELECT ts FROM events WHERE taskId = ? ORDER BY ts DESC LIMIT 1`)
        .get(id) as { ts: number } | undefined;

      const lastActivity = Math.max(lastLog?.ts ?? 0, lastEvent?.ts ?? 0);
      if (lastActivity > 0 && lastActivity < now - NO_ACTIVITY_MS) {
        const reason = `No activity for ${Math.round(NO_ACTIVITY_MS / 60000)} minutes`;
        db.transaction(() => {
          db.prepare(`UPDATE tasks SET status = 'blocked', stuckReason = ?, updatedAt = ? WHERE id = ?`)
            .run(reason, now, id);
          db.prepare(`INSERT INTO events (id, taskId, ts, type, summary, dataJson) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(randomUUID(), id, now, "status_change", reason, JSON.stringify({ from: "running", to: "blocked", reason }));
        })();
        noActivity++;
      }
    }

    if (archived + stuck + noActivity > 0) {
      logger.info(`Stagnation check: archived=${archived} stuck=${stuck} noActivity=${noActivity}`);
    }
  } catch (err) {
    logger.error(`Stagnation check error: ${String(err)}`);
  } finally {
    _running = false;
  }

  return { archived, stuck, noActivity };
}

export function startStagnationJob(): void {
  if (_interval) return;
  // Run once immediately
  runStagnationCheck().catch(() => {});
  _interval = setInterval(() => runStagnationCheck().catch(() => {}), CHECK_INTERVAL);
  logger.info(`Stagnation job started (interval=${CHECK_INTERVAL}ms)`);
}

export function stopStagnationJob(): void {
  if (_interval) { clearInterval(_interval); _interval = null; }
}
