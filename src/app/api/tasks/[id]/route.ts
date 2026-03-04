import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestId, logger } from "@/lib/logger";
import { assertTransition } from "@/lib/state-machine";
import type { TaskRow, TaskStatus } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = createRequestId();

  try {
    const db = getDb();
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

    if (!task) {
      return NextResponse.json(
        { error: "Not Found", message: `Task ${id} not found`, requestId },
        { status: 404 }
      );
    }

    return NextResponse.json(task, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache" },
    });
  } catch (err) {
    logger.error("Failed to get task", { requestId, message: String(err) });
    return NextResponse.json(
      { error: "Internal Server Error", message: String(err), requestId },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = createRequestId();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too Many Requests", message: "Rate limit exceeded", requestId },
      { status: 429 }
    );
  }

  try {
    const db = getDb();
    const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
      | TaskRow
      | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: "Not Found", message: `Task ${id} not found`, requestId },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, title, primaryAgent, model, finalOutput, errorSummary } = body;

    const now = Date.now();
    const updates: string[] = ["updatedAt = ?"];
    const values: unknown[] = [now];

    if (status && status !== existing.status) {
      assertTransition(existing.status, status as TaskStatus);
      updates.push("status = ?");
      values.push(status);

      if (status === "running" && !existing.startedAt) {
        updates.push("startedAt = ?");
        values.push(now);
      }
      if (status === "completed" || status === "failed") {
        updates.push("finishedAt = ?");
        values.push(now);
      }
    }

    if (title !== undefined) { updates.push("title = ?"); values.push(title); }
    if (primaryAgent !== undefined) { updates.push("primaryAgent = ?"); values.push(primaryAgent); }
    if (model !== undefined) { updates.push("model = ?"); values.push(model); }
    if (finalOutput !== undefined) { updates.push("finalOutput = ?"); values.push(finalOutput); }
    if (errorSummary !== undefined) { updates.push("errorSummary = ?"); values.push(errorSummary); }

    values.push(id);

    const updateTx = db.transaction(() => {
      db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values);

      if (status && status !== existing.status) {
        db.prepare(
          "INSERT INTO events (id, taskId, ts, type, summary, dataJson) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(
          randomUUID(),
          id,
          now,
          "status_change",
          `Status changed from ${existing.status} to ${status}`,
          JSON.stringify({ from: existing.status, to: status })
        );
      }
    });

    updateTx();

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    logger.info("Task updated", { requestId, method: "PATCH", path: `/api/tasks/${id}` });
    return NextResponse.json(updated);
  } catch (err) {
    const message = String(err);
    if (message.includes("Invalid status transition")) {
      return NextResponse.json(
        { error: "Bad Request", message, requestId },
        { status: 400 }
      );
    }
    logger.error("Failed to update task", { requestId, message });
    return NextResponse.json(
      { error: "Internal Server Error", message, requestId },
      { status: 500 }
    );
  }
}
