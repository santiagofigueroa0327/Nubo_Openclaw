import { redirect } from "next/navigation";
import { AgentDetailClient } from "./agent-detail-client";

export const dynamic = "force-dynamic";

interface AgentConfig {
  agentId: string;
  name: string;
  role: string;
  description: string;
  enabled: boolean;
  model: string;
  fallbacks: string[];
  capabilities: string[];
  toolsAllow: string[];
  toolsDeny: string[];
  skills: string[];
}

async function getAgentConfig(agentId: string): Promise<AgentConfig> {
  const res = await fetch(`http://127.0.0.1:3010/api/agents/${agentId}`);
  if (!res.ok) {
    if (res.status === 404) redirect("/agents");
    throw new Error(`Failed to fetch agent config: ${res.statusText}`);
  }
  return res.json();
}

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agentConfig = await getAgentConfig(id);

  return <AgentDetailClient initialAgentConfig={agentConfig} />;
}
