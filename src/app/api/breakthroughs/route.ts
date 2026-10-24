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
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (projectId && !ObjectId.isValid(projectId)) return NextResponse.json({ error: "Choose a valid breakthrough." }, { status: 400 });
    const nominationQuery = { approvalStatus: "approved" };
    const nominations = await db.collection("projectNominations")
      .find(projectId ? { ...nominationQuery, projectId } : nominationQuery)
      .sort({ reviewedAt: -1, createdAt: -1 })
      .limit(100)
      .toArray();
    const uniqueNominations = [...new Map(nominations.map((nomination) => [nomination.projectId, nomination])).values()];
    const projectIds = uniqueNominations.map((nomination) => nomination.projectId).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id));
    const projects = projectIds.length ? await db.collection("projects").find({ _id: { $in: projectIds.map((id) => new ObjectId(id)) } }).toArray() : [];
    const projectMap = new Map(projects.map((project) => [project._id.toHexString(), project]));
    const votes = projectIds.length ? await db.collection("projectVotes").find({ projectId: { $in: projectIds } }).toArray() : [];
    const upvotes = projectIds.length ? await db.collection("breakthroughUpvotes").find({ projectId: { $in: projectIds } }).toArray() : [];
    const peerReviews = projectIds.length ? await db.collection("breakthroughReviews").find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 }).toArray() : [];
    const peopleIds = [...new Set([
      ...uniqueNominations.flatMap((item) => [
        ...(Array.isArray(item.memberIds) ? item.memberIds : []),
        ...(Array.isArray(item.signoffs) ? item.signoffs : []),
      ]),
      ...peerReviews.map((review) => review.userId),
    ].filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))];
    const people = peopleIds.length ? await db.collection("users").find(
      { _id: { $in: peopleIds.map((id) => new ObjectId(id)) } },
      { projection: { name: 1, photoFileId: 1, photo: 1 } },
    ).toArray() : [];
    const peopleMap = new Map(people.map((person) => [person._id.toHexString(), person]));
    const voteGroups = new Map<string, { total: number; count: number; ownScore: number | null }>();
    for (const vote of votes) {
      const group = voteGroups.get(vote.projectId) ?? { total: 0, count: 0, ownScore: null };
      if (typeof vote.score === "number") { group.total += vote.score; group.count += 1; }
      if (vote.voterId === user._id.toHexString()) group.ownScore = vote.score;
      voteGroups.set(vote.projectId, group);
    }
    const entries = await Promise.all(uniqueNominations.map(async (nomination) => {
      const project = projectMap.get(nomination.projectId);
      if (!project) return null;
      const memberIds: string[] = Array.isArray(project.memberIds) ? project.memberIds : [];
      const signoffs: string[] = Array.isArray(nomination.signoffs) ? nomination.signoffs : [];
      const eligibility = await evaluateBreakthroughEligibility(db, project);
      if (!eligibility.eligible || memberIds.length !== 2 || !memberIds.every((id) => signoffs.includes(id))) return null;
      const voteGroup = voteGroups.get(nomination.projectId) ?? { total: 0, count: 0, ownScore: null };
      const projectUpvotes = upvotes.filter((item) => item.projectId === nomination.projectId);
      const projectReviews = peerReviews.filter((item) => item.projectId === nomination.projectId);
      return {
        projectId: nomination.projectId,
        title: project.title ?? nomination.projectTitle ?? "Untitled project",
        content: typeof project.content === "string" ? project.content : "",
        publishedAt: nomination.reviewedAt ?? nomination.createdAt,
        contributors: memberIds.map((id) => {
          const person = peopleMap.get(id);
          return { id, name: person?.name ?? "Collaborator", photoUrl: person?.photoFileId || person?.photo ? `/api/profile/photo?v=${person.photoFileId ? String(person.photoFileId) : "legacy"}&userId=${id}` : null };
        }),
        contribution: eligibility.contribution,
        resonancePoint: eligibility.resonancePoint,
        wordCount: eligibility.wordCount,
        voteCount: voteGroup.count,
        averageScore: voteGroup.count ? Math.round(voteGroup.total / voteGroup.count) : null,
        ownScore: voteGroup.ownScore,
        upvoteCount: projectUpvotes.length,
        hasUpvoted: projectUpvotes.some((item) => item.userId === user._id.toHexString()),
        canVote: !memberIds.includes(user._id.toHexString()),
        reviews: projectReviews.map((review) => ({
          id: review._id.toHexString(),
          author: peopleMap.get(review.userId)?.name ?? "Community member",
          userId: review.userId,
          text: review.text,
          createdAt: review.createdAt,
        })),
      };
    }));
    const results = entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    if (projectId && ObjectId.isValid(projectId) && !results.length) {
      return NextResponse.json({ error: "Breakthrough not found." }, { status: 404 });
    }
    return NextResponse.json(projectId ? { breakthrough: results[0] ?? null } : { breakthroughs: results });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (typeof body.projectId !== "string" || !ObjectId.isValid(body.projectId) || !["upvote", "review"].includes(body.action)) {
      return NextResponse.json({ error: "Choose a published breakthrough and a valid action." }, { status: 400 });
    }
    const db = await getDatabase();
    const nomination = await db.collection("projectNominations").findOne({ projectId: body.projectId, approvalStatus: "approved" });
    const project = await db.collection("projects").findOne({ _id: new ObjectId(body.projectId) });
    if (!nomination || !project) return NextResponse.json({ error: "Breakthrough not found." }, { status: 404 });
    const eligibility = await evaluateBreakthroughEligibility(db, project);
    const memberIds: string[] = Array.isArray(project.memberIds) ? project.memberIds : [];
    const signoffs: string[] = Array.isArray(nomination.signoffs) ? nomination.signoffs : [];
    if (!eligibility.eligible || memberIds.length !== 2 || !memberIds.every((id) => signoffs.includes(id))) {
      return NextResponse.json({ error: "This project is no longer eligible for the Breakthrough Index." }, { status: 409 });
    }
    if (body.action === "review") {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text || text.length > 2000) return NextResponse.json({ error: "Peer reviews must contain 1 to 2,000 characters." }, { status: 400 });
      if (memberIds.includes(user._id.toHexString())) return NextResponse.json({ error: "Project collaborators cannot review their own breakthrough." }, { status: 403 });
      const result = await db.collection("breakthroughReviews").insertOne({ projectId: body.projectId, userId: user._id.toHexString(), text, createdAt: new Date() });
      return NextResponse.json({ saved: true, review: { id: result.insertedId.toHexString(), author: user.name, userId: user._id.toHexString(), text, createdAt: new Date() } }, { status: 201 });
    }
    if (memberIds.includes(user._id.toHexString())) return NextResponse.json({ error: "Project collaborators cannot upvote their own breakthrough." }, { status: 403 });
    const upvotes = db.collection("breakthroughUpvotes");
    await upvotes.createIndex({ projectId: 1, userId: 1 }, { unique: true });
    const existing = await upvotes.findOne({ projectId: body.projectId, userId: user._id.toHexString() });
    if (existing) await upvotes.deleteOne({ _id: existing._id });
    else await upvotes.insertOne({ projectId: body.projectId, userId: user._id.toHexString(), createdAt: new Date() });
    return NextResponse.json({ upvoted: !existing, upvoteCount: await upvotes.countDocuments({ projectId: body.projectId }) });
  } catch (error) {
    return handleApiError(error);
  }
}
