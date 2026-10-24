"use client";

import React from "react";

const userATraits = [
  "Day Trader",
  "Tokyo",
  "Quantitative",
  "Solo",
  "Structured",
];
const userBTraits = [
  "Deep-Sea Fisher",
  "Alaska",
  "Intuitive",
  "Collective",
  "Chaotic",
];
const sharedTrait = "Restoring 1980s mechanical keyboards";

export default function DivergenceViz() {
  return (
    <div className="w-full max-w-sm">
      <div className="flex items-stretch gap-3">
        {/* User A */}
        <div className="flex-1 card-elevated p-3 space-y-1.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary mb-2">
            HT
          </div>
          <p className="text-xs font-semibold text-primary">Hiroshi T.</p>
          {userATraits?.map((t) => (
            <span
              key={`trait-a-${t}`}
              className="inline-block text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 mr-1"
            >
              {t}
            </span>
          ))}
        </div>

        {/* Bridge */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex-1 w-px bg-gradient-to-b from-primary via-border to-accent" />
          <div className="my-2 px-2 py-1 rounded-full bg-secondary border border-border text-[9px] font-semibold text-foreground text-center max-w-[60px] leading-tight">
            ⚡ shared
          </div>
          <div className="flex-1 w-px bg-gradient-to-b from-accent via-border to-primary" />
        </div>

        {/* User B */}
        <div className="flex-1 card-elevated p-3 space-y-1.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-accent-foreground bg-accent mb-2">
            SR
          </div>
          <p className="text-xs font-semibold text-accent">Solveig R.</p>
          {userBTraits?.map((t) => (
            <span
              key={`trait-b-${t}`}
              className="inline-block text-[10px] bg-accent/10 text-accent border border-accent/20 rounded px-1.5 py-0.5 mr-1"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      {/* Resonance point */}
      <div className="mt-3 p-3 rounded-xl border border-primary/30 bg-primary/5 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
          Resonance Point
        </p>
        <p className="text-xs font-semibold text-foreground">{sharedTrait}</p>
      </div>
    </div>
  );
}
