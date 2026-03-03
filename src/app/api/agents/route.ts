import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createRequestId, logger } from "@/lib/logger";
import type { AgentRow } from "@/lib/types";

function parseAgent(row: AgentRow) {
  return {
    agentId: row.agentId,
    role: row.role,
    capabilities: JSON.parse(row.capabilitiesJson || "[]") as string[],
    enabled: row.enabled === 1,
    defaultModelPolicy: row.defaultModelPolicy,
  };
}

export async function GET() {
  const requestId = createRequestId();

  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM agents_registry ORDER BY agentId").all() as AgentRow[];
    const agents = rows.map(parseAgent);

    logger.info("Agents listed", { requestId, method: "GET", path: "/api/agents" });
    return NextResponse.json({ agents });
  } catch (err) {
    logger.error("Failed to list agents", { requestId, message: String(err) });
    return NextResponse.json(
      { error: "Internal Server Error", message: String(err), requestId },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";

  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too Many Requests", message: "Rate limit exceeded", requestId },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { agentId, role, capabilities, enabled, defaultModelPolicy } = body;

    if (!agentId || !role) {
      return NextResponse.json(
        { error: "Bad Request", message: "agentId and role are required", requestId },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO agents_registry (agentId, role, capabilitiesJson, enabled, defaultModelPolicy)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      agentId,
      role,
      JSON.stringify(capabilities || []),
      enabled !== false ? 1 : 0,
      defaultModelPolicy || ""
    );

    const row = db.prepare("SELECT * FROM agents_registry WHERE agentId = ?").get(agentId) as AgentRow;
    const agent = parseAgent(row);

    logger.info("Agent upserted", { requestId, method: "POST", path: "/api/agents" });
    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    logger.error("Failed to upsert agent", { requestId, message: String(err) });
    return NextResponse.json(
      { error: "Internal Server Error", message: String(err), requestId },
      { status: 500 }
    );
  }
}
