"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import Icon from "@/components/ui/AppIcon";

interface Creator {
  id: string;
  name: string;
  role: string;
  location: string;
  divergence: number | null;
  sharedInterest: string;
  interests: string[];
  bio: string;
  initials: string;
  photo: string | null;
  worldview: Record<string, number | null>;
  divergentAxes: { id: string; label: string; difference: number }[];
  nominations: { title: string; nominatedAt: string }[];
  isOnline: boolean;
  lastActiveAt: string | null;
  sharedInterestCount: number;
}
type CreatorFilter = "all" | "online" | "shared";
type CreatorSort = "divergence" | "interests" | "recent";

const WORLDVIEW_AXIS_LABELS: Record<string, { title: string; left: string; right: string }> = {
  "wv-order": { title: "System Order", left: "Rigid Order", right: "Emergent Chaos" },
  "wv-local": { title: "Scale of Change", left: "Hyper-Local", right: "Planetary Scale" },
  "wv-empirical": { title: "Decision Making", left: "Empirical Evidence", right: "Intuitive Knowing" },
  "wv-individual": { title: "Collective Action", left: "Individual Agency", right: "Collective Wisdom" },
};
interface MatchRequest {
  id: string;
  otherId?: string;
  otherName: string;
  status: string;
  direction: string;
}
interface ActiveMatch {
  id: string;
  status: string;
  memberIds?: string[];
  createdAt?: string;
}

