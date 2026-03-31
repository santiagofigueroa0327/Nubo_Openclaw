"use client";

import { usePathname } from "next/navigation";
import { SearchIcon, UserIcon, MenuIcon } from "./ui/icons";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks",
  "/agents": "Agents",
  "/logs": "Logs",
  "/cron": "Cron Jobs",
  "/skills": "Skills",
  "/metrics": "Metrics",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/tasks/")) return "Task Detail";
  if (pathname.startsWith("/agents/")) return "Agent Detail";
  if (pathname.startsWith("/missions/")) return "Mission Detail";
  return PAGE_TITLES[pathname] ?? "Dashboard";
}

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 h-14 bg-bg/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg text-muted hover:text-text hover:bg-bg2/60 transition-colors"
          aria-label="Open navigation"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        <h2 className="text-base font-semibold text-text">
          {getPageTitle(pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Search — hidden on mobile to avoid crowding */}
        <div className="relative hidden md:block">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search..."
            className="w-52 pl-9 pr-3 py-1.5 text-xs bg-bg2/50 border border-border rounded-lg text-text placeholder:text-muted/60 focus:outline-none focus:border-accent-cyan/50 transition-colors"
          />
        </div>

        <div className="w-8 h-8 rounded-full bg-bg2 border border-border flex items-center justify-center shrink-0">
          <UserIcon className="w-4 h-4 text-muted" />
        </div>
      </div>
    </header>
  );
}
