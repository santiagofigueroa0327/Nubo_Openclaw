"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SummaryHeader } from "@/components/task-detail/summary-header";
import { Timeline } from "@/components/task-detail/timeline";
import { LogsPanel } from "@/components/task-detail/logs-panel";
import { OutputPanel } from "@/components/task-detail/output-panel";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { TaskRow, EventRow, TaskLogRow } from "@/lib/types";

export function TaskDetailClient({
  task,
  events,
  logs,
}: {
  task: TaskRow;
  events: EventRow[];
  logs: TaskLogRow[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted mb-4">
        <Link href="/tasks" className="hover:text-text transition-colors">
          Tasks
        </Link>
        <ChevronRightIcon className="w-3 h-3" />
        <span className="text-text">{task.id.slice(0, 8)}</span>
      </div>

      <SummaryHeader task={task} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="rounded-xl border border-border bg-surface/30 p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Timeline</h3>
          <Timeline events={events} />
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface/30 p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Logs</h3>
            <LogsPanel logs={logs} />
          </div>

          <div className="rounded-xl border border-border bg-surface/30 p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Output</h3>
            <OutputPanel task={task} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