export default function DiscoverPage() {
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [activeMatchIds, setActiveMatchIds] = useState<Record<string, string>>({});
  const [incomingRequests, setIncomingRequests] = useState<MatchRequest[]>([]);
  const [query, setQuery] = useState("");
  const [minimumDivergence, setMinimumDivergence] = useState(0);
  const [sortBy, setSortBy] = useState<CreatorSort>("divergence");
  const [creatorFilter, setCreatorFilter] = useState<CreatorFilter>("all");
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [requestingCreatorIds, setRequestingCreatorIds] = useState<string[]>(
    [],
  );
  const [respondingRequestIds, setRespondingRequestIds] = useState<string[]>([]);

  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get("search");
    if (initialSearch) setQuery(initialSearch);
    const handleCommandSearch = (event: Event) => {
      const customEvent = event as CustomEvent<{ query?: string }>;
      if (typeof customEvent.detail?.query === "string") setQuery(customEvent.detail.query);
    };
    window.addEventListener("oppositelab:discover-search", handleCommandSearch);
    return () => window.removeEventListener("oppositelab:discover-search", handleCommandSearch);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [discoverResponse, requestsResponse, matchesResponse] = await Promise.all([
          fetch(`/api/discover?minDivergence=${minimumDivergence}`),
          fetch("/api/match-requests"),
          fetch("/api/matches", { cache: "no-store" }),
        ]);
        const discoverData = await discoverResponse.json();
        const requestsData = await requestsResponse.json();
        const matchesData = await matchesResponse.json();
        if (!discoverResponse.ok)
          throw new Error(discoverData.error || "Could not load creators.");
        if (!requestsResponse.ok)
          throw new Error(
            requestsData.error || "Could not load match requests.",
          );
        if (!matchesResponse.ok)
          throw new Error(matchesData.error || "Could not load your active matches.");
        if (!cancelled) {
          const allRequests: MatchRequest[] = requestsData.requests ?? [];
          const currentUserId: string = matchesData.currentUser?.id ?? "";
          const activeMatches: ActiveMatch[] = (matchesData.matches ?? [])
            .filter((match: ActiveMatch) => match.status === "active")
            .sort((left: ActiveMatch, right: ActiveMatch) => {
              const leftDate = new Date(left.createdAt ?? 0).getTime();
              const rightDate = new Date(right.createdAt ?? 0).getTime();
              return rightDate - leftDate;
            });
          const matchIdsByPartner: Record<string, string> = {};
          for (const match of activeMatches) {
            const partnerId = match.memberIds?.find((memberId) => memberId !== currentUserId);
            if (partnerId && !matchIdsByPartner[partnerId]) matchIdsByPartner[partnerId] = match.id;
          }
          setCreators(discoverData.creators ?? []);
          setActiveMatchIds(matchIdsByPartner);
          setRequestedIds(
            allRequests
              .filter(
                (item) =>
                  item.status === "pending" && item.direction === "outgoing",
              )
              .map((item) => item.otherId ?? "")
              .filter(Boolean),
          );
          setIncomingRequests(
            allRequests.filter(
              (item) =>
                item.direction === "incoming" && item.status === "pending",
            ),
          );
        }
      } catch (loadError) {
        if (!cancelled)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load creators.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [minimumDivergence]);

  const visibleCreators = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = creators.filter((creator) =>
      (creatorFilter === "all" || (creatorFilter === "online" ? creator.isOnline : creator.sharedInterestCount > 0)) &&
      [
        creator.name,
        creator.role,
        creator.location,
        creator.sharedInterest,
        creator.bio,
        ...creator.interests,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
    return filtered.sort((left, right) => {
      if (sortBy === "interests") return right.sharedInterestCount - left.sharedInterestCount || (right.divergence ?? -1) - (left.divergence ?? -1);
      if (sortBy === "recent") return new Date(right.lastActiveAt ?? 0).getTime() - new Date(left.lastActiveAt ?? 0).getTime();
      return (right.divergence ?? -1) - (left.divergence ?? -1);
    });
  }, [creators, query, creatorFilter, sortBy]);

  const requestMatch = async (recipientId: string) => {
    setError("");
    setNotice("");
    setRequestingCreatorIds((current) => [...current, recipientId]);
    setRequestedIds((current) => current.includes(recipientId) ? current : [...current, recipientId]);
    try {
      const response = await fetch("/api/match-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not send the request.");
      setRequestedIds((current) =>
        current.includes(recipientId) ? current : [...current, recipientId],
      );
      setNotice("Your match request has been sent.");
    } catch (requestError) {
      setRequestedIds((current) => current.filter((id) => id !== recipientId));
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not send the request.",
      );
    } finally {
      setRequestingCreatorIds((current) =>
        current.filter((id) => id !== recipientId),
      );
    }
  };

  const respondToRequest = async (
    item: MatchRequest,
    action: "accept" | "decline",
  ) => {
    setError("");
    setNotice("");
    setRespondingRequestIds((current) => [...current, item.id]);
    try {
      const response = await fetch("/api/match-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not update the request.");
      setIncomingRequests((current) =>
        current.filter((request) => request.id !== item.id),
      );
      setNotice(
        action === "accept"
          ? `You are now matched with ${item.otherName}.`
          : "Match request declined.",
      );
      if (action === "accept") {
        const matchesResponse = await fetch("/api/matches", { cache: "no-store" });
        const matchesData = await matchesResponse.json();
        if (!matchesResponse.ok) throw new Error(matchesData.error || "The request was accepted, but your match list could not be refreshed.");
        const newMatch = (matchesData.matches ?? []).find((match: ActiveMatch) =>
          match.status === "active" && match.memberIds?.includes(item.otherId ?? ""),
        ) as ActiveMatch | undefined;
        const otherId = item.otherId;
        if (newMatch && otherId) {
          setActiveMatchIds((current) => ({ ...current, [otherId]: newMatch.id }));
        }
      }
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Could not update the request.",
      );
    } finally {
      setRespondingRequestIds((current) => current.filter((id) => id !== item.id));
    }
  };

  return (
    <AppLayout activePath="/discover">
      <main className="min-h-screen overflow-x-hidden bg-background px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                The opposite network
              </p>
              <h1 className="text-3xl font-bold text-foreground">
                Discover creators
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Find collaborators with different ways of thinking. Shared
                interests are optional, and being matched with one creator
                doesn’t prevent you from requesting other collaborations.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {visibleCreators.length}
              </span>{" "}
              creators
            </div>
          </header>

          <section className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[minmax(250px,1fr)_auto_auto] lg:items-center">
            <label className="relative block">
              <span className="sr-only">Search creators and interests</span>
              <Icon
                name="MagnifyingGlassIcon"
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, field, or interest"
                className="w-full rounded-lg border border-border bg-input py-2.5 pl-10 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Minimum divergence</span>
              <select
                value={minimumDivergence}
                onChange={(event) =>
                  setMinimumDivergence(Number(event.target.value))
                }
                className="rounded-lg border border-border bg-input px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={0}>Any</option>
                <option value={75}>75+</option>
                <option value={85}>85+</option>
                <option value={90}>90+</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Sort by</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as CreatorSort)} className="rounded-lg border border-border bg-input px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring">
                <option value="divergence">Highest Divergence</option>
                <option value="interests">Most Shared Interests</option>
                <option value="recent">Recently Active</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-2 lg:col-span-3" role="group" aria-label="Quick filters">
              {([
                ["all", "All Creators"],
                ["online", "Online Now"],
                ["shared", "Has Shared Interests"],
              ] as const).map(([filter, label]) => <button key={filter} type="button" aria-pressed={creatorFilter === filter} onClick={() => setCreatorFilter(filter)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${creatorFilter === filter ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}>{label}</button>)}
            </div>
          </section>

          {notice && (
            <p
              role="status"
              className="mb-4 rounded-lg border border-positive/30 bg-positive/10 px-4 py-3 text-sm text-positive"
            >
              {notice}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative"
            >
              {error}
            </p>
          )}

          {incomingRequests.length > 0 && (
            <section className="mb-6 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold">Incoming match requests</h2>
              <ul className="mt-3 divide-y divide-border">
                {incomingRequests.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <span>{item.otherName} wants to collaborate</span>
                    <span className="flex gap-2">
                      <button
                        disabled={respondingRequestIds.includes(item.id)}
                        onClick={() => void respondToRequest(item, "decline")}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        Decline
                      </button>
                      <button
                        disabled={respondingRequestIds.includes(item.id)}
                        onClick={() => void respondToRequest(item, "accept")}
                        className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                      >
                        Accept
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Loading creators…
            </p>
          ) : visibleCreators.length ? (
            <section
              aria-label="Suggested creators"
              className="grid grid-cols-1 gap-4 xl:grid-cols-2"
            >
              {visibleCreators.map((creator) => {
                const requested = requestedIds.includes(creator.id);
                const activeMatchId = activeMatchIds[creator.id];
                return (
                  <article
                    key={creator.id}
                    className="flex flex-col rounded-2xl border border-border bg-card p-5 sm:p-6"
                  >
                    <div className="flex flex-1 items-stretch gap-4">
                      <button type="button" onClick={() => setSelectedCreator(creator)} aria-label={`View ${creator.name}'s profile`} className="relative h-12 w-12 shrink-0 self-start overflow-hidden rounded-full bg-primary/15 font-bold text-primary ring-offset-2 hover:ring-2 hover:ring-primary">
                        {creator.photo ? <img src={creator.photo} alt={`${creator.name}'s profile`} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center">{creator.initials}</span>}
                        {creator.isOnline && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-positive" title="Online now" />}
                      </button>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <button type="button" onClick={() => setSelectedCreator(creator)} className="text-left font-semibold text-foreground hover:text-primary hover:underline">{creator.name}</button>
                            <p className="text-sm text-muted-foreground">
                              {creator.role}
                              {creator.location ? ` · ${creator.location}` : ""}
                            </p>
                          </div>
                          <div title={creator.divergence === null ? "Worldview coordinates are not available" : `${creator.divergence} / 100 • ${creator.divergence >= 70 ? "High" : creator.divergence >= 35 ? "Moderate" : "Low"} Divergence`} className="cursor-help rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-center">
                            <span className="block text-lg font-bold leading-tight text-primary">
                              {creator.divergence ?? "—"}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {creator.divergence === null
                                ? "not calibrated"
                                : "divergence"}
                            </span>
                          </div>
                        </div>
                        {creator.isOnline && <p className="mt-1 text-xs font-medium text-positive">Online now</p>}
                        {creator.bio ? (
                          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                            {creator.bio}
                          </p>
                        ) : (
                          creator.divergence === null && (
                            <p className="mt-4 text-sm text-muted-foreground">
                              This creator is still setting up their profile.
                            </p>
                          )
                        )}
                        {creator.sharedInterest && (
                          <div className="mt-4 rounded-xl border border-border bg-background/60 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Shared interests
                            </p>
                            <p className="mt-1 text-sm font-medium text-foreground">
                              {creator.sharedInterest}
                            </p>
                          </div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {creator.interests.length ? (
                            creator.interests.map((interest) => (
                              <span
                                key={interest}
                                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                              >
                                {interest}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Interests not added yet
                            </span>
                          )}
                        </div>
                        <div className="mt-4 rounded-xl border border-border bg-background/60 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Divergent axes</p>
                          {creator.divergentAxes.length ? <p className="mt-1 text-sm text-foreground">Opposite on: {creator.divergentAxes.map((axis) => axis.label).join(" & ")}</p> : <p className="mt-1 text-xs text-muted-foreground">No strong opposing worldview axes recorded yet.</p>}
                        </div>
                        <div className="mt-auto pt-5">
                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                          {activeMatchId ? (
                            <button
                              type="button"
                              onClick={() => router.push(`/match-pairing-screen?match=${encodeURIComponent(activeMatchId)}`)}
                              className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                              Open Match
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={requested}
                              onClick={() => void requestMatch(creator.id)}
                              className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${requested ? "border border-primary/40 bg-primary/10 text-primary" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                            >
                              {requested ? "⌛ Match Pending" : "Request a Match"}
                            </button>
                          )}
                        </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
              <h2 className="font-semibold text-foreground">
                {error
                  ? "Creators unavailable"
                  : creators.length
                    ? "No creators match these filters"
                    : "No other creators yet"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Active creator accounts that have not opted out will appear here
                when they are available.
              </p>
            </div>
          )}
          {selectedCreator && (
            <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCreator(null); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
              <section role="dialog" aria-modal="true" aria-labelledby="creator-details-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-7">
                <header className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary/15 text-lg font-bold text-primary">
                      {selectedCreator.photo ? <img src={selectedCreator.photo} alt={`${selectedCreator.name}'s profile`} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center">{selectedCreator.initials}</span>}
                      {selectedCreator.isOnline && <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-card bg-positive" />}
                    </div>
                    <div className="min-w-0">
                      <h2 id="creator-details-title" className="truncate text-xl font-bold text-foreground">{selectedCreator.name}</h2>
                      <p className="text-sm text-muted-foreground">{selectedCreator.role}{selectedCreator.location ? ` · ${selectedCreator.location}` : ""}{selectedCreator.isOnline ? " · Online now" : ""}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedCreator(null)} aria-label="Close creator details" className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">✕</button>
                </header>
                <div className="mt-6 space-y-6">
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">About</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedCreator.bio || "This creator hasn’t shared a bio yet."}</p>
                  </section>
                  <section>
                    <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Worldview coordinates</h3><span className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary" title={`${selectedCreator.divergence ?? "Not available"} / 100 divergence`}>{selectedCreator.divergence === null ? "Not calibrated" : `${selectedCreator.divergence} / 100 divergence`}</span></div>
                    <div className="mt-3 space-y-3">
                      {Object.entries(WORLDVIEW_AXIS_LABELS).map(([axisId, axis]) => {
                        const value = selectedCreator.worldview[axisId];
                        return <div key={axisId}><div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">{axis.left}</span><span className="font-medium text-foreground">{axis.title} · {value === null ? "Not set" : `${value}%`}</span><span className="text-right text-muted-foreground">{axis.right}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${value ?? 0}%` }} /></div></div>;
                      })}
                    </div>
                  </section>
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Past workspace nominations</h3>
                    {selectedCreator.nominations.length ? <ul className="mt-3 space-y-2">{selectedCreator.nominations.map((nomination, index) => <li key={`${nomination.title}-${nomination.nominatedAt}-${index}`} className="rounded-xl border border-border bg-background px-4 py-3"><p className="text-sm font-semibold text-foreground">{nomination.title}</p><time className="mt-1 block text-xs text-muted-foreground">{new Date(nomination.nominatedAt).toLocaleDateString()}</time></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No past workspace nominations.</p>}
                  </section>
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Interests</h3>
                    <div className="mt-2 flex flex-wrap gap-2">{selectedCreator.interests.length ? selectedCreator.interests.map((interest) => <span key={interest} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{interest}</span>) : <span className="text-sm text-muted-foreground">Interests are not shared.</span>}</div>
                  </section>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
