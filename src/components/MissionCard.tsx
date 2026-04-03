"use client";

import { useEffect, useRef, memo } from "react";
import gsap from "gsap";
import Link from "next/link";
import {
  MISSION_STATES,
  agentosToMissionStatus,
  type MissionStatus,
} from "@/lib/mission-states";

interface MissionData {
  id: string;
  title: string;
  status: string;
  primaryAgent: string;
  model: string;
  receivedAt: number;
  updatedAt: number;
  agentosStatus?: string | null;
  retryCount?: number | null;
}

interface MissionCardProps {
  mission: MissionData;
  index?: number;
}

const AGENT_EMOJI: Record<string, string> = {
  main: "🤖",
  nubo: "🤖",
  atlas: "🔎",
  zenith: "⚡",
  chronos: "📅",
  spark: "✨",
  flux: "🔀",
  hermes: "📋",
  sentinel: "🛡️",
  aegis: "🏛️",
};

export const MissionCard = memo(function MissionCard({
  mission,
  index = 0,
}: MissionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const prevStatusRef = useRef<MissionStatus | null>(null);

  // Derive canonical status from AgentOS status or MC status
  const canonicalStatus: MissionStatus = mission.agentosStatus
    ? agentosToMissionStatus(mission.agentosStatus)
    : agentosToMissionStatus(mission.status);

  const stateConfig = MISSION_STATES[canonicalStatus];

  // Entry animation with stagger
  useEffect(() => {
    if (cardRef.current) {
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 16,
        duration: 0.35,
        delay: index * 0.06,
        ease: "power2.out",
      });
    }
  }, [index]);

  // Status change animation
  useEffect(() => {
    if (prevStatusRef.current && prevStatusRef.current !== canonicalStatus) {
      if (cardRef.current) {
        const tl = gsap.timeline();
        tl.to(cardRef.current, {
          boxShadow: `0 0 0 2px ${stateConfig.color}`,
          duration: 0.2,
          ease: "power1.out",
        }).to(cardRef.current, {
          boxShadow: "0 0 0 1px transparent",
          duration: 0.8,
          ease: "power1.inOut",
        });
      }
    }
    prevStatusRef.current = canonicalStatus;
  }, [canonicalStatus, stateConfig.color]);

  // Dot pulse for active states
  useEffect(() => {
    if (!dotRef.current) return;

    let tween: gsap.core.Tween | null = null;
    if (stateConfig.pulse) {
      tween = gsap.to(dotRef.current, {
        scale: 1.6,
        opacity: 0.4,
        duration: 0.8,
        ease: "power1.inOut",
        yoyo: true,
        repeat: -1,
      });
    } else {
      gsap.set(dotRef.current, { scale: 1, opacity: 1 });
    }

    return () => { tween?.kill(); };
  }, [stateConfig.pulse, canonicalStatus]);

  const elapsed = Math.round(
    (Date.now() - mission.receivedAt) / 1000
  );
  const elapsedStr =
    elapsed > 3600
      ? `${Math.round(elapsed / 3600)}h`
      : elapsed > 120
      ? `${Math.round(elapsed / 60)}m`
      : `${elapsed}s`;

  const agent = mission.primaryAgent || "—";
  const emoji = AGENT_EMOJI[agent.toLowerCase()] || "🤖";
  const taskId = mission.id.startsWith("agentos-")
    ? mission.id
    : `agentos-${mission.id}`;

  return (
    <Link href={`/tasks/${taskId}`}>
      <div
        ref={cardRef}
        className="group rounded-lg bg-surface/40 border border-border/60 p-3 hover:bg-surface/70 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div
            ref={dotRef}
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: stateConfig.color }}
          />
          <span
            className="text-[11px] font-medium"
            style={{ color: stateConfig.color }}
          >
            {stateConfig.icon} {stateConfig.label}
          </span>
          {(mission.retryCount ?? 0) > 0 && (
            <span className="text-[10px] text-amber-400 font-mono ml-auto">
              retry {mission.retryCount}
            </span>
          )}
          <span className="text-[10px] text-muted font-mono ml-auto">
            {elapsedStr}
          </span>
        </div>

        <p className="text-sm text-text leading-snug line-clamp-2 mb-2">
          {mission.title || mission.id}
        </p>

        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span>
            {emoji} {agent}
          </span>
          {mission.model && (
            <>
              <span className="text-border">·</span>
              <span className="font-mono">{mission.model.split("/").pop()}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
});
