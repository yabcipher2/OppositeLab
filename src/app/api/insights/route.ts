import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const db = await getDatabase();
    const userId = user._id.toHexString();

    const [matches, projects, milestones, activities] = await Promise.all([
      db.collection("matches").find({ memberIds: userId }).sort({ createdAt: -1 }).toArray(),
      db.collection("projects").find({ memberIds: userId }).sort({ updatedAt: -1 }).toArray(),
      db.collection("milestones").find({ memberIds: userId }).toArray(),
      db.collection("workspaceActivity").find({ memberIds: userId }).sort({ createdAt: -1 }).limit(8).toArray(),
    ]);

    const activeMatch = matches.find((match) => match.status === "active");
    const activeProject = activeMatch && Array.isArray(activeMatch.memberIds)
      ? projects.find((project) => activeMatch.memberIds.every((memberId: string) => project.memberIds?.includes(memberId))) ?? null
      : null;
    const partnerId = Array.isArray(activeMatch?.memberIds)
      ? activeMatch.memberIds.find((memberId: string) => memberId !== userId) ?? null
      : null;
    const partner = partnerId && ObjectId.isValid(partnerId)
      ? await db.collection("users").findOne({ _id: new ObjectId(partnerId) }, { projection: { name: 1 } })
      : null;

    const now = new Date();
    const activeCreatedAt = activeMatch?.createdAt ? new Date(activeMatch.createdAt).getTime() : Number.NaN;
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const firstDay = new Date(today);
    firstDay.setUTCDate(firstDay.getUTCDate() - 20);
    const [recentActivity, projectVotes] = await Promise.all([
      db.collection("workspaceActivity").find({ memberIds: userId, createdAt: { $gte: firstDay } }).toArray(),
      activeProject ? db.collection("projectVotes").find({ projectId: activeProject._id.toHexString() }, { projection: { score: 1 } }).toArray() : Promise.resolve([]),
    ]);
    const trackedSavesPerDay = Math.round((recentActivity.length / 21) * 10) / 10;
    const contributionMap = new Map<string, { date: string; mine: number; partner: number }>();
    for (let dayOffset = 0; dayOffset < 21; dayOffset += 1) {
      const date = new Date(firstDay);
      date.setUTCDate(firstDay.getUTCDate() + dayOffset);
      const key = date.toISOString().slice(0, 10);
      contributionMap.set(key, { date: key, mine: 0, partner: 0 });
    }
    for (const activity of recentActivity) {
      const key = new Date(activity.createdAt).toISOString().slice(0, 10);
      const day = contributionMap.get(key);
      if (!day) continue;
      if (activity.actorId === userId) day.mine += 1;
      else if (partnerId && activity.actorId === partnerId) day.partner += 1;
    }

    const scoreHistory = matches
      .filter((match) => typeof match.divergenceScore === "number")
      .slice(0, 10)
      .reverse()
      .map((match, index) => ({
        match: `Match ${index + 1}`,
        score: match.divergenceScore,
        date: match.createdAt,
      }));
    const recentEvents = activities.map((activity) => ({
      id: activity._id.toHexString(),
      projectTitle: activity.projectTitle,
      kind: activity.kind,
      createdAt: activity.createdAt,
      actor: activity.actorId === userId ? user.name : activity.actorId === partnerId ? partner?.name ?? "Partner" : "Collaborator",
    }));

    return NextResponse.json({
      summary: {
        activeMatches: matches.filter((match) => match.status === "active").length,
        projects: projects.length,
        completedMilestones: milestones.filter((milestone) => milestone.completedAt).length,
        totalMilestones: milestones.length,
        activeDivergence: typeof activeMatch?.divergenceScore === "number" ? activeMatch.divergenceScore : null,
        activeHealth: typeof activeMatch?.healthScore === "number" ? activeMatch.healthScore : null,
        breakthroughIndex: projectVotes.length ? Math.round(projectVotes.reduce((sum, vote) => sum + (typeof vote.score === "number" ? vote.score : 0), 0) / projectVotes.length) : null,
        breakthroughVotes: projectVotes.length,
        activeDays: Number.isFinite(activeCreatedAt) ? Math.max(1, Math.floor((now.getTime() - activeCreatedAt) / 86400000)) : null,
        trackedSavesPerDay,
      },
      contributions: Array.from(contributionMap.values()),
      contributors: { mine: user.name, partner: partner?.name ?? "Match partner" },
      scoreHistory,
      recentEvents,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
