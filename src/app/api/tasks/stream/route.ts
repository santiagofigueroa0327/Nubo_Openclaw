import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * SSE endpoint: streams task-list changes to connected dashboards.
 * Every 2s, checks for tasks updated since the last push and sends them.
 * Connection auto-closes after 10 minutes (clients should reconnect).
 */
export async function GET() {
  const encoder = new TextEncoder();
  let lastCheckedAt = Date.now();

  const readable = new ReadableStream({
    start(controller) {
      // Send initial heartbeat so the client knows the connection is alive
      controller.enqueue(encoder.encode(": connected\n\n"));

      const interval = setInterval(() => {
        try {
          const db = getDb();
          const now = Date.now();
          const updated = db
            .prepare("SELECT * FROM tasks WHERE updatedAt > ? ORDER BY updatedAt ASC")
            .all(lastCheckedAt);

          if (updated.length > 0) {
            lastCheckedAt = now;
            const payload = JSON.stringify({ tasks: updated, ts: now });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 2_000);

      // Auto-close after 10 minutes
      setTimeout(() => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      }, 600_000);
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
