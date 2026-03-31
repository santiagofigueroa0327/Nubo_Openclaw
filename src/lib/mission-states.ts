import type { TaskStatus } from "./types";

/**
 * Canonical mission statuses — superset of MC TaskStatus.
 * Maps to both Telegram notification format and MC visual states.
 */
export type MissionStatus =
  | "planning"
  | "dispatched"
  | "running"
  | "stale_retry"
  | "handoff"
  | "done"
  | "failed"
  | "cancelled";

export interface MissionStatusConfig {
  label: string;
  color: string;
  dotColor: string;
  pulse: boolean;
  icon: string;
  description: string;
  /** Map to MC TaskStatus for DB/UI compatibility */
  mcStatus: TaskStatus;
}

export const MISSION_STATES: Record<MissionStatus, MissionStatusConfig> = {
  planning: {
    label: "Planificando",
    color: "#f5a623",
    dotColor: "#f5a623",
    pulse: true,
    icon: "⏳",
    description: "Nubo evalúa y descompone la tarea",
    mcStatus: "queued",
  },
  dispatched: {
    label: "Despachado",
    color: "#4a9eff",
    dotColor: "#4a9eff",
    pulse: true,
    icon: "🚀",
    description: "Job enviado al especialista",
    mcStatus: "queued",
  },
  running: {
    label: "En ejecución",
    color: "#2ed573",
    dotColor: "#2ed573",
    pulse: true,
    icon: "⚡",
    description: "Worker activo, heartbeat recibido",
    mcStatus: "running",
  },
  stale_retry: {
    label: "Reintentando",
    color: "#f5a623",
    dotColor: "#f5a623",
    pulse: true,
    icon: "⚠️",
    description: "Sin heartbeat. Auto-retry activo.",
    mcStatus: "blocked",
  },
  handoff: {
    label: "Handoff",
    color: "#a78bfa",
    dotColor: "#a78bfa",
    pulse: false,
    icon: "↗️",
    description: "Resultado pasando a siguiente agente",
    mcStatus: "running",
  },
  done: {
    label: "Completado",
    color: "#2ed573",
    dotColor: "#2ed573",
    pulse: false,
    icon: "✅",
    description: "Misión completada. Resultado entregado.",
    mcStatus: "completed",
  },
  failed: {
    label: "Fallido",
    color: "#ff4757",
    dotColor: "#ff4757",
    pulse: false,
    icon: "❌",
    description: "Falló después de max retries",
    mcStatus: "failed",
  },
  cancelled: {
    label: "Cancelado",
    color: "#3d4a60",
    dotColor: "#3d4a60",
    pulse: false,
    icon: "⛔",
    description: "Cancelada por presupuesto, timeout o instrucción",
    mcStatus: "failed",
  },
};

/** Map AgentOS SQLite status → canonical MissionStatus */
export function agentosToMissionStatus(raw: string): MissionStatus {
  switch (raw) {
    case "planning":
      return "planning";
    case "dispatched":
      return "dispatched";
    case "running":
      return "running";
    case "retrying":
      return "stale_retry";
    case "handoff":
      return "handoff";
    case "delivered":
    case "completed":
    case "archived":
      return "done";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "planning";
  }
}
