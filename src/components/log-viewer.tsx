"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatTimestamp } from "@/lib/utils";
import { RefreshIcon } from "@/components/ui/icons";
import type { LogLevel } from "@/lib/types";

interface GlobalLog {
  id: string;
  taskId: string;
  ts: number;
  level: string;
  message: string;
  metaJson: string | null;
}

const LEVEL_STYLES: Record<string, string> = {
  debug: "text-muted",
  info: "text-accent-cyan",
  warn: "text-amber-400",
  error: "text-red-400",
};

const LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

export function LogViewer({ initialLogs }: { initialLogs: GlobalLog[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (levelFilter !== "all" && log.level !== levelFilter) return false;
      if (search && !log.message.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [logs, levelFilter, search]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const { tasks } = await res.json();
      const allLogs: GlobalLog[] = [];
      for (const task of tasks.slice(0, 20)) {
        const logRes = await fetch(`/api/tasks/${task.id}/logs?limit=50`);
        const data = await logRes.json();
        allLogs.push(...data.logs);
      }
      allLogs.sort((a, b) => b.ts - a.ts);
      setLogs(allLogs.slice(0, 200));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-0.5 bg-bg2/30 rounded-md">
            <button
              onClick={() => setLevelFilter("all")}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
                levelFilter === "all" ? "bg-bg2 text-text" : "text-muted"
              }`}
            >
              All
            </button>
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={`px-2 py-1 text-[10px] rounded capitalize transition-colors ${
                  levelFilter === level
                    ? `bg-bg2 ${LEVEL_STYLES[level]}`
                    : "text-muted"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Filter by content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 px-2 py-1 text-xs bg-bg2/30 border border-border rounded text-text placeholder:text-muted/50 focus:outline-none focus:border-accent-cyan/30"
          />
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-bg2/60 border border-border rounded-lg text-muted hover:text-text transition-colors disabled:opacity-50"
        >
          <RefreshIcon className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-border bg-bg/50 max-h-[calc(100vh-240px)] overflow-y-auto font-mono text-xs">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-muted">No logs match filters</p>
        ) : (
          filtered.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.01, 0.5) }}
              className="flex gap-3 px-3 py-1.5 border-b border-border/20 hover:bg-bg2/20"
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
              <Link
                href={`/tasks/${log.taskId}`}
                className="shrink-0 w-20 text-accent-cyan/60 hover:text-accent-cyan truncate"
              >
                {log.taskId.slice(0, 8)}
              </Link>
              <span className="text-text">{log.message}</span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
