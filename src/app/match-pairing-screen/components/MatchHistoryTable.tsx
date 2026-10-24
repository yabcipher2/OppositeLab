"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import Icon from "@/components/ui/AppIcon";
import Modal from "@/components/ui/Modal";

type Match = {
  id: string;
  memberIds?: string[];
  status: string;
  createdAt: string;
  endedAt?: string;
  resonancePoint?: string;
  divergenceScore?: number;
  healthScore?: number;
  breakthroughIndex?: number;
  partner: null | { name: string };
};
type Project = { id: string; title: string; memberIds?: string[] };

const filters = ["All", "Active", "Completed", "Stalled", "Archived"];

export default function MatchHistoryTable() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedMatch, setSelectedMatch] = useState<(Match & { projectTitle: string }) | null>(null);
  useEffect(() => {
    Promise.all([
      fetch("/api/matches", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/workspace", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([matchData, projectData]) => {
      setMatches(matchData.matches ?? []);
      setProjects(projectData.projects ?? []);
    }).catch(() => { setMatches([]); setProjects([]); });
  }, []);

  const rows = useMemo(() => matches.filter((match) => {
    const statusMatches = filter === "All" || match.status.toLowerCase() === filter.toLowerCase();
    const relatedProject = projects.find((project) => match.memberIds?.every((id) => project.memberIds?.includes(id)));
    const searchMatches = `${match.partner?.name ?? ""} ${match.resonancePoint ?? ""} ${relatedProject?.title ?? ""}`.toLowerCase().includes(query.toLowerCase());
    return statusMatches && searchMatches;
  }).map((match) => ({
    ...match,
    projectTitle: projects.find((project) => match.memberIds?.every((id) => project.memberIds?.includes(id)))?.title ?? "—",
  })), [matches, projects, query, filter]);

  return (
    <section className="card-elevated overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Match history</h2>
          <p className="mt-1 text-sm text-muted-foreground">{matches.length} {matches.length === 1 ? "pairing" : "pairings"} saved to your account</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="match-search">Search partners and projects</label>
          <input id="match-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search partners, projects…" className="min-w-56 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <div className="flex flex-wrap gap-1 rounded-xl bg-secondary p-1" role="group" aria-label="Filter match history">
            {filters.map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${filter === item ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{item}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-20 w-[210px] min-w-[210px] bg-card px-5 py-4 font-semibold shadow-[1px_0_0_hsl(var(--border))]">Partner</th>
                <th className="px-5 py-4 font-semibold">Resonance point</th>
                <th className="px-5 py-4 font-semibold">Divergence</th>
                <th className="px-5 py-4 font-semibold">Health</th>
                <th className="px-5 py-4 font-semibold">Days active</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Project</th>
                <th className="px-5 py-4 font-semibold">Breakthrough</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-border/70">
            {rows.length ? rows.map((match) => {
                const start = new Date(match.createdAt).getTime();
                const end = match.endedAt ? new Date(match.endedAt).getTime() : Date.now();
                const days = Number.isFinite(start) ? Math.max(1, Math.floor((end - start) / 86400000)) : null;
                return (
                  <tr key={match.id} className="group transition hover:bg-secondary/40">
                    <td className="sticky left-0 z-10 w-[210px] min-w-[210px] bg-card px-5 py-4 font-semibold text-foreground shadow-[1px_0_0_hsl(var(--border))] transition-colors group-hover:bg-secondary">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-muted-foreground" aria-hidden="true">
                          {(match.partner?.name || "?").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                        </span>
                        <span className="truncate">{match.partner?.name ?? "Partner unavailable"}</span>
                      </div>
                    </td>
                    <td className="max-w-[250px] truncate px-5 py-4 text-muted-foreground" title={match.resonancePoint}>{match.resonancePoint || "—"}</td>
                    <td className="px-5 py-4 font-semibold text-primary">{typeof match.divergenceScore === "number" ? match.divergenceScore : "—"}</td>
                    <td className="px-5 py-4 text-positive">{typeof match.healthScore === "number" ? `${match.healthScore}%` : "—"}</td>
                    <td className="px-5 py-4 text-muted-foreground">{days ?? "—"}</td>
                    <td className="px-5 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-medium ${match.status === "active" ? "border-positive/30 text-positive" : "border-border text-muted-foreground"}`}>{match.status}</span></td>
                    <td className="px-5 py-4 text-foreground">{match.projectTitle}</td>
                    <td className="px-5 py-4 font-semibold text-warning">{typeof match.breakthroughIndex === "number" ? match.breakthroughIndex : "—"}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedMatch(match)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`View match with ${match.partner?.name ?? "partner"}`}
                        title="View match details"
                      >
                        <Icon name="EyeIcon" size={18} />
                      </button>
                    </td>
                  </tr>
                );
            }) : (
              <tr>
                <td colSpan={9} className="p-0">
                  <div className="grid min-h-[360px] place-items-center px-6 py-12">
                    <EmptyState
                      icon="ClockIcon"
                      title={matches.length ? "No pairings match this filter" : "No match history"}
                      description={matches.length ? "Try a different status or search term." : "Accepted match requests will appear here."}
                    />
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal
        open={Boolean(selectedMatch)}
        onClose={() => setSelectedMatch(null)}
        title={selectedMatch ? `Match with ${selectedMatch.partner?.name ?? "partner"}` : "Match details"}
        size="md"
      >
        {selectedMatch && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${selectedMatch.status === "active" ? "border-positive/30 text-positive" : "border-border text-muted-foreground"}`}>
                {selectedMatch.status}
              </span>
              <span className="text-sm text-muted-foreground">{new Date(selectedMatch.createdAt).toLocaleDateString()}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div><dt className="text-muted-foreground">Resonance point</dt><dd className="mt-1 font-medium text-foreground">{selectedMatch.resonancePoint || "Not recorded"}</dd></div>
              <div><dt className="text-muted-foreground">Divergence</dt><dd className="mt-1 font-medium text-foreground">{typeof selectedMatch.divergenceScore === "number" ? `${selectedMatch.divergenceScore}/100` : "Not recorded"}</dd></div>
              <div><dt className="text-muted-foreground">Match health</dt><dd className="mt-1 font-medium text-foreground">{typeof selectedMatch.healthScore === "number" ? `${selectedMatch.healthScore}%` : "Not recorded"}</dd></div>
              <div><dt className="text-muted-foreground">Breakthrough</dt><dd className="mt-1 font-medium text-foreground">{typeof selectedMatch.breakthroughIndex === "number" ? `${selectedMatch.breakthroughIndex}/100` : "Not recorded"}</dd></div>
              <div className="col-span-2"><dt className="text-muted-foreground">Project</dt><dd className="mt-1 font-medium text-foreground">{selectedMatch.projectTitle === "—" ? "No shared project" : selectedMatch.projectTitle}</dd></div>
            </dl>
            {selectedMatch.status === "active" && selectedMatch.projectTitle !== "—" && (
              <Link href="/collaborative-project-workspace" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">
                Open workspace <Icon name="ArrowTopRightOnSquareIcon" size={16} />
              </Link>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}
