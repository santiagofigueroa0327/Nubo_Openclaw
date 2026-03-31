import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const WORKSPACE_SKILLS_DIR = "/home/moltbot/.openclaw/workspace/skills";
const OPENCLAW_BIN = "/home/moltbot/.npm-global/bin/openclaw";

export interface SkillInfo {
  name: string;
  description: string;
  emoji?: string;
  eligible: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  source: string;
  bundled: boolean;
  homepage?: string;
  missing: {
    bins: string[];
    anyBins: string[];
    env: string[];
    config: string[];
    os: string[];
  };
  // enriched from SKILL.md frontmatter
  owner?: string;
  type?: string;
  version?: string;
  state?: string;
  hasReferences?: boolean;
  hasScripts?: boolean;
  hasAssets?: boolean;
  trigger?: string;
  inputSummary?: string;
  outputSummary?: string;
  restrictions?: string[];
  skillMdSize?: number;
}

function parseSkillFrontmatter(skillDir: string): Partial<SkillInfo> {
  const skillMdPath = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) return {};

  try {
    const content = fs.readFileSync(skillMdPath, "utf-8");
    const stat = fs.statSync(skillMdPath);
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return { skillMdSize: stat.size };

    const fm = fmMatch[1];
    const body = content.slice(fmMatch[0].length);

    // Extract fields from frontmatter
    const ownerMatch = fm.match(/owner:\s*(\S+)/);
    const typeMatch = fm.match(/type:\s*(.+)/);
    const versionMatch = fm.match(/version:\s*["']?([^"'\n]+)["']?/);

    // Extract trigger from body (look for "Cuándo usar" or "Trigger" section)
    let trigger: string | undefined;
    const triggerMatch = body.match(/(?:cuándo usar|trigger|when to use)[:\s]*([^\n]+)/i);
    if (triggerMatch) trigger = triggerMatch[1].trim();

    // Determine state
    let state: string = "active";
    if (fm.match(/disabled:\s*true/)) state = "disabled";
    else if (fm.match(/state:\s*(\S+)/)) {
      const stateMatch = fm.match(/state:\s*(\S+)/);
      if (stateMatch) state = stateMatch[1];
    }

    return {
      owner: ownerMatch?.[1] ?? "system",
      type: typeMatch?.[1]?.trim() ?? "instruction-only",
      version: versionMatch?.[1]?.trim() ?? "1.0.0",
      state,
      hasReferences: fs.existsSync(path.join(skillDir, "references")),
      hasScripts: fs.existsSync(path.join(skillDir, "scripts")),
      hasAssets: fs.existsSync(path.join(skillDir, "assets")),
      trigger,
      skillMdSize: stat.size,
    };
  } catch {
    return {};
  }
}

function getWorkspaceSkillMeta(slug: string): Partial<SkillInfo> {
  const skillDir = path.join(WORKSPACE_SKILLS_DIR, slug);
  if (!fs.existsSync(skillDir)) return {};
  return parseSkillFrontmatter(skillDir);
}

// In-memory + disk cache — avoids 9s CLI call on every page navigation
const CACHE_TTL_MS = 120_000; // 2 minutes in-memory
const DISK_CACHE_PATH = "/tmp/mc-skills-cache.json";
const DISK_CACHE_TTL_MS = 300_000; // 5 minutes on disk
let cachedSkills: SkillInfo[] | null = null;
let cacheTimestamp = 0;

