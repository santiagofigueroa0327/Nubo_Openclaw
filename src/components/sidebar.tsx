"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { TasksIcon, AgentsIcon, LogsIcon } from "./ui/icons";
import type { SVGProps } from "react";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
}[] = [
  { href: "/tasks", label: "Tasks", icon: TasksIcon },
  { href: "/agents", label: "Agents", icon: AgentsIcon },
  { href: "/logs", label: "Logs", icon: LogsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-bg border-r border-border flex flex-col z-30">
      <div className="px-5 py-5 border-b border-border">
        <Link href="/tasks" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
            <span className="text-white text-sm font-bold">MC</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text leading-tight">
              Mission Control
            </h1>
            <p className="text-[10px] text-muted leading-tight">Gateway Ops</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
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
    </aside>
  );
}
