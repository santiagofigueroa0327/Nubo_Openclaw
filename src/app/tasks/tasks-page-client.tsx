"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { TaskTable } from "@/components/task-table";
import { TaskBoard } from "@/components/task-board";
import { RefreshIcon, ListIcon, KanbanIcon } from "@/components/ui/icons";
import type { TaskRow, TaskStatus } from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────────────────────

type ViewMode = "list" | "board";
const LS_KEY = "mc-tasks-view-mode";

const ALL_STATUSES: TaskStatus[] = [
  "queued",
  "running",
  "blocked",
  "completed",
  "failed",
  "archived",
];

interface Filters {
  statuses: TaskStatus[];
  agent: string;
  model: string;
}

const DEFAULT_FILTERS: Filters = { statuses: [], agent: "", model: "" };

function activeFilterCount(f: Filters) {
  return (
    (f.statuses.length > 0 ? 1 : 0) + (f.agent ? 1 : 0) + (f.model ? 1 : 0)
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function TasksPageClient({
  initialTasks,
  initialTotal,
}: {
  initialTasks: TaskRow[];
  initialTotal: number;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);

  // Board by default; hydration-safe: always start 'board', apply localStorage in effect
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as ViewMode | null;
      if (saved === "list" || saved === "board") setViewMode(saved);
    } catch {
      // ignore
    }
  }, []);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const filtersRef = useRef<Filters>(DEFAULT_FILTERS);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // ── Side effects ─────────────────────────────────────────────────────────────

  // Fetch agent list once on mount
  useEffect(() => {
    fetch("/api/agents", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.agents))
          setAvailableAgents(
            d.agents.map((a: { agentId: string }) => a.agentId)
          );
      })
      .catch(() => {});
  }, []);

  // Derive unique, non-empty model names from current task list
  useEffect(() => {
    const models = Array.from(
      new Set(tasks.map((t) => t.model).filter(Boolean))
    );
    setAvailableModels(models);
  }, [tasks]);

  // Close the panel when clicking outside
  useEffect(() => {
    if (!filtersOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filtersOpen]);

  // ── Data fetching ─────────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async (f?: Filters) => {
    setIsLoading(true);
    try {
      const active = f ?? filtersRef.current;
      const wantsArchived = active.statuses.includes("archived");
      const nonArchivedStatuses = active.statuses.filter((s) => s !== "archived");

      let allRows: TaskRow[] = [];

      // "archived" requires a dedicated API call (archivedAt IS NOT NULL query)
      if (wantsArchived) {
        const p = new URLSearchParams({ status: "archived", limit: "200", _t: String(Date.now()) });
        if (active.agent) p.set("agent", active.agent);
        if (active.model) p.set("model", active.model);
        const res = await fetch(`/api/tasks?${p}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          allRows = [...allRows, ...(data.tasks as TaskRow[])];
        }
      }

      // Fetch active (non-archived) tasks when needed
      if (!wantsArchived || nonArchivedStatuses.length > 0) {
        const p = new URLSearchParams({ _t: String(Date.now()) });
        if (nonArchivedStatuses.length === 1) p.set("status", nonArchivedStatuses[0]);
        if (active.agent) p.set("agent", active.agent);
        if (active.model) p.set("model", active.model);
        p.set("limit", nonArchivedStatuses.length > 0 ? "200" : "50");
        const res = await fetch(`/api/tasks?${p}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const rows: TaskRow[] = data.tasks;
          // Client-side multi-status filter (e.g. running + blocked selected)
          const filtered = nonArchivedStatuses.length > 1
            ? rows.filter((t) => (nonArchivedStatuses as TaskStatus[]).includes(t.status))
            : rows;
          if (!wantsArchived) setTotal(nonArchivedStatuses.length > 1 ? filtered.length : data.total);
          allRows = [...allRows, ...filtered];
        }
      }

      if (wantsArchived) setTotal(allRows.length);
      allRows.sort((a, b) => b.receivedAt - a.receivedAt);
      setTasks(allRows);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // SSE: subscribe to realtime task updates, with fallback polling every 5s
  useEffect(() => {
    let es: EventSource | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let sseConnected = false;

    try {
      es = new EventSource("/api/tasks/stream");

      es.onopen = () => {
        sseConnected = true;
        // Clear fallback if SSE connects
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (Array.isArray(payload.tasks) && payload.tasks.length > 0) {
            // Merge updated tasks into current state
            setTasks((prev) => {
              const map = new Map(prev.map((t) => [t.id, t]));
              for (const updated of payload.tasks) {
                map.set(updated.id, updated);
              }
              // Re-sort by receivedAt desc and apply status filter
              const merged = Array.from(map.values()).sort(
                (a, b) => b.receivedAt - a.receivedAt
              );
              const active = filtersRef.current;
              return active.statuses.length > 0
                ? merged.filter((t) => active.statuses.includes(t.status))
                : merged;
            });
            setTotal((prev) => {
              // Approximate: if new tasks appeared, bump total
              const newIds = payload.tasks.filter(
                (t: TaskRow) => !tasks.find((x) => x.id === t.id)
              );
              return prev + newIds.length;
            });
          }
        } catch {
          // ignore malformed SSE data
        }
      };

      es.onerror = () => {
        sseConnected = false;
        // Start fallback polling when SSE disconnects
        if (!fallbackInterval) {
          fallbackInterval = setInterval(() => fetchTasks(), 5_000);
        }
      };
    } catch {
      // SSE not available, use polling
    }

    // Always start fallback polling; SSE onopen will clear it
    if (!sseConnected) {
      fallbackInterval = setInterval(() => fetchTasks(), 5_000);
    }

    return () => {
      if (es) { es.close(); }
      if (fallbackInterval) { clearInterval(fallbackInterval); }
    };
  }, [fetchTasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter helpers ────────────────────────────────────────────────────────────

  const applyFilters = (next: Filters) => {
    setFilters(next);
    filtersRef.current = next;
    fetchTasks(next);
  };

  const clearFilters = () => applyFilters(DEFAULT_FILTERS);

  const toggleStatus = (s: TaskStatus) => {
    const cur = filtersRef.current.statuses;
    const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
    applyFilters({ ...filtersRef.current, statuses: next });
  };

  // ── View ─────────────────────────────────────────────────────────────────────

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(LS_KEY, mode);
    } catch {
      // ignore
    }
  };

  const filterCount = activeFilterCount(filters);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text">Tasks</h1>
          {filters.statuses.includes("archived") && (
          <p className="text-sm text-muted mt-0.5">{total} total tasks</p>
        )}
        </div>

        {/* Controls: Filters · List/Board · Refresh */}
        <div className="flex items-center gap-2">
          {/* ── Filters button + dropdown ── */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors ${
                filterCount > 0 || filtersOpen
                  ? "bg-accent-cyan/10 border-accent-cyan/50 text-accent-cyan"
                  : "bg-bg2/60 border-border text-muted hover:text-text hover:border-accent-cyan/30"
              }`}
            >
              <span>⊞</span>
              <span>Filters</span>
              {filterCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-accent-cyan/20 text-accent-cyan rounded-full leading-none">
                  {filterCount}
                </span>
              )}
            </button>

            {filtersOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-bg2 border border-border rounded-xl shadow-xl p-4 space-y-4">
                {/* Status */}
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    Status
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleStatus(s)}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                          filters.statuses.includes(s)
                            ? "bg-accent-cyan/15 border-accent-cyan/50 text-accent-cyan"
                            : "bg-bg/50 border-border text-muted hover:text-text"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agent */}
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    Agent
                  </p>
                  <select
                    value={filters.agent}
                    onChange={(e) =>
                      applyFilters({ ...filters, agent: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-bg border border-border rounded-lg text-text focus:outline-none focus:border-accent-cyan/50"
                  >
                    <option value="">All agents</option>
                    {availableAgents.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    Model
                  </p>
                  <input
                    type="text"
                    value={filters.model}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, model: e.target.value }))
                    }
                    onBlur={() => applyFilters(filters)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applyFilters(filters);
                    }}
                    placeholder="e.g. claude-sonnet…"
                    list="mc-model-datalist"
                    className="w-full px-2.5 py-1.5 text-xs bg-bg border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-accent-cyan/50"
                  />
                  <datalist id="mc-model-datalist">
                    {availableModels.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                {/* Clear */}
                {filterCount > 0 && (
                  <div className="pt-1 border-t border-border">
                    <button
                      onClick={clearFilters}
                      className="w-full text-xs text-muted hover:text-text py-1 transition-colors"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Board / List toggle (Board is default/first) ── */}
          <div className="flex items-center gap-0.5 p-1 bg-bg2/60 border border-border rounded-lg">
            <button
              onClick={() => switchView("board")}
              title="Board view"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "board"
                  ? "bg-bg2 text-text shadow-sm border border-border"
                  : "text-muted hover:text-text"
              }`}
            >
              <KanbanIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => switchView("list")}
              title="List view"
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-bg2 text-text shadow-sm border border-border"
                  : "text-muted hover:text-text"
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Refresh ── */}
          <button
            onClick={() => fetchTasks()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-bg2/60 border border-border rounded-lg text-muted hover:text-text hover:border-accent-cyan/30 transition-colors disabled:opacity-50"
          >
            <RefreshIcon
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* View — no status tabs */}
      {viewMode === "list" ? (
        <TaskTable tasks={tasks} />
      ) : (
        <TaskBoard tasks={tasks} />
      )}
    </div>
  );
}
