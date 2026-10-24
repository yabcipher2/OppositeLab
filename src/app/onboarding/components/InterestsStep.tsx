"use client";

import React from "react";
import { INTEREST_CATALOG as INTEREST_DOMAINS } from "@/lib/interest-catalog";

const CLUSTERS = [
  "All",
  "Systems",
  "Nature",
  "Creative",
  "Tech",
  "Abstract",
  "History",
];

const CLUSTER_COLORS: Record<string, string> = {
  Systems: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  Nature: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  Creative: "text-pink-400 bg-pink-400/10 border-pink-400/30",
  Tech: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  Abstract: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  History: "text-amber-400 bg-amber-400/10 border-amber-400/30",
};

interface InterestsStepProps {
  selected: string[];
  onChange: (ids: string[]) => void;
}

export default function InterestsStep({
  selected,
  onChange,
}: InterestsStepProps) {
  const [activeCluster, setActiveCluster] = React.useState("All");
  const [search, setSearch] = React.useState("");
  const [customInterest, setCustomInterest] = React.useState("");

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  const addCustom = () => {
    const label = customInterest.trim();
    if (!label) return;
    const id = `custom-interest:${label}`;
    if (!selected.some((item) => item.toLowerCase() === id.toLowerCase())) onChange([...selected, id]);
    setCustomInterest("");
  };

  const query = search.trim().toLowerCase();
  const filtered = INTEREST_DOMAINS.filter((domain) =>
    (activeCluster === "All" || domain.cluster === activeCluster) &&
    (!query || domain.label.toLowerCase().includes(query) || domain.cluster.toLowerCase().includes(query)),
  );
  const customSelected = selected.filter((id) => id.startsWith("custom-interest:"));
  const visibleCustom = customSelected.filter((id) => !query || id.slice("custom-interest:".length).toLowerCase().includes(query));

  return (
    <div className="animate-slide-up">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-1">
          Your digital interest fingerprint
        </h2>
        <p className="text-sm text-muted-foreground">
          Select at least{" "}
          <span className="text-primary font-semibold">3 domains</span>. Your
          opposite will share exactly one — the resonance point that makes
          collaboration possible.
        </p>
      </div>

      {/* Cluster filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {CLUSTERS.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCluster(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
              activeCluster === c
                ? "bg-primary/15 border-primary/50 text-primary"
                : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="mb-4 block">
        <span className="sr-only">Search interests and tags</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search interests and tags..." className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </label>

      {/* Interest tags — bento-style varied layout */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filtered.map((domain) => {
          const active = selected.includes(domain.id);
          const clusterStyle = CLUSTER_COLORS[domain.cluster] || "";
          return (
            <button
              key={domain.id}
              onClick={() => toggle(domain.id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                active
                  ? "bg-primary/15 border-primary text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-border/60"
              }`}
            >
              {domain.label}
              {!active && (
                <span
                  className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border font-mono-data ${clusterStyle}`}
                >
                  {domain.cluster}
                </span>
              )}
            </button>
          );
        })}
        {visibleCustom.map((id) => {
          const label = id.slice("custom-interest:".length);
          return <span key={id} className="flex items-center gap-2 rounded-lg border border-primary bg-primary/15 px-3.5 py-2 text-sm font-medium text-primary">{label}<span className="text-[10px]">Custom</span><button type="button" onClick={() => toggle(id)} aria-label={`Remove ${label}`} className="rounded-full px-1 text-base leading-none hover:bg-primary/10">×</button></span>;
        })}
        {!filtered.length && !visibleCustom.length && <p className="w-full py-4 text-center text-sm text-muted-foreground">No tags match “{search}”.</p>}
      </div>

      <div className="card-elevated mb-6 p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">Add a custom interest</p>
        <form onSubmit={(event) => { event.preventDefault(); addCustom(); }} className="flex gap-2">
          <input type="text" maxLength={120} value={customInterest} onChange={(event) => setCustomInterest(event.target.value)} placeholder="Type a custom interest..." className="min-w-0 flex-1 rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={!customInterest.trim()} className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-40"><span aria-hidden="true">+</span> Add Tag</button>
        </form>
      </div>

      {/* Selected summary */}
      {selected.length > 0 && (
        <div className="card-elevated p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Selected ({selected.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.map((id) => {
              const domain = INTEREST_DOMAINS.find((d) => d.id === id);
              const label = domain?.label ?? (id.startsWith("custom-interest:") ? id.slice("custom-interest:".length) : null);
              if (!label) return null;
              return (
                <span
                  key={id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg text-xs font-medium text-primary"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="hover:text-primary/60 transition-colors"
                    aria-label={`Remove ${label}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
          {selected.length >= 3 && (
            <p className="text-xs text-positive mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-positive inline-block" />
              Minimum reached — add more for a sharper divergence score.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
