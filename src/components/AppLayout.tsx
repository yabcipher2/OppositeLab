"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

export default function AppLayout({ children, activePath }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const isMatchDashboard = activePath === "/match-pairing-screen";

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center text-muted-foreground" role="status" aria-live="polite">
        {loading ? "Checking your session…" : "Signing out…"}
      </main>
    );
  }

  return (
    <div className={`${isMatchDashboard ? "fixed inset-0" : "relative h-dvh"} flex min-h-0 w-full overflow-hidden bg-background`}>
      {mobileNavigationOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavigationOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}
      <Sidebar
        activePath={activePath}
        mobileOpen={mobileNavigationOpen}
        onNavigate={() => setMobileNavigationOpen(false)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileNavigationOpen}
            onClick={() => setMobileNavigationOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-foreground"
          >
            <span aria-hidden="true" className="text-xl leading-none">☰</span>
          </button>
          <span className="font-semibold text-foreground">OppositeLab</span>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto scrollbar-thin pb-[env(safe-area-inset-bottom)]">
          {children}
        </main>
      </div>
    </div>
  );
}
