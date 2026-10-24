"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Contributor = { id: string; name: string; photoUrl: string | null };
type PeerReview = { id: string; author: string; userId: string; text: string; createdAt: string };
type Breakthrough = {
  projectId: string;
  title: string;
  content: string;
  publishedAt: string;
  contributors: Contributor[];
  contribution: Array<{ memberId: string; percent: number }>;
  resonancePoint: string;
  wordCount: number;
  voteCount: number;
  averageScore: number | null;
  ownScore: number | null;
  upvoteCount: number;
  hasUpvoted: boolean;
  canVote: boolean;
  reviews: PeerReview[];
};

export default function BreakthroughIndex({ projectId }: { projectId?: string }) {
  const [breakthroughs, setBreakthroughs] = useState<Breakthrough[]>([]);
  const [breakthrough, setBreakthrough] = useState<Breakthrough | null>(null);
  const [score, setScore] = useState("50");
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    const url = projectId ? `/api/breakthroughs?projectId=${encodeURIComponent(projectId)}` : "/api/breakthroughs";
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load the Breakthrough Index.");
    if (projectId) {
      setBreakthrough(data.breakthrough);
      setScore(String(data.breakthrough?.ownScore ?? 50));
    } else setBreakthroughs(data.breakthroughs ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    const url = projectId ? `/api/breakthroughs?projectId=${encodeURIComponent(projectId)}` : "/api/breakthroughs";
    fetch(url, { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the Breakthrough Index.");
      return data;
    }).then((data) => {
      if (cancelled) return;
      if (projectId) {
        setBreakthrough(data.breakthrough);
        setScore(String(data.breakthrough?.ownScore ?? 50));
      } else setBreakthroughs(data.breakthroughs ?? []);
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load the Breakthrough Index."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const toggleUpvote = async (item: Breakthrough) => {
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/breakthroughs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upvote", projectId: item.projectId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update upvote.");
      await load();
      setNotice(data.upvoted ? "Breakthrough upvoted." : "Upvote removed.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update upvote."); }
    finally { setSaving(false); }
  };

  const rateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!breakthrough) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: breakthrough.projectId, score: Number(score) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your peer review.");
      await load();
      setNotice("Your project rating was saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save your peer review."); }
    finally { setSaving(false); }
  };

  const leaveReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!breakthrough) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/breakthroughs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "review", projectId: breakthrough.projectId, text: reviewText }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit your peer review.");
      setReviewText("");
      await load();
      setNotice("Your peer review was added.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not submit your peer review."); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
  const renderCard = (item: Breakthrough) => <article key={item.projectId} className="overflow-hidden rounded-2xl border border-border bg-card">
    <div className="border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-cyan-500/10 p-5"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Community-approved co-creation</p><h2 className="mt-2 text-xl font-bold text-foreground">{item.title}</h2><p className="mt-1 text-xs text-muted-foreground">Published {new Date(item.publishedAt).toLocaleDateString()} · {item.wordCount} words</p></div>
    <div className="space-y-4 p-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Co-authors</p><div className="mt-2 flex flex-wrap gap-3">{item.contributors.map((person, index) => <span key={person.id} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm"><span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">{person.photoUrl ? <img src={person.photoUrl} alt="" className="h-full w-full object-cover" /> : person.name.slice(0, 1).toUpperCase()}</span>{person.name}<span className="text-xs text-muted-foreground">{item.contribution[index]?.percent ?? 0}%</span></span>)}</div></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${item.contribution[0]?.percent ?? 50}%` }} /></div><div className="rounded-lg bg-secondary/50 px-3 py-2"><p className="text-xs font-semibold text-muted-foreground">Resonance anchor</p><p className="mt-1 text-sm text-foreground">{item.resonancePoint}</p></div><p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item.content}</p><div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><span className="text-xs text-muted-foreground">{item.averageScore ?? "—"}/100 peer rating · {item.voteCount} ratings</span><div className="flex gap-2"><button type="button" disabled={saving || !item.canVote} onClick={() => void toggleUpvote(item)} className="rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50">{item.hasUpvoted ? "★ Upvoted" : "☆ Upvote"} · {item.upvoteCount}</button><Link href={`/breakthroughs/${item.projectId}`} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Read project</Link></div></div></div>
  </article>;

  return <main className="min-h-screen bg-background px-6 py-8 lg:px-10"><div className="mx-auto max-w-6xl">
    <header className="mb-7"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Analytics · Hall of co-creation</p><h1 className="mt-2 text-3xl font-bold text-foreground">{projectId ? "Breakthrough Showcase" : "Breakthrough Index"}</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">A curated showcase of completed workspace projects. Published projects require both collaborator sign-offs, completed milestones, a resonance anchor, at least 100 words, a balanced 40/60 contribution split, and admin approval.</p></header>
    {error && <p role="alert" className="mb-4 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-lg border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive">{notice}</p>}
    {loading ? <p className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading breakthrough projects…</p> : projectId ? breakthrough ? <div className="space-y-6">
      <Link href="/breakthroughs" className="inline-flex text-sm font-medium text-primary hover:underline">← Back to Breakthrough Index</Link>
      {renderCard(breakthrough)}
      <article className="rounded-2xl border border-border bg-card p-5 sm:p-7"><h2 className="text-lg font-semibold text-foreground">Project draft</h2><pre className="mt-4 max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-xl bg-background p-5 font-sans text-sm leading-7 text-foreground">{breakthrough.content}</pre></article>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7"><h2 className="text-lg font-semibold text-foreground">Peer review</h2>{breakthrough.canVote ? <div className="mt-4 grid gap-6 lg:grid-cols-2"><form onSubmit={rateProject} className="space-y-3"><label className="block text-sm font-medium text-foreground">Impact rating: {score}/100<input type="range" min="0" max="100" step="1" value={score} onChange={(event) => setScore(event.target.value)} className="mt-2 block w-full accent-primary" /></label><button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : breakthrough.ownScore === null ? "Submit rating" : "Update rating"}</button></form><form onSubmit={leaveReview} className="space-y-3"><label className="block text-sm font-medium text-foreground">Written review<textarea required minLength={1} maxLength={2000} rows={4} value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="Share what makes this co-creation impactful…" className={`${inputClass} mt-1`} /></label><button disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50">{saving ? "Submitting…" : "Add peer review"}</button></form></div> : <p className="mt-3 text-sm text-muted-foreground">Project collaborators can’t rate or review their own work.</p>}<div className="mt-6 space-y-3">{breakthrough.reviews.map((review) => <article key={review.id} className="rounded-xl border border-border p-4"><div className="flex justify-between gap-2"><span className="text-sm font-semibold">{review.author}</span><time className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{review.text}</p></article>)}{!breakthrough.reviews.length && <p className="text-sm text-muted-foreground">No written peer reviews yet.</p>}</div></section>
    </div> : <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">This breakthrough is unavailable.</p> : breakthroughs.length ? <div className="grid gap-5 lg:grid-cols-2">{breakthroughs.map(renderCard)}</div> : <p className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No projects have been approved for the Breakthrough Index yet. Eligible completed workspaces require both collaborators’ sign-off and admin review.</p>}
  </div></main>;
}
