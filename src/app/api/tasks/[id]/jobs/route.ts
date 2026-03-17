import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createRequestId, logger } from "@/lib/logger";
import type { TaskRow } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = createRequestId();

  try {
    const db = getDb();
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
    if (!task) {
      return NextResponse.json({ error: "Not Found", requestId }, { status: 404 });
    }

    let jobs: unknown[] = [];
    try {
      jobs = db.prepare("SELECT id AS jobId, taskId, missionId, agentId, status, jobDir, retryCount, validationVerdict, validationScore, dispatchedAt, completedAt, createdAt, updatedAt FROM agentos_jobs WHERE taskId = ? ORDER BY rowid ASC").all(id);
    } catch {
      // agentos_jobs table might not exist
    }

    return NextResponse.json({ jobs, total: jobs.length });
  } catch (err) {
    logger.error("Failed to get task jobs", { requestId, message: String(err) });
    return NextResponse.json({ error: "Internal Server Error", message: String(err), requestId }, { status: 500 });
  }
}
