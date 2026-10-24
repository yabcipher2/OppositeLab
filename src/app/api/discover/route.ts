import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, profilePhotoUrl, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";
import { interestLabel } from "@/lib/interest-catalog";
import { calculateDivergence, normalizedWorldview } from "@/lib/server/matching";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const db = await getDatabase();
    const currentId = user._id.toHexString();
    const exclusions = await db.collection("creatorExclusions").find({
      $or: [
        { userId: currentId },
        { targetId: currentId, kind: "blocked" },
      ],
    }).toArray();
    const hiddenIds = Array.from(new Set(exclusions
      .filter((item) => item.kind === "blocked" || item.userId === currentId)
      .map((item) => item.userId === currentId ? item.targetId : item.userId)
      .filter((id) => typeof id === "string" && id !== currentId && /^[a-f\d]{24}$/i.test(id))))
      .map((id) => new ObjectId(id));
    const candidates = await db.collection("users").find({
      _id: { $nin: [user._id, ...hiddenIds] },
      role: "creator",
      $or: [{ status: "active" }, { status: { $exists: false } }],
      "preferences.discoverable": { $ne: false },
    }, { projection: {
      name: 1, roleLabel: 1, location: 1, interests: 1, worldviewSliders: 1, bio: 1,
      preferences: 1, photoFileId: 1, photo: 1, microHobbies: 1, updatedAt: 1,
    } }).toArray();
    const candidateIds = candidates.map((candidate) => candidate._id.toHexString());
    const [presenceRows, nominations] = await Promise.all([
      candidateIds.length
        ? db.collection("projectPresence").find({ userId: { $in: candidateIds }, lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }).sort({ lastSeen: -1 }).toArray()
        : Promise.resolve([]),
      db.collection("projectNominations").find({}).sort({ createdAt: -1 }).limit(1000).toArray(),
    ]);
    const lastSeenByUser = new Map<string, Date>();
    for (const row of presenceRows) {
      if (typeof row.userId === "string" && !lastSeenByUser.has(row.userId)) lastSeenByUser.set(row.userId, new Date(row.lastSeen));
    }
    const nominatedProjectIds = [...new Set(nominations.map((item) => item.projectId).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))];
    const nominatedProjects = nominatedProjectIds.length
      ? await db.collection("projects").find({ _id: { $in: nominatedProjectIds.map((id) => new ObjectId(id)) }, memberIds: { $in: candidateIds } }, { projection: { title: 1, memberIds: 1, updatedAt: 1, _id: 1 } }).toArray()
      : [];
    const nominatedProjectsById = new Map(nominatedProjects.map((project) => [project._id.toHexString(), project]));
    const nominationsByUser = new Map<string, { title: string; nominatedAt: Date }[]>();
    for (const nomination of nominations) {
      const project = nominatedProjectsById.get(nomination.projectId);
      if (!project) continue;
      for (const memberId of Array.isArray(project.memberIds) ? project.memberIds : []) {
        if (!candidateIds.includes(memberId)) continue;
        const existing = nominationsByUser.get(memberId) ?? [];
        if (existing.length < 10) existing.push({ title: project.title, nominatedAt: nomination.createdAt });
        nominationsByUser.set(memberId, existing);
      }
    }
    const currentInterests: string[] = Array.isArray(user.interests) ? user.interests.map(interestLabel) : [];
    const currentWorldview = normalizedWorldview(user.worldviewSliders);
    const axisNames: Record<string, string> = {
      "wv-order": "System Order",
      "wv-local": "Scale of Change",
      "wv-empirical": "Decision Making",
      "wv-individual": "Individual vs Collective",
    };
    const profiles = candidates.map((candidate) => {
      const candidateInterests: string[] = Array.isArray(candidate.interests) ? candidate.interests.map(interestLabel) : [];
      const shared = currentInterests.filter((interest) => candidateInterests.includes(interest));
      const worldview = normalizedWorldview(candidate.worldviewSliders);
      const divergenceResult = calculateDivergence(currentWorldview, worldview);
      const divergentAxes = divergenceResult.axes
        .map((id) => ({ id, label: axisNames[id] ?? id, difference: Math.abs((currentWorldview[id] ?? 50) - (worldview[id] ?? 50)) }))
        .sort((left, right) => right.difference - left.difference)
        .filter((axis) => axis.difference >= 20)
        .slice(0, 3);
      const lastActiveAt = candidate.preferences?.showOnlineStatus === false
        ? null
        : lastSeenByUser.get(candidate._id.toHexString()) ?? null;
      const isOnline = Boolean(lastActiveAt && Date.now() - lastActiveAt.getTime() < 45000);
      return {
        id: candidate._id.toHexString(),
        name: candidate.name,
        role: candidate.roleLabel ?? "Creator",
        location: candidate.preferences?.showLocation === false ? "" : candidate.location ?? "",
        photo: profilePhotoUrl(candidate.photoFileId, Boolean(candidate.photo), candidate._id),
        divergence: divergenceResult.score,
        divergentAxes,
        sharedInterest: candidate.preferences?.showInterests === false ? "" : shared.length === 1 ? shared[0] : shared.length ? `${shared.length} shared interests` : "No shared interests yet. You can still request to collaborate.",
        interests: candidate.preferences?.showInterests === false ? [] : candidateInterests,
        bio: candidate.preferences?.showBio === false ? "" : candidate.bio ?? "",
        worldview: {
          "wv-order": worldview["wv-order"] ?? null,
          "wv-local": worldview["wv-local"] ?? null,
          "wv-empirical": worldview["wv-empirical"] ?? null,
          "wv-individual": worldview["wv-individual"] ?? null,
        },
        nominations: nominationsByUser.get(candidate._id.toHexString()) ?? [],
        isOnline,
        lastActiveAt,
        sharedInterestCount: candidate.preferences?.showInterests === false ? 0 : shared.length,
        initials: String(candidate.name ?? "?").split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase(),
      };
    }).sort((a, b) => (b.divergence ?? -1) - (a.divergence ?? -1));
    const minDivergence = Number(request.nextUrl.searchParams.get("minDivergence") ?? 0);
    return NextResponse.json({
      creators: profiles.filter((profile) => profile.divergence === null ? minDivergence === 0 : profile.divergence >= minDivergence),
      currentUserId: currentId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
