"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";

interface RealtimeMetrics {
  missions: Record<string, number>;
  jobs: Record<string, number>;
}

interface CronInfo {
  id: string;
  name: string;
  lastStatus: string;
  nextRun: string;
}

export function SystemHealth() {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [crons, setCrons] = useState<CronInfo[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/realtime-metrics");
      if (res.ok) setMetrics(await res.json());
    } catch { /* retry next */ }

    try {
      const res = await fetch("/api/cron");
      if (res.ok) {
        const data = await res.json();
        setCrons(Array.isArray(data) ? data.slice(0, 6) : []);
      }
    } catch { /* retry next */ }
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 8,
        duration: 0.4,
        delay: 0.15,
        ease: "power2.out",
      });
    }
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const missionTotal = metrics
    ? Object.values(metrics.missions).reduce((s, n) => s + n, 0)
    : 0;
  const jobsActive = metrics
    ? (metrics.jobs["pending"] || 0) + (metrics.jobs["running"] || 0)
    : 0;
  const gatewayUp = metrics !== null;

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Gateway status */}
      <div className="rounded-xl bg-surface/50 p-4 border border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted uppercase tracking-wider">
            Sistema
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: gatewayUp ? "#2ed573" : "#ff4757",
              }}
            />
            <span className="text-[10px] text-muted">
              {gatewayUp ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-lg font-semibold font-mono text-text">
              {missionTotal}
            </div>
            <div className="text-[10px] text-muted">misiones</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold font-mono text-accent-cyan">
              {jobsActive}
            </div>
            <div className="text-[10px] text-muted">activos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold font-mono text-text">
              {metrics?.jobs["completed"] || 0}
            </div>
            <div className="text-[10px] text-muted">completados</div>
          </div>
        </div>
      </div>

      {/* Cron jobs status */}
      {crons.length > 0 && (
        <div className="rounded-xl bg-surface/50 p-4 border border-border space-y-2">
          <span className="text-xs font-medium text-muted uppercase tracking-wider">
            Cron Jobs
          </span>
          <div className="space-y-1.5">
            {crons.map((cron) => (
              <div
                key={cron.id}
                className="flex items-center gap-2 text-[11px]"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background:
                      cron.lastStatus === "ok"
                        ? "#2ed573"
                        : cron.lastStatus === "running"
                        ? "var(--color-accent-cyan)"
                        : "#ff4757",
                  }}
                />
                <span className="text-text truncate flex-1">
                  {cron.name}
                </span>
                <span className="text-muted font-mono shrink-0">
                  {cron.lastStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
