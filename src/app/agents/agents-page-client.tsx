"use client";

import { AgentCard } from "@/components/agent-card";
import type { Agent } from "@/lib/types";

export function AgentsPageClient({
  initialAgents,
}: {
  initialAgents: Agent[];
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text">Agents</h1>
        <p className="text-sm text-muted mt-0.5">
          {initialAgents.length} registered agents
        </p>
      </div>

      {initialAgents.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-sm">No agents registered</p>
          <p className="text-xs mt-1">Seed the database to add sample agents</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {initialAgents.map((agent, i) => (
            <AgentCard key={agent.agentId} agent={agent} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
