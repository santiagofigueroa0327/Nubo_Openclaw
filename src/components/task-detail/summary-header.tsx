"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/status-badge";
import { ClockIcon } from "@/components/ui/icons";
import { formatDuration, formatTimestamp } from "@/lib/utils";
import type { TaskRow } from "@/lib/types";

export function SummaryHeader({ task }: { task: TaskRow }) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isArchived = !!task.archivedAt;

  async function handleArchive() {
    setArchiving(true);
    try {
      await fetch(`/api/tasks/${task.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unarchive: isArchived }),
      });
      router.refresh();
    } finally {
      setArchiving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      router.push("/tasks");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-surface/30 p-5"
    >
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={task.status} />
            <span className="text-xs text-muted font-mono">{task.id.slice(0, 8)}</span>
            {isArchived && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/10 text-muted">Archivada</span>
            )}
          </div>
          <h2 className="text-base md:text-lg font-semibold text-text break-words line-clamp-3 md:line-clamp-2">{task.title}</h2>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleArchive}
            disabled={archiving}
            title={isArchived ? "Desarchivar" : "Archivar tarea"}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-border bg-bg2/40 text-muted hover:text-text hover:border-muted/50 transition-colors disabled:opacity-50"
          >
            {archiving ? "…" : isArchived ? "📂 Desarchivar" : "📁 Archivar"}
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Eliminar tarea permanentemente"
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-50 ${
              confirmDelete
                ? "border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "border-border bg-bg2/40 text-muted hover:text-red-400 hover:border-red-500/50"
            }`}
          >
            {deleting ? "…" : confirmDelete ? "⚠ Confirmar" : "🗑 Eliminar"}
          </button>

          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1.5 text-xs text-muted hover:text-text transition-colors"
            >
              ✕
            </button>
          )}
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
