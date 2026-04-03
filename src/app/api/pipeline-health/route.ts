import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";

interface TestResult {
  name: string;
  pass: boolean;
  error: string;
}

function check(name: string, fn: () => boolean | string): TestResult {
  try {
    const result = fn();
    if (result === true || result === "") {
      return { name, pass: true, error: "" };
    }
    return { name, pass: false, error: String(result) };
  } catch (err) {
    return { name, pass: false, error: String(err).substring(0, 100) };
  }
}

function serviceActive(service: string): boolean {
  try {
    const out = execSync(`systemctl --user is-active ${service}`, {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    return out === "active";
  } catch {
    return false;
  }
}

function systemServiceActive(service: string): boolean {
  try {
    const out = execSync(`systemctl is-active ${service}`, {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    return out === "active";
  } catch {
    return false;
  }
}

export async function GET() {
  const requestId = randomUUID().substring(0, 8);
  const tests: TestResult[] = [];

  // Services
  tests.push(check("Gateway running", () => serviceActive("openclaw-gateway.service")));
  tests.push(check("Mission Control running", () => serviceActive("mission-control.service")));
  tests.push(check("Nginx running", () => systemServiceActive("nginx")));

  // MC loopback
  tests.push(
    check("MC loopback only", () => {
      const out = execSync("ss -tlnp 2>/dev/null | grep ':3010'", {
        encoding: "utf-8",
        timeout: 3000,
      });
      const bind = out.split(/\s+/)[3] || "";
      if (bind.startsWith("127.0.0.1") || bind.startsWith("[::1]")) return true;
      if (bind.startsWith("*:") || bind.startsWith("0.0.0.0") || bind.startsWith("[::]:"))
        return `bound to ${bind}`;
      return true;
    })
  );

  // AgentOS DB
  const agentosDb = "/home/moltbot/.openclaw/agentos/agentos.sqlite";
  const jobHistoryDb = "/home/moltbot/.openclaw/agentos/job_history.db";
  tests.push(check("agentos.sqlite exists", () => fs.existsSync(agentosDb)));
  tests.push(check("job_history.db exists", () => fs.existsSync(jobHistoryDb)));

  tests.push(
    check("DB has missions", () => {
      const out = execSync(
        `sqlite3 ${agentosDb} "SELECT COUNT(*) FROM missions"`,
        { encoding: "utf-8", timeout: 3000 }
      ).trim();
      return parseInt(out) > 0 ? true : `count=${out}`;
    })
  );

  // Required scripts
  const binDir = "/home/moltbot/.openclaw/agentos/bin";
  const requiredScripts = [
    "dispatch-job",
    "agentosctl",
    "telegram-notify",
    "job-watchdog.sh",
    "mission-finisher.sh",
    "reaper",
  ];
  for (const script of requiredScripts) {
    tests.push(check(`Script: ${script}`, () => fs.existsSync(`${binDir}/${script}`)));
  }

  // MiroFish scripts
  const mirofishScripts = [
    "resource-graph.py",
    "memory-updater.sh",
    "job-history.sh",
    "multi-spawn.sh",
    "spawn-status.sh",
  ];
  for (const script of mirofishScripts) {
    tests.push(check(`MiroFish: ${script}`, () => fs.existsSync(`${binDir}/${script}`)));
  }

  // Agent memory files
  const workspaceDir = "/home/moltbot/.openclaw/workspace";
  for (const agent of ["atlas", "zenith", "flux", "hermes", "spark"]) {
    tests.push(
      check(`MEMORY_${agent}.md`, () => fs.existsSync(`${workspaceDir}/MEMORY_${agent}.md`))
    );
  }

  // nubo.env
  tests.push(
    check("nubo.env exists", () => fs.existsSync("/home/moltbot/.openclaw/nubo.env"))
  );

  // Job success rate
  let successRate = 0;
  tests.push(
    check("Job success rate", () => {
      const out = execSync(
        `sqlite3 ${agentosDb} "SELECT ROUND(100.0*SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END)/COUNT(*),1) FROM jobs"`,
        { encoding: "utf-8", timeout: 3000 }
      ).trim();
      successRate = parseFloat(out) || 0;
      if (successRate >= 40) return true;
      return `${successRate}% (below 40% threshold)`;
    })
  );

  // Compute summary
  const pass = tests.filter((t) => t.pass).length;
  const fail = tests.filter((t) => !t.pass).length;
  const total = tests.length;
  const score = total > 0 ? Math.round((pass / total) * 100) : 0;

  let status = "healthy";
  if (fail > 0) status = "degraded";
  if (fail > 3) status = "critical";

  return NextResponse.json(
    {
      status,
      score,
      pass,
      fail,
      warn: 0,
      total,
      tests,
      successRate,
      lastChecked: new Date().toISOString(),
      requestId,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
