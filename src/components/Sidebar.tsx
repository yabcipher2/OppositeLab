"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/AppIcon";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  group: string;
}

interface SidebarProps {
  activePath?: string;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}

type NotificationCounts = {
  discover: number;
  match: number;
  pendingRequests: number;
  workspace: number;
  community: number;
  admin: number;
};

const emptyNotificationCounts: NotificationCounts = {
  discover: 0,
  match: 0,
  pendingRequests: 0,
  workspace: 0,
  community: 0,
  admin: 0,
};

type PaletteResult = { label: string; detail: string; href: string; category: string };

export default function Sidebar({ activePath, mobileOpen = false, onNavigate }: SidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [openReportCount, setOpenReportCount] = useState(0);
  const [notificationCounts, setNotificationCounts] = useState(emptyNotificationCounts);
  const [notificationError, setNotificationError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandResults, setCommandResults] = useState<PaletteResult[]>([]);
  const [commandLoading, setCommandLoading] = useState(false);
  const [commandError, setCommandError] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);
  const { user, signOut } = useAuth();
  const isCollapsed = collapsed && !mobileOpen;

  useEffect(() => {
    const compactSidebar = window.matchMedia("(max-width: 1024px)");
    const syncSidebarWidth = () => setCollapsed(compactSidebar.matches);
    syncSidebarWidth();
    compactSidebar.addEventListener("change", syncSidebarWidth);
    return () => compactSidebar.removeEventListener("change", syncSidebarWidth);
  }, []);

  const navItems = useMemo<NavItem[]>(() => [
    {
      label: "My Match",
      href: "/match-pairing-screen",
      icon: "SparklesIcon",
      group: "core",
    },
    {
      label: "Workspace",
      href: "/collaborative-project-workspace",
      icon: "DocumentTextIcon",
      group: "core",
    },
    {
      label: "Community Hubs",
      href: "/communities",
      icon: "BuildingLibraryIcon",
      group: "core",
    },
    {
      label: "Breakthroughs",
      href: "/breakthroughs",
      icon: "TrophyIcon",
      group: "analytics",
    },
    {
      label: "Signal Calibration",
      href: "/onboarding",
      icon: "AdjustmentsHorizontalIcon",
      group: "account",
    },
    { label: "Discover", href: "/discover", icon: "GlobeAltIcon", group: "core" },
    {
      label: "Admin Dashboard",
      href: "/admin",
      icon: "ChartBarIcon",
      group: "admin",
    },
    {
      label: "Moderation",
      href: "/moderation",
      icon: "ShieldCheckIcon",
      group: "admin",
    },
    { label: "Profile", href: "/profile", icon: "UserCircleIcon", group: "account" },
    { label: "Settings", href: "/settings", icon: "Cog6ToothIcon", group: "account" },
  ], []);

  const groups = useMemo(() => [
    { key: "core", label: "Laboratory" },
    { key: "analytics", label: "Analytics" },
    { key: "admin", label: "Moderation" },
    { key: "account", label: "Account" },
  ], []);

  const filteredNavItems = useMemo(() => {
    const hasModerationAccess = user?.role === "admin" || user?.role === "moderator";
    return navItems.filter((item) => item.group !== "admin" || hasModerationAccess);
  }, [navItems, user?.role]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      } else if (event.key === "Escape") {
        setCommandOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!commandOpen) return;
    setCommandQuery("");
    setCommandError("");
    setCommandLoading(true);
    const loadResults = async () => {
      const [creatorResponse, workspaceResponse, communityResponse] = await Promise.all([
        fetch("/api/discover", { cache: "no-store" }),
        fetch("/api/workspace", { cache: "no-store" }),
        fetch("/api/communities", { cache: "no-store" }),
      ]);
      const [creatorData, workspaceData, communityData] = await Promise.all([
        creatorResponse.json(), workspaceResponse.json(), communityResponse.json(),
      ]);
      if (!creatorResponse.ok) throw new Error(creatorData.error || "Could not search creators.");
      if (!workspaceResponse.ok) throw new Error(workspaceData.error || "Could not search workspaces.");
      if (!communityResponse.ok) throw new Error(communityData.error || "Could not search chat channels.");
      const results: PaletteResult[] = [
        ...(creatorData.creators ?? []).map((creator: { id: string; name: string; role?: string }) => ({ label: creator.name, detail: creator.role ?? "Creator", href: `/discover?search=${encodeURIComponent(creator.name)}`, category: "Creator" })),
        ...(workspaceData.projects ?? []).map((project: { id: string; title: string }) => ({ label: project.title, detail: "Workspace", href: `/collaborative-project-workspace?projectId=${encodeURIComponent(project.id)}`, category: "Workspace" })),
        ...(communityData.communities ?? []).filter((community: { joined: boolean }) => community.joined).map((community: { id: string; name: string; category?: string }) => ({ label: community.name, detail: community.category ?? "Community chat", href: `/communities/${community.id}`, category: "Chat Channel" })),
        { label: "Settings", detail: "Privacy, notifications, and appearance", href: "/settings", category: "Quick Link" },
      ];
      setCommandResults(results);
    };
    void loadResults()
      .catch((reason) => setCommandError(reason instanceof Error ? reason.message : "Could not load command search results."))
      .finally(() => setCommandLoading(false));
    window.requestAnimationFrame(() => commandInputRef.current?.focus());
  }, [commandOpen]);

  const itemsByGroup = useMemo(() => {
    const grouped: Record<string, NavItem[]> = {};
    filteredNavItems.forEach((item) => {
      if (!grouped[item.group]) grouped[item.group] = [];
      grouped[item.group].push(item);
    });
    return grouped;
  }, [filteredNavItems]);

  const visibleCommandResults = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return commandResults;
    return commandResults.filter((result) => `${result.label} ${result.detail} ${result.category}`.toLowerCase().includes(query));
  }, [commandQuery, commandResults]);

  const handleSignOut = async () => {
    setSigningOut(true);
    setLogoutError("");
    try {
      await signOut();
      // Force a fresh document so no protected dashboard UI survives logout.
      window.location.replace("/");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let notificationTimer: number | undefined;
    let reportTimer: number | undefined;
    const refreshNotifications = async () => {
      const response = await fetch("/api/sidebar-notifications", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load sidebar notifications.");
      if (!cancelled) {
        setNotificationCounts({ ...emptyNotificationCounts, ...result.counts });
        setNotificationError("");
      }
    };
    const readSection: Record<string, string> = {
      "/discover": "discover",
      "/match-pairing-screen": "match",
      "/collaborative-project-workspace": "workspace",
      "/community": "community",
      "/communities": "community",
      "/admin": "admin",
    };
    const section = activePath
      ? readSection[activePath]
        ?? (activePath.startsWith("/community") || activePath.startsWith("/communities") ? "community" : undefined)
      : undefined;
    const initialize = async () => {
      await refreshNotifications();
      if (section) {
        const response = await fetch("/api/sidebar-notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section }),
        });
        if (!response.ok) throw new Error("Could not mark sidebar notifications as read.");
        await refreshNotifications();
      }
    };
    void initialize().catch((error) => {
      if (!cancelled) setNotificationError(error instanceof Error ? error.message : "Could not load sidebar notifications.");
    });
    notificationTimer = window.setInterval(() => {
      void refreshNotifications().catch((error) => {
        if (!cancelled) setNotificationError(error instanceof Error ? error.message : "Could not load sidebar notifications.");
      });
    }, 15000);

    if (user?.role !== "moderator" && user?.role !== "admin") {
      setOpenReportCount(0);
    } else {
      const refreshReports = async () => {
        const response = await fetch("/api/moderation/reports?countOnly=1", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load moderation report count.");
        const result = await response.json();
        if (!cancelled) setOpenReportCount(Number(result.openCount) || 0);
      };
      void refreshReports().catch(() => undefined);
      reportTimer = window.setInterval(() => { void refreshReports().catch(() => undefined); }, 15000);
    }

    return () => {
      cancelled = true;
      if (notificationTimer !== undefined) window.clearInterval(notificationTimer);
      if (reportTimer !== undefined) window.clearInterval(reportTimer);
    };
  }, [activePath, user?.role]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-full min-h-0 flex-col overflow-hidden border-r border-border bg-[#17171a] transition-all duration-300 ease-in-out md:relative md:z-auto md:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
      style={{ width: mobileOpen ? "min(88vw, 340px)" : isCollapsed ? 68 : "clamp(280px, 18.9vw, 355px)" }}
    >
      {/* Logo */}
      <div className={`flex border-b border-border min-h-[76px] ${isCollapsed ? "flex-col items-center justify-center gap-1 px-2 py-2" : "items-center justify-between gap-3 px-5 py-4"}`}>
        <div className={`flex min-w-0 items-center ${isCollapsed ? "" : "gap-4"}`}>
        <svg className="h-11 w-11 shrink-0" viewBox="0 0 48 48" role="img" aria-label="OppositeLab logo">
          <defs>
            <linearGradient id="opposite-purple" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#d946ef" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="opposite-cyan" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#22d3ee" />
              <stop offset="1" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <path d="M3 19 20 3v12h12L14 33V22H3Z" fill="url(#opposite-purple)" />
          <path d="m45 29-17 16V33H16l18-18v11h11Z" fill="url(#opposite-cyan)" />
        </svg>
        {!isCollapsed && (
          <span className="font-semibold text-sm text-foreground tracking-tight truncate">
            OppositeLab
          </span>
        )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:block"
        >
          <Icon name={collapsed ? "ChevronRightIcon" : "ChevronLeftIcon"} size={16} />
        </button>
        <button
          type="button"
          onClick={onNavigate}
          aria-label="Close navigation menu"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
        >
          <Icon name="XMarkIcon" size={20} />
        </button>
      </div>

      <div className="border-b border-border px-3 py-3">
        <button type="button" onClick={() => setCommandOpen(true)} title={isCollapsed ? "Search (Ctrl+K)" : undefined} className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
          <Icon name="MagnifyingGlassIcon" size={17} />
          {!isCollapsed && <><span className="flex-1">Search OppositeLab</span><kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px]">⌘K / Ctrl+K</kbd></>}
        </button>
      </div>

      {/* Nav */}
      <nav className="min-h-0 flex-1 overscroll-y-contain overflow-y-auto scrollbar-thin py-4">
        {notificationError && !isCollapsed && <p role="alert" className="mx-3 mb-3 rounded-lg bg-negative/10 px-3 py-2 text-xs text-negative">{notificationError}</p>}
        {groups.map((group) => {
          const items = itemsByGroup[group.key] ?? [];
          if (!items.length) return null;
          return (
            <div key={`group-${group.key}`} className="mb-6">
              {!isCollapsed && (
              <p className="px-3 mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5 px-2">
                {items.map((item) => {
                  const isActive = activePath === item.href.split("#")[0];
                  const badge = item.label === "Moderation"
                    ? openReportCount
                    : item.label === "Discover"
                      ? notificationCounts.discover
                      : item.label === "My Match"
                        ? notificationCounts.pendingRequests
                        : item.label === "Workspace"
                          ? notificationCounts.workspace
                          : item.label === "Community Hubs"
                            ? notificationCounts.community
                            : item.label === "Admin Dashboard"
                              ? notificationCounts.admin
                              : item.badge;
                  return (
                <li key={`nav-${item.label}`}>
                      <Link
                        href={item.href}
                        prefetch
                        onMouseEnter={() => router.prefetch(item.href)}
                        onFocus={() => router.prefetch(item.href)}
                        onTouchStart={() => router.prefetch(item.href)}
                        onClick={() => {
                          onNavigate?.();
                          if (item.label === "Signal Calibration" && activePath === item.href) {
                            window.dispatchEvent(new Event("oppositelab:edit-onboarding"));
                          }
                        }}
                        title={isCollapsed ? item.label : undefined}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-all duration-150 relative group
                          ${
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                          }`}
                      >
                        <Icon
                          name={item.icon as Parameters<typeof Icon>[0]["name"]}
                          size={18}
                          className={
                            isActive
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                          }
                        />
                        {!isCollapsed && (
                          <span className="flex-1 truncate">{item.label}</span>
                        )}
                        {!isCollapsed && badge !== undefined && badge > 0 && (
                          <span className="text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono-data">
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                        {isCollapsed && badge !== undefined && badge > 0 && (
                          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-border p-3 space-y-2">
        {!isCollapsed && (
          <Link href="/profile" onClick={onNavigate} className="flex min-h-11 items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-purple-cyan flex items-center justify-center shrink-0">
              {typeof user?.photo === "string" && user.photo ? (
                <img src={user.photo} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-white">{(user?.name ?? "?").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.name ?? "Guest"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {typeof user?.roleLabel === "string" ? user.roleLabel : user?.role ?? "Not signed in"}
              </p>
            </div>
          </Link>
        )}
        {user && <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} title={isCollapsed ? "Sign out" : undefined} className="min-h-11 w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-negative/10 hover:text-negative disabled:opacity-50" aria-label="Sign out">
          <Icon name="ArrowRightOnRectangleIcon" size={17} />
          {!isCollapsed && <span>{signingOut ? "Signing out…" : "Sign out"}</span>}
        </button>}
        {logoutError && !isCollapsed && <p role="alert" className="px-2 text-xs text-negative">{logoutError}</p>}
      </div>
      {commandOpen && <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[12vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="command-palette-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <h2 id="command-palette-title" className="sr-only">Search OppositeLab</h2>
          <div className="flex items-center gap-3 border-b border-border px-4"><Icon name="MagnifyingGlassIcon" size={19} className="text-muted-foreground" /><input ref={commandInputRef} value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="Search creators, workspaces, chat channels, settings…" className="min-w-0 flex-1 bg-transparent py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground" /><kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd></div>
          <div className="max-h-[55vh] overflow-y-auto p-2">
            {commandLoading ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">Searching…</p> : commandError ? <p role="alert" className="px-3 py-5 text-sm text-negative">{commandError}</p> : visibleCommandResults.length ? <ul>{visibleCommandResults.map((result, index) => <li key={`${result.category}-${result.href}-${result.label}-${index}`}><button type="button" onClick={() => { setCommandOpen(false); onNavigate?.(); router.push(result.href); if (result.category === "Creator") window.dispatchEvent(new CustomEvent("oppositelab:discover-search", { detail: { query: result.label } })); if (result.category === "Workspace") window.dispatchEvent(new CustomEvent("oppositelab:workspace-project", { detail: { projectId: new URL(result.href, window.location.origin).searchParams.get("projectId") } })); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-secondary"><span className="flex-1"><span className="block text-sm font-medium text-foreground">{result.label}</span><span className="block text-xs text-muted-foreground">{result.detail}</span></span><span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{result.category}</span></button></li>)}</ul> : <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching results.</p>}
          </div>
          <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">Creators · Workspaces · Chat Channels · Settings</div>
        </section>
      </div>}
    </aside>
  );
}
