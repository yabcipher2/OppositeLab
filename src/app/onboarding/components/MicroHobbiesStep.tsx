"use client";

import React from "react";
import Icon from "@/components/ui/AppIcon";

const MICRO_HOBBIES = [
  {
    id: "mh-kb-restore",
    label: "Restoring 1980s mechanical keyboards",
    rarity: "Rare",
  },
  {
    id: "mh-tide-charts",
    label: "Collecting antique tide charts",
    rarity: "Rare",
  },
  {
    id: "mh-moss-terr",
    label: "Moss terrarium cultivation",
    rarity: "Uncommon",
  },
  {
    id: "mh-circuit-bend",
    label: "Circuit bending toy instruments",
    rarity: "Rare",
  },
  { id: "mh-dead-lang", label: "Learning dead languages", rarity: "Uncommon" },
  { id: "mh-star-maps", label: "Hand-drawing star maps", rarity: "Uncommon" },
  { id: "mh-seed-saving", label: "Heirloom seed saving", rarity: "Common" },
  {
    id: "mh-shortwave",
    label: "Shortwave radio listening",
    rarity: "Uncommon",
  },
  { id: "mh-lock-pick", label: "Competitive lockpicking", rarity: "Rare" },
  { id: "mh-paper-marb", label: "Ebru paper marbling", rarity: "Rare" },
  { id: "mh-neon-bend", label: "Neon tube bending", rarity: "Rare" },
  { id: "mh-soil-micro", label: "Soil microbiome study", rarity: "Uncommon" },
  { id: "mh-zine-make", label: "Zine making & distribution", rarity: "Common" },
  {
    id: "mh-astro-photo",
    label: "Deep-sky astrophotography",
    rarity: "Uncommon",
  },
  { id: "mh-watch-serv", label: "Vintage watch servicing", rarity: "Uncommon" },
  { id: "mh-tape-loop", label: "Magnetic tape loop art", rarity: "Rare" },
  {
    id: "mh-urban-foraging",
    label: "Urban foraging & identification",
    rarity: "Common",
  },
  {
    id: "mh-font-hunt",
    label: "Typeface hunting in the wild",
    rarity: "Common",
  },
];

const RARITY_STYLE: Record<string, string> = {
  Common: "text-muted-foreground bg-muted border-border",
  Uncommon: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  Rare: "text-primary bg-primary/10 border-primary/30",
};

interface MicroHobbiesStepProps {
  selected: string[];
  customHobby: string;
  onChange: (ids: string[]) => void;
  onCustomChange: (val: string) => void;
}

export default function MicroHobbiesStep({
  selected,
  customHobby,
  onChange,
  onCustomChange,
}: MicroHobbiesStepProps) {
  const [search, setSearch] = React.useState("");
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  const addCustom = () => {
    const trimmed = customHobby.trim();
    if (!trimmed) return;
    const id = `mh-custom:${trimmed}`;
    if (!selected.includes(id)) {
      onChange([...selected, id]);
    }
    onCustomChange("");
  };

  const query = search.trim().toLowerCase();
  const filteredHobbies = MICRO_HOBBIES.filter((hobby) => !query || hobby.label.toLowerCase().includes(query) || hobby.rarity.toLowerCase().includes(query));
  const customHobbies = selected.filter((id) => id.startsWith("mh-custom:"));
  const filteredCustom = customHobbies.filter((id) => !query || id.slice("mh-custom:".length).toLowerCase().includes(query));

  return (
    <div className="animate-slide-up space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          Your micro-hobby fingerprint
        </h2>
        <p className="text-sm text-muted-foreground">
          These hyper-specific interests are the{" "}
          <span className="text-accent font-semibold">resonance points</span> —
          the single shared obsession that bridges two completely opposite
          people. Rarer hobbies create stronger matches.
        </p>
      </div>

      <label className="block">
        <span className="sr-only">Search hobbies and tags</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search hobbies and tags..." className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </label>

      {/* Rarity legend */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground">Rarity:</span>
        {["Common", "Uncommon", "Rare"].map((r) => (
          <span
            key={r}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border font-mono-data ${RARITY_STYLE[r]}`}
          >
            {r}
          </span>
        ))}
      </div>

      {/* Hobby grid — asymmetric bento layout */}
      <div className="flex flex-wrap gap-2.5">
        {filteredHobbies.map((hobby) => {
          const active = selected.includes(hobby.id);
          return (
            <button
              key={hobby.id}
              onClick={() => toggle(hobby.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-primary/15 border-primary text-primary glow-purple"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-border/60"
              }`}
            >
              <span>{hobby.label}</span>
              <span
                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border font-mono-data ${RARITY_STYLE[hobby.rarity]}`}
              >
                {hobby.rarity}
              </span>
            </button>
          );
        })}
        {filteredCustom.map((id) => {
          const label = id.slice("mh-custom:".length);
          return <span key={id} className="flex items-center gap-2 rounded-xl border border-primary bg-primary/15 px-3.5 py-2.5 text-sm font-medium text-primary">{label}<span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold">Custom</span><button type="button" onClick={() => toggle(id)} aria-label={`Remove ${label}`} className="rounded-full px-1 text-base leading-none hover:bg-primary/10">×</button></span>;
        })}
        {!filteredHobbies.length && !filteredCustom.length && <p className="w-full py-4 text-center text-sm text-muted-foreground">No tags match “{search}”.</p>}
      </div>

      {/* Custom hobby input */}
      <div className="card-elevated p-5">
        <p className="text-sm font-semibold text-foreground mb-1">
          Add your own
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          The more specific, the better. "Photography" is too broad. "Wet-plate
          collodion photography" is perfect.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={150}
            value={customHobby}
            onChange={(e) => onCustomChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder="Type a custom interest..."
            className="flex-1 px-4 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addCustom}
            disabled={!customHobby.trim()}
            className="px-4 py-2.5 bg-primary/15 border border-primary/40 text-primary rounded-lg text-sm font-semibold hover:bg-primary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex items-center gap-1.5"
          >
            <Icon name="PlusIcon" size={15} />
            Add Tag
          </button>
        </div>
      </div>

      {/* Selected summary */}
      {selected.length > 0 && (
        <div className="card-elevated p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Your resonance candidates ({selected.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.map((id) => {
              const hobby = MICRO_HOBBIES.find((h) => h.id === id);
              const label = hobby?.label ?? (id.startsWith("mh-custom:")
                ? id.slice("mh-custom:".length)
                : id.replace("mh-custom-", "").replace(/-/g, " "));
              return (
                <span
                  key={id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-lg text-xs font-medium text-accent"
                >
                  {label}
                  <button
                    onClick={() => toggle(id)}
                    className="hover:text-accent/60 transition-colors"
                    aria-label={`Remove ${label}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
