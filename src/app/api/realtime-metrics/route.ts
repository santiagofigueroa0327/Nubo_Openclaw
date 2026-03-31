
import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const AGENTOS_DB = '/home/moltbot/.openclaw/agentos/agentos.sqlite';

export async function GET() {
  let agentosDb: Database.Database | null = null;
  try {
    agentosDb = new Database(AGENTOS_DB, { readonly: true });
    agentosDb.pragma('journal_mode = WAL');
    agentosDb.pragma('busy_timeout = 5000');

    const missionsTotal = (agentosDb.prepare('SELECT COUNT(*) as c FROM missions').get() as { c: number }).c;
    const missionsByStatus = agentosDb.prepare('SELECT status, COUNT(*) as count FROM missions GROUP BY status').all() as { status: string; count: number }[];

    const jobsTotal = (agentosDb.prepare('SELECT COUNT(*) as c FROM jobs').get() as { c: number }).c;
    const jobsByStatus = agentosDb.prepare('SELECT status, COUNT(*) as count FROM jobs GROUP BY status').all() as { status: string; count: number }[];

    // Build flat status maps for easy consumption
    const missionMap: Record<string, number> = {};
    for (const row of missionsByStatus) missionMap[row.status] = row.count;

    const jobMap: Record<string, number> = {};
    for (const row of jobsByStatus) jobMap[row.status] = row.count;

    return NextResponse.json({
      timestamp: Date.now(),
      missions: { total: missionsTotal, ...missionMap },
      jobs: { total: jobsTotal, ...jobMap },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching real-time metrics:', message);
    return NextResponse.json({ error: 'Failed to fetch real-time metrics', details: message }, { status: 500 });
  } finally {
    agentosDb?.close();
  }
}
