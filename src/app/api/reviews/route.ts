import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { evaluateBreakthroughEligibility } from "@/lib/server/breakthroughs";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const db = await getDatabase();
    const nominations = await db.collection("projectNominations").find({ approvalStatus: "approved" }).sort({ createdAt: -1 }).limit(100).toArray();
    const projectIds = [...new Set(nominations.map((item) => item.projectId).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))];
    const votes = projectIds.length ? await db.collection("projectVotes").find({ projectId: { $in: projectIds } }).toArray() : [];
    const voteGroups = new Map<string, { total: number; count: number; ownScore: number | null }>();
    for (const vote of votes) {
      const group = voteGroups.get(vote.projectId) ?? { total: 0, count: 0, ownScore: null };
      if (typeof vote.score === "number") { group.total += vote.score; group.count += 1; }
      if (vote.voterId === user._id.toHexString()) group.ownScore = vote.score;
      voteGroups.set(vote.projectId, group);
    }
    const projects = projectIds.length ? await db.collection("projects").find({ _id: { $in: projectIds.map((id) => new ObjectId(id)) } }).toArray() : [];
    const projectMap = new Map(projects.map((project) => [project._id.toHexString(), project]));
    const reviews = await Promise.all(nominations.map(async (nomination) => {
      const project = projectMap.get(nomination.projectId);
      if (!project) return null;
      const memberIds: string[] = Array.isArray(project.memberIds) ? project.memberIds : [];
      const signoffs: string[] = Array.isArray(nomination.signoffs) ? nomination.signoffs : [];
      const eligibility = await evaluateBreakthroughEligibility(db, project);
      if (!eligibility.eligible || memberIds.length !== 2 || !memberIds.every((memberId) => signoffs.includes(memberId))) return null;
      const group = voteGroups.get(nomination.projectId) ?? { total: 0, count: 0, ownScore: null };
      return {
        projectId: nomination.projectId,
        title: project.title,
        nominatedAt: nomination.createdAt,
        nominationCount: await db.collection("projectNominations").countDocuments({ projectId: nomination.projectId }),
        voteCount: group.count,
        averageScore: group.count ? Math.round(group.total / group.count) : null,
        ownScore: group.ownScore,
        canVote: !memberIds.includes(user._id.toHexString()),
      };
    }));
    return NextResponse.json({ reviews: reviews.filter((review): review is NonNullable<typeof review> => review !== null) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (typeof body.projectId !== "string" || !ObjectId.isValid(body.projectId) || !Number.isInteger(body.score) || body.score < 0 || body.score > 100) {
      return NextResponse.json({ error: "Choose a project and a whole-number score from 0 to 100." }, { status: 400 });
    }
    const db = await getDatabase();
    const project = await db.collection("projects").findOne({ _id: new ObjectId(body.projectId) }, { projection: { title: 1, memberIds: 1 } });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const nomination = await db.collection("projectNominations").findOne({ projectId: body.projectId, approvalStatus: "approved" });
    if (!nomination) return NextResponse.json({ error: "This project has not been nominated for review." }, { status: 409 });
    const signoffs: string[] = Array.isArray(nomination.signoffs) ? nomination.signoffs : [];
    const memberIds: string[] = Array.isArray(project.memberIds) ? project.memberIds : [];
    if (memberIds.length !== 2 || !memberIds.every((memberId) => signoffs.includes(memberId))) {
      return NextResponse.json({ error: "This project is not yet published in the Breakthrough Index." }, { status: 409 });
    }
    if (Array.isArray(project.memberIds) && project.memberIds.includes(user._id.toHexString())) {
      return NextResponse.json({ error: "Project collaborators cannot vote on their own project." }, { status: 403 });
    }
    const votes = db.collection("projectVotes");
    await votes.createIndex({ projectId: 1, voterId: 1 }, { unique: true });
    const now = new Date();
    await votes.updateOne(
      { projectId: body.projectId, voterId: user._id.toHexString() },
      { $set: { score: body.score, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    const projectVotes = await votes.find({ projectId: body.projectId }, { projection: { score: 1 } }).toArray();
    const averageScore = Math.round(projectVotes.reduce((total, vote) => total + vote.score, 0) / projectVotes.length);
    return NextResponse.json({ saved: true, ownScore: body.score, voteCount: projectVotes.length, averageScore });
  } catch (error) {
    return handleApiError(error);
  }
}
