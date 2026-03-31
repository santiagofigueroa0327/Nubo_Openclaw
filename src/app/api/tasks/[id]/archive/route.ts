import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createRequestId, logger } from "@/lib/logger";
import type { TaskRow } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = createRequestId();

  try {
    const body = await request.json().catch(() => ({}));
    const unarchive = body.unarchive === true;

    const db = getDb();
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
    if (!task) {
      return NextResponse.json({ error: "Not Found", message: `Task ${id} not found`, requestId }, { status: 404 });
    }

    const now = Date.now();
    if (unarchive) {
      // Restore to a neutral terminal status so it appears in normal filters
      const restoredStatus = ["archived", "running", "queued"].includes(task.status) ? "completed" : task.status;
      db.prepare("UPDATE tasks SET archivedAt = NULL, status = ?, updatedAt = ? WHERE id = ?")
        .run(restoredStatus, now, id);
    } else {
      // Mark as archived — both archivedAt and status must be set so filters work correctly
      db.prepare("UPDATE tasks SET archivedAt = ?, status = 'archived', updatedAt = ? WHERE id = ?")
        .run(now, now, id);
    }

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    logger.info(`Task ${id} ${unarchive ? "unarchived" : "archived"}`, { requestId });
    return NextResponse.json(updated);
  } catch (err) {
    logger.error("Failed to archive task", { requestId, message: String(err) });
    return NextResponse.json({ error: "Internal Server Error", message: String(err), requestId }, { status: 500 });
  }
}
