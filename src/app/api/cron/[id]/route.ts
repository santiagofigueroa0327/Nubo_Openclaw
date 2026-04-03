import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

const JOBS_FILE = "/home/moltbot/.openclaw/cron/jobs.json";

function readJobs() {
  return JSON.parse(fs.readFileSync(JOBS_FILE, "utf-8"));
}
function writeJobs(data: unknown) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = readJobs();
    const idx = data.jobs.findIndex((j: { id: string }) => j.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const job = data.jobs[idx];
    if (body.name !== undefined) job.name = body.name;
    if (body.enabled !== undefined) job.enabled = body.enabled;
    if (body.expr !== undefined) job.schedule.expr = body.expr;
    if (body.tz !== undefined) job.schedule.tz = body.tz;
    if (body.message !== undefined) job.payload.message = body.message;
    job.updatedAtMs = Date.now();

    data.jobs[idx] = job;
    writeJobs(data);
    return NextResponse.json(job);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = readJobs();
    const before = data.jobs.length;
    data.jobs = data.jobs.filter((j: { id: string }) => j.id !== id);
    if (data.jobs.length === before) return NextResponse.json({ error: "Not found" }, { status: 404 });
    writeJobs(data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
