"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <Sidebar
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      {/* Desktop: offset main content past the sidebar.
          Mobile: no offset — sidebar is a drawer overlay. */}
      <main className="md:ml-56 min-h-screen">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </>
  );
}
