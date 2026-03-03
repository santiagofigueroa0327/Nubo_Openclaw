import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createRequestId, logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = createRequestId();

  try {
    const db = getDb();

    const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(id);
    if (!task) {
      return NextResponse.json(
        { error: "Not Found", message: `Task ${id} not found`, requestId },
        { status: 404 }
      );
    }

    const url = request.nextUrl;
    const level = url.searchParams.get("level");
    const contains = url.searchParams.get("contains");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const conditions: string[] = ["taskId = ?"];
    const queryParams: unknown[] = [id];

    if (level) {
      conditions.push("level = ?");
      queryParams.push(level);
    }
    if (contains) {
      conditions.push("message LIKE ?");
      queryParams.push(`%${contains}%`);
    }

    const where = conditions.join(" AND ");
    const logs = db
      .prepare(
        `SELECT * FROM task_logs WHERE ${where} ORDER BY ts ASC LIMIT ? OFFSET ?`
      )
      .all(...queryParams, limit, offset);

    const { total } = db
      .prepare(`SELECT COUNT(*) as total FROM task_logs WHERE ${where}`)
      .get(...queryParams) as { total: number };

    logger.info("Task logs listed", {
      requestId,
      method: "GET",
      path: `/api/tasks/${id}/logs`,
    });
    return NextResponse.json({ logs, total });
  } catch (err) {
    logger.error("Failed to get task logs", { requestId, message: String(err) });
    return NextResponse.json(
      { error: "Internal Server Error", message: String(err), requestId },
      { status: 500 }
    );
  }
}
