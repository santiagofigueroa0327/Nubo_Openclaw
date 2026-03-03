"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { TaskTable } from "@/components/task-table";
import { RefreshIcon } from "@/components/ui/icons";
import type { TaskRow, TaskStatus } from "@/lib/types";

const STATUS_TABS: { label: string; value: TaskStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Queued", value: "queued" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Blocked", value: "blocked" },
  { label: "Failed", value: "failed" },
];

export function TasksPageClient({
  initialTasks,
  initialTotal,
}: {
  initialTasks: TaskRow[];
  initialTotal: number;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [total, setTotal] = useState(initialTotal);
  const [activeTab, setActiveTab] = useState<TaskStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(false);

  const fetchTasks = useCallback(
    async (status?: TaskStatus | "all") => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (status && status !== "all") params.set("status", status);
        params.set("limit", "50");
        const res = await fetch(`/api/tasks?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTasks(data.tasks);
        setTotal(data.total);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleTabChange = (tab: TaskStatus | "all") => {
    setActiveTab(tab);
    fetchTasks(tab);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text">Tasks</h1>
          <p className="text-sm text-muted mt-0.5">{total} total tasks</p>
        </div>
        <button
          onClick={() => fetchTasks(activeTab)}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-bg2/60 border border-border rounded-lg text-muted hover:text-text hover:border-accent-cyan/30 transition-colors disabled:opacity-50"
        >
          <RefreshIcon
            className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="flex gap-1 mb-4 p-1 bg-bg2/30 rounded-lg w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className="relative px-3 py-1.5 text-xs rounded-md transition-colors"
          >
            {activeTab === tab.value && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-bg2 rounded-md border border-border"
                transition={{ duration: 0.2 }}
              />
            )}
            <span
              className={`relative z-10 ${
                activeTab === tab.value ? "text-text" : "text-muted"
              }`}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <TaskTable tasks={tasks} />
    </div>
  );
}
