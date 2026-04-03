"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshIcon } from "@/components/ui/icons";

interface AgentCost {
  agentId: string;
  model: string;
  totalCost: number;
  estimatedCost: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  sessions: number;
  messages: number;
  byDay: Record<string, number>;
}

interface TokenCostsData {
  agents: AgentCost[];
  totals: { cost: number; estimatedCost: number; sessions: number; messages: number };
  nuboPercent: number;
  period: { days: number; from: string; to: string };
}

interface HealthTest {
  name: string;
  pass: boolean;
  error: string;
}

interface PipelineHealthData {
  status: string;
  score: number;
  pass: number;
  fail: number;
  warn: number;
  total: number;
  tests: HealthTest[];
  lastChecked: string;
}

interface RealtimeMetricsData {
  timestamp: number;
  missions: {
    total: number;
    byStatus: { status: string; count: number }[];
  };
  jobs: {
    total: number;
    byStatus: { status: string; count: number }[];
  };
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "healthy"
      ? "bg-green-400"
      : status === "degraded"
        ? "bg-yellow-400"
        : "bg-red-400";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}

function CostBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-bg2/60 rounded-full h-2.5 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-purple transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function MetricsPageClient() {
  const [costs, setCosts] = useState<TokenCostsData | null>(null);
  const [health, setHealth] = useState<PipelineHealthData | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [costsRes, healthRes, realtimeMetricsRes] = await Promise.all([
        fetch(`/api/token-costs?days=${days}`),
        fetch("/api/pipeline-health"),
        fetch("/api/realtime-metrics"),
      ]);
      if (costsRes.ok) setCosts(await costsRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
      if (realtimeMetricsRes.ok) setRealtimeMetrics(await realtimeMetricsRes.json());
    } catch {
      // silently fail — UI shows loading state
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxCost = costs?.agents.reduce((m, a) => Math.max(m, a.totalCost), 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Metrics</h1>
          <p className="text-sm text-muted mt-1">Token costs, pipeline health, agent performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text"
          >
            <option value={1}>Last 24h</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg border border-border hover:bg-bg2/60 transition-colors disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 text-muted ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Total Cost"
          value={costs ? formatCost(costs.totals.cost) : "—"}
          subtitle={costs ? `${days}d period` : ""}
          accent
        />
        <Card
          title="Nubo (main) %"
          value={costs ? `${costs.nuboPercent.toFixed(1)}%` : "—"}
          subtitle="of total cost"
          warn={costs ? costs.nuboPercent > 80 : false}
        />
        <Card
          title="Sessions"
          value={costs ? String(costs.totals.sessions) : "—"}
          subtitle={costs ? `${costs.totals.messages} messages` : ""}
        />
        <Card
          title="Pipeline"
          value={health ? `${health.score}%` : "—"}
          subtitle={health ? `${health.pass}/${health.total} pass` : ""}
          healthStatus={health?.status}
        />
      </div>

      {/* Pipeline Health */}
      {health && (
        <section className="rounded-xl border border-border bg-surface/30 p-5">
          <div className="flex items-center gap-2 mb-4">
            <StatusDot status={health.status} />
            <h2 className="text-lg font-semibold text-text">Pipeline Health</h2>
            <span className="text-xs text-muted ml-auto">
              {health.lastChecked ? new Date(health.lastChecked).toLocaleString() : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {health.tests.map((t) => (
              <div
                key={t.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  t.pass ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300"
                }`}
              >
                <span>{t.pass ? "✓" : "✗"}</span>
                <span className="truncate">{t.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cost by Agent */}
      {costs && costs.agents.length > 0 && (
        <section className="rounded-xl border border-border bg-surface/30 p-5">
          <h2 className="text-lg font-semibold text-text mb-4">Cost by Agent</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-3 py-2 font-medium text-muted text-xs uppercase tracking-wider">Agent</th>
                  <th className="px-3 py-2 font-medium text-muted text-xs uppercase tracking-wider">Model</th>
                  <th className="px-3 py-2 font-medium text-muted text-xs uppercase tracking-wider">Cost</th>
                  <th className="px-3 py-2 font-medium text-muted text-xs uppercase tracking-wider w-1/3">Distribution</th>
                  <th className="px-3 py-2 font-medium text-muted text-xs uppercase tracking-wider">Input</th>
                  <th className="px-3 py-2 font-medium text-muted text-xs uppercase tracking-wider">Output</th>
                  <th className="px-3 py-2 font-medium text-muted text-xs uppercase tracking-wider">Cache</th>
                  <th className="px-3 py-2 font-medium text-muted text-xs uppercase tracking-wider">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {costs.agents.map((a) => (
                  <tr key={a.agentId} className="border-b border-border/50 hover:bg-bg2/40 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-text">{a.agentId}</td>
                    <td className="px-3 py-2.5 text-muted">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-bg2/80 border border-border">
                        {a.model.split("-").slice(-2).join("-")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-accent-cyan font-mono">{formatCost(a.totalCost)}</td>
                    <td className="px-3 py-2.5">
                      <CostBar value={a.totalCost} max={maxCost} />
                    </td>
                    <td className="px-3 py-2.5 text-muted font-mono">{formatTokens(a.inputTokens)}</td>
                    <td className="px-3 py-2.5 text-muted font-mono">{formatTokens(a.outputTokens)}</td>
                    <td className="px-3 py-2.5 text-muted font-mono">{formatTokens(a.cacheReadTokens)}</td>
                    <td className="px-3 py-2.5 text-muted text-center">{a.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Cost by Day */}
      {costs && costs.agents.length > 0 && (
        <section className="rounded-xl border border-border bg-surface/30 p-5">
          <h2 className="text-lg font-semibold text-text mb-4">Daily Cost Trend</h2>
          <DailyChart agents={costs.agents} />
        </section>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  subtitle,
  accent,
  warn,
  healthStatus,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent?: boolean;
  warn?: boolean;
  healthStatus?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/30 p-4">
      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">{title}</p>
      <div className="flex items-center gap-2">
        {healthStatus && <StatusDot status={healthStatus} />}
        <p
          className={`text-2xl font-bold ${
            warn ? "text-yellow-400" : accent ? "text-accent-cyan" : "text-text"
          }`}
        >
          {value}
        </p>
      </div>
      {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
    </div>
  );
}

function DailyChart({ agents }: { agents: AgentCost[] }) {
  // Aggregate byDay across all agents
  const dayTotals: Record<string, number> = {};
  for (const a of agents) {
    for (const [day, cost] of Object.entries(a.byDay)) {
      dayTotals[day] = (dayTotals[day] || 0) + cost;
    }
  }

  const sortedDays = Object.entries(dayTotals).sort(([a], [b]) => a.localeCompare(b));
  if (sortedDays.length === 0) return <p className="text-sm text-muted">No data for this period</p>;

  const maxDayCost = Math.max(...sortedDays.map(([, c]) => c), 0.01);

  return (
    <div className="flex items-end gap-1.5 h-40">
      {sortedDays.map(([day, cost]) => {
        const heightPct = (cost / maxDayCost) * 100;
        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[10px] text-accent-cyan font-mono">{formatCost(cost)}</span>
            <div className="w-full flex items-end" style={{ height: "100px" }}>
              <div
                className="w-full rounded-t bg-gradient-to-t from-accent-cyan/60 to-accent-purple/60 transition-all duration-500"
                style={{ height: `${heightPct}%`, minHeight: cost > 0 ? "2px" : "0" }}
              />
            </div>
            <span className="text-[10px] text-muted truncate w-full text-center">
              {day.substring(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
