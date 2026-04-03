export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import Link from "next/link";

interface MissionRow {
  id: string;
  title: string;
  status: string;
  sourceChannel: string;
  receivedAt: number;
  finishedAt: number | null;
  updatedAt: number;
  agentosId: string;
  agentosStatus: string;
  workflowStep: string | null;
  validationScore: number | null;
  validationVerdict: string | null;
  retryCount: number;
  jobCount: number;
  errorSummary: string | null;
}

function WorkflowBadge({ step }: { step: string | null }) {
  const steps = ["dispatch", "working", "validating", "assembling", "delivered"];
  const stepLabels: Record<string, string> = {
    dispatch: "Dispatch",
    working: "Working",
    validating: "Validating",
    assembling: "Assembling",
    delivered: "Delivered",
    failed: "Failed",
    planning: "Planning",
  };

  const colors: Record<string, string> = {
    dispatch: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    working: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    validating: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    assembling: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    delivered: "bg-green-500/20 text-green-300 border-green-500/30",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
    planning: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  };

  const normalizedStep = step || "planning";
  const color = colors[normalizedStep] || colors["planning"];
  const label = stepLabels[normalizedStep] || normalizedStep;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      {label}
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
  });
}

export default function MissionsPage() {
  const db = getDb();

  let missions: MissionRow[] = [];
  let total = 0;
  let lastSync: string | null = null;

  try {
    missions = db
      .prepare(
        `SELECT t.*, (SELECT COUNT(*) FROM agentos_jobs j WHERE j.taskId = t.id) as totalJobs
         FROM tasks t WHERE t.agentosId IS NOT NULL ORDER BY t.receivedAt DESC LIMIT 100`
      )
      .all() as MissionRow[];

    const result = db
      .prepare(`SELECT COUNT(*) as total FROM tasks WHERE agentosId IS NOT NULL`)
      .get() as { total: number };
    total = result.total;

    const syncState = db
      .prepare(`SELECT value FROM agentos_sync_state WHERE key = 'last_sync'`)
      .get() as { value: string } | undefined;
    lastSync = syncState?.value || null;
  } catch (e) {
    // Tables might not exist yet if sync hasn't run
    missions = [];
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">AgentOS Missions</h2>
          <p className="text-sm text-text-muted mt-0.5">
            {total} total • Sync: {lastSync ? new Date(lastSync).toLocaleTimeString() : "never"}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs text-text-muted bg-bg-card px-3 py-1.5 rounded border border-border">
            🔄 Auto-sync every 5s
          </span>
        </div>
      </div>

      {/* Architecture diagram */}
      <div className="px-6 py-4 bg-bg-card border-b border-border">
        <p className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">AgentOS Workflow</p>
        <div className="flex items-center gap-1 text-xs">
          {["Nubo", "→", "Atlas/Zenith/...", "→", "Sentinel", "→", "Aegis", "→", "Delivery"].map((item, i) => (
            <span
              key={i}
              className={
                item === "→"
                  ? "text-text-muted"
                  : "bg-bg px-2 py-1 rounded border border-border text-text-muted font-mono"
              }
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Mission list */}
      {missions.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <div className="text-4xl mb-3">🚀</div>
          <p className="text-text-muted text-sm">No AgentOS missions yet.</p>
          <p className="text-text-muted text-xs mt-1">
            Run <code className="bg-bg-card px-1 rounded text-text">dispatch-job --no-wait atlas &quot;Tu tarea&quot;</code> to create one.
          </p>
          <p className="text-text-muted text-xs mt-2">
            Or wait for the sync daemon to populate this page.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {missions.map((mission) => (
            <Link
              key={mission.id}
              href={`/missions/${mission.agentosId || mission.id}`}
              className="flex items-start gap-4 px-6 py-4 hover:bg-bg-card transition-colors"
            >
              {/* Status indicator */}
              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                mission.status === "completed" ? "bg-green-400" :
                mission.status === "running" ? "bg-yellow-400 animate-pulse" :
                mission.status === "failed" ? "bg-red-400" :
                "bg-gray-400"
              }`} />

              {/* Mission info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-text truncate">
                    {mission.title}
                  </span>
                  <WorkflowBadge step={mission.workflowStep} />
                  {mission.validationVerdict && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      mission.validationVerdict === "PASS"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-red-500/20 text-red-300"
                    }`}>
                      {mission.validationVerdict}
                      {mission.validationScore ? ` ${mission.validationScore}/100` : ""}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="font-mono">{mission.agentosId}</span>
                  <span>·</span>
                  <span>{mission.jobCount} job{mission.jobCount !== 1 ? "s" : ""}</span>
                  {mission.retryCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-yellow-400">⚠ {mission.retryCount} retry</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{fmt(mission.receivedAt)}</span>
                  {mission.finishedAt && (
                    <>
                      <span>→</span>
                      <span>{fmt(mission.finishedAt)}</span>
                    </>
                  )}
                </div>

                {mission.errorSummary && (
                  <p className="text-xs text-red-400 mt-1 truncate">{mission.errorSummary}</p>
                )}
              </div>

              {/* Arrow */}
              <span className="text-text-muted text-sm flex-shrink-0">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
