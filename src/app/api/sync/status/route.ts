import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/status — Shows gateway sync health
 */
export async function GET() {
  try {
    const db = getDb();

    // Check if session_task_map exists
    const tableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='session_task_map'"
      )
      .get();

    if (!tableExists) {
      return NextResponse.json({
        syncActive: false,
        message: "Sync not initialized yet (table missing)",
      });
    }

    const mappingCount = (
      db.prepare("SELECT COUNT(*) as c FROM session_task_map").get() as {
        c: number;
      }
    ).c;

    const runningTasks = (
      db
        .prepare("SELECT COUNT(*) as c FROM tasks WHERE status = 'running'")
        .get() as { c: number }
    ).c;

    const recentSync = db
      .prepare(
        "SELECT MAX(lastSeenAt) as lastSync FROM session_task_map"
      )
      .get() as { lastSync: number | null };

    const lastSyncAgoMs = recentSync.lastSync
      ? Date.now() - recentSync.lastSync
      : null;

    return NextResponse.json({
      syncActive: lastSyncAgoMs !== null && lastSyncAgoMs < 60000,
      trackedSessions: mappingCount,
      runningTasks,
      lastSyncMs: recentSync.lastSync,
      lastSyncAgoMs,
      lastSyncAgoHuman: lastSyncAgoMs
        ? `${Math.round(lastSyncAgoMs / 1000)}s ago`
        : "never",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: String(err) },
      { status: 500 }
    );
  }
}
