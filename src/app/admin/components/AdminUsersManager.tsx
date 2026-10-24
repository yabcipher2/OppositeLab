"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type ManagedUser = { id: string; name: string; email: string; role: "creator" | "moderator" | "admin"; status: "active" | "suspended"; createdAt: string };

export default function AdminUsersManager() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<ManagedUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/users", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load users.");
      return data.users as ManagedUser[];
    }).then((items) => { if (!cancelled) setUsers(items); }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load users."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visibleUsers = useMemo(() => users.filter((item) => `${item.name} ${item.email} ${item.role} ${item.status}`.toLowerCase().includes(query.trim().toLowerCase())), [users, query]);

  const updateUser = async (target: ManagedUser, changes: { role?: "creator" | "moderator"; status?: "active" | "suspended" }) => {
    setSavingId(target.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: target.id, ...changes }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update account.");
      setUsers((current) => current.map((item) => item.id === target.id ? { ...item, ...data.user } : item));
      setNotice(`Updated ${target.name}'s account.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update account."); }
    finally { setSavingId(""); }
  };

  return <section className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-semibold">Manage users</h2><p className="mt-1 text-sm text-muted-foreground">Change creator and moderator roles or suspend and restore accounts.</p></div><label className="text-sm"><span className="sr-only">Search users</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="w-64 rounded-lg border border-border bg-background px-3 py-2" /></label></div>
    {error && <p role="alert" className="mt-4 text-sm text-negative">{error}</p>}{notice && <p role="status" className="mt-4 text-sm text-positive">{notice}</p>}
    {loading ? <p className="py-8 text-sm text-muted-foreground">Loading accounts…</p> : visibleUsers.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="py-2">Account</th><th>Role</th><th>Status</th><th className="text-right">Account action</th></tr></thead><tbody className="divide-y divide-border">{visibleUsers.map((account) => { const selfAccount = account.id === currentUser?._id; const protectedAccount = account.role === "admin" || selfAccount; return <tr key={account.id}><td className="py-3"><p className="font-medium">{account.name}{selfAccount && <span className="ml-2 text-xs text-primary">You</span>}</p><p className="text-xs text-muted-foreground">{account.email}</p></td><td>{account.role === "admin" ? <span className="text-xs text-primary">Administrator</span> : <select aria-label={`Role for ${account.name}`} disabled={protectedAccount || savingId === account.id} value={account.role} onChange={(event) => void updateUser(account, { role: event.target.value as "creator" | "moderator" })} className="rounded-lg border border-border bg-background px-2 py-1.5"><option value="creator">Creator</option><option value="moderator">Moderator</option></select>}</td><td><span className={account.status === "active" ? "text-positive" : "text-negative"}>{account.status}</span></td><td className="text-right">{account.role !== "admin" && <button type="button" disabled={selfAccount || savingId === account.id} onClick={() => account.status === "active" ? setSuspendTarget(account) : void updateUser(account, { status: "active" })} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium disabled:opacity-50">{savingId === account.id ? "Saving…" : account.status === "active" ? "Suspend" : "Restore"}</button>}</td></tr>; })}</tbody></table></div> : <p className="py-8 text-center text-sm text-muted-foreground">No matching accounts.</p>}
    {suspendTarget && <div role="dialog" aria-modal="true" aria-labelledby="suspend-user-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"><h3 id="suspend-user-title" className="text-lg font-semibold">Suspend {suspendTarget.name}?</h3><p className="mt-2 text-sm text-muted-foreground">This account will lose access until an administrator restores it.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setSuspendTarget(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button><button type="button" disabled={savingId === suspendTarget.id} onClick={() => { const target = suspendTarget; setSuspendTarget(null); void updateUser(target, { status: "suspended" }); }} className="rounded-lg bg-negative px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Suspend user</button></div></div></div>}
  </section>;
}
