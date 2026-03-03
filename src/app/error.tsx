"use client";

import { AlertCircleIcon, RefreshIcon } from "@/components/ui/icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <AlertCircleIcon className="w-12 h-12 text-red-400 mb-4" />
      <h2 className="text-lg font-semibold text-text mb-2">Something went wrong</h2>
      <p className="text-sm text-muted mb-6 max-w-md text-center">
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-bg2 border border-border rounded-lg text-text hover:border-accent-cyan/30 transition-colors"
      >
        <RefreshIcon className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}
