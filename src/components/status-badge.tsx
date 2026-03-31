"use client";

import { motion } from "framer-motion";
import type { TaskStatus } from "@/lib/types";

const STATUS_STYLES: Record<TaskStatus, string> = {
  // AgentOS v2
  planning:    "bg-amber-500/20 text-amber-400",
  dispatched:  "bg-blue-500/20 text-blue-400",
  running:     "bg-accent-cyan/20 text-accent-cyan",
  stale_retry: "bg-amber-500/20 text-amber-400",
  handoff:     "bg-purple-500/20 text-purple-400",
  done:        "bg-emerald-500/20 text-emerald-400",
  cancelled:   "bg-gray-500/20 text-gray-400",
  // Legacy
  queued:      "bg-muted/20 text-muted",
  completed:   "bg-emerald-500/20 text-emerald-400",
  blocked:     "bg-amber-500/20 text-amber-400",
  failed:      "bg-red-500/20 text-red-400",
  archived:    "bg-gray-500/20 text-gray-400",
};

const PULSE_STATES = new Set<TaskStatus>(["running", "stale_retry", "planning", "dispatched", "handoff"]);

export function StatusBadge({ status }: { status: TaskStatus }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.queued;
  const dotColor =
    status === "running" ? "bg-accent-cyan" :
    status === "stale_retry" || status === "planning" ? "bg-amber-400" :
    status === "dispatched" ? "bg-blue-400" :
    status === "handoff" ? "bg-purple-400" : null;

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}
    >
      {PULSE_STATES.has(status) && dotColor && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
      )}
      {status}
    </motion.span>
  );
}
