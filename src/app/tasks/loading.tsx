export default function TasksLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 w-24 bg-bg2/60 rounded mb-2" />
          <div className="h-4 w-32 bg-bg2/40 rounded" />
        </div>
        <div className="h-8 w-20 bg-bg2/40 rounded-lg" />
      </div>

      <div className="flex gap-1 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-bg2/30 rounded-md" />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface/30 overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 bg-bg2/40 rounded" style={{ width: `${60 + i * 10}px` }} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-4 py-3 flex gap-4 items-center">
            <div className="h-5 w-20 bg-bg2/30 rounded-full" />
            <div className="h-4 bg-bg2/30 rounded flex-1 max-w-xs" />
            <div className="h-4 w-20 bg-bg2/20 rounded hidden md:block" />
            <div className="h-4 w-16 bg-bg2/20 rounded hidden lg:block" />
            <div className="h-4 w-16 bg-bg2/20 rounded hidden sm:block" />
            <div className="h-4 w-14 bg-bg2/20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
