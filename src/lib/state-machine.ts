import type { TaskStatus } from "./types";

const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  queued: ["running", "blocked"],
  running: ["completed", "blocked", "failed"],
  blocked: ["running"],
  completed: [],
  failed: [],
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
