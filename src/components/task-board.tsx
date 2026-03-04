"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { StatusBadge } from "./status-badge";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import type { TaskRow, TaskStatus } from "@/lib/types";

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: "queued",    label: "Queued",    accent: "border-t-muted/60" },
  { status: "running",   label: "Running",   accent: "border-t-accent-cyan/60" },
  { status: "blocked",   label: "Blocked",   accent: "border-t-amber-500/60" },
  { status: "completed", label: "Completed", accent: "border-t-emerald-500/60" },
  { status: "failed",    label: "Failed",    accent: "border-t-red-500/60" },
];

function TaskCard({ task, index }: { task: TaskRow; index: number }) {
  const router = useRouter();

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      onClick={() => router.push(`/tasks/${task.id}`)}
      className="group bg-surface/40 border border-border rounded-lg p-3 cursor-pointer hover:bg-bg2/60 hover:border-accent-cyan/20 transition-colors"
    >
      {/* Title */}
      <p className="text-xs font-medium text-text leading-snug line-clamp-2 mb-2">
        {task.title}
      </p>

      {/* Agent + Model chips */}
      <div className="flex flex-wrap gap-1 mb-2">
        {task.primaryAgent && (
          <span className="text-[10px] bg-bg2/60 border border-border px-1.5 py-0.5 rounded text-muted truncate max-w-[120px]">
            {task.primaryAgent}
          </span>
        )}
        {task.model && (
          <span className="text-[10px] bg-bg2/60 border border-border px-1.5 py-0.5 rounded text-muted truncate max-w-[100px]">
            {task.model.split("-").slice(0, 2).join("-")}
          </span>
        )}
      </div>

      {/* Timestamps row */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted/70">
          {formatRelativeTime(task.receivedAt)}
        </span>
        <span className="text-[10px] font-mono text-muted/70">
          {formatDuration(task.startedAt, task.finishedAt)}
        </span>
      </div>
    </motion.div>
  );
}

function KanbanColumn({
  status,
  label,
  accent,
  tasks,
}: {
  status: TaskStatus;
  label: string;
  accent: string;
  tasks: TaskRow[];
}) {
  return (
    <div className={`flex flex-col min-w-[220px] w-[220px] sm:min-w-[240px] sm:w-[240px] flex-shrink-0`}>
      {/* Column header */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-xl border border-b-0 border-border bg-bg2/50 border-t-2 ${accent}`}
      >
        <span className="text-xs font-semibold text-text capitalize">{label}</span>
        <span className="text-[10px] font-mono bg-bg2 border border-border px-1.5 py-0.5 rounded-full text-muted">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 bg-bg2/20 border border-t-0 border-border rounded-b-xl min-h-[120px]">
        {tasks.length === 0 ? (
          <p className="text-[10px] text-muted/50 text-center py-6">Empty</p>
        ) : (
          tasks.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i} />
          ))
        )}
      </div>
    </div>
  );
}

export function TaskBoard({ tasks }: { tasks: TaskRow[] }) {
  const byStatus = Object.fromEntries(
    COLUMNS.map((col) => [
      col.status,
      tasks.filter((t) => t.status === col.status),
    ])
  ) as Record<TaskStatus, TaskRow[]>;

  return (
    /* Outer wrapper: horizontal scroll on mobile */
    <div className="overflow-x-auto pb-4 -mx-1 px-1">
      <div className="flex gap-3 w-max min-w-full">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            accent={col.accent}
            tasks={byStatus[col.status]}
          />
        ))}
      </div>
    </div>
  );
}
