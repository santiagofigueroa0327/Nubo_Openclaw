export default function TaskDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-1.5 mb-4">
        <div className="h-3 w-10 bg-bg2/40 rounded" />
        <div className="h-3 w-3 bg-bg2/20 rounded" />
        <div className="h-3 w-16 bg-bg2/40 rounded" />
      </div>

      <div className="rounded-xl border border-border bg-surface/30 p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-5 w-20 bg-bg2/30 rounded-full" />
          <div className="h-4 w-16 bg-bg2/20 rounded" />
        </div>
        <div className="h-6 w-80 bg-bg2/40 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-12 bg-bg2/20 rounded mb-2" />
              <div className="h-4 w-24 bg-bg2/30 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-surface/30 p-5">
          <div className="h-4 w-20 bg-bg2/40 rounded mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-4 pl-6">
              <div className="h-3 w-24 bg-bg2/20 rounded mb-1" />
              <div className="h-4 w-48 bg-bg2/30 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface/30 p-5 h-48" />
          <div className="rounded-xl border border-border bg-surface/30 p-5 h-32" />
        </div>
      </div>
    </div>
  );
}
