"use client";
export function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border transition-colors ${
      connected
        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        : "bg-amber-500/10 border-amber-500/30 text-amber-400"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
      {connected ? "Live" : "Reconnecting"}
    </div>
  );
}
