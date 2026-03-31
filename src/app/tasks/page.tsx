export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import type { TaskRow } from "@/lib/types";
import { TasksPageClient } from "./tasks-page-client";

export default function TasksPage() {
  const db = getDb();
  // Default view: exclude archived tasks (they are fetched explicitly via filter)
  const tasks = db
    .prepare("SELECT * FROM tasks WHERE archivedAt IS NULL ORDER BY receivedAt DESC LIMIT 50")
    .all() as TaskRow[];
  const { total } = db.prepare("SELECT COUNT(*) as total FROM tasks WHERE archivedAt IS NULL").get() as {
    total: number;
  };

  return <TasksPageClient initialTasks={tasks} initialTotal={total} />;
}
