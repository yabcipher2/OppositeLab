import React from "react";
import MatchHeroCard from "./MatchHeroCard";
import MatchInsights from "./MatchInsights";
import MatchHistoryTable from "./MatchHistoryTable";
import MatchMetrics from "./MatchMetrics";

export default function MatchDashboard() {
  return (
    <div className="px-6 py-6 xl:px-9 2xl:px-10 max-w-[1720px] mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">My Match</h1>
          <p className="text-base text-muted-foreground">
            Your current active pairing and collaboration overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-transparent border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
            <span className="text-sm font-semibold text-positive">Live</span>
          </div>
        </div>
      </div>

      {/* Hero pairing card */}
      <MatchHeroCard />

      <MatchMetrics />

      {/* Activity charts use saved match and workspace records. */}
      <MatchInsights />

      {/* History table */}
      <MatchHistoryTable />
    </div>
  );
}
