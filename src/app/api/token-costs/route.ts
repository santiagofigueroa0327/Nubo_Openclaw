import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const AGENTS_DIR = "/home/moltbot/.openclaw/agents";
const AGENT_IDS = [
  "main",
  "zenith",
  "atlas",
  "chronos",
  "spark",
  "flux",
  "hermes",
  "sentinel",
  "aegis",
];

const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cacheRead: 0.30 },
  "gemini-2.5-flash": { input: 0.075, output: 0.30, cacheRead: 0.01875 },
  "claude-opus-4-6": { input: 15.0, output: 75.0, cacheRead: 1.50 },
};

const AGENT_MODEL: Record<string, string> = {
  main: "claude-sonnet-4-6",
  zenith: "claude-opus-4-6",
  atlas: "gemini-2.5-flash",
  chronos: "gemini-2.5-flash",
  spark: "gemini-2.5-flash",
  flux: "gemini-2.5-flash",
  hermes: "gemini-2.5-flash",
  sentinel: "gemini-2.5-flash",
  aegis: "gemini-2.5-flash",
};

interface UsageData {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  cost: { input: number; output: number; cacheRead: number; cacheWrite: number; total: number };
}

interface SessionLine {
  type: string;
  timestamp?: string;
  message?: {
    role: string;
    usage?: UsageData;
  };
}

async function parseSessionFile(filePath: string): Promise<{
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  apiCost: number;
  messages: number;
  date: string;
}> {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let apiCost = 0;
  let messages = 0;
  let date = "";

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    try {
      const entry: SessionLine = JSON.parse(line);
      if (entry.type === "session" && entry.timestamp) {
        date = entry.timestamp.substring(0, 10);
      }
      if (entry.type === "message" && entry.message?.usage) {
        const u = entry.message.usage;
        if (u.totalTokens > 0) {
          inputTokens += u.input || 0;
          outputTokens += u.output || 0;
          cacheReadTokens += u.cacheRead || 0;
          apiCost += u.cost?.total || 0;
          messages++;
        }
      }
    } catch {
      // skip malformed lines
    }
  }

  return { inputTokens, outputTokens, cacheReadTokens, apiCost, messages, date };
}

export async function GET(request: NextRequest) {
  const requestId = randomUUID().substring(0, 8);
  const url = request.nextUrl;
  const days = Math.min(parseInt(url.searchParams.get("days") || "7", 10), 90);
  const cutoffMs = Date.now() - days * 86400000;

  try {
    const agentResults: {
      agentId: string;
      model: string;
      totalCost: number;
      estimatedCost: number;
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      sessions: number;
      messages: number;
      byDay: Record<string, number>;
    }[] = [];

    let grandTotalCost = 0;
    let grandEstimatedCost = 0;

    for (const agentId of AGENT_IDS) {
      const sessionsDir = path.join(AGENTS_DIR, agentId, "sessions");
      if (!fs.existsSync(sessionsDir)) continue;

      const files = fs.readdirSync(sessionsDir).filter(
        (f) => f.endsWith(".jsonl") && !f.includes(".deleted.") && !f.includes(".reset.")
      );

      let totalIn = 0;
      let totalOut = 0;
      let totalCache = 0;
      let totalApiCost = 0;
      let sessionCount = 0;
      let totalMessages = 0;
      const byDay: Record<string, number> = {};

      for (const file of files) {
        const filePath = path.join(sessionsDir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.mtimeMs < cutoffMs) continue;

          const result = await parseSessionFile(filePath);
          if (result.messages === 0) continue;

          totalIn += result.inputTokens;
          totalOut += result.outputTokens;
          totalCache += result.cacheReadTokens;
          totalApiCost += result.apiCost;
          totalMessages += result.messages;
          sessionCount++;

          if (result.date) {
            byDay[result.date] = (byDay[result.date] || 0) + result.apiCost;
          }
        } catch {
          // skip unreadable files
        }
      }

      const model = AGENT_MODEL[agentId] || "gemini-2.5-flash";
      const p = PRICES[model] || PRICES["gemini-2.5-flash"];
      const estimatedCost =
        (totalIn * p.input + totalOut * p.output + totalCache * p.cacheRead) / 1_000_000;

      if (totalMessages > 0) {
        agentResults.push({
          agentId,
          model,
          totalCost: totalApiCost,
          estimatedCost,
          inputTokens: totalIn,
          outputTokens: totalOut,
          cacheReadTokens: totalCache,
          sessions: sessionCount,
          messages: totalMessages,
          byDay,
        });
        grandTotalCost += totalApiCost;
        grandEstimatedCost += estimatedCost;
      }
    }

    agentResults.sort((a, b) => b.totalCost - a.totalCost);

    const mainAgent = agentResults.find((a) => a.agentId === "main");
    const nuboPercent = mainAgent && grandTotalCost > 0
      ? (mainAgent.totalCost / grandTotalCost) * 100
      : 0;

    return NextResponse.json(
      {
        agents: agentResults,
        totals: {
          cost: grandTotalCost,
          estimatedCost: grandEstimatedCost,
          sessions: agentResults.reduce((s, a) => s + a.sessions, 0),
          messages: agentResults.reduce((s, a) => s + a.messages, 0),
        },
        nuboPercent,
        period: { days, from: new Date(cutoffMs).toISOString(), to: new Date().toISOString() },
        requestId,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to compute token costs", message: String(err), requestId },
      { status: 500 }
    );
  }
}
