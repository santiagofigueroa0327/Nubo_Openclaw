import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <h2 className="text-4xl font-bold text-text mb-2">404</h2>
      <p className="text-sm text-muted mb-6">Page not found</p>
      <Link
        href="/tasks"
        className="px-4 py-2 text-sm bg-bg2 border border-border rounded-lg text-text hover:border-accent-cyan/30 transition-colors"
      >
        Back to Tasks
      </Link>
    </div>
  );
}
