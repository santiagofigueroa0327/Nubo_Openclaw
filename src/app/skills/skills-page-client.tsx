"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshIcon } from "@/components/ui/icons";
import type { SkillInfo } from "../api/skills/route";

interface SkillsResponse {
  skills: SkillInfo[];
  stats: {
    total: number;
    eligible: number;
    disabled: number;
    workspace: number;
    bundled: number;
    missing: number;
  };
  error?: string;
}

interface SkillUsage {
  slug: string;
  total: number;
  ok: number;
  fail: number;
  agents: string[];
  lastUsed: string | null;
  recentEvents: Array<{ ts: string; agent: string; result: string }>;
}

interface AnalyticsResponse {
  totalEvents: number;
  uniqueSkills: number;
  skills: SkillUsage[];
  dataAvailable: boolean;
}

type FilterType = "all" | "eligible" | "workspace" | "disabled" | "missing";

function SkillStatus({ skill }: { skill: SkillInfo }) {
  if (skill.disabled) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        disabled
      </span>
    );
  }
  if (skill.eligible) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-900/40 text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        ready
      </span>
    );
  }
  if (skill.blockedByAllowlist) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-900/40 text-purple-400">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
        blocked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-900/30 text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      missing
    </span>
  );
}

function SkillSourceBadge({ source }: { source: string }) {
  const label =
    source === "openclaw-workspace"
      ? "workspace"
      : source === "openclaw-bundled"
      ? "bundled"
      : source;
  const cls =
    source === "openclaw-workspace"
      ? "bg-cyan-900/30 text-cyan-400"
      : "bg-bg2 text-muted";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${cls}`}>
      {label}
    </span>
  );
}

function SkillTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  const colors: Record<string, string> = {
    "instruction-only": "bg-blue-900/30 text-blue-400",
    "reference-heavy": "bg-amber-900/30 text-amber-400",
    "scripted": "bg-green-900/30 text-green-400",
    "integration": "bg-pink-900/30 text-pink-400",
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${colors[type] ?? "bg-bg2 text-muted"}`}>
      {type}
    </span>
  );
}

