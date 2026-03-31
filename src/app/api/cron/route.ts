import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const JOBS_FILE = "/home/moltbot/.openclaw/cron/jobs.json";

function readJobs() {
  const raw = fs.readFileSync(JOBS_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeJobs(data: unknown) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  try {
    const data = readJobs();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = readJobs();
    const newJob = {
      id: crypto.randomUUID(),
      name: body.name || "Nuevo Job",
      enabled: body.enabled ?? true,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      schedule: {
        kind: "cron",
        expr: body.expr || "0 * * * *",
        tz: body.tz || "America/Bogota",
      },
      sessionTarget: "isolated",
      wakeMode: "now",
      payload: {
        kind: "agentTurn",
        message: body.message || "",
      },
      delivery: {
        mode: "announce",
        channel: "telegram",
      },
      state: {},
    };
    data.jobs.push(newJob);
    writeJobs(data);
    return NextResponse.json(newJob, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
