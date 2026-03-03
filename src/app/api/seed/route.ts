import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { createRequestId, logger } from "@/lib/logger";

const AGENTS = [
  {
    agentId: "codegen-01",
    role: "Code Generation",
    capabilities: ["code-gen", "refactor", "test-gen", "documentation"],
    defaultModelPolicy: "claude-sonnet-4-20250514",
  },
  {
    agentId: "review-02",
    role: "Code Review",
    capabilities: ["review", "security-scan", "lint", "style-check"],
    defaultModelPolicy: "claude-sonnet-4-20250514",
  },
  {
    agentId: "deploy-03",
    role: "Deployment",
    capabilities: ["deploy", "rollback", "health-check", "infra"],
    defaultModelPolicy: "claude-haiku-4-5-20251001",
  },
  {
    agentId: "research-04",
    role: "Research & Analysis",
    capabilities: ["web-search", "summarize", "compare", "report"],
    defaultModelPolicy: "claude-opus-4-20250514",
  },
];

const TASK_TEMPLATES = [
  { title: "Refactor authentication middleware", agent: "codegen-01", model: "claude-sonnet-4-20250514", channel: "github" },
  { title: "Deploy staging environment v2.4.1", agent: "deploy-03", model: "claude-haiku-4-5-20251001", channel: "slack" },
  { title: "Investigate memory leak in worker pool", agent: "research-04", model: "claude-opus-4-20250514", channel: "api" },
  { title: "Generate unit tests for payment module", agent: "codegen-01", model: "claude-sonnet-4-20250514", channel: "manual" },
  { title: "Review PR #1842 - API rate limiter", agent: "review-02", model: "claude-sonnet-4-20250514", channel: "github" },
  { title: "Migrate database schema to v3", agent: "codegen-01", model: "claude-sonnet-4-20250514", channel: "api" },
  { title: "Audit security headers configuration", agent: "review-02", model: "claude-sonnet-4-20250514", channel: "manual" },
  { title: "Deploy production hotfix #892", agent: "deploy-03", model: "claude-haiku-4-5-20251001", channel: "slack" },
  { title: "Analyze API latency patterns", agent: "research-04", model: "claude-opus-4-20250514", channel: "email" },
  { title: "Generate OpenAPI spec from routes", agent: "codegen-01", model: "claude-sonnet-4-20250514", channel: "api" },
];

const STATUSES_AND_TIMING: {
  status: string;
  hasStart: boolean;
  hasFinish: boolean;
  offsetHours: number;
  durationMin: number;
}[] = [
  { status: "completed", hasStart: true, hasFinish: true, offsetHours: 36, durationMin: 12 },
  { status: "completed", hasStart: true, hasFinish: true, offsetHours: 30, durationMin: 45 },
  { status: "running", hasStart: true, hasFinish: false, offsetHours: 1, durationMin: 0 },
  { status: "queued", hasStart: false, hasFinish: false, offsetHours: 0.2, durationMin: 0 },
  { status: "completed", hasStart: true, hasFinish: true, offsetHours: 24, durationMin: 8 },
  { status: "failed", hasStart: true, hasFinish: true, offsetHours: 18, durationMin: 3 },
  { status: "blocked", hasStart: true, hasFinish: false, offsetHours: 6, durationMin: 0 },
  { status: "completed", hasStart: true, hasFinish: true, offsetHours: 12, durationMin: 22 },
  { status: "running", hasStart: true, hasFinish: false, offsetHours: 0.5, durationMin: 0 },
  { status: "queued", hasStart: false, hasFinish: false, offsetHours: 0.1, durationMin: 0 },
];

const EVENT_TEMPLATES: { type: string; summary: string }[] = [
  { type: "status_change", summary: "Task queued for processing" },
  { type: "agent_assigned", summary: "Agent assigned to task" },
  { type: "status_change", summary: "Task started execution" },
  { type: "output_generated", summary: "Intermediate output generated" },
  { type: "status_change", summary: "Task completed successfully" },
  { type: "error_occurred", summary: "Error: timeout waiting for response" },
  { type: "retry", summary: "Retrying after transient failure" },
  { type: "comment", summary: "Human review requested" },
];

