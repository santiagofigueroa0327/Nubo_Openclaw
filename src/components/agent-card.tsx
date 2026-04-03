"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { Agent } from "@/lib/types";

export function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      whileHover={{ y: -2 }}
    >
    <Link
      href={`/agents/${agent.agentId}`}
      className="block rounded-xl border border-border bg-surface/30 p-5 transition-colors hover:border-accent-cyan/20"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 flex items-center justify-center">
            <span className="text-xs font-bold text-accent-cyan">
              {agent.agentId.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">{agent.agentId}</h3>
            <p className="text-xs text-muted">{agent.role}</p>
          </div>
        </div>
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            agent.enabled ? "bg-emerald-400" : "bg-muted/50"
          }`}
          title={agent.enabled ? "Enabled" : "Disabled"}
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {agent.capabilities.map((cap) => (
          <span
            key={cap}
            className="px-2 py-0.5 text-[10px] rounded-md bg-accent-purple/15 text-accent-cyan border border-accent-purple/20"
          >
            {cap}
          </span>
        ))}
      </div>

      <div className="pt-3 border-t border-border/50">
        <p className="text-[10px] text-muted">
          Model: <span className="text-text/70 font-mono">{agent.defaultModelPolicy || "default"}</span>
        </p>
      </div>
    </Link>
    </motion.div>
  );
}
