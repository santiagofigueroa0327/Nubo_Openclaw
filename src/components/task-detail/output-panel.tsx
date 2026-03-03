"use client";

import { motion } from "framer-motion";
import type { TaskRow } from "@/lib/types";

export function OutputPanel({ task }: { task: TaskRow }) {
  const hasOutput = task.finalOutput || task.errorSummary;

  if (!hasOutput) {
    return (
      <div className="text-center py-6 text-muted text-sm">
        {task.status === "running"
          ? "Task is still running..."
          : task.status === "queued"
          ? "Task is queued, no output yet"
          : "No output available"}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {task.errorSummary && (
        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs font-medium text-red-400 mb-1">Error</p>
          <pre className="text-xs font-mono text-red-300 whitespace-pre-wrap">
            {task.errorSummary}
          </pre>
        </div>
      )}

      {task.finalOutput && (
        <div className="p-3 bg-bg/50 border border-border rounded-lg">
          <p className="text-xs font-medium text-muted mb-2">Output</p>
          <pre className="text-xs font-mono text-text whitespace-pre-wrap leading-relaxed">
            {task.finalOutput}
          </pre>
        </div>
      )}
    </motion.div>
  );
}
