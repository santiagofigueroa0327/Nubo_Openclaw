import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { logger } from "./logger";

const globalForDb = globalThis as unknown as {
  __mcDb: Database.Database | undefined;
};

function getDbPath(): string {
  return path.resolve(process.env.DB_PATH || "./data/dashboard.sqlite");
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      sourceChannel TEXT NOT NULL DEFAULT 'manual',
      sourceUser TEXT NOT NULL DEFAULT '',
      primaryAgent TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      receivedAt INTEGER NOT NULL,
      startedAt INTEGER,
      finishedAt INTEGER,
      updatedAt INTEGER NOT NULL,
      finalOutput TEXT,
      errorSummary TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      ts INTEGER NOT NULL,
      type TEXT NOT NULL,
      summary TEXT NOT NULL,
      dataJson TEXT,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_logs (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      ts INTEGER NOT NULL,
      level TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      metaJson TEXT,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agents_registry (
      agentId TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      capabilitiesJson TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 1,
      defaultModelPolicy TEXT NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_events_taskId ON events(taskId);
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
    CREATE INDEX IF NOT EXISTS idx_task_logs_taskId ON task_logs(taskId);
    CREATE INDEX IF NOT EXISTS idx_task_logs_ts ON task_logs(ts);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_receivedAt ON tasks(receivedAt);

    -- Notification state: tracks Telegram message lifecycle per task
    CREATE TABLE IF NOT EXISTS notification_state (
      taskId TEXT PRIMARY KEY,
      missionId TEXT,
      jobId TEXT,
      channel TEXT NOT NULL DEFAULT 'telegram',
      chatId TEXT,
      messageId TEXT,
      lastStatus TEXT NOT NULL DEFAULT 'pending',
      deliveredFinal INTEGER NOT NULL DEFAULT 0,
      deliveredAt INTEGER,
      lastEditAt INTEGER,
      lastError TEXT,
      mcLink TEXT,
      retryCount INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notification_state_missionId ON notification_state(missionId);
    CREATE INDEX IF NOT EXISTS idx_notification_state_deliveredFinal ON notification_state(deliveredFinal);
  `);

  // Migrations: add new columns if not present
  const migrations = [
    `ALTER TABLE agents_registry ADD COLUMN description TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE tasks ADD COLUMN archivedAt INTEGER`,
    `ALTER TABLE tasks ADD COLUMN stuckReason TEXT`,
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}

export function getDb(): Database.Database {
  if (!globalForDb.__mcDb) {
    const dbPath = getDbPath();
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });

    logger.info(`Initializing SQLite at ${dbPath}`);
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    initSchema(db);
    globalForDb.__mcDb = db;
  }
  return globalForDb.__mcDb;
}
