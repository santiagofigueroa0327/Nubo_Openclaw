import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createRequestId, logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import type { AgentRow } from "@/lib/types";
import fs from "node:fs";
import { exec as cp_exec } from "node:child_process";
import path from "node:path";

const OPENCLAW_CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH || path.resolve(process.env.HOME || '/home/moltbot', '.openclaw', 'openclaw.json');
const OPENCLAW_BIN = process.env.OPENCLAW_BIN || path.resolve(process.env.HOME || '/home/moltbot', '.npm-global', 'bin', 'openclaw');

// Helper to read and parse openclaw.json
function readOpenClawConfig() {
  if (!fs.existsSync(OPENCLAW_CONFIG_PATH)) {
    throw new Error(`OpenClaw config not found at ${OPENCLAW_CONFIG_PATH}`);
  }
  return JSON.parse(fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf8'));
}

// Helper to write openclaw.json
function writeOpenClawConfig(config: any) {
  fs.writeFileSync(OPENCLAW_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

// Helper to restart gateway (async, non-blocking)
function restartOpenClawGateway() {
  logger.warn("Restarting OpenClaw Gateway...");
  cp_exec(`${OPENCLAW_BIN} gateway restart`, (error, stdout, stderr) => {
    if (error) {
      logger.error(`Gateway restart failed: ${error.message}`);
      return;
    }
    logger.info(`Gateway restart success: ${stdout}`);
    if (stderr) logger.warn(`Gateway restart stderr: ${stderr}`);
  });
}

function combineAgentConfig(dbAgent: AgentRow, ocConfig: any) {
  const agentConfig = ocConfig.agents.list.find((a: any) => a.id === dbAgent.agentId);
  const defaultModel = ocConfig.agents.defaults.model.primary;
  const defaultFallbacks = ocConfig.agents.defaults.model.fallbacks || [];

  return {
    agentId: dbAgent.agentId,
    name: agentConfig?.name || dbAgent.agentId,
    role: dbAgent.role,
    description: agentConfig?.description || '',
    enabled: dbAgent.enabled === 1,
    model: agentConfig?.model?.primary || defaultModel,
    fallbacks: agentConfig?.model?.fallbacks || defaultFallbacks,
    capabilities: JSON.parse(dbAgent.capabilitiesJson || '[]') as string[],
    toolsAllow: agentConfig?.tools?.allow || [],
    toolsDeny: agentConfig?.tools?.deny || [],
    skills: agentConfig?.skills || [] // Assuming skills are in openclaw.json for now
  };
}

// GET /api/agents/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = createRequestId();

  try {
    const db = getDb();
    const dbAgent = db.prepare("SELECT * FROM agents_registry WHERE agentId = ?").get(id) as AgentRow | undefined;

    if (!dbAgent) {
      return NextResponse.json(
        { error: "Not Found", message: `Agent ${id} not found`, requestId },
        { status: 404 }
      );
    }

    const ocConfig = readOpenClawConfig();
    const combined = combineAgentConfig(dbAgent, ocConfig);

    logger.info(`Agent ${id} config fetched`, { requestId });
    return NextResponse.json(combined);
  } catch (err) {
    logger.error(`Failed to get agent ${id} config`, { requestId, message: String(err) });
    return NextResponse.json(
      { error: "Internal Server Error", message: String(err), requestId },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const { name, role, description, enabled, model, fallbacks, capabilities, toolsAllow, toolsDeny, skills } = body;

    const db = getDb();
    const dbAgent = db.prepare("SELECT * FROM agents_registry WHERE agentId = ?").get(id) as AgentRow | undefined;

    if (!dbAgent) {
      return NextResponse.json(
        { error: "Not Found", message: `Agent ${id} not found`, requestId },
        { status: 404 }
      );
    }

    // 1. Update agents_registry in SQLite
    db.prepare(
      `UPDATE agents_registry SET role = ?, capabilitiesJson = ?, enabled = ? WHERE agentId = ?`
    ).run(role, JSON.stringify(capabilities || []), enabled ? 1 : 0, id);

    // 2. Update openclaw.json
    const ocConfig = readOpenClawConfig();
    let agentEntry = ocConfig.agents.list.find((a: any) => a.id === id);

    if (!agentEntry) {
      // If agent not in list, create a new entry (copy defaults)
      agentEntry = { ...ocConfig.agents.defaults, id: id, name: name || id };
      // Ensure `model` and `tools` objects exist before setting properties
      if (!agentEntry.model) agentEntry.model = {};
      if (!agentEntry.tools) agentEntry.tools = {};
      ocConfig.agents.list.push(agentEntry);
    }

    agentEntry.name = name;
    agentEntry.description = description; // Add description field
    agentEntry.model.primary = model || ocConfig.agents.defaults.model.primary; // Update primary model
    agentEntry.model.fallbacks = fallbacks || ocConfig.agents.defaults.model.fallbacks || []; // Update fallbacks
    agentEntry.tools.allow = toolsAllow || [];
    agentEntry.tools.deny = toolsDeny || [];
    agentEntry.skills = skills || [];

    writeOpenClawConfig(ocConfig);

    // Respond before restarting gateway (it will kill this process)
    logger.info(`Agent ${id} config updated. Gateway restart initiated.`, { requestId });
    
    // 3. Restart gateway (async, non-blocking, will kill this process)
    restartOpenClawGateway();

    return NextResponse.json({ message: `Agent ${id} updated and gateway restarting.`, agent: combineAgentConfig(db.prepare("SELECT * FROM agents_registry WHERE agentId = ?").get(id) as AgentRow, ocConfig) });

  } catch (err) {
    logger.error(`Failed to update agent ${id} config`, { requestId, message: String(err) });
    return NextResponse.json(
      { error: "Internal Server Error", message: String(err), requestId },
      { status: 500 }
    );
  }
}
