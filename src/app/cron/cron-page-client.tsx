"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshIcon } from "@/components/ui/icons";

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: { kind: string; expr: string; tz: string };
  payload: { kind: string; message: string };
  delivery?: { mode: string; channel: string };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastRunStatus?: string;
    lastDurationMs?: number;
    consecutiveErrors?: number;
  };
}

const EMPTY_JOB: Partial<CronJob> = {
  name: "",
  enabled: true,
  schedule: { kind: "cron", expr: "0 * * * *", tz: "America/Bogota" },
  payload: { kind: "agentTurn", message: "" },
};

function fmtDate(ms?: number) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function StatusDot({ enabled, status }: { enabled: boolean; status?: string }) {
  const color = !enabled
    ? "bg-gray-500"
    : status === "ok"
    ? "bg-emerald-400"
    : status === "error"
    ? "bg-red-400"
    : "bg-yellow-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color} mr-2`} />;
}

export function CronPageClient() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CronJob | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<CronJob>>(EMPTY_JOB);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cron");
    const data = await res.json();
    setJobs(data.jobs || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const toggleEnabled = async (job: CronJob) => {
    await fetch(`/api/cron/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !job.enabled }),
    });
    await loadJobs();
    if (selected?.id === job.id) setSelected((j) => j ? { ...j, enabled: !j.enabled } : j);
  };

  const saveEdit = async () => {
    if (!selected || !form) return;
    setSaving(true);
    await fetch(`/api/cron/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        expr: form.schedule?.expr,
        tz: form.schedule?.tz,
        message: form.payload?.message,
      }),
    });
    setSaving(false);
    setEditing(false);
    await loadJobs();
  };

  const deleteJob = async (id: string) => {
    if (!confirm("¿Eliminar este cron job?")) return;
    setDeleting(id);
    await fetch(`/api/cron/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (selected?.id === id) setSelected(null);
    await loadJobs();
  };

  const saveNew = async () => {
    setSaving(true);
    await fetch("/api/cron", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        expr: form.schedule?.expr,
        tz: form.schedule?.tz,
        message: form.payload?.message,
        enabled: form.enabled,
      }),
    });
    setSaving(false);
    setAdding(false);
    setForm(EMPTY_JOB);
    await loadJobs();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold text-text">Cron Jobs</h2>
          <p className="text-xs text-muted mt-0.5">{jobs.length} jobs configurados</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadJobs}
            className="p-2 rounded-lg text-muted hover:text-text hover:bg-bg2/60 transition-colors"
            title="Refrescar"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setAdding(true); setForm({ ...EMPTY_JOB, schedule: { kind: "cron", expr: "0 * * * *", tz: "America/Bogota" }, payload: { kind: "agentTurn", message: "" } }); }}
            className="px-3 py-1.5 rounded-lg bg-accent-cyan/10 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/20 transition-colors"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Job List */}
        <div className="w-72 shrink-0 border-r border-border overflow-y-auto">
          {loading ? (
            <div className="p-4 text-muted text-sm">Cargando...</div>
          ) : jobs.length === 0 ? (
            <div className="p-4 text-muted text-sm">No hay cron jobs.</div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => { setSelected(job); setEditing(false); }}
                className={`px-4 py-3 cursor-pointer border-b border-border/50 hover:bg-bg2/40 transition-colors ${selected?.id === job.id ? "bg-bg2" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text truncate flex items-center">
                    <StatusDot enabled={job.enabled} status={job.state?.lastRunStatus} />
                    {job.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleEnabled(job); }}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition-colors ${job.enabled ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"}`}
                  >
                    {job.enabled ? "ON" : "OFF"}
                  </button>
                </div>
                <div className="text-[11px] text-muted mt-1 font-mono">{job.schedule.expr}</div>
                {job.state?.nextRunAtMs && (
                  <div className="text-[10px] text-muted mt-0.5">Próx: {fmtDate(job.state.nextRunAtMs)}</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {adding ? (
            <div className="max-w-lg">
              <h3 className="text-base font-semibold text-text mb-4">Nuevo Cron Job</h3>
              <div className="space-y-3">
                <label className="block text-xs text-muted mb-1">Nombre</label>
                <input
                  className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text"
                  value={form.name || ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre del job"
                />
                <label className="block text-xs text-muted mb-1 mt-3">Expresión Cron</label>
                <input
                  className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text font-mono"
                  value={form.schedule?.expr || ""}
                  onChange={(e) => setForm((f) => ({ ...f, schedule: { ...f.schedule!, expr: e.target.value } }))}
                  placeholder="0 * * * *"
                />
                <label className="block text-xs text-muted mb-1 mt-3">Timezone</label>
                <input
                  className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text"
                  value={form.schedule?.tz || ""}
                  onChange={(e) => setForm((f) => ({ ...f, schedule: { ...f.schedule!, tz: e.target.value } }))}
                  placeholder="America/Bogota"
                />
                <label className="block text-xs text-muted mb-1 mt-3">Mensaje / Tarea</label>
                <textarea
                  className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text font-mono resize-none"
                  rows={4}
                  value={form.payload?.message || ""}
                  onChange={(e) => setForm((f) => ({ ...f, payload: { ...f.payload!, message: e.target.value } }))}
                  placeholder="Instrucción para el agente..."
                />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={form.enabled ?? true}
                    onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                    id="enabled-new"
                  />
                  <label htmlFor="enabled-new" className="text-sm text-text">Habilitado</label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={saveNew} disabled={saving} className="px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/80 transition-colors disabled:opacity-50">
                  {saving ? "Guardando..." : "Crear"}
                </button>
                <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg bg-bg2 text-muted text-sm hover:text-text transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : selected ? (
            <div className="max-w-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-text">{selected.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${selected.enabled ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {selected.enabled ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(true); setForm({ ...selected }); }} className="px-3 py-1.5 text-xs rounded-lg bg-bg2 text-muted hover:text-text transition-colors">Editar</button>
                  <button
                    onClick={() => deleteJob(selected.id)}
                    disabled={deleting === selected.id}
                    className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    {deleting === selected.id ? "..." : "Eliminar"}
                  </button>
                </div>
              </div>

              {editing ? (
                <div className="space-y-3">
                  <label className="block text-xs text-muted">Nombre</label>
                  <input
                    className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text"
                    value={form.name || ""}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <label className="block text-xs text-muted mt-3">Expresión Cron</label>
                  <input
                    className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text font-mono"
                    value={form.schedule?.expr || ""}
                    onChange={(e) => setForm((f) => ({ ...f, schedule: { ...f.schedule!, expr: e.target.value } }))}
                  />
                  <label className="block text-xs text-muted mt-3">Timezone</label>
                  <input
                    className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text"
                    value={form.schedule?.tz || ""}
                    onChange={(e) => setForm((f) => ({ ...f, schedule: { ...f.schedule!, tz: e.target.value } }))}
                  />
                  <label className="block text-xs text-muted mt-3">Mensaje / Tarea</label>
                  <textarea
                    className="w-full bg-bg2 border border-border rounded-lg px-3 py-2 text-sm text-text font-mono resize-none"
                    rows={5}
                    value={form.payload?.message || ""}
                    onChange={(e) => setForm((f) => ({ ...f, payload: { ...f.payload!, message: e.target.value } }))}
                  />
                  <div className="flex gap-2 mt-4">
                    <button onClick={saveEdit} disabled={saving} className="px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold disabled:opacity-50">
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg bg-bg2 text-muted text-sm hover:text-text transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs text-muted mb-1">Expresión Cron</p>
                    <code className="text-accent-cyan font-mono text-sm bg-bg2 px-2 py-1 rounded">{selected.schedule.expr}</code>
                    <span className="text-xs text-muted ml-2">{selected.schedule.tz}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted mb-1">Mensaje / Tarea</p>
                    <p className="text-text bg-bg2 px-3 py-2 rounded-lg text-xs font-mono leading-relaxed">{selected.payload.message}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted">Última ejecución</p>
                      <p className="text-text">{fmtDate(selected.state?.lastRunAtMs)}</p>
                    </div>
                    <div>
                      <p className="text-muted">Próxima ejecución</p>
                      <p className="text-text">{fmtDate(selected.state?.nextRunAtMs)}</p>
                    </div>
                    <div>
                      <p className="text-muted">Estado último run</p>
                      <p className={`font-semibold ${selected.state?.lastRunStatus === "ok" ? "text-emerald-400" : selected.state?.lastRunStatus === "error" ? "text-red-400" : "text-muted"}`}>
                        {selected.state?.lastRunStatus || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted">Duración último run</p>
                      <p className="text-text">{selected.state?.lastDurationMs ? `${(selected.state.lastDurationMs / 1000).toFixed(1)}s` : "—"}</p>
                    </div>
                    {(selected.state?.consecutiveErrors ?? 0) > 0 && (
                      <div className="col-span-2">
                        <p className="text-muted">Errores consecutivos</p>
                        <p className="text-red-400 font-semibold">{selected.state?.consecutiveErrors}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted border-t border-border pt-3 mt-2">
                    <span>ID: <code className="font-mono">{selected.id}</code></span>
                    <span className="ml-4">Actualizado: {fmtDate(selected.updatedAtMs)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted text-sm">
              Selecciona un cron job para ver sus detalles
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