const LOG_MESSAGES: { level: string; message: string }[] = [
  { level: "info", message: "Task received and validated" },
  { level: "info", message: "Agent context initialized" },
  { level: "debug", message: "Loading model weights from cache" },
  { level: "info", message: "Processing input tokens: 4,218" },
  { level: "info", message: "Generating response..." },
  { level: "warn", message: "Token usage approaching limit (85%)" },
  { level: "debug", message: "Response generated in 3.2s" },
  { level: "info", message: "Output validation passed" },
  { level: "error", message: "Connection to upstream API timed out after 30s" },
  { level: "info", message: "Result stored and task finalized" },
  { level: "warn", message: "Retryable error detected, scheduling retry" },
  { level: "debug", message: "Cleanup: releasing model context" },
];

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Seed endpoint is disabled in production" },
      { status: 403 }
    );
  }

  const requestId = createRequestId();
  const start = Date.now();

  try {
    const db = getDb();
    const now = Date.now();

    const seedAll = db.transaction(() => {
      db.exec("DELETE FROM task_logs");
      db.exec("DELETE FROM events");
      db.exec("DELETE FROM tasks");
      db.exec("DELETE FROM agents_registry");

      // Seed agents
      const insertAgent = db.prepare(
        "INSERT INTO agents_registry (agentId, role, capabilitiesJson, enabled, defaultModelPolicy) VALUES (?, ?, ?, ?, ?)"
      );
      for (const a of AGENTS) {
        insertAgent.run(a.agentId, a.role, JSON.stringify(a.capabilities), 1, a.defaultModelPolicy);
      }

      // Seed tasks
      const insertTask = db.prepare(
        `INSERT INTO tasks (id, title, status, sourceChannel, sourceUser, primaryAgent, model, receivedAt, startedAt, finishedAt, updatedAt, finalOutput, errorSummary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const insertEvent = db.prepare(
        "INSERT INTO events (id, taskId, ts, type, summary, dataJson) VALUES (?, ?, ?, ?, ?, ?)"
      );
      const insertLog = db.prepare(
        "INSERT INTO task_logs (id, taskId, ts, level, message, metaJson) VALUES (?, ?, ?, ?, ?, ?)"
      );

      const taskIds: string[] = [];

      for (let i = 0; i < TASK_TEMPLATES.length; i++) {
        const tmpl = TASK_TEMPLATES[i];
        const timing = STATUSES_AND_TIMING[i];
        const taskId = randomUUID();
        taskIds.push(taskId);

        const receivedAt = now - timing.offsetHours * 3600_000;
        const startedAt = timing.hasStart ? receivedAt + 2000 : null;
        const finishedAt =
          timing.hasFinish && startedAt
            ? startedAt + timing.durationMin * 60_000
            : null;

        const finalOutput =
          timing.status === "completed"
            ? `Task "${tmpl.title}" completed successfully. All checks passed.`
            : null;
        const errorSummary =
          timing.status === "failed"
            ? "Error: upstream API timeout after 30s. Max retries exceeded."
            : null;

        insertTask.run(
          taskId,
          tmpl.title,
          timing.status,
          tmpl.channel,
          "ops-user",
          tmpl.agent,
          tmpl.model,
          receivedAt,
          startedAt,
          finishedAt,
          finishedAt || startedAt || receivedAt,
          finalOutput,
          errorSummary
        );

        // Events for this task
        const eventCount = timing.status === "completed" ? 5 : timing.status === "running" ? 3 : 2;
        for (let e = 0; e < eventCount; e++) {
          const evt = EVENT_TEMPLATES[e % EVENT_TEMPLATES.length];
          insertEvent.run(
            randomUUID(),
            taskId,
            receivedAt + e * 3000,
            evt.type,
            evt.summary,
            JSON.stringify({ step: e + 1, agent: tmpl.agent })
          );
        }

        // Logs for this task
        const logCount = timing.status === "completed" ? 6 : timing.status === "running" ? 4 : 2;
        for (let l = 0; l < logCount; l++) {
          const lg = LOG_MESSAGES[l % LOG_MESSAGES.length];
          insertLog.run(
            randomUUID(),
            taskId,
            receivedAt + l * 1500,
            lg.level,
            lg.message,
            JSON.stringify({ taskStep: l + 1 })
          );
        }
      }
    });

    seedAll();

    logger.info("Database seeded", { requestId, durationMs: Date.now() - start });
    return NextResponse.json(
      {
        message: "Database seeded successfully",
        counts: { agents: AGENTS.length, tasks: TASK_TEMPLATES.length },
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error("Seed failed", { requestId, message: String(err) });
    return NextResponse.json(
      { error: "Seed failed", message: String(err), requestId },
      { status: 500 }
    );
  }
}
