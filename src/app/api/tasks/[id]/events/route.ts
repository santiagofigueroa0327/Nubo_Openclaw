import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createRequestId, logger } from "@/lib/logger";
import type { EventRow } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = createRequestId();
  const stream = request.nextUrl.searchParams.get("stream");

  try {
    const db = getDb();

    // Verify task exists
    const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(id);
    if (!task) {
      return NextResponse.json(
        { error: "Not Found", message: `Task ${id} not found`, requestId },
        { status: 404 }
      );
    }

    if (stream === "true") {
      const encoder = new TextEncoder();
      let lastEventTs = 0;

      const readable = new ReadableStream({
        start(controller) {
          const interval = setInterval(() => {
            try {
              const newEvents = db
                .prepare(
                  "SELECT * FROM events WHERE taskId = ? AND ts > ? ORDER BY ts ASC"
                )
                .all(id, lastEventTs) as EventRow[];

              for (const event of newEvents) {
                lastEventTs = event.ts;
                const data = JSON.stringify(event);
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            } catch {
              clearInterval(interval);
              controller.close();
            }
          }, 3000); // 3s polling for Phase 0

          // Close after 5 minutes
          setTimeout(() => {
            clearInterval(interval);
            controller.close();
          }, 300_000);
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Normal mode
    const events = db
      .prepare("SELECT * FROM events WHERE taskId = ? ORDER BY ts ASC")
      .all(id);

    logger.info("Events listed", { requestId, method: "GET", path: `/api/tasks/${id}/events` });
    return NextResponse.json({ events });
  } catch (err) {
    logger.error("Failed to get events", { requestId, message: String(err) });
    return NextResponse.json(
      { error: "Internal Server Error", message: String(err), requestId },
      { status: 500 }
    );
  }
}
