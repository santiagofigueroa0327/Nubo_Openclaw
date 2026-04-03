"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardIcon, TasksIcon, AgentsIcon, LogsIcon, CronIcon, XIcon, SkillsIcon, MetricsIcon } from "./ui/icons";
import type { SVGProps } from "react";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
}[] = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/tasks", label: "Tasks", icon: TasksIcon },
  { href: "/agents", label: "Agents", icon: AgentsIcon },
  { href: "/logs", label: "Logs", icon: LogsIcon },
  { href: "/cron", label: "Cron Jobs", icon: CronIcon },
  { href: "/skills", label: "Skills", icon: SkillsIcon },
  { href: "/metrics", label: "Metrics", icon: MetricsIcon },
];

function SidebarContent({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border flex items-center justify-between">
        <Link
          href="/tasks"
          className="flex items-center gap-2.5"
          onClick={onClose}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">MC</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text leading-tight">
              Mission Control
            </h1>
            <p className="text-[10px] text-muted leading-tight">Gateway Ops</p>
          </div>
        </Link>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-muted hover:text-text hover:bg-bg2/60 transition-colors"
            aria-label="Close navigation"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={onClose}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-bg2 text-accent-cyan"
                    : "text-muted hover:text-text hover:bg-bg2/50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 w-0.5 h-5 bg-accent-cyan rounded-r"
                    transition={{ duration: 0.2 }}
                  />
                )}
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <p className="text-[10px] text-muted">Phase 0 &middot; Local DB</p>
      </div>
    </div>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ────────────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-bg border-r border-border flex-col z-30">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* ── Mobile drawer + backdrop ───────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              onClick={onMobileClose}
              aria-hidden="true"
            />
            {/* Drawer panel */}
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="md:hidden fixed left-0 top-0 h-screen w-56 bg-bg border-r border-border flex flex-col z-50"
            >
              <SidebarContent
                pathname={pathname}
                onClose={onMobileClose}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
