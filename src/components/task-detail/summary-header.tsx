"use client";

import { motion } from "framer-motion";
import { StatusBadge } from "@/components/status-badge";
import { ClockIcon } from "@/components/ui/icons";
import { formatDuration, formatTimestamp } from "@/lib/utils";
import type { TaskRow } from "@/lib/types";

export function SummaryHeader({ task }: { task: TaskRow }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-surface/30 p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={task.status} />
            <span className="text-xs text-muted font-mono">{task.id.slice(0, 8)}</span>
          </div>
          <h2 className="text-lg font-semibold text-text truncate">{task.title}</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted mb-1">Agent</p>
          <p className="text-text">
            <span className="bg-bg2/60 px-2 py-0.5 rounded text-xs">
              {task.primaryAgent || "--"}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Model</p>
          <p className="text-text text-xs font-mono">
            {task.model || "--"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Source</p>
          <p className="text-text text-xs capitalize">
            {task.sourceChannel} &middot; {task.sourceUser || "system"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Duration</p>
          <p className="text-text text-xs font-mono flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {formatDuration(task.startedAt, task.finishedAt)}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
        <span>Received: {formatTimestamp(task.receivedAt)}</span>
        {task.startedAt && <span>Started: {formatTimestamp(task.startedAt)}</span>}
        {task.finishedAt && <span>Finished: {formatTimestamp(task.finishedAt)}</span>}
      </div>
    </motion.div>
  );
}
