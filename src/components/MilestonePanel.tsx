"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Project = { id: string; title: string };
type Milestone = {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  dueDate: string | null;
  completedAt: string | null;
};

export default function MilestonePanel() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/milestones", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load milestones.");
        if (cancelled) return;
        setProjects(data.projects ?? []);
        setMilestones(data.milestones ?? []);
        setProjectId((current) => current || data.projects?.[0]?.id || "");
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load milestones."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const completedCount = useMemo(() => milestones.filter((item) => Boolean(item.completedAt)).length, [milestones]);
  const progress = milestones.length ? Math.round((completedCount / milestones.length) * 100) : 0;

  async function addMilestone(event: FormEvent) {
    event.preventDefault();
    if (!projectId || !title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, dueDate: dueDate || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not add milestone.");
      setMilestones((current) => [...current, data.milestone]);
      setTitle("");
      setDueDate("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add milestone.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleMilestone(milestone: Milestone) {
    const completed = !milestone.completedAt;
    setError("");
    try {
      const response = await fetch("/api/milestones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: milestone.id, completed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update milestone.");
      setMilestones((current) => current.map((item) => item.id === milestone.id ? { ...item, completedAt: data.completedAt } : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update milestone.");
    }
  }

  return (
    <section className="card-elevated overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Milestones</h2>
          <p className="mt-1 text-sm text-muted-foreground">Track the next steps for your shared work</p>
        </div>
        <span className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
          {completedCount} / {milestones.length} complete
        </span>
      </div>

      <div className="px-6 pt-5">
        <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-label={`${progress}% of milestones completed`}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {loading ? (
        <p className="px-6 py-6 text-sm text-muted-foreground">Loading milestones…</p>
      ) : (
        <>
          {milestones.length > 0 ? (
            <ul className="divide-y divide-border/70 px-6">
              {milestones.map((milestone) => (
                <li key={milestone.id} className="flex items-start gap-3 py-4">
                  <input
                    type="checkbox"
                    checked={Boolean(milestone.completedAt)}
                    onChange={() => void toggleMilestone(milestone)}
                    aria-label={`Mark ${milestone.title} ${milestone.completedAt ? "incomplete" : "complete"}`}
                    className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${milestone.completedAt ? "text-muted-foreground line-through" : "text-foreground"}`}>{milestone.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{milestone.projectTitle}{milestone.dueDate ? ` · Due ${new Date(milestone.dueDate).toLocaleDateString()}` : ""}</p>
                  </div>
                  {milestone.completedAt && <span className="text-xs font-medium text-positive">Complete</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-5 text-sm text-muted-foreground">No milestones yet. Add one for a shared project below.</p>
          )}

          {projects.length > 0 ? (
            <form onSubmit={addMilestone} className="grid gap-3 border-t border-border px-6 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.7fr)_auto]">
              <label className="sr-only" htmlFor="milestone-title">Milestone title</label>
              <input id="milestone-title" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a milestone…" className="min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <label className="sr-only" htmlFor="milestone-project">Project</label>
              <select id="milestone-project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground outline-none focus:border-primary">
                {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
              <button disabled={saving || !title.trim()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? "Adding…" : "Add milestone"}</button>
              <label className="text-xs text-muted-foreground sm:col-span-2">Optional due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 block rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground" /></label>
            </form>
          ) : (
            <div className="border-t border-border px-6 py-5 text-sm text-muted-foreground">Create a workspace project to start tracking milestones.</div>
          )}
        </>
      )}
      {error && <p role="alert" className="px-6 pb-4 text-sm text-negative">{error}</p>}
    </section>
  );
}
