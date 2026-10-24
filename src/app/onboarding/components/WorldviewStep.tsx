"use client";

import React from "react";

const WORLDVIEW_SLIDERS = [
  {
    id: "wv-order",
    left: "Rigid Order",
    right: "Emergent Chaos",
    description: "How do you believe complex systems should be organised?",
  },
  {
    id: "wv-local",
    left: "Hyper-Local",
    right: "Planetary Scale",
    description: "Where does meaningful change actually happen?",
  },
  {
    id: "wv-empirical",
    left: "Empirical Evidence",
    right: "Intuitive Knowing",
    description: "What do you trust more when making decisions?",
  },
  {
    id: "wv-individual",
    left: "Individual Agency",
    right: "Collective Wisdom",
    description: "Who drives the most important breakthroughs?",
  },
];

const WORLDVIEW_ANCHORS = [
  {
    id: "wa-systems",
    label: "Systems Thinker",
    desc: "You see feedback loops everywhere",
  },
  {
    id: "wa-builder",
    label: "First-Principles Builder",
    desc: "You reconstruct from scratch",
  },
  {
    id: "wa-connector",
    label: "Cross-Domain Connector",
    desc: "You find patterns across fields",
  },
  {
    id: "wa-critic",
    label: "Structural Critic",
    desc: "You question the frame, not just the content",
  },
  {
    id: "wa-synthesist",
    label: "Synthesist",
    desc: "You merge opposing ideas into new forms",
  },
  {
    id: "wa-pragmatist",
    label: "Radical Pragmatist",
    desc: "You care only about what works",
  },
];

interface WorldviewStepProps {
  sliders: Record<string, number>;
  picks: string[];
  onSlidersChange: (sliders: Record<string, number>) => void;
  onPicksChange: (picks: string[]) => void;
}

export default function WorldviewStep({
  sliders,
  picks,
  onSlidersChange,
  onPicksChange,
}: WorldviewStepProps) {
  const updateSlider = (id: string, value: number) => {
    onSlidersChange({ ...sliders, [id]: value });
  };

  const togglePick = (id: string) => {
    onPicksChange(
      picks.includes(id) ? picks.filter((p) => p !== id) : [...picks, id],
    );
  };

  return (
    <div className="animate-slide-up space-y-10">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          Your worldview coordinates
        </h2>
        <p className="text-sm text-muted-foreground">
          These axes map your philosophical position. There are no correct
          answers — only honest ones. Your opposite will sit at the far end of
          your spectrum.
        </p>
      </div>

      {/* Philosophical sliders */}
      <div className="space-y-7">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Orientation axes
        </p>
        {WORLDVIEW_SLIDERS.map((slider) => {
          const val = sliders[slider.id] ?? 50;
          return (
            <div key={slider.id} className="card-elevated p-5">
              <p className="text-sm font-medium text-foreground mb-1">
                {slider.description}
              </p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-mono-data">
                  {slider.left}
                </span>
                <span className="text-xs font-mono-data text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {val < 40
                    ? slider.left
                    : val > 60
                      ? slider.right
                      : "Balanced"}
                </span>
                <span className="text-xs text-muted-foreground font-mono-data">
                  {slider.right}
                </span>
              </div>
              <div className="relative pt-8">
                <output
                  aria-live="polite"
                  className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-md border border-primary/30 bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm"
                  style={{ left: `clamp(2.5rem, ${val}%, calc(100% - 2.5rem))` }}
                >
                  {val}% - {val < 40 ? slider.left : val > 60 ? slider.right : "Balanced"}
                </output>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) =>
                    updateSlider(slider.id, Number(e.target.value))
                  }
                  className="slider-purple w-full"
                  style={{ "--val": `${val}%` } as React.CSSProperties}
                  aria-label={`${slider.description}: ${val}%`}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <div
                  className="h-1 rounded-full bg-primary/30 transition-all duration-150"
                  style={{ width: `${val}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Worldview anchors */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Thinking archetype — pick at least one
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {WORLDVIEW_ANCHORS.map((anchor) => {
            const active = picks.includes(anchor.id);
            return (
              <button
                key={anchor.id}
                onClick={() => togglePick(anchor.id)}
                className={`text-left p-4 rounded-xl border transition-all duration-150 ${
                  active
                    ? "bg-primary/10 border-primary glow-purple"
                    : "bg-secondary border-border hover:border-border/60 hover:bg-secondary/80"
                }`}
              >
                <p
                  className={`text-sm font-semibold mb-1 ${active ? "text-primary" : "text-foreground"}`}
                >
                  {anchor.label}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {anchor.desc}
                </p>
                {active && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[10px] text-primary font-mono-data">
                      Selected
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
