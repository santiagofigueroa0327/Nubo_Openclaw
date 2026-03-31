import { getDb } from "./db";
import { MISSION_STATES, type MissionStatus } from "./mission-states";
import { logger } from "./logger";

interface UpdateStatusOptions {
  missionId: string;
  status: MissionStatus;
  agentName?: string;
  detail?: string;
}

/**
 * Single source of truth for mission status transitions.
 * Updates MC's tasks table and logs the event.
 */
export function updateMissionStatus(opts: UpdateStatusOptions): void {
  const { missionId, status, agentName, detail } = opts;
  const stateConfig = MISSION_STATES[status];
  const taskId = `agentos-${missionId}`;
  const db = getDb();

  // Check if task exists in MC
  const existing = db
    .prepare("SELECT id FROM tasks WHERE id = ?")
    .get(taskId) as { id: string } | undefined;

  if (!existing) {
    logger.warn(
      `[updateMissionStatus] Task ${taskId} not found in MC database — skipping`
    );
    return;
  }

  // Update task status + detail
  const now = Date.now();
  db.prepare(
    `UPDATE tasks SET
      status = ?,
      updatedAt = ?,
      errorSummary = CASE WHEN ? IN ('failed','cancelled') THEN ? ELSE errorSummary END,
      finishedAt = CASE WHEN ? IN ('completed','failed') THEN ? ELSE finishedAt END
    WHERE id = ?`
  ).run(
    stateConfig.mcStatus,
    now,
    status,
    detail || null,
    stateConfig.mcStatus,
    now,
    taskId
  );

  // Log the event
  const eventId = `evt-${missionId}-${Date.now()}`;
  const summary = `${stateConfig.icon} ${stateConfig.label}${
    agentName ? ` (${agentName})` : ""
  }${detail ? `: ${detail}` : ""}`;

  db.prepare(
    `INSERT OR IGNORE INTO events (id, taskId, ts, type, summary, dataJson)
     VALUES (?, ?, ?, 'status_change', ?, ?)`
  ).run(
    eventId,
    taskId,
    now,
    summary,
    JSON.stringify({ status, agentName, detail })
  );

  logger.info(
    `[updateMissionStatus] ${missionId} → ${status}${
      detail ? ": " + detail : ""
    }`
  );
}
