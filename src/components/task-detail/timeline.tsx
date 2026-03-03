"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon } from "@/components/ui/icons";
import { formatTimestamp, safeJsonParse } from "@/lib/utils";
import type { EventRow } from "@/lib/types";

const EVENT_COLORS: Record<string, string> = {
  status_change: "bg-accent-cyan",
  agent_assigned: "bg-accent-blue",
  output_generated: "bg-emerald-500",
  error_occurred: "bg-red-500",
  retry: "bg-amber-500",
  comment: "bg-accent-purple2",
};

export function Timeline({ events }: { events: EventRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted text-sm">
        No events recorded
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

      {events.map((event, i) => {
        const data = safeJsonParse(event.dataJson);
        const isExpanded = expandedId === event.id;

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            className="relative mb-4 pl-6"
          >
            <div
              className={`absolute left-[-3px] top-1.5 w-[10px] h-[10px] rounded-full ${
                EVENT_COLORS[event.type] || "bg-muted"
              } border-2 border-bg`}
            />

            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted mb-0.5">
                  {formatTimestamp(event.ts)}{" "}
                  <span className="text-accent-cyan/60 ml-1">{event.type}</span>
                </p>
                <p className="text-sm text-text">{event.summary}</p>
              </div>

              {data && (
                <button
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="shrink-0 mt-1 p-1 rounded hover:bg-bg2/50 transition-colors"
                >
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 text-muted transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>

            <AnimatePresence>
              {isExpanded && data && (
                <motion.pre
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-2 p-3 bg-bg/50 rounded-lg text-xs font-mono text-muted overflow-auto max-h-48"
                >
                  {JSON.stringify(data, null, 2)}
                </motion.pre>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