function MissingBadges({ missing }: { missing: SkillInfo["missing"] }) {
  const items: string[] = [
    ...missing.bins.map((b) => `bin:${b}`),
    ...missing.env.map((e) => `env:${e}`),
    ...missing.config.map((c) => `cfg:${c}`),
    ...missing.os.map((o) => `os:${o}`),
  ];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map((item) => (
        <span
          key={item}
          className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-red-900/20 text-red-400 font-mono"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-bg2 border border-border rounded-lg px-4 py-3 text-left hover:border-accent-cyan/30 transition-colors"
    >
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  loading,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  variant?: "default" | "danger" | "success";
}) {
  const colors = {
    default: "bg-bg2 hover:bg-bg2/80 text-text border-border",
    danger: "bg-red-900/20 hover:bg-red-900/30 text-red-400 border-red-900/40",
    success: "bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-400 border-emerald-900/40",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-40 ${colors[variant]}`}
    >
      {loading ? "..." : label}
    </button>
  );
}

export function SkillsPageClient() {
  const [data, setData] = useState<SkillsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SkillInfo | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [validationOutput, setValidationOutput] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);

  // Load usage analytics (non-blocking, background)
  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/skills-analytics");
      const json: AnalyticsResponse = await res.json();
      setAnalytics(json);
    } catch { /* analytics are optional, ignore errors */ }
  }, []);

  // Get usage for a specific skill
  const getUsage = useCallback((slug: string): SkillUsage | null => {
    return analytics?.skills.find(s => s.slug === slug) ?? null;
  }, [analytics]);

  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const url = forceRefresh ? "/api/skills?refresh=1" : "/api/skills";
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch {
      setData({ skills: [], stats: { total: 0, eligible: 0, disabled: 0, workspace: 0, bundled: 0, missing: 0 }, error: "Failed to fetch" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadAnalytics(); }, [load, loadAnalytics]);

  const doAction = useCallback(async (action: string, slug: string) => {
    setActionLoading(true);
    setActionResult(null);
    setValidationOutput(null);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, slug }),
      });
      const json = await res.json();
      if (json.ok) {
        if (action === "validate") {
          setValidationOutput(json.result);
        } else {
          setActionResult(`${action}: OK`);
          // Refresh data after enable/disable (force refresh to bypass cache)
          await load(true);
          // Update selected skill if it was modified
          if (selected?.name === slug) {
            const updated = data?.skills.find(s => s.name === slug);
            if (updated) setSelected(updated);
          }
        }
      } else {
        setActionResult(`Error: ${json.error}`);
      }
    } catch (e) {
      setActionResult(`Error: ${String(e)}`);
    } finally {
      setActionLoading(false);
    }
  }, [load, selected, data]);

  const skills = data?.skills ?? [];
  const stats = data?.stats;

  const filtered = skills.filter((s) => {
    const matchSearch = search
      ? s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        (s.owner ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.type ?? "").toLowerCase().includes(search.toLowerCase())
      : true;

    const matchFilter =
      filter === "all"
        ? true
        : filter === "eligible"
        ? s.eligible
        : filter === "workspace"
        ? s.source === "openclaw-workspace"
        : filter === "disabled"
        ? s.disabled
        : filter === "missing"
        ? !s.eligible &&
          !s.disabled &&
          (s.missing.bins.length > 0 ||
            s.missing.env.length > 0 ||
            s.missing.config.length > 0)
        : true;

    return matchSearch && matchFilter;
  });

  return (
    <div className="flex h-screen bg-bg text-text">
      {/* Left panel — skill list */}
      <div className="flex flex-col w-full md:w-[420px] border-r border-border">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold">Skills</h1>
            {stats && (
              <p className="text-xs text-muted mt-0.5">
                {stats.eligible} ready · {stats.total} total
              </p>
            )}
          </div>
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-bg2 text-muted hover:text-text transition-colors disabled:opacity-40"
            title="Refresh (fuerza recarga)"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="px-4 py-3 border-b border-border grid grid-cols-3 gap-2">
            <StatCard label="Ready" value={stats.eligible} color="text-emerald-400" onClick={() => setFilter("eligible")} />
            <StatCard label="Workspace" value={stats.workspace} color="text-cyan-400" onClick={() => setFilter("workspace")} />
            <StatCard label="Disabled" value={stats.disabled} color="text-gray-400" onClick={() => setFilter("disabled")} />
          </div>
        )}
        {/* Analytics mini-row */}
        {analytics && analytics.totalEvents > 0 && (
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <p className="text-xs text-muted">
              📊 {analytics.totalEvents} eventos · {analytics.uniqueSkills} skills usadas
            </p>
            <div className="flex gap-2">
              {analytics.skills.slice(0, 3).map(s => (
                <span key={s.slug} className="text-[10px] bg-violet-900/20 text-violet-400 px-1.5 py-0.5 rounded">
                  {s.slug} ×{s.total}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search + filter */}
        <div className="px-4 py-2.5 border-b border-border space-y-2">
          <input
            type="text"
            placeholder="Buscar skill, owner, tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg2 border border-border rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent-cyan"
          />
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "eligible", "workspace", "disabled", "missing"] as FilterType[]).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                    filter === f
                      ? "bg-accent-cyan/20 text-accent-cyan"
                      : "bg-bg2 text-muted hover:text-text"
                  }`}
                >
                  {f}
                </button>
              )
            )}
          </div>
        </div>

        {/* Skill list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted text-sm gap-2">
              <RefreshIcon className="w-5 h-5 animate-spin" />
              <span>Cargando skills...</span>
              <span className="text-xs text-muted/60">(primera carga puede tomar ~10s)</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted text-sm">
              No hay skills para mostrar
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((skill) => (
                <button
                  key={skill.name}
                  onClick={() => { setSelected(skill); setActionResult(null); setValidationOutput(null); }}
                  className={`w-full text-left px-4 py-3 hover:bg-bg2/60 transition-colors ${
                    selected?.name === skill.name ? "bg-bg2" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">
                        {skill.emoji ?? "🔧"}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {skill.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <SkillSourceBadge source={skill.source} />
                      <SkillStatus skill={skill} />
                    </div>
                  </div>
                  <p className="text-xs text-muted mt-1 line-clamp-2 pl-7">
                    {skill.description}
                  </p>
                  <div className="pl-7 mt-1 flex gap-1.5 flex-wrap">
                    <SkillTypeBadge type={skill.type} />
                    {skill.owner && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-bg2 text-muted">
                        {skill.owner}
                      </span>
                    )}
                    {(() => {
                      const u = getUsage(skill.name);
                      return u && u.total > 0 ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-violet-900/30 text-violet-400">
                          {u.total} uso{u.total !== 1 ? "s" : ""}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  {!skill.eligible && !skill.disabled && (
                    <div className="pl-7">
                      <MissingBadges missing={skill.missing} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — skill detail */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Detail header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selected.emoji ?? "🔧"}</span>
                  <div>
                    <h2 className="text-base font-semibold">{selected.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <SkillStatus skill={selected} />
                      <SkillSourceBadge source={selected.source} />
                      <SkillTypeBadge type={selected.type} />
                      {selected.version && (
                        <span className="text-[10px] text-muted">
                          v{selected.version}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex gap-2">
                  {selected.source === "openclaw-workspace" && (
                    <ActionButton
                      label="Validar"
                      onClick={() => doAction("validate", selected.name)}
                      loading={actionLoading}
                    />
                  )}
                  {selected.disabled ? (
                    <ActionButton
                      label="Habilitar"
                      onClick={() => doAction("enable", selected.name)}
                      loading={actionLoading}
                      variant="success"
                    />
                  ) : (
                    <ActionButton
                      label="Deshabilitar"
                      onClick={() => doAction("disable", selected.name)}
                      loading={actionLoading}
                      variant="danger"
                    />
                  )}
                  <ActionButton
                    label="Refresh"
                    onClick={() => load(true)}
                    loading={loading}
                  />
                </div>
              </div>
            </div>

            {/* Detail body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Action result banner */}
              {actionResult && (
                <div className={`px-4 py-2 rounded-lg text-sm ${
                  actionResult.startsWith("Error")
                    ? "bg-red-900/20 text-red-400 border border-red-900/40"
                    : "bg-emerald-900/20 text-emerald-400 border border-emerald-900/40"
                }`}>
                  {actionResult}
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  Descripción
                </h3>
                <p className="text-sm text-text leading-relaxed">
                  {selected.description}
                </p>
              </div>

              {/* Trigger */}
              {selected.trigger && (
                <div>
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    Trigger / Cuándo usar
                  </h3>
                  <p className="text-sm text-text leading-relaxed">
                    {selected.trigger}
                  </p>
                </div>
              )}

              {/* Requirements */}
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  Requisitos
                </h3>
                {selected.eligible ? (
                  <p className="text-sm text-emerald-400">
                    ✓ Todos los requisitos resueltos
                  </p>
                ) : selected.disabled ? (
                  <p className="text-sm text-gray-400">
                    ⏸ Skill deshabilitada
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selected.missing.bins.length > 0 && (
                      <div>
                        <span className="text-xs text-muted">Binarios faltantes:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selected.missing.bins.map((b) => (
                            <code key={b} className="text-xs bg-red-900/20 text-red-400 px-2 py-0.5 rounded">
                              {b}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.missing.env.length > 0 && (
                      <div>
                        <span className="text-xs text-muted">Env vars faltantes:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selected.missing.env.map((e) => (
                            <code key={e} className="text-xs bg-yellow-900/20 text-yellow-400 px-2 py-0.5 rounded">
                              {e}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.missing.config.length > 0 && (
                      <div>
                        <span className="text-xs text-muted">Config faltante:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selected.missing.config.map((c) => (
                            <code key={c} className="text-xs bg-orange-900/20 text-orange-400 px-2 py-0.5 rounded">
                              {c}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.missing.os.length > 0 && (
                      <div>
                        <span className="text-xs text-muted">OS incompatible:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selected.missing.os.map((o) => (
                            <code key={o} className="text-xs bg-purple-900/20 text-purple-400 px-2 py-0.5 rounded">
                              {o}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  Metadata
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-bg2 rounded-lg px-3 py-2.5">
                    <div className="text-[10px] text-muted uppercase tracking-wide">Fuente</div>
                    <div className="text-sm mt-0.5">{selected.source === "openclaw-workspace" ? "workspace" : selected.source}</div>
                  </div>
                  <div className="bg-bg2 rounded-lg px-3 py-2.5">
                    <div className="text-[10px] text-muted uppercase tracking-wide">Owner</div>
                    <div className="text-sm mt-0.5">{selected.owner ?? "—"}</div>
                  </div>
                  <div className="bg-bg2 rounded-lg px-3 py-2.5">
                    <div className="text-[10px] text-muted uppercase tracking-wide">Tipo</div>
                    <div className="text-sm mt-0.5">{selected.type ?? "—"}</div>
                  </div>
                  <div className="bg-bg2 rounded-lg px-3 py-2.5">
                    <div className="text-[10px] text-muted uppercase tracking-wide">Versión</div>
                    <div className="text-sm mt-0.5">v{selected.version ?? "—"}</div>
                  </div>
                  <div className="bg-bg2 rounded-lg px-3 py-2.5">
                    <div className="text-[10px] text-muted uppercase tracking-wide">Estado</div>
                    <div className="text-sm mt-0.5">{selected.state ?? (selected.disabled ? "disabled" : selected.eligible ? "active" : "incomplete")}</div>
                  </div>
                  {selected.skillMdSize && (
                    <div className="bg-bg2 rounded-lg px-3 py-2.5">
                      <div className="text-[10px] text-muted uppercase tracking-wide">SKILL.md</div>
                      <div className="text-sm mt-0.5">{(selected.skillMdSize / 1024).toFixed(1)} KB</div>
                    </div>
                  )}
                  {selected.source === "openclaw-workspace" && (
                    <>
                      <div className="bg-bg2 rounded-lg px-3 py-2.5">
                        <div className="text-[10px] text-muted uppercase tracking-wide">References</div>
                        <div className="text-sm mt-0.5">
                          {selected.hasReferences ? "✓ sí" : "—"}
                        </div>
                      </div>
                      <div className="bg-bg2 rounded-lg px-3 py-2.5">
                        <div className="text-[10px] text-muted uppercase tracking-wide">Scripts</div>
                        <div className="text-sm mt-0.5">
                          {selected.hasScripts ? "✓ sí" : "—"}
                        </div>
                      </div>
                      <div className="bg-bg2 rounded-lg px-3 py-2.5">
                        <div className="text-[10px] text-muted uppercase tracking-wide">Assets</div>
                        <div className="text-sm mt-0.5">
                          {selected.hasAssets ? "✓ sí" : "—"}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Validation output */}
              {validationOutput && (
                <div>
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    Resultado de validación
                  </h3>
                  <pre className="text-xs bg-bg2 border border-border rounded-lg px-4 py-3 overflow-x-auto whitespace-pre-wrap font-mono text-text max-h-64 overflow-y-auto">
                    {validationOutput}
                  </pre>
                </div>
              )}

              {/* Homepage link */}
              {selected.homepage && (
                <div>
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    Recursos
                  </h3>
                  <a
                    href={selected.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent-cyan hover:underline"
                  >
                    {selected.homepage}
                  </a>
                </div>
              )}

              {/* Workspace path */}
              {selected.source === "openclaw-workspace" && (
                <div>
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    Ubicación
                  </h3>
                  <code className="text-xs text-muted bg-bg2 px-2 py-1 rounded block">
                    ~/.openclaw/workspace/skills/{selected.name}/
                  </code>
                </div>
              )}

              {/* Usage Analytics */}
              {(() => {
                const usage = getUsage(selected.name);
                if (!usage) {
                  return (
                    <div className="bg-bg2 border border-border rounded-lg px-4 py-3">
                      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
                        Usage Analytics
                      </h3>
                      <p className="text-xs text-muted">
                        Sin datos de uso registrados. Los agentes registran usos via{" "}
                        <code className="bg-bg text-muted/80 px-1 rounded">skill-use.sh {selected.name}</code>
                      </p>
                    </div>
                  );
                }
                return (
                  <div>
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                      Usage Analytics
                    </h3>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-bg2 rounded-lg px-3 py-2.5 text-center">
                        <div className="text-lg font-bold text-violet-400">{usage.total}</div>
                        <div className="text-[10px] text-muted mt-0.5">Total</div>
                      </div>
                      <div className="bg-bg2 rounded-lg px-3 py-2.5 text-center">
                        <div className="text-lg font-bold text-emerald-400">{usage.ok}</div>
                        <div className="text-[10px] text-muted mt-0.5">OK</div>
                      </div>
                      <div className="bg-bg2 rounded-lg px-3 py-2.5 text-center">
                        <div className="text-lg font-bold text-red-400">{usage.fail}</div>
                        <div className="text-[10px] text-muted mt-0.5">Fail</div>
                      </div>
                    </div>
                    {usage.agents.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs text-muted">Agentes: </span>
                        {usage.agents.map(a => (
                          <span key={a} className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-bg2 text-muted mr-1">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                    {usage.lastUsed && (
                      <p className="text-xs text-muted mb-2">
                        Último uso: {new Date(usage.lastUsed).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
                      </p>
                    )}
                    {usage.recentEvents.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted font-medium">Eventos recientes:</p>
                        {usage.recentEvents.slice(0, 5).map((e, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={e.result === "ok" ? "text-emerald-400" : "text-red-400"}>
                              {e.result === "ok" ? "✓" : "✗"}
                            </span>
                            <span className="text-muted/70">
                              {new Date(e.ts).toLocaleTimeString("es-CO", { timeZone: "America/Bogota" })}
                            </span>
                            <span className="text-muted">agent={e.agent}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted text-sm gap-3">
            <div className="text-4xl">🧩</div>
            <p>Selecciona una skill para ver su detalle</p>
            <p className="text-xs">
              {skills.length} skills · {skills.filter(s => s.eligible).length} ready ·{" "}
              {skills.filter(s => s.source === "openclaw-workspace").length} workspace
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
