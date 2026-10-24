"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { CommunityChat, type Community } from "../components/CommunityChat";

export default function CommunityChatPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/communities", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load community.");
        return (result.communities ?? []).find((item: Community) => item.id === communityId) ?? null;
      })
      .then((item) => {
        if (cancelled) return;
        if (!item) setError("This community could not be found.");
        else if (!item.joined) setError("Join this community to open its chat.");
        else setCommunity(item);
      })
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load community."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [communityId]);

  async function leaveCommunity() {
    setLeaving(true);
    setError("");
    try {
      const response = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave", communityId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not leave this community.");
      router.push("/communities");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not leave this community.");
      setLeaving(false);
    }
  }

  return (
    <AppLayout activePath="/communities">
      <main className="min-h-screen bg-background px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <Link href="/communities" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary">
              Back to Community
            </Link>
            {community && !loading && (
              <button
                type="button"
                onClick={leaveCommunity}
                disabled={leaving}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-red-500/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {leaving ? "Leaving..." : "Leave community"}
              </button>
            )}
          </div>
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading community chat...</p>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">{error}</div>
          ) : community ? (
            <CommunityChat community={community} onClose={() => router.push("/communities")} onCommunityUpdated={setCommunity} />
          ) : null}
        </div>
      </main>
    </AppLayout>
  );
}
