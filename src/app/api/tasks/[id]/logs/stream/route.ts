import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const encoder = new TextEncoder();
  let lastTs = 0;
  let closed = false;
  let interval: ReturnType<typeof setInterval> | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  function cleanup() {
    closed = true;
    if (interval) { clearInterval(interval); interval = null; }
    if (timeout) { clearTimeout(timeout); timeout = null; }
  }

  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      interval = setInterval(() => {
        if (closed) return;
        try {
          const db = getDb();
          const logs = db
            .prepare("SELECT * FROM task_logs WHERE taskId = ? AND ts > ? ORDER BY ts ASC LIMIT 50")
            .all(id, lastTs) as { id: string; ts: number; level: string; message: string; metaJson: string | null }[];

          if (logs.length > 0) {
            lastTs = logs[logs.length - 1].ts;
            const payload = JSON.stringify({ logs, ts: Date.now() });
            if (!closed) controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          } else {
            if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
          }
        } catch {
          cleanup();
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 1_500);

      timeout = setTimeout(() => {
        const was = closed;
        cleanup();
        if (!was) try { controller.close(); } catch { /* */ }
      }, 600_000);
    },
    cancel() { cleanup(); },
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
