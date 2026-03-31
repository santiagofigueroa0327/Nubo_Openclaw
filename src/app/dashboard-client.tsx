"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { CostWidget } from "@/components/CostWidget";
import { MissionCard } from "@/components/MissionCard";
import { SystemHealth } from "@/components/SystemHealth";
import type { Task } from "@/lib/types";

export function DashboardClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch { /* retry next */ }
    setLoading(false);
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10_000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // SSE for real-time updates
  useEffect(() => {
    const es = new EventSource("/api/tasks/stream");
    es.onmessage = (event) => {
      try {
        const updated: Task[] = JSON.parse(event.data);
        if (Array.isArray(updated) && updated.length > 0) {
          setTasks(updated);
        }
      } catch { /* ignore parse errors */ }
    };
    return () => es.close();
  }, []);

  // Entry animation
  useEffect(() => {
    if (!loading && headerRef.current && gridRef.current) {
      const tl = gsap.timeline();
      tl.from(headerRef.current, {
        opacity: 0,
        y: -12,
        duration: 0.4,
        ease: "power2.out",
      });
      tl.from(
        gridRef.current.children,
        {
          opacity: 0,
          y: 16,
          stagger: 0.08,
          duration: 0.35,
          ease: "power2.out",
        },
        "-=0.2"
      );
    }
  }, [loading]);

  // Separate tasks by status
  const activeTasks = tasks.filter(
    (t) => t.status === "running" || t.status === "queued" || t.status === "blocked"
  );
  const recentDone = tasks
    .filter((t) => t.status === "completed" || t.status === "failed")
    .slice(0, 8);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div ref={headerRef} className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text">Dashboard</h1>
          <p className="text-xs text-muted mt-0.5">
            OpenClaw · Mission Control
          </p>
        </div>
        <div className="text-[10px] text-muted font-mono">
          {new Date().toLocaleDateString("es-CO", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Main grid: 3 columns on desktop */}
      <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left column — System health + Cost */}
        <div className="md:col-span-3 space-y-4">
          <CostWidget />
          <SystemHealth />
        </div>

        {/* Center — Active missions */}
        <div className="md:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-text">
              Misiones activas
              {activeTasks.length > 0 && (
                <span className="ml-2 text-xs text-accent-cyan font-mono">
                  {activeTasks.length}
                </span>
              )}
            </h2>
          </div>

          {activeTasks.length === 0 ? (
            <div className="rounded-xl bg-surface/30 border border-border/40 p-8 text-center">
              <div className="text-2xl mb-2">🔕</div>
              <p className="text-sm text-muted">
                Sin misiones activas
              </p>
              <p className="text-[11px] text-muted/60 mt-1">
                Las misiones nuevas aparecerán aquí en tiempo real
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTasks.map((task, i) => (
                <MissionCard
                  key={task.id}
                  mission={task}
                  index={i}
                />
              ))}
            </div>
          )}

          {/* Recent completed */}
          {recentDone.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-text mt-6">
                Recientes
                <span className="ml-2 text-xs text-muted font-mono">
                  {recentDone.length}
                </span>
              </h2>
              <div className="space-y-2">
                {recentDone.map((task, i) => (
                  <MissionCard
                    key={task.id}
                    mission={task}
                    index={i}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right column — Quick actions */}
        <div className="md:col-span-3 space-y-4">
          <div className="rounded-xl bg-surface/50 p-4 border border-border space-y-3">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">
              Accesos rápidos
            </span>
            <nav className="space-y-1">
              {[
                { href: "/tasks", label: "Todas las tareas", icon: "📋" },
                { href: "/agents", label: "Agentes", icon: "🤖" },
                { href: "/cron", label: "Cron Jobs", icon: "⏰" },
                { href: "/metrics", label: "Métricas", icon: "📊" },
                { href: "/skills", label: "Skills", icon: "🧩" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-muted hover:text-text hover:bg-bg2/40 transition-colors"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
          </div>

          {/* Agents overview */}
          <div className="rounded-xl bg-surface/50 p-4 border border-border space-y-2">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">
              Agentes
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "nubo", emoji: "🤖", label: "Nubo" },
                { id: "zenith", emoji: "⚡", label: "Zenith" },
                { id: "atlas", emoji: "🔎", label: "Atlas" },
                { id: "chronos", emoji: "📅", label: "Chronos" },
                { id: "flux", emoji: "🔀", label: "Flux" },
                { id: "hermes", emoji: "📋", label: "Hermes" },
              ].map((agent) => (
                <a
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-bg2/40 transition-colors"
                >
                  <span className="text-base">{agent.emoji}</span>
                  <span className="text-[10px] text-muted">
                    {agent.label}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
