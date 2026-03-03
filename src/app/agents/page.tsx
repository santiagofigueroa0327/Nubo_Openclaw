import { getDb } from "@/lib/db";
import type { AgentRow } from "@/lib/types";
import { AgentsPageClient } from "./agents-page-client";

function parseAgent(row: AgentRow) {
  return {
    agentId: row.agentId,
    role: row.role,
    capabilities: JSON.parse(row.capabilitiesJson || "[]") as string[],
    enabled: row.enabled === 1,
    defaultModelPolicy: row.defaultModelPolicy,
  };
}

export default function AgentsPage() {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM agents_registry ORDER BY agentId")
    .all() as AgentRow[];
  const agents = rows.map(parseAgent);

  return <AgentsPageClient initialAgents={agents} />;
}
