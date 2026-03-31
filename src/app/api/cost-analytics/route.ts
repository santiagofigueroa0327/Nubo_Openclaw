import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const AGENTS_DIR = "/home/moltbot/.openclaw/agents";
const AGENT_IDS = [
  "main", "zenith", "atlas", "chronos",
  "spark", "flux", "hermes", "sentinel", "aegis",
];

// Prices per million tokens (USD)
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-opus-4-6":   { input: 15.0,  output: 75.0,  cacheRead: 1.50 },
  "claude-sonnet-4-6": { input: 3.0,   output: 15.0,  cacheRead: 0.30 },
  "gemini-2.5-flash":  { input: 0.075, output: 0.30,  cacheRead: 0.01875 },
  "gemini-3.1-pro":    { input: 1.25,  output: 5.0,   cacheRead: 0.3125 },
};

const AGENT_MODEL: Record<string, string> = {
  main: "gemini-3.1-pro",
  zenith: "claude-opus-4-6",
  atlas: "gemini-2.5-flash",
  chronos: "gemini-2.5-flash",
  spark: "gemini-2.5-flash",
  flux: "gemini-2.5-flash",
  hermes: "gemini-2.5-flash",
  sentinel: "gemini-2.5-flash",
  aegis: "gemini-2.5-flash",
};

interface SessionUsage {
  input: number;
  output: number;
  cacheRead: number;
  apiCost: number;
  date: string;
}

async function parseSessionUsage(filePath: string): Promise<SessionUsage> {
  let input = 0, output = 0, cacheRead = 0, apiCost = 0, date = "";

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === "session" && entry.timestamp) {
        date = entry.timestamp.substring(0, 10);
      }
      if (entry.type === "message" && entry.message?.usage?.totalTokens > 0) {
        const u = entry.message.usage;
        input += u.input || 0;
        output += u.output || 0;
        cacheRead += u.cacheRead || 0;
        apiCost += u.cost?.total || 0;
      }
    } catch { /* skip malformed lines */ }
  }

  return { input, output, cacheRead, apiCost, date };
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const monthPrefix = today.slice(0, 7);
    const cutoff7d = Date.now() - 7 * 86400000;

    let todayCost = 0;
    let monthCost = 0;
    const byAgent: Record<string, number> = {};
    const dailyTrend: Record<string, number> = {};
    let totalJobsToday = 0;

    for (const agentId of AGENT_IDS) {
      const sessionsDir = path.join(AGENTS_DIR, agentId, "sessions");
      if (!fs.existsSync(sessionsDir)) continue;

      const model = AGENT_MODEL[agentId] || "gemini-2.5-flash";
      const p = PRICES[model] || PRICES["gemini-2.5-flash"];
      const files = fs.readdirSync(sessionsDir).filter(
        (f) => f.endsWith(".jsonl") && !f.includes(".deleted.") && !f.includes(".reset.")
      );

      for (const file of files) {
        const filePath = path.join(sessionsDir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.mtimeMs < cutoff7d) continue;

          const usage = await parseSessionUsage(filePath);
          if (!usage.date) continue;

          // Use API-reported cost if available, otherwise estimate
          const cost = usage.apiCost > 0
            ? usage.apiCost
            : (usage.input * p.input + usage.output * p.output + usage.cacheRead * p.cacheRead) / 1_000_000;

          if (usage.date === today) {
            todayCost += cost;
            byAgent[agentId] = (byAgent[agentId] || 0) + cost;
            totalJobsToday++;
          }

          if (usage.date.startsWith(monthPrefix)) {
            monthCost += cost;
          }

          // Daily trend (last 7 days)
          dailyTrend[usage.date] = (dailyTrend[usage.date] || 0) + cost;
        } catch { /* skip unreadable */ }
      }
    }

    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    const projected = dayOfMonth > 0 ? (monthCost / dayOfMonth) * daysInMonth : 0;

    const dailyBudget = 6.0;
    const monthlyBudget = 150.0;

    return NextResponse.json(
      {
        today: {
          cost: Math.round(todayCost * 100) / 100,
          budget: dailyBudget,
          percentUsed: Math.round((todayCost / dailyBudget) * 100),
          status:
            todayCost >= dailyBudget * 1.2
              ? "over"
              : todayCost >= dailyBudget * 0.7
              ? "warning"
              : "ok",
          byAgent,
          jobs: totalJobsToday,
        },
        month: {
          cost: Math.round(monthCost * 100) / 100,
          projected: Math.round(projected * 100) / 100,
          budget: monthlyBudget,
          percentUsed: Math.round((monthCost / monthlyBudget) * 100),
          status: monthCost >= monthlyBudget * 0.8 ? "warning" : "ok",
        },
        dailyTrend: Object.entries(dailyTrend)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-7)
          .map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 })),
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to compute cost analytics", message: String(err) },
      { status: 500 }
    );
  }
}
