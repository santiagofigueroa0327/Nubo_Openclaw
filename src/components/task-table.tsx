"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { StatusBadge } from "./status-badge";
import { formatDuration, formatRelativeTime } from "@/lib/utils";
import type { TaskRow } from "@/lib/types";

export function TaskTable({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter();

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-muted">
        <p className="text-sm">No tasks found</p>
        <p className="text-xs mt-1">Seed the database or create a task to get started</p>
      </div>
    );
  }

  return (
    <>
      {/* Table for larger screens */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border bg-surface/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">
                Title
              </th>
              <th className="px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider hidden md:table-cell">
                Agent
              </th>
              <th className="px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider hidden lg:table-cell">
                Model
              </th>
              <th className="px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider hidden sm:table-cell">
                Received
              </th>
              <th className="px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, i) => (
              <motion.tr
                key={task.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                onClick={() => router.push(`/tasks/${task.id}`)}
                className="border-b border-border/50 cursor-pointer hover:bg-bg2/40 transition-colors"
              >
                <td className="px-4 py-3">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-4 py-3 text-text font-medium max-w-xs truncate">
                  {task.title}
                </td>
                <td className="px-4 py-3 text-muted hidden md:table-cell">
                  <span className="text-xs bg-bg2/60 px-2 py-0.5 rounded">
                    {task.primaryAgent || "--"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted text-xs hidden lg:table-cell">
                  {task.model ? task.model.split("-").slice(0, 2).join("-") : "--"}
                </td>
                <td className="px-4 py-3 text-muted text-xs hidden sm:table-cell">
                  {formatRelativeTime(task.receivedAt)}
                </td>
                <td className="px-4 py-3 text-muted font-mono text-xs">
                  {formatDuration(task.startedAt, task.finishedAt)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards for small screens */}
      <div className="sm:hidden grid grid-cols-1 gap-3">
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            onClick={() => router.push(`/tasks/${task.id}`)}
            className="block rounded-xl border border-border bg-surface/30 p-4 cursor-pointer hover:bg-bg2/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <StatusBadge status={task.status} />
              <span className="text-muted text-xs">
                {formatRelativeTime(task.receivedAt)}
              </span>
            </div>
            <h3 className="text-text font-medium text-base mb-1 truncate">
              {task.title}
            </h3>
            <div className="flex justify-between items-center text-xs text-muted">
              <span>Agent: {task.primaryAgent || "--"}</span>
              <span>Duration: {formatDuration(task.startedAt, task.finishedAt)}</span>
            </div>
            {task.model && (
              <p className="text-muted text-xs mt-1">
                Model: {task.model.split("-").slice(0, 2).join("-")}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </>
  );
}
