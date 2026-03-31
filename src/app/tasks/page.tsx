import { getDb } from "@/lib/db";
import type { TaskRow } from "@/lib/types";
import { TasksPageClient } from "./tasks-page-client";
import { redirect } from "next/navigation";

export default function TasksPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const taskId = searchParams?.id;

  if (taskId && typeof taskId === 'string') {
    redirect(`/tasks/${taskId}`);
  }
  const db = getDb();
  const tasks = db
    .prepare("SELECT * FROM tasks ORDER BY receivedAt DESC LIMIT 50")
    .all() as TaskRow[];
  const { total } = db.prepare("SELECT COUNT(*) as total FROM tasks").get() as {
    total: number;
  };

  return <TasksPageClient initialTasks={tasks} initialTotal={total} />;
}
