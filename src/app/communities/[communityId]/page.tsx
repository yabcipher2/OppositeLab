"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { CommunityChat, type Community } from "../../community/components/CommunityChat";

type CommunityInviteDetails = Community & { joined: boolean };

export default function CommunityChatPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [inviteDetails, setInviteDetails] = useState<CommunityInviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadCommunity = async () => {
      const inviteToken = new URLSearchParams(window.location.search).get("invite");
      const metadataUrl = new URL(`/api/communities/${communityId}/invite`, window.location.origin);
      if (inviteToken) metadataUrl.searchParams.set("token", inviteToken);
      const response = await fetch(metadataUrl, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load community.");
      if (cancelled) return;
      const item = result.community as CommunityInviteDetails;
      setInviteDetails(item);
      setError("");
      if (item.joined) setCommunity(item);
      else setCommunity(null);
    };
    void loadCommunity()
      .catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load community."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [communityId, user?._id]);

  async function joinCommunity() {
    if (!user) return;
    setJoining(true);
    setError("");
    try {
      const inviteToken = new URLSearchParams(window.location.search).get("invite");
      const response = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", communityId, ...(inviteToken ? { inviteToken } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not join this community.");
      if (inviteDetails) {
        setInviteDetails({ ...inviteDetails, joined: true, members: result.members ?? inviteDetails.members });
        setCommunity({ ...inviteDetails, joined: true, members: result.members ?? inviteDetails.members });
      }
      router.replace(`/communities/${communityId}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not join this community.");
    } finally {
      setJoining(false);
    }
  }

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

  const saveInviteAndContinue = (destination: "login" | "signup") => {
    const inviteUrl = `${window.location.pathname}${window.location.search}`;
    window.sessionStorage.setItem("oppositelab:pending-community-invite", inviteUrl);
    router.push(`/sign-up-login-screen?mode=${destination}`);
  };

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Checking your session…</main>;
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          {loading ? <p className="text-sm text-muted-foreground">Loading community invitation…</p> : error ? (
            <div role="alert" className="rounded-lg bg-negative/10 p-3 text-sm text-negative">{error}</div>
          ) : inviteDetails ? <>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Community invitation</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Join {inviteDetails.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{inviteDetails.description}</p>
            <p className="mt-4 text-xs text-muted-foreground">{inviteDetails.members} members · {inviteDetails.visibility === "private" ? "Private community" : "Public community"}</p>
            <p className="mt-5 text-sm text-foreground">Sign in or create an account to join this community.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => saveInviteAndContinue("login")} className="min-h-11 flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Sign in to continue</button>
              <button type="button" onClick={() => saveInviteAndContinue("signup")} className="min-h-11 flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground">Create account</button>
            </div>
          </> : null}
        </section>
      </main>
    );
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
          ) : inviteDetails && !community ? (
            <section className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Community invitation</p>
              <h1 className="mt-2 text-2xl font-bold text-foreground">Join {inviteDetails.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{inviteDetails.description}</p>
              <p className="mt-4 text-xs text-muted-foreground">{inviteDetails.members} members · {inviteDetails.visibility === "private" ? "Private community" : "Public community"}</p>
              <button type="button" onClick={() => void joinCommunity()} disabled={joining} className="mt-6 min-h-11 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {joining ? "Joining…" : "Join Community"}
              </button>
            </section>
          ) : community ? (
            <CommunityChat community={community} onClose={() => router.push("/communities")} onCommunityUpdated={setCommunity} />
          ) : null}
        </div>
      </main>
    </AppLayout>
  );
}
