"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Profile = {
  name: string;
  photo?: string | null;
  roleLabel?: string;
  location?: string;
  interests?: string[];
  worldviewSliders?: Record<string, number>;
};

type Match = {
  id: string;
  status: string;
  createdAt: string;
  resonancePoint?: string;
  divergenceScore?: number;
  memberIds?: string[];
  partner: Profile | null;
};

type CurrentProfile = Profile;
type WorkspaceProject = { id: string; title: string; memberIds?: string[] };
type Milestone = { projectId: string; completedAt: string | null };

function initials(name?: string) {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ProfileColumn({
  profile,
  isCurrentUser = false,
}: {
  profile: Profile;
  isCurrentUser?: boolean;
}) {
  const sliderRows = [
    { key: "wv-order", label: "Structure" },
    { key: "wv-individual", label: "Solo Work" },
    { key: "wv-empirical", label: "Concrete" },
  ].flatMap(({ key, label }) => {
    const value = profile.worldviewSliders?.[key];
    return typeof value === "number" && Number.isFinite(value)
      ? [{ key, label, value: Math.max(0, Math.min(100, value)) }]
      : [];
  });
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-4">
        <div
          className="relative grid h-[72px] w-[72px] min-h-[72px] min-w-[72px] shrink-0 place-items-center overflow-hidden rounded-[25px] border-2 bg-background text-2xl font-bold"
          style={{ borderColor: isCurrentUser ? "hsl(var(--primary))" : "hsl(var(--accent))", color: isCurrentUser ? "hsl(var(--primary))" : "hsl(var(--accent))" }}
          role={profile.photo ? undefined : "img"}
          aria-label={profile.photo ? undefined : `${profile.name} initials`}
        >
          {profile.photo ? (
            <img src={profile.photo} alt={`${profile.name}'s profile`} className="absolute inset-0 block h-full w-full object-cover" />
          ) : initials(profile.name)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="truncate text-xl font-bold text-foreground">{profile.name}</h2>
            {isCurrentUser && <span className="text-sm font-semibold text-primary">You</span>}
          </div>
          <p className="mt-1 text-base text-muted-foreground">{profile.roleLabel || "Creator"}</p>
          {profile.location && <p className="mt-1 text-sm text-muted-foreground">⌖ {profile.location}</p>}
        </div>
      </div>
      <div className="mt-6 flex min-h-12 flex-wrap content-start gap-2">
        {(profile.interests || []).map((interest) => (
          <span
            key={interest}
            className={`rounded-full border border-border px-3.5 py-2 text-sm font-medium ${isCurrentUser ? "text-primary" : "text-accent"}`}
          >
            {interest}
          </span>
        ))}
        {!profile.interests?.length && (
          <span className="text-sm text-muted-foreground">Interests haven’t been added yet</span>
        )}
      </div>
      {sliderRows.length > 0 && (
        <div className="mt-4 space-y-3">
          {sliderRows.map((row) => (
            <div key={row.key} className="grid grid-cols-[88px_minmax(0,1fr)_32px] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-secondary">
                <span className={`block h-full rounded-full ${isCurrentUser ? "bg-primary" : "bg-accent"}`} style={{ width: `${row.value}%` }} />
              </span>
              <span className="text-right font-mono-data text-xs text-muted-foreground">{Math.round(row.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MatchHeroCard() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [savesPerDay, setSavesPerDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const syncSelectedMatch = () => {
      setSelectedMatchId(new URLSearchParams(window.location.search).get("match") ?? "");
    };
    syncSelectedMatch();
    window.addEventListener("popstate", syncSelectedMatch);
    return () => window.removeEventListener("popstate", syncSelectedMatch);
  }, []);

  useEffect(() => {
    const optionalJson = async (url: string) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        return response.ok ? response.json() : null;
      } catch { return null; }
    };
    Promise.all([
      fetch("/api/matches", { cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load matches.");
        return data;
      }),
      optionalJson("/api/workspace"),
      optionalJson("/api/milestones"),
      optionalJson("/api/insights"),
    ])
      .then(([matchData, workspaceData, milestoneData, insightsData]) => {
        const loadedMatches: Match[] = matchData.matches ?? [];
        setMatches(loadedMatches);
        setCurrentProfile(matchData.currentUser ?? null);
        const projects: WorkspaceProject[] = workspaceData?.projects ?? [];
        setProjects(projects);
        setMilestones(milestoneData?.milestones ?? []);
        const velocity = insightsData?.summary?.trackedSavesPerDay;
        setSavesPerDay(typeof velocity === "number" ? velocity : null);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load matches."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card-elevated p-8 text-sm text-muted-foreground">Loading your matches…</div>;
  if (error) return <div className="card-elevated p-8 text-sm text-negative">{error}</div>;

  const activeMatches = matches
    .filter((match) => match.status === "active")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const active = activeMatches.find((match) => match.id === selectedMatchId) ?? activeMatches[0];
  const activeProject = projects.find((project) =>
    active && Array.isArray(active.memberIds) && active.memberIds.length > 0 &&
    active.memberIds.every((memberId) => project.memberIds?.includes(memberId)),
  ) ?? null;
  const projectMilestones = activeProject
    ? milestones.filter((item) => item.projectId === activeProject.id)
    : [];
  const milestoneReached = projectMilestones.length > 0 && projectMilestones.every((item) => Boolean(item.completedAt));

  const selectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    router.replace(`/match-pairing-screen?match=${encodeURIComponent(matchId)}`, { scroll: false });
  };

  if (!active) {
    return (
      <section className="card-elevated accent-glow p-6 xl:p-9" aria-labelledby="match-empty-title">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="mr-2 font-mono-data text-sm text-muted-foreground">No active pairing</p>
            <span className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground">Waiting for a match</span>
          </div>
          <Link href="/discover" className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition hover:brightness-110">
            <span aria-hidden="true">⌕</span> Discover creators
          </Link>
        </div>

        <div className="grid items-start gap-9 xl:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)] xl:items-center xl:gap-8">
          <ProfileColumn profile={currentProfile || { name: "Your profile", roleLabel: "Complete onboarding to get started" }} isCurrentUser />

          <div className="flex flex-col items-center text-center">
            <div className="grid h-[154px] w-[154px] place-items-center rounded-full bg-secondary p-[10px]" aria-label="Divergence score unavailable until you have a match">
              <div className="grid h-full w-full place-content-center rounded-full bg-card">
                <span className="text-4xl font-bold text-muted-foreground">—</span>
                <span className="mt-1 text-sm text-muted-foreground">divergence</span>
              </div>
            </div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><span className="mr-2 text-warning">⚡</span>Resonance point</p>
            <div className="mt-4 w-full rounded-2xl border border-border bg-background px-5 py-5 text-sm font-medium leading-6 text-muted-foreground">A shared interest will appear when a creator accepts your match request.</div>
            <p className="mt-5 text-sm text-muted-foreground">Pairing duration starts after acceptance</p>
          </div>

          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border px-7 py-8 text-center">
            <div className="grid h-[72px] w-[72px] place-items-center rounded-[25px] border-2 border-accent/50 bg-background text-2xl font-bold text-accent" aria-hidden="true">?</div>
            <h2 id="match-empty-title" className="mt-5 text-xl font-bold text-foreground">Your future collaborator</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Their profile, interests, and worldview will appear here when they accept your request.</p>
            <Link href="/discover" className="mt-5 text-sm font-semibold text-accent hover:underline">Explore creators</Link>
          </div>
        </div>

        <div className="mt-9 grid gap-4 border-t border-border pt-6 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <div className="min-w-0"><p className="text-sm text-muted-foreground">Active project</p><p className="mt-1 text-base font-semibold text-muted-foreground">A shared project appears after you’re matched</p></div>
          <div className="text-left sm:text-right"><p className="text-xl font-bold text-muted-foreground">—</p><p className="text-xs text-muted-foreground">contributions/day</p></div>
          <div className="text-left sm:text-right"><p className="text-xl font-bold text-muted-foreground">—</p><p className="text-xs text-muted-foreground">match health</p></div>
        </div>
      </section>
    );
  }

  const score = typeof active.divergenceScore === "number" ? Math.max(0, Math.min(active.divergenceScore, 100)) : null;
  const createdAt = new Date(active.createdAt).getTime();
  const activeDays = Number.isFinite(createdAt) ? Math.max(1, Math.floor((Date.now() - createdAt) / 86400000)) : null;
  const leftProfile = currentProfile || { name: "You", roleLabel: "Creator" };
  const rightProfile = active.partner || { name: "Partner profile unavailable", roleLabel: "Creator" };

  return (
    <section className="card-elevated accent-glow p-6 xl:p-9">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-5">
        <div className="flex flex-wrap items-center gap-3">
          {activeMatches.length > 1 ? (
            <label className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Recent connections</span>
              <select
                value={active.id}
                onChange={(event) => selectMatch(event.target.value)}
                aria-label="Choose an active match"
                className="max-w-[min(70vw,18rem)] rounded-lg border border-border bg-background px-3 py-2 font-medium text-foreground"
              >
                {activeMatches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.partner?.name ?? "Partner"} · {new Date(match.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="mr-2 text-sm text-muted-foreground font-mono-data">{active.id}</p>
          )}
          <span className="rounded-lg border border-positive/30 px-3 py-1.5 text-sm font-semibold text-positive">Active</span>
          <span className="rounded-lg border border-primary/30 px-3 py-1.5 text-sm font-semibold text-primary">{milestoneReached ? "Milestone Reached" : "In Progress"}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/collaborative-project-workspace" className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition hover:brightness-110">
            <span aria-hidden="true">▤</span> Open Workspace
          </Link>
          <Link href="/discover" className="flex items-center gap-2 rounded-2xl border border-border bg-secondary px-5 py-3 text-base font-semibold text-foreground transition hover:bg-secondary/70">
            <span aria-hidden="true">↻</span> New Match
          </Link>
        </div>
      </div>

      <div className="grid items-start gap-9 xl:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)] xl:items-center xl:gap-8">
        <ProfileColumn profile={leftProfile} isCurrentUser />

        <div className="flex flex-col items-center text-center">
          <div
            className="grid h-[154px] w-[154px] place-items-center rounded-full p-[10px]"
            style={{ background: score === null ? "hsl(var(--secondary))" : `conic-gradient(from 0deg, hsl(var(--accent)), hsl(var(--primary)) ${score}%, hsl(var(--secondary)) ${score}%)` }}
            aria-label={score === null ? "Divergence score unavailable" : `Divergence score ${score}`}
          >
            <div className="grid h-full w-full place-content-center rounded-full bg-card">
              <span className="text-4xl font-bold" style={{ color: "hsl(var(--primary))" }}>{score ?? "—"}</span>
              <span className="mt-1 text-sm text-muted-foreground">divergence</span>
            </div>
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"><span className="mr-2 text-warning">⚡</span>Resonance point</p>
          <div className="mt-4 w-full rounded-2xl border border-border bg-background px-5 py-5 text-base font-semibold leading-7 text-foreground">
            {active.resonancePoint || "Your collaboration is just getting started."}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{activeDays === null ? "Pairing active" : `${activeDays} ${activeDays === 1 ? "day" : "days"} active`}</p>
        </div>

        <ProfileColumn profile={rightProfile} />
      </div>

      <div className="mt-9 grid gap-4 border-t border-border pt-6 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Active project</p>
          {activeProject ? (
            <Link href="/collaborative-project-workspace" className="mt-1 block truncate text-base font-semibold text-foreground hover:text-primary">{activeProject.title}</Link>
          ) : (
            <Link href="/collaborative-project-workspace" className="mt-1 block text-base font-semibold text-primary">Create a shared project</Link>
          )}
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xl font-bold text-foreground">{savesPerDay === null ? "—" : savesPerDay.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">tracked saves/day</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xl font-bold text-foreground">{milestoneReached ? "Reached" : "—"}</p>
          <p className="text-xs text-muted-foreground">project milestone</p>
        </div>
      </div>
    </section>
  );
}
