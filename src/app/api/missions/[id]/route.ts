import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  // Try both formats: agentos-m-xxx or just m-xxx
  const taskId = id.startsWith("agentos-") ? id : `agentos-${id}`;

  const task = db
    .prepare(`SELECT * FROM tasks WHERE id = ? OR agentosId = ?`)
    .get(taskId, id) as Record<string, unknown> | undefined;

  if (!task) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  // Get jobs for this mission
  let jobs: object[] = [];
  try {
    jobs = db
      .prepare(
        `SELECT * FROM agentos_jobs WHERE taskId = ? ORDER BY createdAt`
      )
      .all(task.id as string) as object[];
  } catch (e) {
    // table might not exist
  }

  // Get events (from events table)
  const events = db
    .prepare(
      `SELECT * FROM events WHERE taskId = ? ORDER BY ts DESC LIMIT 100`
    )
    .all(task.id as string) as object[];

  // Get task_logs (structured progress logs)
  const logs = db
    .prepare(
      `SELECT * FROM task_logs WHERE taskId = ? ORDER BY ts DESC LIMIT 200`
    )
    .all(task.id as string) as object[];

  return NextResponse.json({
    task,
    jobs,
    events,
    logs,
  });
}
