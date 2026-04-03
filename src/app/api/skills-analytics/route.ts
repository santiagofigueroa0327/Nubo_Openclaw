import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ANALYTICS_DIR = path.join(process.env.HOME || "/home/moltbot", ".openclaw/skills-analytics");
const GLOBAL_LOG = path.join(ANALYTICS_DIR, "events.jsonl");

interface SkillEvent {
  ts: string;
  skill: string;
  agent: string;
  result: "ok" | "fail" | string;
}

interface SkillUsage {
  slug: string;
  total: number;
  ok: number;
  fail: number;
  agents: string[];
  lastUsed: string | null;
  recentEvents: SkillEvent[];
}

function readGlobalLog(): SkillEvent[] {
  if (!fs.existsSync(GLOBAL_LOG)) return [];
  try {
    const lines = fs.readFileSync(GLOBAL_LOG, "utf-8").split("\n").filter(Boolean);
    return lines.map((l) => JSON.parse(l)).filter(Boolean);
  } catch {
    return [];
  }
}

function getSkillEvents(slug: string): SkillEvent[] {
  const logFile = path.join(ANALYTICS_DIR, `${slug}.jsonl`);
  if (!fs.existsSync(logFile)) return [];
  try {
    const lines = fs.readFileSync(logFile, "utf-8").split("\n").filter(Boolean);
    return lines.map((l) => {
      const e = JSON.parse(l);
      return { ...e, skill: slug };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);

  if (slug) {
    // Single skill analytics
    const events = getSkillEvents(slug);
    const ok = events.filter((e) => e.result === "ok").length;
    const fail = events.filter((e) => e.result !== "ok").length;
    const agents = [...new Set(events.map((e) => e.agent))];
    const lastUsed = events.length > 0 ? events[events.length - 1].ts : null;
    const recentEvents = events.slice(-10).reverse();

    return NextResponse.json({
      slug,
      total: events.length,
      ok,
      fail,
      agents,
      lastUsed,
      recentEvents,
    } satisfies SkillUsage);
  }

  // All skills summary
  const events = readGlobalLog();

  // Aggregate by skill
  const bySkill = new Map<string, SkillEvent[]>();
  for (const e of events) {
    if (!bySkill.has(e.skill)) bySkill.set(e.skill, []);
    bySkill.get(e.skill)!.push(e);
  }

  const summary: SkillUsage[] = [];
  for (const [skillSlug, skillEvents] of bySkill.entries()) {
    const ok = skillEvents.filter((e) => e.result === "ok").length;
    const fail = skillEvents.filter((e) => e.result !== "ok").length;
    const agents = [...new Set(skillEvents.map((e) => e.agent))];
    const lastUsed = skillEvents.length > 0 ? skillEvents[skillEvents.length - 1].ts : null;
    summary.push({
      slug: skillSlug,
      total: skillEvents.length,
      ok,
      fail,
      agents,
      lastUsed,
      recentEvents: skillEvents.slice(-5).reverse(),
    });
  }

  // Sort by total desc
  summary.sort((a, b) => b.total - a.total);

  return NextResponse.json({
    totalEvents: events.length,
    uniqueSkills: summary.length,
    skills: summary.slice(0, limit),
    analyticsDir: ANALYTICS_DIR,
    dataAvailable: fs.existsSync(GLOBAL_LOG),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, agent, result } = body;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "");
    if (safeSlug !== slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const event: SkillEvent = {
      ts: new Date().toISOString(),
      skill: safeSlug,
      agent: typeof agent === "string" ? agent.replace(/[^a-zA-Z0-9_-]/g, "") : "mc-ui",
      result: result === "fail" ? "fail" : "ok",
    };

    // Ensure dir exists
    fs.mkdirSync(ANALYTICS_DIR, { recursive: true });

    // Append to global log
    fs.appendFileSync(GLOBAL_LOG, JSON.stringify(event) + "\n");

    // Append to per-skill log
    const { skill, ...perSkillEvent } = event;
    fs.appendFileSync(
      path.join(ANALYTICS_DIR, `${safeSlug}.jsonl`),
      JSON.stringify(perSkillEvent) + "\n"
    );

    // Update count file
    const countFile = path.join(ANALYTICS_DIR, `${safeSlug}.count`);
    let count = 0;
    if (fs.existsSync(countFile)) {
      count = parseInt(fs.readFileSync(countFile, "utf-8").trim() || "0", 10) || 0;
    }
    fs.writeFileSync(countFile, String(count + 1));

    return NextResponse.json({ ok: true, event });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
