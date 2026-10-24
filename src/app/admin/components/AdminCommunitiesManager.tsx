"use client";

import { useEffect, useState, type FormEvent } from "react";

type ManagedCommunity = { id: string; name: string; category: string; description: string; status: "active" | "archived"; creatorName: string; members: number; createdAt: string };

export default function AdminCommunitiesManager() {
  const [communities, setCommunities] = useState<ManagedCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<ManagedCommunity | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/communities", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load communities.");
      return data.communities as ManagedCommunity[];
    }).then((items) => { if (!cancelled) setCommunities(items); })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load communities."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const updateCommunity = async (community: ManagedCommunity, changes: Partial<Pick<ManagedCommunity, "name" | "category" | "description" | "status">>) => {
    setSavingId(community.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/communities", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ communityId: community.id, ...changes }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update community.");
      setCommunities((current) => current.map((item) => item.id === community.id ? { ...item, ...changes } : item));
      setNotice(`Updated ${community.name}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update community."); }
    finally { setSavingId(""); }
  };

  const createCommunity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setCreateSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/communities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), category: form.get("category"), description: form.get("description") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create community.");
      setCommunities((current) => [data.community as ManagedCommunity, ...current]);
      setCreating(false); setNotice(`Created ${data.community.name}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create community."); }
    finally { setCreateSaving(false); }
  };

  return <section className="rounded-2xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Manage communities</h2><p className="mt-1 text-sm text-muted-foreground">Edit community details or archive and restore a community. Archiving preserves its members and messages.</p></div><button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">+ Create Community</button></div>
    {error && <p role="alert" className="mt-4 text-sm text-negative">{error}</p>}{notice && <p role="status" className="mt-4 text-sm text-positive">{notice}</p>}
    {creating && <div role="dialog" aria-modal="true" aria-labelledby="create-community-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={(event) => void createCommunity(event)} className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"><h3 id="create-community-title" className="text-lg font-semibold">Create community</h3><div className="mt-4 space-y-3"><label className="block text-sm">Name<input name="name" required minLength={3} maxLength={80} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label><label className="block text-sm">Topic<input name="category" maxLength={40} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label><label className="block text-sm">Description<textarea name="description" required minLength={10} maxLength={500} rows={4} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button><button disabled={createSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{createSaving ? "Creating…" : "Create"}</button></div></form></div>}
    {archiveTarget && <div role="dialog" aria-modal="true" aria-labelledby="archive-community-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"><h3 id="archive-community-title" className="text-lg font-semibold">Archive {archiveTarget.name}?</h3><p className="mt-2 text-sm text-muted-foreground">Members and messages will be preserved, but the community will no longer be active.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setArchiveTarget(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button><button type="button" disabled={savingId === archiveTarget.id} onClick={() => { const target = archiveTarget; setArchiveTarget(null); void updateCommunity(target, { status: "archived" }); }} className="rounded-lg bg-negative px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Archive community</button></div></div></div>}
    {loading ? <p className="py-8 text-sm text-muted-foreground">Loading communities…</p> : communities.length ? <div className="mt-4 space-y-3">{communities.map((community) => <details key={community.id} className="rounded-xl border border-border p-4"><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3"><span><span className="font-medium">{community.name}</span><span className="ml-2 rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted-foreground">{community.status}</span></span><span className="text-xs text-muted-foreground">{community.members} members · Created by {community.creatorName}</span></summary><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void updateCommunity(community, { name: String(form.get("name")), category: String(form.get("category")), description: String(form.get("description")) }); }} className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2"><label className="text-xs font-medium">Name<input name="name" required minLength={3} maxLength={80} defaultValue={community.name} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label><label className="text-xs font-medium">Topic<input name="category" maxLength={40} defaultValue={community.category} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label><label className="text-xs font-medium md:col-span-2">Description<textarea name="description" required minLength={10} maxLength={500} rows={3} defaultValue={community.description} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label><div className="flex flex-wrap justify-between gap-2 md:col-span-2"><button disabled={savingId === community.id} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{savingId === community.id ? "Saving…" : "Save details"}</button><button type="button" disabled={savingId === community.id} onClick={() => community.status === "active" ? setArchiveTarget(community) : void updateCommunity(community, { status: "active" })} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">{community.status === "active" ? "Archive community" : "Restore community"}</button></div></form></details>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">No communities have been created.</p>}
  </section>;
}
