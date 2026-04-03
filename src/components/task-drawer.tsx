"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge } from "./status-badge";
import { formatDuration, formatRelativeTime, formatTimestamp } from "@/lib/utils";
import type { TaskRow, TaskEvent, TaskLog, AgentOSJob } from "@/lib/types";

// ── Icons ──────────────────────────────────────────────────────────────────────
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function RefreshSmIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────
type DrawerTab = "summary" | "timeline" | "logs" | "artifacts";

interface Artifact {
  name: string;
  content: string;
  path: string;
}

// ── Log level colors ──────────────────────────────────────────────────────────
function logLevelClass(level: string) {
  switch (level) {
    case "error": return "text-red-400";
    case "warn":  return "text-amber-400";
    case "debug": return "text-muted/60";
    default:      return "text-text/80";
  }
}

// ── Timeline event icon ───────────────────────────────────────────────────────
function eventDot(type: string) {
  switch (type) {
    case "status_change":   return "bg-accent-cyan";
    case "error_occurred":  return "bg-red-500";
    case "retry":           return "bg-amber-500";
    case "output_generated":return "bg-emerald-500";
    default:                return "bg-muted";
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryTab({ task, jobs, onArchive, onRetry }: { task: TaskRow; jobs: AgentOSJob[]; onArchive: () => void; onRetry: () => void }) {
  const isArchived = !!task.archivedAt;
  const canRetry = task.status === "blocked" || task.status === "failed";

  return (
    <div className="space-y-4">
      {/* Core details */}
      <div className="grid grid-cols-2 gap-3">
        <DetailField label="Status">
          <StatusBadge status={task.status} />
          {isArchived && <span className="ml-2 text-[10px] text-muted bg-bg2 border border-border px-1.5 py-0.5 rounded">Archived</span>}
        </DetailField>
        <DetailField label="Channel">
          <span className="text-xs text-text capitalize">{task.sourceChannel || "—"}</span>
        </DetailField>
        <DetailField label="Agent">
          <span className="text-xs font-mono text-accent-cyan">{task.primaryAgent || "—"}</span>
        </DetailField>
        <DetailField label="Model">
          <span className="text-xs font-mono text-muted">{task.model || "—"}</span>
        </DetailField>
        <DetailField label="Received">
          <span className="text-xs text-text">{formatTimestamp(task.receivedAt)}</span>
        </DetailField>
        <DetailField label="Duration">
          <span className="text-xs font-mono text-text">{formatDuration(task.startedAt, task.finishedAt)}</span>
        </DetailField>
        {task.finishedAt && (
          <DetailField label="Finished">
            <span className="text-xs text-text">{formatRelativeTime(task.finishedAt)}</span>
          </DetailField>
        )}
        {task.stuckReason && (
          <DetailField label="Blocked reason" className="col-span-2">
            <span className="text-xs text-amber-400">{task.stuckReason}</span>
          </DetailField>
        )}
      </div>

      {/* AgentOS info */}
      {task.agentosId && (
        <div className="border border-border rounded-lg p-3 space-y-2">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">AgentOS Mission</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-muted">Mission ID:</span>
            <span className="font-mono text-text">{task.agentosId}</span>
            {task.workflowStep && (
              <>
                <span className="text-muted">Step:</span>
                <span className="text-text capitalize">{task.workflowStep}</span>
              </>
            )}
            {task.validationVerdict && (
              <>
                <span className="text-muted">Validation:</span>
                <span className={task.validationVerdict === "PASS" ? "text-emerald-400" : "text-red-400"}>
                  {task.validationVerdict} {task.validationScore != null ? `(${task.validationScore}/100)` : ""}
                </span>
              </>
            )}
            {task.retryCount != null && task.retryCount > 0 && (
              <>
                <span className="text-muted">Retries:</span>
                <span className="text-amber-400">{task.retryCount}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Jobs */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Jobs ({jobs.length})</p>
          {jobs.map((job) => (
            <div key={job.jobId} className="flex items-center justify-between px-3 py-2 bg-bg2/40 border border-border rounded-lg">
              <div>
                <span className="text-xs font-mono text-text">{job.agentId}</span>
                <span className="text-[10px] text-muted ml-2">{job.jobId}</span>
              </div>
              <div className="flex items-center gap-2">
                {job.workflowStep && (
                  <span className="text-[10px] text-muted capitalize">{job.workflowStep}</span>
                )}
                {job.validationVerdict && (
                  <span className={`text-[10px] font-semibold ${job.validationVerdict === "PASS" ? "text-emerald-400" : "text-red-400"}`}>
                    {job.validationVerdict}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error summary */}
      {task.errorSummary && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-[11px] font-semibold text-red-400 mb-1">Error</p>
          <p className="text-xs text-red-300">{task.errorSummary}</p>
        </div>
      )}

      {/* Final output preview */}
      {task.finalOutput && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Output Preview</p>
          <pre className="text-[11px] text-text/80 bg-bg/60 border border-border rounded-lg p-3 overflow-x-auto max-h-32 whitespace-pre-wrap">
            {task.finalOutput.slice(0, 500)}{task.finalOutput.length > 500 ? "…" : ""}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border">
        {canRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors"
          >
            <RefreshSmIcon className="w-3 h-3" />
            Retry
          </button>
        )}
        <button
          onClick={onArchive}
          className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${
            isArchived
              ? "bg-bg2/60 border-border text-muted hover:text-text"
              : "bg-muted/10 border-muted/30 text-muted hover:text-text hover:border-muted/50"
          }`}
        >
          {isArchived ? "Unarchive" : "Archive"}
        </button>
      </div>
    </div>
  );
}

function DetailField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-0.5 ${className ?? ""}`}>
      <p className="text-[10px] font-semibold text-muted uppercase tracking-wide">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function TimelineTab({ events }: { events: TaskEvent[] }) {
  if (events.length === 0) {
    return <p className="text-xs text-muted text-center py-8">No events yet</p>;
  }
  return (
    <div className="relative space-y-0 pl-4">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
      {events.map((ev) => (
        <div key={ev.id} className="relative flex gap-3 pb-4">
          <div className={`absolute -left-[5px] w-2.5 h-2.5 rounded-full border-2 border-bg mt-0.5 shrink-0 ${eventDot(ev.type)}`} />
          <div className="min-w-0">
            <p className="text-xs text-text leading-snug">{ev.summary}</p>
            <p className="text-[10px] text-muted mt-0.5">{formatTimestamp(ev.ts)}</p>
            {ev.data && ev.type !== "status_change" && (
              <pre className="text-[10px] text-muted/70 mt-1 bg-bg/60 border border-border rounded px-2 py-1 overflow-x-auto max-w-xs">
                {JSON.stringify(ev.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveLogsTab({ taskId }: { taskId: string }) {
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const logMapRef = useRef<Map<string, TaskLog>>(new Map());

  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      es = new EventSource(`/api/tasks/${taskId}/logs/stream`);
      es.onopen = () => setConnected(true);
      es.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (Array.isArray(payload.logs)) {
            for (const log of payload.logs) {
              logMapRef.current.set(log.id, { ...log, meta: log.metaJson ? JSON.parse(log.metaJson) : null });
            }
            const sorted = Array.from(logMapRef.current.values()).sort((a, b) => a.ts - b.ts);
            setLogs(sorted);
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        setConnected(false);
        es?.close();
        retry = setTimeout(connect, 3000);
      };
    };

    // Load initial logs via REST
    fetch(`/api/tasks/${taskId}/logs`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.logs)) {
          for (const log of d.logs) {
            logMapRef.current.set(log.id, { ...log, meta: log.metaJson ? JSON.parse(log.metaJson) : null });
          }
          const sorted = Array.from(logMapRef.current.values()).sort((a, b) => a.ts - b.ts);
          setLogs(sorted);
        }
      })
      .catch(() => {});

    connect();
    return () => {
      es?.close();
      if (retry) clearTimeout(retry);
    };
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted">{logs.length} log entries</span>
        <div className={`flex items-center gap-1 text-[10px] ${connected ? "text-emerald-400" : "text-amber-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          {connected ? "Live" : "Reconnecting"}
        </div>
      </div>
      <div className="flex-1 bg-bg/60 border border-border rounded-lg overflow-auto font-mono text-[11px] p-3 space-y-0.5 max-h-80">
        {logs.length === 0 ? (
          <span className="text-muted/50">No logs yet…</span>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="text-muted/50 shrink-0 text-[10px]">{new Date(log.ts).toISOString().slice(11, 19)}</span>
              <span className={`shrink-0 w-8 text-right text-[10px] ${logLevelClass(log.level)}`}>{log.level}</span>
              <span className="text-text/80 break-all">{log.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function ArtifactsTab({ taskId }: { taskId: string }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/tasks/${taskId}/artifacts`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.artifacts)) {
          setArtifacts(d.artifacts);
          if (d.artifacts.length > 0) setSelected(0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) return <p className="text-xs text-muted text-center py-8">Loading artifacts…</p>;
  if (artifacts.length === 0) return <p className="text-xs text-muted text-center py-8">No artifacts yet</p>;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {artifacts.map((a, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={`px-2.5 py-1 text-[10px] rounded-md border transition-colors ${
              selected === i
                ? "bg-accent-cyan/15 border-accent-cyan/40 text-accent-cyan"
                : "bg-bg2/60 border-border text-muted hover:text-text"
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>
      {selected !== null && artifacts[selected] && (
        <pre className="text-[11px] text-text/80 bg-bg/60 border border-border rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap font-mono">
          {artifacts[selected].content}
        </pre>
      )}
    </div>
  );
}

// ── Main Drawer ────────────────────────────────────────────────────────────────

export function TaskDrawer({
  taskId,
  onClose,
  onTaskUpdate,
}: {
  taskId: string;
  onClose: () => void;
  onTaskUpdate?: (task: TaskRow) => void;
}) {
  const [task, setTask] = useState<TaskRow | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [jobs, setJobs] = useState<AgentOSJob[]>([]);
  const [tab, setTab] = useState<DrawerTab>("summary");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [taskRes, eventsRes, jobsRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}`, { cache: "no-store" }),
        fetch(`/api/tasks/${taskId}/events`, { cache: "no-store" }),
        fetch(`/api/tasks/${taskId}/jobs`, { cache: "no-store" }),
      ]);
      if (taskRes.ok) {
        const t = await taskRes.json();
        setTask(t);
      }
      if (eventsRes.ok) {
        const d = await eventsRes.json();
        setEvents(
          (d.events || []).map((e: { id: string; taskId: string; ts: number; type: string; summary: string; dataJson: string | null }) => ({
            ...e,
            data: e.dataJson ? JSON.parse(e.dataJson) : null,
          }))
        );
      }
      if (jobsRes.ok) {
        const d = await jobsRes.json();
        setJobs(d.jobs || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh task data periodically if running
  useEffect(() => {
    if (!task || task.status !== "running") return;
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [task?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleArchive = async () => {
    if (!task) return;
    const isArchived = !!task.archivedAt;
    try {
      const res = await fetch(`/api/tasks/${task.id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unarchive: isArchived }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        onTaskUpdate?.(updated);
      }
    } catch { /* ignore */ }
  };

  const handleRetry = async () => {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/retry`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        onTaskUpdate?.(updated);
      }
    } catch { /* ignore */ }
  };

  const TABS: { id: DrawerTab; label: string }[] = [
    { id: "summary",   label: "Summary" },
    { id: "timeline",  label: `Timeline ${events.length > 0 ? `(${events.length})` : ""}` },
    { id: "logs",      label: "Logs" },
    { id: "artifacts", label: "Artifacts" },
  ];

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-40"
      />

      {/* Drawer panel */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-[480px] max-w-[95vw] bg-bg border-l border-border z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0 pr-3">
            {loading ? (
              <div className="h-4 bg-bg2 rounded w-48 animate-pulse" />
            ) : (
              <>
                <h2 className="text-sm font-semibold text-text leading-snug line-clamp-2">
                  {task?.title || taskId}
                </h2>
                <p className="text-[10px] font-mono text-muted mt-1">{taskId}</p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-muted hover:text-text hover:bg-bg2 transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                tab === t.id
                  ? "border-accent-cyan text-accent-cyan"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-bg2/60 rounded-lg animate-pulse" />)}
            </div>
          ) : !task ? (
            <p className="text-xs text-red-400 text-center py-8">Failed to load task</p>
          ) : tab === "summary" ? (
            <SummaryTab task={task} jobs={jobs} onArchive={handleArchive} onRetry={handleRetry} />
          ) : tab === "timeline" ? (
            <TimelineTab events={events} />
          ) : tab === "logs" ? (
            <LiveLogsTab taskId={taskId} />
          ) : (
            <ArtifactsTab taskId={taskId} />
          )}
        </div>
      </motion.aside>
    </>
  );
}
