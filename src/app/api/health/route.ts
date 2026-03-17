import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";

const startedAt = Date.now();

export async function GET() {
  const requestId = randomUUID().substring(0, 8);
  const now = Date.now();
  const uptimeMs = now - startedAt;

  let dbStatus = "unknown";
  let taskCount = 0;
  let notificationCount = 0;

  try {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) as n FROM tasks").get() as { n: number };
    taskCount = row.n;

    try {
      const nsRow = db.prepare("SELECT COUNT(*) as n FROM notification_state").get() as { n: number };
      notificationCount = nsRow.n;
    } catch {
      // notification_state table may not exist yet
    }

    dbStatus = "connected";
  } catch (err) {
    dbStatus = `error: ${String(err)}`;
  }

  return NextResponse.json({
    status: dbStatus === "connected" ? "healthy" : "degraded",
    uptime: uptimeMs,
    uptimeHuman: `${Math.floor(uptimeMs / 3600000)}h ${Math.floor((uptimeMs % 3600000) / 60000)}m`,
    db: dbStatus,
    taskCount,
    notificationCount,
    requestId,
    timestamp: new Date(now).toISOString(),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
