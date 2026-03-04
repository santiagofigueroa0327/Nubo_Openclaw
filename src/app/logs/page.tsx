export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { LogViewer } from "@/components/log-viewer";

export default function LogsPage() {
  const db = getDb();
  const logs = db
    .prepare(
      "SELECT * FROM task_logs ORDER BY ts DESC LIMIT 200"
    )
    .all() as {
    id: string;
    taskId: string;
    ts: number;
    level: string;
    message: string;
    metaJson: string | null;
  }[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text">Logs</h1>
        <p className="text-sm text-muted mt-0.5">
          Recent logs across all tasks
        </p>
      </div>
      <LogViewer initialLogs={logs} />
    </div>
  );
}
