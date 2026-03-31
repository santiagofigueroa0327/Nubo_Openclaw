import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const db = getDb();

  let query = `
    SELECT
      t.id,
      t.title,
      t.status,
      t.sourceChannel,
      t.receivedAt,
      t.finishedAt,
      t.updatedAt,
      t.agentosId,
      t.agentosStatus,
      t.workflowStep,
      t.validationScore,
      t.validationVerdict,
      t.retryCount,
      t.jobCount,
      t.errorSummary,
      (SELECT COUNT(*) FROM agentos_jobs j WHERE j.taskId = t.id) as totalJobs
    FROM tasks t
    WHERE t.agentosId IS NOT NULL
  `;

  const params: (string | number)[] = [];

  if (status) {
    query += ` AND t.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY t.receivedAt DESC LIMIT ?`;
  params.push(limit);

  let rows: object[] = [];
  try {
    rows = db.prepare(query).all(...params) as object[];
  } catch (e) {
    // agentos columns might not exist yet if sync hasn't run
    rows = [];
  }

  const { total } = db
    .prepare(
      `SELECT COUNT(*) as total FROM tasks WHERE agentosId IS NOT NULL`
    )
    .get() as { total: number };

  // Get sync state
  let lastSync = null;
  try {
    const syncState = db
      .prepare(`SELECT value FROM agentos_sync_state WHERE key = 'last_sync'`)
      .get() as { value: string } | undefined;
    lastSync = syncState?.value || null;
  } catch (e) {
    // sync state table doesn't exist yet
  }

  return NextResponse.json({
    missions: rows,
    total,
    lastSync,
  });
}
