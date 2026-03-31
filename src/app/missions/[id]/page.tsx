export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import Link from "next/link";

interface JobRow {
  id: string;
  agentId: string;
  status: string;
  retryCount: number;
  validationVerdict: string | null;
  validationScore: number | null;
  createdAt: number;
  completedAt: number | null;
  jobDir: string;
}

interface EventRow {
  id: string;
  ts: number;
  type: string;
  summary: string;
  dataJson: string | null;
}

interface LogRow {
  id: string;
  ts: number;
  level: string;
  message: string;
  metaJson: string | null;
}

function WorkflowTimeline({ step }: { step: string | null }) {
  const steps = [
    { id: "planning", label: "Planning", icon: "📋" },
    { id: "dispatch", label: "Dispatch", icon: "🚀" },
    { id: "working", label: "Working", icon: "⚙️" },
    { id: "validating", label: "Validating", icon: "🔍" },
    { id: "assembling", label: "Assembling", icon: "✨" },
    { id: "delivered", label: "Delivered", icon: "✅" },
  ];

  const normalStep = step || "planning";
  const currentIdx = steps.findIndex((s) => s.id === normalStep);

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const isDone = i < currentIdx || (normalStep === "delivered" && i <= currentIdx);
        const isCurrent = i === currentIdx;
        const isFailed = normalStep === "failed";

        return (
          <div key={s.id} className="flex items-center">
            <div
              className={`flex flex-col items-center ${
                isDone
                  ? "text-green-400"
                  : isCurrent
                  ? isFailed
                    ? "text-red-400"
                    : "text-yellow-400"
                  : "text-text-muted/30"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border ${
                  isDone
                    ? "bg-green-500/20 border-green-500/40"
                    : isCurrent
                    ? isFailed
                      ? "bg-red-500/20 border-red-500/40"
                      : "bg-yellow-500/20 border-yellow-500/40 animate-pulse"
                    : "bg-bg border-border"
                }`}
              >
                <span className="text-xs">{s.icon}</span>
              </div>
              <span className="text-[10px] mt-1 font-medium">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mt-[-10px] ${
                  isDone ? "bg-green-500/40" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AgentBadge({ agentId }: { agentId: string }) {
  const colors: Record<string, string> = {
    atlas: "bg-blue-500/20 text-blue-300",
    zenith: "bg-purple-500/20 text-purple-300",
    chronos: "bg-cyan-500/20 text-cyan-300",
    spark: "bg-yellow-500/20 text-yellow-300",
    flux: "bg-orange-500/20 text-orange-300",
    hermes: "bg-pink-500/20 text-pink-300",
    sentinel: "bg-red-500/20 text-red-300",
    aegis: "bg-green-500/20 text-green-300",
    nubo: "bg-indigo-500/20 text-indigo-300",
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${colors[agentId] || "bg-gray-500/20 text-gray-300"}`}>
      {agentId}
    </span>
  );
}

function fmt(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-CO", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function elapsed(startMs: number, endMs: number | null): string {
  if (!endMs) return "…";
  const sec = Math.round((endMs - startMs) / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const taskId = id.startsWith("agentos-") ? id : `agentos-${id}`;

  const task = db
    .prepare(`SELECT * FROM tasks WHERE id = ? OR agentosId = ?`)
    .get(taskId, id) as Record<string, unknown> | undefined;

  if (!task) notFound();

  let jobs: JobRow[] = [];
  try {
    jobs = db
      .prepare(`SELECT * FROM agentos_jobs WHERE taskId = ? ORDER BY createdAt`)
      .all(task.id as string) as JobRow[];
  } catch (e) {
    // table might not exist yet
  }

  const events = db
    .prepare(`SELECT * FROM events WHERE taskId = ? ORDER BY ts ASC LIMIT 100`)
    .all(task.id as string) as EventRow[];

  const logs = db
    .prepare(`SELECT * FROM task_logs WHERE taskId = ? ORDER BY ts ASC LIMIT 200`)
    .all(task.id as string) as LogRow[];

  const workflowStep = (task.workflowStep as string) || "planning";
  const validationVerdict = task.validationVerdict as string | null;
  const validationScore = task.validationScore as number | null;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
          <Link href="/missions" className="hover:text-text transition-colors">Missions</Link>
          <span>›</span>
          <span className="font-mono text-xs">{task.agentosId as string}</span>
        </div>
        <h2 className="text-lg font-semibold text-text mb-3">
          {task.title as string}
        </h2>

        {/* Workflow Timeline */}
        <WorkflowTimeline step={workflowStep} />

        {/* Validation result */}
        {validationVerdict && (
          <div className={`mt-3 px-3 py-2 rounded border inline-flex items-center gap-2 text-sm ${
            validationVerdict === "PASS"
              ? "bg-green-500/10 border-green-500/30 text-green-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}>
            {validationVerdict === "PASS" ? "✅" : "❌"} Validation: {validationVerdict}
            {validationScore !== null && ` (${validationScore}/100)`}
          </div>
        )}

        {/* Meta */}
        <div className="mt-3 flex gap-4 text-xs text-text-muted">
          <span>Started: {fmt(task.receivedAt as number)}</span>
          {(task.finishedAt as number | null) && <span>Finished: {fmt(task.finishedAt as number)}</span>}
          {(task.retryCount as number) > 0 && (
            <span className="text-yellow-400">⚠ {task.retryCount as number} retries</span>
          )}
          <span>Status: {task.agentosStatus as string}</span>
        </div>
      </div>

      <div className="flex gap-0">
        {/* Left: Jobs */}
        <div className="flex-1 border-r border-border">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text">Jobs ({jobs.length})</h3>
          </div>

          {jobs.length === 0 ? (
            <div className="px-6 py-8 text-center text-text-muted text-sm">No jobs yet</div>
          ) : (
            <div className="divide-y divide-border">
              {jobs.map((job) => (
                <div key={job.id} className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AgentBadge agentId={job.agentId} />
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      job.status === "completed" ? "bg-green-500/20 text-green-300" :
                      job.status === "failed" ? "bg-red-500/20 text-red-300" :
                      job.status === "dispatched" ? "bg-yellow-500/20 text-yellow-300" :
                      "bg-gray-500/20 text-gray-300"
                    }`}>
                      {job.status}
                    </span>
                    {job.retryCount > 0 && (
                      <span className="text-xs text-yellow-400">retry {job.retryCount}</span>
                    )}
                    {job.validationVerdict && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        job.validationVerdict === "PASS"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-red-500/20 text-red-300"
                      }`}>
                        {job.validationVerdict}
                        {job.validationScore ? ` ${job.validationScore}/100` : ""}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted font-mono">{job.id}</div>
                  <div className="flex gap-3 text-xs text-text-muted mt-1">
                    <span>Created: {fmt(job.createdAt)}</span>
                    {job.completedAt && (
                      <span>
                        Duration: {elapsed(job.createdAt, job.completedAt)}
                      </span>
                    )}
                  </div>
                  {job.jobDir && (
                    <div className="text-xs text-text-muted/50 mt-1 font-mono truncate">
                      {job.jobDir}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Logs + Events */}
        <div className="w-80 flex-shrink-0">
          {/* Task Logs */}
          <div className="border-b border-border">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">
                Progress Logs ({logs.length})
              </h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="px-4 py-4 text-xs text-text-muted text-center">No logs</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {logs.map((log) => {
                    let meta: Record<string, unknown> = {};
                    try {
                      meta = JSON.parse(log.metaJson || "{}");
                    } catch (e) { /* ignore */ }

                    return (
                      <div key={log.id} className="px-4 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            log.level === "error" ? "bg-red-400" :
                            meta.status === "complete" ? "bg-green-400" :
                            "bg-yellow-400"
                          }`} />
                          <span className="text-xs text-text font-mono">{meta.step as string || "?"}</span>
                          {(meta.elapsed as number | null) && (
                            <span className="text-xs text-text-muted">({meta.elapsed as number}s)</span>
                          )}
                          {(meta.agent as string | null) && <AgentBadge agentId={meta.agent as string} />}
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">{log.message}</p>
                        <p className="text-[10px] text-text-muted/50 mt-0.5">{fmt(log.ts)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Events */}
          <div>
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">
                Events ({events.length})
              </h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {events.length === 0 ? (
                <div className="px-4 py-4 text-xs text-text-muted text-center">No events</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {events.map((ev) => (
                    <div key={ev.id} className="px-4 py-2">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-mono text-accent-cyan">{ev.type}</span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">{ev.summary}</p>
                      <p className="text-[10px] text-text-muted/50 mt-0.5">{fmt(ev.ts)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
