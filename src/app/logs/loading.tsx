export default function LogsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-6 w-16 bg-bg2/60 rounded mb-2" />
        <div className="h-4 w-48 bg-bg2/40 rounded" />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1 p-0.5 bg-bg2/30 rounded-md">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-12 bg-bg2/20 rounded" />
          ))}
        </div>
        <div className="h-6 w-56 bg-bg2/20 rounded" />
      </div>
      <div className="rounded-xl border border-border bg-bg/50">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-3 py-2 border-b border-border/20">
            <div className="h-3 w-32 bg-bg2/20 rounded" />
            <div className="h-3 w-12 bg-bg2/30 rounded" />
            <div className="h-3 w-20 bg-bg2/20 rounded" />
            <div className="h-3 flex-1 bg-bg2/20 rounded max-w-xs" />
          </div>
        ))}
      </div>
    </div>
  );
}
