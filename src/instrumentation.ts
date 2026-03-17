/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts.
 *
 * CHANGED 2026-03-17: gateway-sync DISABLED as writer.
 * agentos-sync.js (external daemon) is now the SOLE writer to dashboard.sqlite.
 * This eliminates the dual-write "database is locked" errors.
 *
 * We only start the stagnation checker here (read + minimal writes for archival).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || !process.env.NEXT_RUNTIME) {
    // gateway-sync DISABLED — agentos-sync.service is the sole writer
    // const { startGatewaySync } = await import("@/lib/gateway-sync");
    // startGatewaySync();

    // Stagnation detection still runs (lightweight read + archive writes)
    try {
      const { startStagnationJob } = await import("@/lib/stagnation");
      startStagnationJob();
    } catch {
      // stagnation module may not exist yet — that's ok
    }
  }
}
