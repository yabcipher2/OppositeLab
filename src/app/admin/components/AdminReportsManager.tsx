"use client";

import { useCallback, useEffect, useState } from "react";

type Report = { id: string; target: string; reason: string; details?: string; reportedBy?: string; createdAt: string };

export default function AdminReportsManager() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReports = useCallback(async () => {
    const response = await fetch("/api/moderation/reports", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load reports.");
    setReports(data.reports ?? []);
  }, []);

  useEffect(() => {
    loadReports().catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load reports."))
      .finally(() => setLoading(false));
  }, [loadReports]);

  const resolve = async (report: Report, decision: "dismissed" | "removed") => {
    setSavingId(report.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/moderation/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: report.id, decision }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not resolve the report.");
      setReports((current) => current.filter((item) => item.id !== report.id));
      setNotice(`Report ${decision}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not resolve the report."); }
    finally { setSavingId(""); }
  };

  return <section className="rounded-2xl border border-border bg-card p-5"><div><h2 className="text-lg font-semibold">Moderation queue</h2><p className="mt-1 text-sm text-muted-foreground">Review reports and record a decision.</p></div>
    {error && <p role="alert" className="mt-4 text-sm text-negative">{error}</p>}{notice && <p role="status" className="mt-4 text-sm text-positive">{notice}</p>}
    {loading ? <p className="py-8 text-sm text-muted-foreground">Loading reports…</p> : reports.length ? <div className="mt-4 space-y-3">{reports.map((report) => <article key={report.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{report.target}</h3><p className="mt-1 text-xs text-muted-foreground">{report.reason} · Reported by {report.reportedBy || "Community member"} · {new Date(report.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs text-warning">Open</span></div><p className="mt-3 rounded-lg bg-background p-3 text-sm text-muted-foreground">{report.details || "No additional details were provided."}</p><div className="mt-3 flex justify-end gap-2"><button type="button" disabled={savingId === report.id} onClick={() => void resolve(report, "dismissed")} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">Dismiss</button><button type="button" disabled={savingId === report.id} onClick={() => void resolve(report, "removed")} className="rounded-lg bg-negative px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Remove reported content</button></div></article>)}</div> : <p className="py-8 text-center text-sm text-muted-foreground">No open reports.</p>}
  </section>;
}