function loadDiskCache(): SkillInfo[] | null {
  try {
    if (!fs.existsSync(DISK_CACHE_PATH)) return null;
    const stat = fs.statSync(DISK_CACHE_PATH);
    if (Date.now() - stat.mtimeMs > DISK_CACHE_TTL_MS) return null;
    const content = fs.readFileSync(DISK_CACHE_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function saveDiskCache(skills: SkillInfo[]) {
  try {
    fs.writeFileSync(DISK_CACHE_PATH, JSON.stringify(skills), "utf-8");
  } catch { /* ignore disk write errors */ }
}

function getCachedSkills(): SkillInfo[] | null {
  // 1. Check in-memory cache
  if (cachedSkills && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSkills;
  }
  // 2. Fall back to disk cache
  const disk = loadDiskCache();
  if (disk) {
    cachedSkills = disk;
    cacheTimestamp = Date.now();
    return disk;
  }
  return null;
}

function setCachedSkills(skills: SkillInfo[]) {
  cachedSkills = skills;
  cacheTimestamp = Date.now();
  saveDiskCache(skills);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  try {
    // Serve from cache if available and not forcing refresh
    let raw = forceRefresh ? null : getCachedSkills();

    if (!raw) {
      // Run openclaw skills list --json (slow ~9s, results are cached)
      const output = execSync(
        `${OPENCLAW_BIN} skills list --json 2>/dev/null`,
        { encoding: "utf-8", timeout: 20000 }
      );

      // Parse: CLI returns either {skills: [...]} object or a bare array
      try {
        const parsed = JSON.parse(output.trim());
        if (Array.isArray(parsed)) {
          raw = parsed;
        } else if (parsed.skills && Array.isArray(parsed.skills)) {
          raw = parsed.skills;
        } else {
          // Fallback: find array via regex
          const jsonMatch = output.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            return NextResponse.json({ skills: [], error: "No JSON array in output" });
          }
          raw = JSON.parse(jsonMatch[0]);
        }
      } catch {
        const jsonMatch = output.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          return NextResponse.json({ skills: [], error: "No JSON array in output" });
        }
        raw = JSON.parse(jsonMatch[0]);
      }

      setCachedSkills(raw!);
    }

    if (!raw) {
      return NextResponse.json({ skills: [], stats: {}, error: "Failed to load skills" });
    }

    // Enrich workspace skills with frontmatter data
    const enriched = raw.map((s) => {
      if (s.source === "openclaw-workspace") {
        const meta = getWorkspaceSkillMeta(s.name);
        return { ...s, ...meta };
      }
      return s;
    });

    // Summary stats
    const stats = {
      total: enriched.length,
      eligible: enriched.filter((s) => s.eligible).length,
      disabled: enriched.filter((s) => s.disabled).length,
      workspace: enriched.filter((s) => s.source === "openclaw-workspace").length,
      bundled: enriched.filter((s) => s.bundled).length,
      missing: enriched.filter(
        (s) =>
          !s.eligible &&
          !s.disabled &&
          (s.missing.bins.length > 0 ||
            s.missing.env.length > 0 ||
            s.missing.config.length > 0)
      ).length,
    };

    return NextResponse.json({ skills: enriched, stats });
  } catch (e) {
    return NextResponse.json(
      { skills: [], stats: {}, error: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, slug } = body;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "Missing skill slug" }, { status: 400 });
    }

    // Sanitize slug to prevent injection
    const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, "");
    if (safeSlug !== slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    switch (action) {
      case "enable": {
        const result = execSync(
          `${OPENCLAW_BIN} skills update ${safeSlug} --enabled true 2>&1`,
          { encoding: "utf-8", timeout: 10000 }
        );
        // Invalidate cache so next GET returns fresh data
        cachedSkills = null;
        return NextResponse.json({ ok: true, result: result.trim() });
      }
      case "disable": {
        const result = execSync(
          `${OPENCLAW_BIN} skills update ${safeSlug} --enabled false 2>&1`,
          { encoding: "utf-8", timeout: 10000 }
        );
        // Invalidate cache so next GET returns fresh data
        cachedSkills = null;
        return NextResponse.json({ ok: true, result: result.trim() });
      }
      case "validate": {
        const scriptPath = `${process.env.HOME}/.openclaw/workspace/skills-methodology/scripts/validate-skill.sh`;
        if (fs.existsSync(scriptPath)) {
          const result = execSync(
            `bash ${scriptPath} ${safeSlug} 2>&1`,
            { encoding: "utf-8", timeout: 15000 }
          );
          return NextResponse.json({ ok: true, result });
        }
        return NextResponse.json({ error: "Validation script not found" }, { status: 404 });
      }
      case "info": {
        const result = execSync(
          `${OPENCLAW_BIN} skills info ${safeSlug} 2>&1`,
          { encoding: "utf-8", timeout: 10000 }
        );
        return NextResponse.json({ ok: true, result: result.trim() });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
