"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/AppIcon";
import type { OnboardingData } from "./OnboardingShell";

interface OnboardingCompleteProps {
  data: OnboardingData;
}

export default function OnboardingComplete({ data }: OnboardingCompleteProps) {
  const [score, setScore] = useState(0);

  useEffect(() => {
    const target = Math.min(
      40 +
        data.interests.length * 4 +
        data.microHobbies.length * 6 +
        data.worldviewPicks.length * 5,
      99,
    );
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      if (current >= target) {
        setScore(target);
        clearInterval(interval);
      } else {
        setScore(current);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [data]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-8 py-16 animate-fade-in">
      {/* Glow orb */}
      <div className="relative mb-10">
        <div className="w-28 h-28 rounded-full bg-gradient-purple-cyan flex items-center justify-center glow-purple animate-pulse-glow">
          <Icon name="SparklesIcon" size={48} className="text-white" />
        </div>
        <div className="absolute -inset-4 rounded-full bg-primary/5 blur-xl" />
      </div>

      <h1 className="text-3xl font-bold text-foreground text-center mb-2">
        Signal calibrated.
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-10 text-sm leading-relaxed">
        Your digital fingerprint has been encoded into the matching engine. The
        algorithm is now searching for your mathematical opposite.
      </p>

      {/* Divergence potential score */}
      <div className="card-elevated p-6 w-full max-w-sm mb-8 text-center">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Divergence Potential Score
        </p>
        <div className="text-6xl font-bold font-mono-data text-gradient-purple-cyan mb-2">
          {score}
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-purple-cyan rounded-full transition-all duration-75"
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {score >= 80
            ? "Exceptional divergence — rare match incoming."
            : score >= 60
              ? "Strong signal — high-quality match likely."
              : "Good baseline — add more interests to sharpen."}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 w-full max-w-sm mb-10 md:grid-cols-3">
        {[
          {
            label: "Interests",
            value: data.interests.length,
            icon: "SparklesIcon",
          },
          {
            label: "Worldview axes",
            value: Object.keys(data.worldviewSliders).length,
            icon: "GlobeAltIcon",
          },
          {
            label: "Micro-hobbies",
            value: data.microHobbies.length,
            icon: "PuzzlePieceIcon",
          },
        ].map((stat) => (
          <div key={stat.label} className="card-elevated p-4 text-center">
            <Icon
              name={stat.icon as Parameters<typeof Icon>[0]["name"]}
              size={18}
              className="text-primary mx-auto mb-2"
            />
            <p className="text-2xl font-bold font-mono-data text-foreground">
              {stat.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <Link
        href="/match-pairing-screen"
        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 glow-purple"
      >
        Find my opposite
        <Icon name="ArrowRightIcon" size={16} />
      </Link>

      <p className="text-xs text-muted-foreground mt-4">
        You can update your profile at any time from Settings.
      </p>
    </div>
  );
}
