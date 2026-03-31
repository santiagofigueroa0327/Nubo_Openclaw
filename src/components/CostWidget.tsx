"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";

interface CostData {
  today: {
    cost: number;
    budget: number;
    percentUsed: number;
    status: "ok" | "warning" | "over";
    byAgent: Record<string, number>;
    jobs: number;
  };
  month: {
    cost: number;
    projected: number;
    budget: number;
    percentUsed: number;
    status: "ok" | "warning";
  };
  dailyTrend: { date: string; cost: number }[];
}

const STATUS_COLORS = {
  ok: "var(--color-accent-cyan)",
  warning: "#f5a623",
  over: "#ff4757",
} as const;

export function CostWidget() {
  const [data, setData] = useState<CostData | null>(null);
  const barDayRef = useRef<HTMLDivElement>(null);
  const barMonthRef = useRef<HTMLDivElement>(null);
  const costDayRef = useRef<HTMLSpanElement>(null);
  const statusDotRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCost = useRef(0);
  const pulseRef = useRef<gsap.core.Tween | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/cost-analytics");
      if (!res.ok) return;
      const newData: CostData = await res.json();
      setData(newData);

      // Animate daily bar fill
      if (barDayRef.current) {
        gsap.to(barDayRef.current, {
          width: `${Math.min(newData.today.percentUsed, 100)}%`,
          duration: 0.8,
          ease: "power2.out",
        });
      }

      // Animate monthly bar fill
      if (barMonthRef.current) {
        gsap.to(barMonthRef.current, {
          width: `${Math.min(newData.month.percentUsed, 100)}%`,
          duration: 1.0,
          ease: "power2.out",
        });
      }

      // Animate cost counter
      if (costDayRef.current) {
        const from = prevCost.current;
        const to = newData.today.cost;
        if (from !== to) {
          gsap.to({ val: from }, {
            val: to,
            duration: 0.6,
            ease: "power1.out",
            onUpdate() {
              if (costDayRef.current) {
                costDayRef.current.textContent = `$${this.targets()[0].val.toFixed(2)}`;
              }
            },
          });
        }
        prevCost.current = to;
      }

      // Pulse status dot on warning/over
      if (statusDotRef.current) {
        if (newData.today.status !== "ok") {
          if (!pulseRef.current) {
            pulseRef.current = gsap.to(statusDotRef.current, {
              scale: 1.5,
              opacity: 0.5,
              duration: 0.6,
              ease: "power1.inOut",
              yoyo: true,
              repeat: -1,
            });
          }
        } else {
          if (pulseRef.current) {
            pulseRef.current.kill();
            pulseRef.current = null;
            gsap.to(statusDotRef.current, { scale: 1, opacity: 1, duration: 0.2 });
          }
        }
      }
    } catch { /* silently retry next interval */ }
  }, []);

  // Entry animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.from(containerRef.current, {
        opacity: 0,
        y: 8,
        duration: 0.4,
        ease: "power2.out",
      });
    }
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => {
      clearInterval(interval);
      pulseRef.current?.kill();
    };
  }, [fetchData]);

  if (!data) {
    return (
      <div ref={containerRef} className="rounded-xl bg-surface/50 p-4 border border-border">
        <div className="h-24 animate-pulse bg-bg2/40 rounded-lg" />
      </div>
    );
  }

  const statusColor = STATUS_COLORS[data.today.status];

  return (
    <div ref={containerRef} className="rounded-xl bg-surface/50 p-4 border border-border space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">
          Costo del sistema
        </span>
        <div className="flex items-center gap-2">
          <div
            ref={statusDotRef}
            className="w-2 h-2 rounded-full"
            style={{ background: statusColor }}
          />
          <span className="text-[10px] text-muted font-mono">
            {data.today.jobs} jobs hoy
          </span>
        </div>
      </div>

      {/* Daily cost */}
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span
            ref={costDayRef}
            className="text-xl font-semibold font-mono"
            style={{ color: statusColor }}
          >
            ${data.today.cost.toFixed(2)}
          </span>
          <span className="text-xs text-muted font-mono">
            / ${data.today.budget.toFixed(2)}
          </span>
          <span className="text-[10px] text-muted ml-auto">
            {data.today.percentUsed}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-bg2/60 overflow-hidden">
          <div
            ref={barDayRef}
            className="h-full rounded-full transition-colors"
            style={{ width: "0%", background: statusColor }}
          />
        </div>
      </div>

      {/* Monthly projection */}
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted">Mes (proyectado)</span>
          <span className="text-sm font-mono text-text">
            ${data.month.projected.toFixed(0)}
          </span>
          <span className="text-xs text-muted font-mono">
            / ${data.month.budget.toFixed(0)}
          </span>
        </div>
        <div className="h-1 rounded-full bg-bg2/60 overflow-hidden">
          <div
            ref={barMonthRef}
            className="h-full rounded-full"
            style={{
              width: "0%",
              background: data.month.status === "warning" ? "#f5a623" : "var(--color-accent-cyan)",
            }}
          />
        </div>
      </div>

      {/* Agent breakdown */}
      {Object.keys(data.today.byAgent).length > 0 && (
        <div className="pt-2 border-t border-border/50 space-y-1">
          {Object.entries(data.today.byAgent)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([agent, cost]) => (
              <div key={agent} className="flex items-center justify-between text-[11px]">
                <span className="text-muted font-mono">{agent}</span>
                <span className="text-text font-mono">${cost.toFixed(3)}</span>
              </div>
            ))}
        </div>
      )}

      {/* Mini sparkline */}
      {data.dailyTrend.length > 1 && (
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-end gap-0.5 h-8">
            {data.dailyTrend.map((d) => {
              const maxCost = Math.max(...data.dailyTrend.map((t) => t.cost), 1);
              const height = Math.max((d.cost / maxCost) * 100, 4);
              return (
                <div
                  key={d.date}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${height}%`,
                    background:
                      d.cost > data.today.budget
                        ? "#ff4757"
                        : d.cost > data.today.budget * 0.7
                        ? "#f5a623"
                        : "var(--color-accent-cyan)",
                    opacity: d.date === data.dailyTrend.at(-1)?.date ? 1 : 0.5,
                  }}
                  title={`${d.date}: $${d.cost}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-muted font-mono">
              {data.dailyTrend[0]?.date.slice(5)}
            </span>
            <span className="text-[9px] text-muted font-mono">
              {data.dailyTrend.at(-1)?.date.slice(5)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
