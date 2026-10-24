"use client";

import { useEffect, useState } from "react";

type Summary = {
  activeDivergence: number | null;
  activeHealth: number | null;
  breakthroughIndex: number | null;
  activeDays: number | null;
  trackedSavesPerDay: number;
};

export default function MatchMetrics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    fetch("/api/insights", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setSummary(data.summary ?? null))
      .catch(() => setSummary(null));
  }, []);

  const metrics = [
    { label: "Divergence score", value: summary?.activeDivergence == null ? "—" : `${summary.activeDivergence}/100`, detail: "Saved with the active match", color: "text-primary", icon: "↔" },
    { label: "Match health", value: summary?.activeHealth == null ? "—" : `${summary.activeHealth}%`, detail: summary?.activeHealth == null ? "No health score recorded" : "Current match health", color: "text-positive", icon: "♡" },
    { label: "Collaboration velocity", value: summary ? summary.trackedSavesPerDay.toFixed(1) : "—", detail: "Tracked workspace saves per day", color: "text-accent", icon: "ϟ", suffix: summary ? "/day" : "" },
    { label: "Breakthrough index", value: summary?.breakthroughIndex == null ? "—" : `${summary.breakthroughIndex}/100`, detail: summary?.breakthroughIndex == null ? "No community score recorded" : "Community score", color: "text-warning", icon: "✧" },
    { label: "Days active", value: summary?.activeDays == null ? "—" : `${summary.activeDays}`, detail: "Since this match began", color: "text-foreground", icon: "◷", suffix: summary?.activeDays == null ? "" : "d" },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {metrics.map((metric) => (
        <article key={metric.label} className="card-elevated min-h-[185px] p-6">
          <div className="flex items-center justify-between">
            <span className={`text-2xl ${metric.color}`} aria-hidden="true">{metric.icon}</span>
            {metric.label === "Collaboration velocity" && <span className="text-xs font-medium text-muted-foreground">Live from saves</span>}
          </div>
          <p className="mt-7 text-sm text-muted-foreground">{metric.label}</p>
          <p className={`mt-2 text-3xl font-bold ${metric.color}`}>{metric.value}<span className="ml-1 text-sm font-medium text-muted-foreground">{metric.suffix}</span></p>
          <p className="mt-2 text-xs text-muted-foreground">{metric.detail}</p>
        </article>
      ))}
    </section>
  );
}
