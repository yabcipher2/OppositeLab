"use client";

import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Community } from "./components/CommunityChat";
import Icon from "@/components/ui/AppIcon";

export default function CommunityPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const loadCommunities = async () => {
    const response = await fetch("/api/communities", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load communities.");
    setCommunities(result.communities ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    const refreshCommunities = async () => {
      const response = await fetch("/api/communities", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load communities.");
      if (!cancelled) setCommunities(result.communities ?? []);
    };
    refreshCommunities()
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load communities."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    const timer = window.setInterval(() => {
      refreshCommunities().catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not refresh communities.");
      });
    }, 10000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const visibleGroups = useMemo(() => communities.filter((group) => `${group.name} ${group.category} ${group.description}`.toLowerCase().includes(query.trim().toLowerCase())), [communities, query]);

  const changeMembership = async (group: Community) => {
    setError("");
    try {
      const response = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: group.joined ? "leave" : "join", communityId: group.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update membership.");
      setCommunities((current) => current.map((item) => item.id === group.id ? { ...item, joined: result.joined, members: result.members } : item));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not update membership.");
    }
  };

  const createCommunity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newName, category: newCategory, description: newDescription }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create this circle.");
      await loadCommunities();
      setNewName(""); setNewCategory(""); setNewDescription(""); setShowCreate(false);
      if (result.id) router.push(`/communities/${result.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create this circle.");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = "mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <AppLayout activePath="/communities">
      <main className="min-h-screen bg-background px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Community Hubs</p><h1 className="mt-2 text-3xl font-bold text-foreground">Community Hubs</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Join circles where different disciplines meet around a shared curiosity.</p></div><button type="button" onClick={() => setShowCreate((visible) => !visible)} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{showCreate ? "Cancel" : "Create a circle"}</button></header>

          {showCreate && <form onSubmit={createCommunity} className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-5 md:grid-cols-2"><label className="text-sm font-medium text-foreground">Circle name<input required minLength={3} maxLength={80} value={newName} onChange={(event) => setNewName(event.target.value)} className={fieldClass} /></label><label className="text-sm font-medium text-foreground">Topic<input maxLength={40} value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nature, art, systemsâ€¦" className={fieldClass} /></label><label className="text-sm font-medium text-foreground md:col-span-2">Description<textarea required minLength={10} maxLength={500} rows={3} value={newDescription} onChange={(event) => setNewDescription(event.target.value)} className={fieldClass} /></label><div className="md:col-span-2 flex justify-end"><button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Creatingâ€¦" : "Create circle"}</button></div></form>}

          {error && <p role="alert" className="mb-4 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}
          <label className="relative mb-6 block max-w-xl"><span className="sr-only">Search communities</span><Icon name="MagnifyingGlassIcon" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search circles and topics" className="w-full rounded-lg border border-border bg-input py-2.5 pl-10 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" /></label>

          {loading ? <p className="py-16 text-center text-sm text-muted-foreground">Loading communitiesâ€¦</p> : visibleGroups.length ? <section className="grid gap-4 md:grid-cols-2" aria-label="Community circles">
            {visibleGroups.map((group) => <article key={group.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon name="UserGroupIcon" size={22} /></div><div className="flex items-center gap-2"><span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{group.category || "Community"}</span>{Boolean(group.unreadCount) && <span aria-label={`${group.unreadCount} unread messages or edits`} className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">{group.unreadCount}</span>}</div></div><h2 className="mt-4 text-lg font-semibold text-foreground">{group.name}</h2>{group.creator && <span className="mt-1 inline-block text-xs font-medium text-primary">Created by you</span>}<p className="mt-2 min-h-12 text-sm leading-relaxed text-muted-foreground">{group.description}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><span className="text-xs text-muted-foreground">{group.members} members</span><span className="flex gap-2">{group.joined ? <Link href={`/communities/${group.id}`} className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">Open chat{group.unreadCount ? ` · ${group.unreadCount} new` : ""}</Link> : <button type="button" onClick={() => void changeMembership(group)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Join circle</button>}</span></div></article>)}
          </section> : <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center"><h2 className="font-semibold text-foreground">{query ? "No circles match that search" : "No communities yet"}</h2><p className="mt-2 text-sm text-muted-foreground">Create the first circle or check back when other creators start one.</p></div>}
        </div>
      </main>
    </AppLayout>
  );
}
