"use client";

import { FormEvent, useEffect, useState } from "react";

type Review = {
  projectId: string;
  title: string;
  nominatedAt: string;
  nominationCount: number;
  voteCount: number;
  averageScore: number | null;
  ownScore: number | null;
  canVote: boolean;
};

export default function CommunityReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviews", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load community reviews.");
        if (cancelled) return;
        const items: Review[] = data.reviews ?? [];
        setReviews(items);
        setScores(Object.fromEntries(items.map((item) => [item.projectId, String(item.ownScore ?? 50)])));
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load community reviews."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function submitVote(event: FormEvent, projectId: string) {
    event.preventDefault();
    setSavingId(projectId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, score: Number(scores[projectId]) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save your vote.");
      setReviews((current) => current.map((item) => item.projectId === projectId ? { ...item, ownScore: data.ownScore, voteCount: data.voteCount, averageScore: data.averageScore } : item));
      setNotice("Your review was saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your vote.");
    } finally {
      setSavingId("");
    }
  }

  return <section id="community-reviews" className="mb-8 scroll-mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
    <header className="mb-5"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Community review</p><h2 className="mt-1 text-xl font-bold text-foreground">Nominated projects</h2><p className="mt-1 text-sm text-muted-foreground">Rate the novelty of work nominated by other creators. Collaborators cannot vote on their own project.</p></header>
    {error && <p role="alert" className="mb-4 rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-lg bg-positive/10 px-3 py-2 text-sm text-positive">{notice}</p>}
    {loading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading nominated projects…</p> : reviews.length ? <div className="grid gap-4 lg:grid-cols-2">
      {reviews.map((review) => <article key={review.projectId} className="rounded-xl border border-border p-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-foreground">{review.title}</h3><p className="mt-1 text-xs text-muted-foreground">Nominated {new Date(review.nominatedAt).toLocaleDateString()}</p></div><div className="shrink-0 text-right"><p className="font-mono-data text-lg font-bold text-primary">{review.averageScore ?? "—"}<span className="text-xs font-normal text-muted-foreground"> / 100</span></p><p className="text-xs text-muted-foreground">{review.voteCount} votes</p></div></div>
        {review.canVote ? <form onSubmit={(event) => void submitVote(event, review.projectId)} className="mt-4 flex items-end gap-3 border-t border-border pt-4"><label className="flex-1 text-xs font-medium text-muted-foreground">Your novelty rating: {scores[review.projectId] ?? "50"}<input type="range" min="0" max="100" step="1" value={scores[review.projectId] ?? "50"} onChange={(event) => setScores((current) => ({ ...current, [review.projectId]: event.target.value }))} className="mt-2 block w-full accent-primary" /></label><button disabled={savingId === review.projectId} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{savingId === review.projectId ? "Saving…" : review.ownScore === null ? "Submit vote" : "Update vote"}</button></form> : <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">You’re a collaborator on this project, so you can’t vote on it.</p>}
      </article>)}
    </div> : <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">No projects have been nominated for community review yet.</p>}
  </section>;
}
