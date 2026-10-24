"use client";

import React from "react";
import DivergenceViz from "./DivergenceViz";

const stats = [
  { label: "Active Pairs", value: "4,821", suffix: "" },
  { label: "Avg Divergence", value: "87", suffix: "%" },
  { label: "Projects Shipped", value: "1,203", suffix: "" },
];

export default function AuthBrandPanel() {
  return (
    <div className="w-full flex flex-col bg-card border-r border-border relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl bg-primary pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl bg-accent pointer-events-none" />
      <div className="relative z-10 flex flex-col h-full p-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-9 h-9 rounded-xl bg-gradient-purple-cyan flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">OL</span>
          </div>
          <span className="font-semibold text-lg text-foreground">
            OppositeLab
          </span>
        </div>

        {/* Center content */}
        <div className="flex flex-col items-center justify-center flex-1 py-12">
          <DivergenceViz />

          <h1 className="hero-text-clamp font-bold text-foreground text-center mt-8 mb-4 leading-tight">
            Your best ideas live{" "}
            <span className="text-gradient-purple-cyan">across the divide</span>
          </h1>
          <p className="text-muted-foreground text-center max-w-sm text-base leading-relaxed">
            We pair you with your mathematical opposite — then find the one
            obsession you inexplicably share. What you build together will
            surprise both of you.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats?.map((stat) => (
            <div key={`stat-${stat?.label}`} className="text-center">
              <p className="text-2xl font-bold font-mono-data text-foreground">
                {stat?.value}
                <span className="text-primary">{stat?.suffix}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stat?.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
