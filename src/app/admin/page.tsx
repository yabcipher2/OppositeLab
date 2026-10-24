"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import Icon from "@/components/ui/AppIcon";
import AdminUsersManager from "./components/AdminUsersManager";
import AdminCommunitiesManager from "./components/AdminCommunitiesManager";
import AdminOversight from "./components/AdminOversight";
import AdminReportsManager from "./components/AdminReportsManager";

type Tab = "overview" | "accounts" | "requests" | "reports" | "communities" | "nominations" | "audit";
type DashboardData = {
  counts: { users: number; moderators: number; suspendedUsers: number; communities: number; activeMatches: number; pendingRequests: number; openReports: number };
  recentUsers: Array<{ id: string; name: string; email: string; role: string; createdAt: string }>;
  recentReports: Array<{ id: string; target: string; reason: string; reportedBy: string; createdAt: string }>;
  pendingRequests: Array<{ id: string; requester: string; recipient: string; createdAt: string }>;
};

const cards: Array<{ key: keyof DashboardData["counts"]; label: string; icon: string; tab: Tab }> = [
  { key: "users", label: "Accounts", icon: "UsersIcon", tab: "accounts" },
  { key: "moderators", label: "Moderators", icon: "ShieldCheckIcon", tab: "accounts" },
  { key: "suspendedUsers", label: "Suspended accounts", icon: "NoSymbolIcon", tab: "accounts" },
  { key: "communities", label: "Communities", icon: "UserGroupIcon", tab: "communities" },
  { key: "activeMatches", label: "Active matches", icon: "SparklesIcon", tab: "requests" },
  { key: "pendingRequests", label: "Pending match requests", icon: "ClockIcon", tab: "requests" },
  { key: "openReports", label: "Open reports", icon: "ExclamationTriangleIcon", tab: "reports" },
];
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" }, { id: "accounts", label: "Accounts" },
  { id: "requests", label: "Requests" }, { id: "reports", label: "Moderation" },
  { id: "communities", label: "Communities" }, { id: "nominations", label: "Nominations" }, { id: "audit", label: "Audit Log" },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load the admin dashboard.");
      if (!cancelled) { setData(result); setError(""); }
    };
    load().catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load the admin dashboard."); }).finally(() => { if (!cancelled) setLoading(false); });
    const timer = window.setInterval(() => { void load().catch(() => undefined); }, 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  return <AppLayout activePath="/admin"><div className="mx-auto max-w-7xl space-y-7 px-6 py-8 xl:px-10">
    <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Administration</p><h1 className="mt-2 text-3xl font-bold text-foreground">Admin dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Manage accounts, community safety, nominations, and platform activity.</p></header>
    <nav aria-label="Admin dashboard sections" className="flex flex-wrap gap-2 border-b border-border pb-3">{tabs.map((item) => <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)} className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === item.id ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"}`}>{item.label}</button>)}</nav>
    {error && <div role="alert" className="rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">{error}{error.includes("Administrator access") && <p className="mt-1">An administrator must grant your account the `admin` role in MongoDB Compass first.</p>}</div>}
    {loading && !data ? <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading dashboard…</div> : data && <>
      {tab === "overview" && <>
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Platform totals">{cards.map((card) => <button type="button" key={card.key} onClick={() => setTab(card.tab)} className="rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/50 hover:shadow-sm"><span className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{card.label}</span><Icon name={card.icon} size={19} className="text-primary" /></span><span className="mt-4 block text-3xl font-bold tabular-nums">{data.counts[card.key]}</span></button>)}</section>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Recent accounts</h2><p className="mt-1 text-xs text-muted-foreground">Latest registered users</p></div><button type="button" onClick={() => setTab("accounts")} className="text-sm font-medium text-primary">Manage accounts</button></div>{data.recentUsers.length ? <ul className="divide-y divide-border">{data.recentUsers.map((account) => <li key={account.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-medium">{account.name}</p><p className="text-xs text-muted-foreground">{account.email}</p></div><span className="rounded-full border border-border px-2.5 py-1 text-xs capitalize text-muted-foreground">{account.role}</span></li>)}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">No accounts yet.</p>}</section>
          <section className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Open reports</h2><p className="mt-1 text-xs text-muted-foreground">Reports awaiting moderator review</p></div><button type="button" onClick={() => setTab("reports")} className="text-sm font-medium text-primary">Review queue</button></div>{data.recentReports.length ? <ul className="divide-y divide-border">{data.recentReports.map((report) => <li key={report.id} className="py-3"><p className="text-sm font-medium">{report.target}</p><p className="mt-1 text-xs text-muted-foreground">{report.reason} · {report.reportedBy} · {new Date(report.createdAt).toLocaleString()}</p></li>)}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">No open reports.</p>}</section>
        </div>
        <AdminOversight view="audit" />
      </>}
      {tab === "accounts" && <AdminUsersManager />}
      {tab === "requests" && <section className="rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-semibold">Collaboration requests</h2><p className="mt-1 text-sm text-muted-foreground">{data.counts.pendingRequests} pending requests · {data.counts.activeMatches} active collaborations.</p>{data.pendingRequests.length ? <ul className="mt-4 divide-y divide-border">{data.pendingRequests.map((request) => <li key={request.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span><strong>{request.requester}</strong> requested to collaborate with <strong>{request.recipient}</strong></span><time className="text-xs text-muted-foreground">{new Date(request.createdAt).toLocaleString()}</time></li>)}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">No pending requests.</p>}</section>}
      {tab === "reports" && <AdminReportsManager />}
      {tab === "communities" && <AdminCommunitiesManager />}
      {tab === "nominations" && <AdminOversight view="nominations" />}
      {tab === "audit" && <AdminOversight view="audit" />}
      <p className="text-right text-xs text-muted-foreground">Dashboard refreshes every 30 seconds.</p>
    </>}
  </div></AppLayout>;
}
