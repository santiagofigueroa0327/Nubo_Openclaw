import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { createRequestId, logger } from "@/lib/logger";
import type { TaskRow } from "@/lib/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = createRequestId();

  try {
    const db = getDb();
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
    if (!task) {
      return NextResponse.json({ error: "Not Found", message: `Task ${id} not found`, requestId }, { status: 404 });
    }
    if (task.status !== "blocked" && task.status !== "failed") {
      return NextResponse.json({ error: "Bad Request", message: "Can only retry blocked or failed tasks", requestId }, { status: 400 });
    }

    const now = Date.now();
    db.transaction(() => {
      db.prepare("UPDATE tasks SET status = 'queued', stuckReason = NULL, archivedAt = NULL, updatedAt = ? WHERE id = ?")
        .run(now, id);
      db.prepare("INSERT INTO events (id, taskId, ts, type, summary, dataJson) VALUES (?, ?, ?, ?, ?, ?)")
        .run(randomUUID(), id, now, "retry", `Task retried from ${task.status}`, JSON.stringify({ from: task.status, to: "queued" }));
    })();

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    logger.info(`Task ${id} retried`, { requestId });
    return NextResponse.json(updated);
  } catch (err) {
    logger.error("Failed to retry task", { requestId, message: String(err) });
    return NextResponse.json({ error: "Internal Server Error", message: String(err), requestId }, { status: 500 });
  }
}
