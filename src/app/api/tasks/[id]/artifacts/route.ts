import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createRequestId, logger } from "@/lib/logger";
import type { TaskRow } from "@/lib/types";
import fs from "node:fs";
import path from "node:path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = createRequestId();

  try {
    const db = getDb();
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
    if (!task) {
      return NextResponse.json({ error: "Not Found", message: `Task ${id} not found`, requestId }, { status: 404 });
    }

    const artifacts: { name: string; content: string; path: string }[] = [];

    // Try to find agentos_jobs for this task
    let jobs: { jobId: string; agentId: string; resultPath?: string }[] = [];
    try {
      jobs = db.prepare("SELECT jobId, agentId, resultPath FROM agentos_jobs WHERE taskId = ? ORDER BY rowid ASC")
        .all(id) as { jobId: string; agentId: string; resultPath?: string }[];
    } catch {
      // agentos_jobs table might not exist
    }

    // Also try to find from agentosId (mission directory)
    const AGENTOS_DIR = path.resolve(process.env.HOME || "/home/moltbot", ".openclaw", "agentos", "missions");
    
    if (task.agentosId) {
      const missionDir = path.join(AGENTOS_DIR, task.agentosId);
      if (fs.existsSync(missionDir)) {
        const jobsDir = path.join(missionDir, "jobs");
        if (fs.existsSync(jobsDir)) {
          const jobDirs = fs.readdirSync(jobsDir).filter(d => {
            try { return fs.statSync(path.join(jobsDir, d)).isDirectory(); } catch { return false; }
          });
          for (const jobDir of jobDirs) {
            const resultPath = path.join(jobsDir, jobDir, "result.md");
            const validationPath = path.join(jobsDir, jobDir, "validation.json");
            const finalAnswerPath = path.join(jobsDir, jobDir, "final_answer_telegram.md");
            
            if (fs.existsSync(resultPath)) {
              const content = fs.readFileSync(resultPath, "utf8");
              artifacts.push({ name: `${jobDir}/result.md`, content: content.slice(0, 50000), path: resultPath });
            }
            if (fs.existsSync(validationPath)) {
              const content = fs.readFileSync(validationPath, "utf8");
              artifacts.push({ name: `${jobDir}/validation.json`, content, path: validationPath });
            }
            if (fs.existsSync(finalAnswerPath)) {
              const content = fs.readFileSync(finalAnswerPath, "utf8");
              artifacts.push({ name: `${jobDir}/final_answer_telegram.md`, content, path: finalAnswerPath });
            }
          }
        }
      }
    }

    // Also check from job resultPaths
    for (const job of jobs) {
      if (job.resultPath && fs.existsSync(job.resultPath)) {
        const content = fs.readFileSync(job.resultPath, "utf8");
        const name = `${job.agentId}/result.md`;
        if (!artifacts.find(a => a.path === job.resultPath)) {
          artifacts.push({ name, content: content.slice(0, 50000), path: job.resultPath });
        }
      }
    }

    // finalOutput from task itself
    if (task.finalOutput && !artifacts.find(a => a.name === "finalOutput")) {
      artifacts.push({ name: "Final Output", content: task.finalOutput, path: "" });
    }

    return NextResponse.json({ artifacts, total: artifacts.length });
  } catch (err) {
    logger.error("Failed to get task artifacts", { requestId, message: String(err) });
    return NextResponse.json({ error: "Internal Server Error", message: String(err), requestId }, { status: 500 });
  }
}
