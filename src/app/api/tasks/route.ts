import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestId, logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const start = Date.now();

  try {
    const db = getDb();
    const url = request.nextUrl;
    const status = url.searchParams.get("status");
    const agent = url.searchParams.get("agent");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }
    if (agent) {
      conditions.push("primaryAgent = ?");
      params.push(agent);
    }
    const model = url.searchParams.get("model");
    if (model) {
      conditions.push("model = ?");
      params.push(model);
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
    const tasks = db
      .prepare(`SELECT * FROM tasks${where} ORDER BY receivedAt DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);

    const { total } = db
      .prepare(`SELECT COUNT(*) as total FROM tasks${where}`)
      .get(...params) as { total: number };

    logger.info("Tasks listed", {
      requestId,
      method: "GET",
      path: "/api/tasks",
      durationMs: Date.now() - start,
    });
    return NextResponse.json({ tasks, total });
  } catch (err) {
    logger.error("Failed to list tasks", { requestId, message: String(err) });
    return NextResponse.json(
      { error: "Internal Server Error", message: String(err), requestId },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const { allowed, remaining, resetAt } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too Many Requests", message: "Rate limit exceeded", requestId },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(resetAt),
          "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { title, sourceChannel, sourceUser, primaryAgent, model } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Bad Request", message: "title is required", requestId },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = Date.now();
    const taskId = randomUUID();

    const createTaskTx = db.transaction(() => {
      db.prepare(
        `INSERT INTO tasks (id, title, status, sourceChannel, sourceUser, primaryAgent, model, receivedAt, updatedAt)
         VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, ?)`
      ).run(
        taskId,
        title,
        sourceChannel || "manual",
        sourceUser || "",
        primaryAgent || "",
        model || "",
        now,
        now
      );

      db.prepare(
        "INSERT INTO events (id, taskId, ts, type, summary, dataJson) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        randomUUID(),
        taskId,
        now,
        "status_change",
        "Task queued for processing",
        JSON.stringify({ from: null, to: "queued" })
      );
    });

    createTaskTx();

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);

    logger.info("Task created", { requestId, method: "POST", path: "/api/tasks" });
    return NextResponse.json(task, {
      status: 201,
      headers: { "X-RateLimit-Remaining": String(remaining) },
    });
  } catch (err) {
    logger.error("Failed to create task", { requestId, message: String(err) });
    return NextResponse.json(
      { error: "Internal Server Error", message: String(err), requestId },
      { status: 500 }
    );
  }
}
