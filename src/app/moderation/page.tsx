"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import Icon from "@/components/ui/AppIcon";
import { useAuth } from "@/contexts/AuthContext";

interface Report { id: string; target: string; reason: string; details?: string; reportedBy?: string; createdAt: string }
interface ManagedUser { id: string; name: string; email: string; role: "creator" | "moderator" | "admin"; status: "active" | "suspended" }

function AdminModeratorTools() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/admin/moderators", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load accounts.");
    setUsers(data.users);
  }, []);

  useEffect(() => {
    loadUsers().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load accounts.")).finally(() => setLoading(false));
  }, [loadUsers]);

  const filteredUsers = useMemo(() => users.filter((managedUser) => `${managedUser.name} ${managedUser.email}`.toLowerCase().includes(query.trim().toLowerCase())), [users, query]);

  const changeRole = async (user: ManagedUser, role: "creator" | "moderator") => {
    setSavingId(user.id); setError("");
    try {
      const response = await fetch("/api/admin/moderators", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, role }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not change account role.");
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role } : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not change account role."); }
    finally { setSavingId(""); }
  };

  return <section className="mb-7 rounded-2xl border border-primary/20 bg-card p-5"><div className="mb-4"><h2 className="font-semibold">Moderator Roster &amp; Promotion</h2><p className="mt-1 text-sm text-muted-foreground">Manage active community moderators. Admins can grant or revoke moderator privileges for trusted creators.</p></div>
    {error && <p role="alert" className="mb-3 text-sm text-negative">{error}</p>}
    <label className="mb-3 block"><span className="sr-only">Search moderators and creators by name or email</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
    {loading ? <p className="text-sm text-muted-foreground">Loading accounts…</p> : filteredUsers.length ? <ul className="divide-y divide-border">{filteredUsers.map((managedUser) => <li key={managedUser.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{managedUser.name}</span><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${managedUser.role === "admin" ? "bg-primary/10 text-primary" : managedUser.role === "moderator" ? "bg-positive/10 text-positive" : "bg-secondary text-muted-foreground"}`}>{managedUser.role === "admin" ? "Admin" : managedUser.role === "moderator" ? "Moderator" : "Creator"}</span>{managedUser.status === "suspended" && <span className="rounded-full bg-negative/10 px-2 py-0.5 text-xs text-negative">Suspended</span>}</span><span className="block truncate text-xs text-muted-foreground">{managedUser.email}</span></span>{managedUser.role === "admin" ? null : managedUser.status === "suspended" ? <span className="text-xs text-muted-foreground">Inactive account</span> : managedUser.role === "creator" ? <button type="button" disabled={savingId === managedUser.id} onClick={() => void changeRole(managedUser, "moderator")} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{savingId === managedUser.id ? "Saving…" : "Promote to Moderator"}</button> : <button type="button" disabled={savingId === managedUser.id} onClick={() => void changeRole(managedUser, "creator")} className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50">{savingId === managedUser.id ? "Saving…" : "Revoke Moderator Role"}</button>}</li>)}</ul> : <p className="text-sm text-muted-foreground">{users.length ? "No accounts match your search." : "No creator or moderator accounts found."}</p>}
  </section>;
}

export default function ModerationPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReports = useCallback(async () => {
    const response = await fetch("/api/moderation/reports");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load reports.");
    setReports(result.reports ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/moderation/reports")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load reports.");
        return result.reports ?? [];
      })
      .then((items) => { if (!cancelled) setReports(items); })
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load reports."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadReports().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not refresh reports."));
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadReports]);

  const resolveReport = async (report: Report, decision: "dismissed" | "removed") => {
    setSavingId(report.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/moderation/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: report.id, decision }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not resolve the report.");
      setReports((current) => current.filter((item) => item.id !== report.id));
      setNotice(`Report ${decision}.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not resolve the report.");
    } finally {
      setSavingId("");
    }
  };

  return (
    <AppLayout activePath="/moderation">
      <main className="min-h-screen bg-background px-6 py-8 lg:px-10"><div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon name="ShieldCheckIcon" size={24} /></div><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Safety desk</p><h1 className="mt-1 text-3xl font-bold text-foreground">Moderation queue</h1><p className="mt-1 text-sm text-muted-foreground">Review community reports and record a decision.</p></div></header>
        {error && <div role="alert" className="mb-4 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">{error}</div>}
        {notice && <div role="status" className="mb-4 rounded-lg border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">{notice}</div>}
        {user?.role === "admin" && <AdminModeratorTools />}
        {loading ? <p className="py-16 text-center text-sm text-muted-foreground">Loading reports…</p> : error.includes("Moderator access") ? <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center"><h2 className="font-semibold text-foreground">Moderator access required</h2><p className="mt-2 text-sm text-muted-foreground">An administrator must grant your account the moderator role before you can review reports.</p></div> : <>
          <div className="mb-5 rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Open reports</p><p className="mt-1 text-2xl font-bold text-foreground">{reports.length}</p></div>
          {reports.length ? <section className="space-y-3" aria-label="Open reports">{reports.map((report) => <article key={report.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-foreground">{report.target}</h2><span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs text-warning">{report.reason}</span></div><p className="mt-1 text-xs text-muted-foreground">Reported by {report.reportedBy || "Community member"} · {new Date(report.createdAt).toLocaleString()}</p></div><span className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">Open</span></div><p className="mt-4 rounded-lg bg-background/60 p-3 text-sm text-muted-foreground">{report.details || "No additional details were provided."}</p><div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" disabled={savingId === report.id} onClick={() => void resolveReport(report, "dismissed")} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-50">Dismiss</button><button type="button" disabled={savingId === report.id} onClick={() => void resolveReport(report, "removed")} className="rounded-lg bg-negative px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">Remove reported content</button></div></article>)}</section> : <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center"><Icon name="CheckCircleIcon" size={32} className="mx-auto text-positive" /><h2 className="mt-3 font-semibold text-foreground">No open reports</h2><p className="mt-1 text-sm text-muted-foreground">New community reports will appear here.</p></div>}
        </>}
      </div></main>
    </AppLayout>
  );
}
