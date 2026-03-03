import { getDb } from "@/lib/db";
import type { TaskRow } from "@/lib/types";
import { TasksPageClient } from "./tasks-page-client";

export default function TasksPage() {
  const db = getDb();
  const tasks = db
    .prepare("SELECT * FROM tasks ORDER BY receivedAt DESC LIMIT 50")
    .all() as TaskRow[];
  const { total } = db.prepare("SELECT COUNT(*) as total FROM tasks").get() as {
    total: number;
  };

  return <TasksPageClient initialTasks={tasks} initialTotal={total} />;
}
