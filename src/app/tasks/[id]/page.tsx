import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import type { TaskRow, EventRow, TaskLogRow } from "@/lib/types";
import { TaskDetailClient } from "./task-detail-client";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
    | TaskRow
    | undefined;

  if (!task) notFound();

  const events = db
    .prepare("SELECT * FROM events WHERE taskId = ? ORDER BY ts ASC")
    .all(id) as EventRow[];

  const logs = db
    .prepare("SELECT * FROM task_logs WHERE taskId = ? ORDER BY ts ASC")
    .all(id) as TaskLogRow[];

  return <TaskDetailClient task={task} events={events} logs={logs} />;
}
