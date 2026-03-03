// === Task Status (drives state machine) ===
export type TaskStatus = "queued" | "running" | "completed" | "blocked" | "failed";

// === Source Channels ===
export type SourceChannel = "slack" | "api" | "github" | "manual" | "email";

// === Log Levels ===
export type LogLevel = "debug" | "info" | "warn" | "error";

// === Event Types (timeline) ===
export type EventType =
  | "status_change"
  | "agent_assigned"
  | "output_generated"
  | "error_occurred"
  | "retry"
  | "comment";

// === Database Row Types (what SQLite returns) ===

export interface TaskRow {
  id: string;
  title: string;
  status: TaskStatus;
  sourceChannel: string;
  sourceUser: string;
  primaryAgent: string;
  model: string;
  receivedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  updatedAt: number;
  finalOutput: string | null;
  errorSummary: string | null;
}

export interface EventRow {
  id: string;
  taskId: string;
  ts: number;
  type: string;
  summary: string;
  dataJson: string | null;
}

export interface TaskLogRow {
  id: string;
  taskId: string;
  ts: number;
  level: string;
  message: string;
  metaJson: string | null;
}

export interface AgentRow {
  agentId: string;
  role: string;
  capabilitiesJson: string;
  enabled: number;
  defaultModelPolicy: string;
}

// === API Response Types (parsed) ===

export type Task = TaskRow;

export interface TaskEvent extends Omit<EventRow, "dataJson"> {
  data: Record<string, unknown> | null;
}

export interface TaskLog extends Omit<TaskLogRow, "metaJson"> {
  meta: Record<string, unknown> | null;
}

export interface Agent extends Omit<AgentRow, "capabilitiesJson" | "enabled"> {
  capabilities: string[];
  enabled: boolean;
}

// === API Error ===
export interface ApiError {
  error: string;
  message: string;
  requestId?: string;
}

// === Structured Log Entry ===
export interface LogEntry {
  ts: string;
  requestId: string;
  level: LogLevel;
  method?: string;
  path?: string;
  message: string;
  durationMs?: number;
  [key: string]: unknown;
}
