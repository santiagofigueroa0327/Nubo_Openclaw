"use client";

import { motion } from "framer-motion";
import type { TaskStatus } from "@/lib/types";

const STATUS_STYLES: Record<TaskStatus, string> = {
  queued: "bg-muted/20 text-muted",
  running: "bg-accent-cyan/20 text-accent-cyan",
  completed: "bg-emerald-500/20 text-emerald-400",
  blocked: "bg-amber-500/20 text-amber-400",
  failed: "bg-red-500/20 text-red-400",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.queued}`}
    >
      {status === "running" && (
        <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
      )}
      {status}
    </motion.span>
  );
}
