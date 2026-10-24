"use client";

import { useEffect, useState } from "react";

type Nomination = {
  id: string; projectId: string; title: string; content: string; members: Array<{ id: string; name: string }>;
  nominatedBy: string; createdAt: string; status: "pending" | "approved" | "rejected";
  milestones: Array<{ title: string; completed: boolean }>; contribution: { first: number; second: number };
  signoffs: Array<{ id: string; name: string; signed: boolean }>;
  eligibility: { eligible: boolean; reason: string | null; wordCount: number; resonancePoint: string };
};
type AuditAction = { id: string; actor: string; action: string; target: string; changes: Record<string, unknown>; createdAt: string };

export default function AdminOversight({ view }: { view: "nominations" | "audit" }) {
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [actions, setActions] = useState<AuditAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    const endpoint = view === "nominations" ? "/api/admin/nominations" : "/api/admin/audit-log";
    fetch(endpoint, { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load admin oversight data.");
      return data;
    }).then((data) => {
      if (cancelled) return;
      if (view === "nominations") setNominations(data.nominations ?? []);
      else setActions(data.actions ?? []);
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load admin oversight data."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [view]);

  const decide = async (nomination: Nomination, status: "approved" | "rejected") => {
    setSavingId(nomination.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/nominations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: nomination.id, status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update nomination.");
      setNominations((current) => current.map((item) => item.projectId === nomination.projectId ? { ...item, status } : item));
      setNotice(`${nomination.title} ${status}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update nomination."); }
    finally { setSavingId(""); }
  };

  const readableAction = (action: string, changes: Record<string, unknown>) => {
    if (action === "update_user" && changes.status === "suspended") return "suspended an account";
    if (action === "update_user" && changes.status === "active") return "restored an account";
    if (action === "update_user" && changes.role) return `changed a role to ${String(changes.role)}`;
    if (action === "update_community" && changes.status === "archived") return "archived a community";
    if (action === "update_community") return "updated a community";
    if (action === "create_community") return "created a community";
    if (action === "approve_nomination") return "approved a nomination";
    if (action === "reject_nomination") return "rejected a nomination";
    return action.replaceAll("_", " ");
  };

  return <section className="rounded-2xl border border-border bg-card p-5">
    <div><h2 className="text-lg font-semibold">{view === "nominations" ? "Nomination review queue" : "Audit log"}</h2><p className="mt-1 text-sm text-muted-foreground">{view === "nominations" ? "Review completed co-creations and collaborator sign-offs before publication in the Breakthrough Index." : "Recent administrative changes and moderation decisions."}</p></div>
    {error && <p role="alert" className="mt-4 text-sm text-negative">{error}</p>}{notice && <p role="status" className="mt-4 text-sm text-positive">{notice}</p>}
    {loading ? <p className="py-8 text-sm text-muted-foreground">Loading…</p> : view === "nominations" ? nominations.length ? <div className="mt-4 space-y-4">
      {nominations.map((item) => <article key={item.id} className="rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">Nominated by {item.nominatedBy} · {new Date(item.createdAt).toLocaleString()}</p></div><span className={`rounded-full px-2.5 py-1 text-xs capitalize ${item.status === "approved" ? "bg-positive/10 text-positive" : "bg-warning/10 text-warning"}`}>{item.status}</span></div>
        <div className="mt-4 grid gap-4 md:grid-cols-2"><div><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project content</h4><p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 text-sm">{item.content || "No project canvas content available."}</p></div><div><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Readiness</h4><p className="mt-2 text-sm">Collaborators: {item.members.map((member) => member.name).join(" & ") || "Not listed"}</p><p className="mt-1 text-sm">Contribution balance: {item.members[0]?.name ?? "User A"} {item.contribution.first}% · {item.members[1]?.name ?? "User B"} {item.contribution.second}%</p><p className="mt-1 text-sm">Draft length: {item.eligibility.wordCount} words · Resonance anchor: {item.eligibility.resonancePoint || "Not set"}</p><ul className="mt-2 space-y-1 text-sm">{item.milestones.length ? item.milestones.map((milestone, index) => <li key={`${item.id}-${index}`} className={milestone.completed ? "text-positive" : "text-muted-foreground"}>{milestone.completed ? "✓" : "○"} {milestone.title}</li>) : <li className="text-muted-foreground">No milestones recorded.</li>}</ul><ul className="mt-3 space-y-1 text-sm">{item.signoffs.map((signoff) => <li key={signoff.id} className={signoff.signed ? "text-positive" : "text-warning"}>{signoff.signed ? "✓" : "○"} {signoff.name} {signoff.signed ? "signed off" : "has not signed off"}</li>)}</ul>{!item.eligibility.eligible && <p className="mt-3 rounded-lg bg-warning/10 p-2 text-xs text-warning">{item.eligibility.reason ?? "This project is not eligible for publication."}</p>}</div></div>
        {item.status === "pending" && <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={savingId === item.id} onClick={() => void decide(item, "rejected")} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">Reject</button><button type="button" disabled={savingId === item.id || !item.eligibility.eligible || item.signoffs.length !== 2 || item.signoffs.some((signoff) => !signoff.signed)} onClick={() => void decide(item, "approved")} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{savingId === item.id ? "Saving…" : "Approve for Breakthroughs"}</button></div>}
      </article>)}
    </div> : <p className="py-8 text-center text-sm text-muted-foreground">No nominations awaiting or completed review.</p> : actions.length ? <ol className="mt-4 divide-y divide-border">{actions.map((action) => <li key={action.id} className="py-3 text-sm"><span className="font-medium">{action.actor}</span> {readableAction(action.action, action.changes)} <span className="font-medium">{action.target}</span><time className="mt-1 block text-xs text-muted-foreground">{new Date(action.createdAt).toLocaleString()}</time></li>)}</ol> : <p className="py-8 text-center text-sm text-muted-foreground">No admin actions recorded.</p>}
  </section>;
}
