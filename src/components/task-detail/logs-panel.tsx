"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { formatTimestamp } from "@/lib/utils";
import { RefreshIcon } from "@/components/ui/icons";
import type { TaskLogRow, LogLevel } from "@/lib/types";

const LEVEL_STYLES: Record<string, string> = {
  debug: "text-muted",
  info: "text-accent-cyan",
  warn: "text-amber-400",
  error: "text-red-400",
};

const LEVEL_BG: Record<string, string> = {
  debug: "bg-muted/10",
  info: "bg-accent-cyan/10",
  warn: "bg-amber-500/10",
  error: "bg-red-500/10",
};

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

export function LogsPanel({ logs: initialLogs, taskId }: { logs: TaskLogRow[]; taskId: string }) {
  const [logs, setLogs] = useState<TaskLogRow[]>(initialLogs);
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef(new Set(initialLogs.map((l) => l.id)));

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/logs?limit=200`);
      if (res.ok) {
        const data = await res.json();
        const allLogs: TaskLogRow[] = data.logs ?? [];
        setLogs(allLogs);
        seenIds.current = new Set(allLogs.map((l) => l.id));
      }
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  // SSE live streaming
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      es = new EventSource(`/api/tasks/${taskId}/logs/stream`);

      es.onopen = () => {
        if (!unmounted) setIsLive(true);
      };

      es.onmessage = (event) => {
        if (unmounted) return;
        try {
          const { logs: newLogs } = JSON.parse(event.data) as { logs: TaskLogRow[]; ts: number };
          const fresh = newLogs.filter((l) => !seenIds.current.has(l.id));
          if (fresh.length > 0) {
            fresh.forEach((l) => seenIds.current.add(l.id));
            setLogs((prev) => [...prev, ...fresh]);
            requestAnimationFrame(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            });
          }
        } catch { /* ignore parse errors */ }
      };

      es.onerror = () => {
        if (unmounted) return;
        setIsLive(false);
        es?.close();
        es = null;
        reconnectTimeout = setTimeout(connect, 5_000);
      };
    };

    connect();

    return () => {
      unmounted = true;
      setIsLive(false);
      es?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [taskId]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (levelFilter !== "all" && log.level !== levelFilter) return false;
      if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, levelFilter, search]);

  return (
    <div>
      {/* Toolbar: two rows — filters+status on top, search below */}
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1 p-0.5 bg-bg2/30 rounded-md flex-shrink-0">
            <button
              onClick={() => setLevelFilter("all")}
              className={`px-2 py-1 text-[10px] rounded ${
                levelFilter === "all" ? "bg-bg2 text-text" : "text-muted"
              }`}
            >
              All
            </button>
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={`px-2 py-1 text-[10px] rounded capitalize ${
                  levelFilter === level
                    ? `${LEVEL_BG[level]} ${LEVEL_STYLES[level]}`
                    : "text-muted"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          {/* Live status + refresh — always visible, pushed to right */}
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <span className={`flex items-center gap-1 text-[10px] ${isLive ? "text-green-400" : "text-muted"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-muted"}`} />
              {isLive ? "En vivo" : "Desconectado"}
            </span>
            <button
              onClick={refresh}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-bg2/60 border border-border rounded-lg text-muted hover:text-text transition-colors disabled:opacity-50"
            >
              <RefreshIcon className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Filter logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1 text-xs bg-bg2/30 border border-border rounded text-text placeholder:text-muted/50 focus:outline-none focus:border-accent-cyan/30"
        />
      </div>

      <div ref={scrollRef} className="rounded-lg border border-border bg-bg/50 h-[500px] overflow-y-scroll font-mono text-xs">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-muted text-xs">No hay logs todavía</p>
        ) : (
          filtered.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
              className="flex gap-3 px-3 py-1.5 border-b border-border/30 hover:bg-bg2/20"
            >
              <span className="text-muted shrink-0 w-32">
                {formatTimestamp(log.ts)}
              </span>
              <span
                className={`shrink-0 w-12 uppercase font-semibold ${
                  LEVEL_STYLES[log.level] || "text-muted"
                }`}
              >
                {log.level}
              </span>
              <span className="text-text">{log.message}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
