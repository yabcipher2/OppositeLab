"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Insights = {
  summary: { activeMatches: number; projects: number; completedMilestones: number; totalMilestones: number };
  contributions: { date: string; mine: number; partner: number }[];
  contributors: { mine: string; partner: string };
  scoreHistory: { match: string; score: number; date: string }[];
  recentEvents: { id: string; projectTitle: string; kind: string; createdAt: string; actor: string }[];
};

function EmptyChart({ message }: { message: string }) {
  return <div className="grid h-[280px] place-items-center rounded-xl border border-dashed border-border px-8 text-center text-sm text-muted-foreground">{message}</div>;
}

export default function MatchInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/insights", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load collaboration insights.");
        setData(result);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load collaboration insights."));
  }, []);

  if (error) return <p role="alert" className="rounded-xl border border-negative/30 bg-negative/5 p-4 text-sm text-negative">{error}</p>;
  if (!data) return <div className="card-elevated h-72 animate-pulse" aria-label="Loading collaboration insights" />;

  const hasContributions = data.contributions.some((day) => day.mine > 0 || day.partner > 0);

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="card-elevated p-5">
          <p className="text-sm text-muted-foreground">Active pairings</p>
          <p className="mt-3 text-3xl font-bold text-primary">{data.summary.activeMatches}</p>
          <p className="mt-2 text-xs text-muted-foreground">Current MongoDB match records</p>
        </article>
        <article className="card-elevated p-5">
          <p className="text-sm text-muted-foreground">Shared projects</p>
          <p className="mt-3 text-3xl font-bold text-accent">{data.summary.projects}</p>
          <p className="mt-2 text-xs text-muted-foreground">Projects you can access</p>
        </article>
        <article className="card-elevated p-5">
          <p className="text-sm text-muted-foreground">Milestone progress</p>
          <p className="mt-3 text-3xl font-bold text-positive">{data.summary.completedMilestones}<span className="ml-2 text-base font-medium text-muted-foreground">/ {data.summary.totalMilestones}</span></p>
          <p className="mt-2 text-xs text-muted-foreground">Completed milestones</p>
        </article>
      </div>

      <div className="grid gap-5 2xl:grid-cols-2">
        <article className="card-elevated min-w-0 p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Workspace contributions</h2>
              <p className="mt-1 text-sm text-muted-foreground">Saved project updates per day · last 21 days</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-primary" />{data.contributors.mine}</span>
              <span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-accent" />{data.contributors.partner}</span>
            </div>
          </div>
          {hasContributions ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.contributions} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 5" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={26} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }} labelFormatter={(value) => new Date(`${value}T00:00:00Z`).toLocaleDateString()} />
                  <Line type="monotone" dataKey="mine" name={data.contributors.mine} stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="partner" name={data.contributors.partner} stroke="hsl(var(--accent))" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No workspace saves have been recorded in this period. Save a shared project to start the contribution graph." />
          )}
        </article>

        <article className="card-elevated min-w-0 p-6">
          <div className="mb-5">
              <h2 className="text-lg font-semibold">Divergence distribution</h2>
              <p className="mt-1 text-sm text-muted-foreground">Across {data.scoreHistory.length} matches with a saved score</p>
          </div>
          {data.scoreHistory.length ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.scoreHistory} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 5" vertical={false} />
                  <XAxis dataKey="match" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="score" name="Divergence" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} maxBarSize={52} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="Your match records don’t contain divergence scores yet. Scores will appear here when they’re saved." />
          )}
        </article>
      </div>

      <article className="card-elevated overflow-hidden">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-lg font-semibold">Recent collaboration activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">Latest project saves recorded in MongoDB</p>
        </div>
        {data.recentEvents.length ? (
          <ul className="divide-y divide-border/70">
            {data.recentEvents.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <p className="text-sm"><span className="font-semibold text-primary">{event.actor}</span><span className="text-muted-foreground"> saved </span><span className="font-medium">{event.projectTitle}</span></p>
                <time className="text-xs text-muted-foreground" dateTime={new Date(event.createdAt).toISOString()}>{new Date(event.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-6 text-sm text-muted-foreground">No collaboration saves have been recorded yet.</p>
        )}
      </article>
    </section>
  );
}
