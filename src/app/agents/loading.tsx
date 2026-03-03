export default function AgentsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-6 w-20 bg-bg2/60 rounded mb-2" />
        <div className="h-4 w-40 bg-bg2/40 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-bg2/40 rounded-lg" />
              <div>
                <div className="h-4 w-24 bg-bg2/40 rounded mb-1" />
                <div className="h-3 w-32 bg-bg2/20 rounded" />
              </div>
            </div>
            <div className="flex gap-1.5 mb-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-5 w-16 bg-bg2/20 rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
