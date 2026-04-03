import type { TaskStatus } from "./types";

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  // AgentOS v2 states
  planning:    ["dispatched", "cancelled"],
  dispatched:  ["running", "stale_retry", "cancelled"],
  running:     ["done", "stale_retry", "handoff", "failed"],
  stale_retry: ["running", "failed"],
  handoff:     ["running", "done", "failed"],
  done:        [],
  cancelled:   [],
  // Legacy states (kept for compatibility)
  queued:      ["planning", "running", "blocked"],
  blocked:     ["running"],
  completed:   [],
  failed:      [],
  archived:    [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid status transition: ${from} -> ${to}`);
  }
}

export function getNextStatuses(current: TaskStatus): TaskStatus[] {
  return TRANSITIONS[current] ?? [];
}

export function isTerminal(status: TaskStatus): boolean {
  return (TRANSITIONS[status]?.length ?? 0) === 0;
}
