import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";
import { evaluateBreakthroughEligibility } from "@/lib/server/breakthroughs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId || !ObjectId.isValid(projectId)) return NextResponse.json({ error: "Choose a valid project." }, { status: 400 });
    const db = await getDatabase();
    const project = await db.collection("projects").findOne({ _id: new ObjectId(projectId), memberIds: user._id.toHexString() });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const eligibility = await evaluateBreakthroughEligibility(db, project);
    const nominations = db.collection("projectNominations");
    const activeQuery = { projectId, approvalStatus: { $ne: "rejected" } };
    const nomination = await nominations.findOne(activeQuery, { sort: { createdAt: 1 } });
    const votes = await db.collection("projectVotes").find({ projectId }, { projection: { score: 1 } }).toArray();
    const totalScore = votes.reduce((total, vote) => total + (typeof vote.score === "number" ? vote.score : 0), 0);
    const memberIds: string[] = Array.isArray(project.memberIds) ? project.memberIds : [];
    const signoffs: string[] = Array.isArray(nomination?.signoffs) ? nomination.signoffs : [];
    return NextResponse.json({
      count: nomination ? 1 : 0,
      nominated: signoffs.includes(user._id.toHexString()),
      voteCount: votes.length,
      breakthroughIndex: votes.length ? Math.round(totalScore / votes.length) : null,
      eligibility,
      signoffs: memberIds.map((memberId) => ({ memberId, signed: signoffs.includes(memberId) })),
      signoffsComplete: memberIds.length === 2 && memberIds.every((memberId) => signoffs.includes(memberId)),
      approvalStatus: nomination?.approvalStatus ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (typeof body.projectId !== "string" || !ObjectId.isValid(body.projectId)) return NextResponse.json({ error: "Choose a valid project." }, { status: 400 });
    const db = await getDatabase();
    const project = await db.collection("projects").findOne({ _id: new ObjectId(body.projectId), memberIds: user._id.toHexString() });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const eligibility = await evaluateBreakthroughEligibility(db, project);
    if (!eligibility.eligible) return NextResponse.json({ error: eligibility.reason, eligibility }, { status: 409 });
    const memberIds: string[] = Array.isArray(project.memberIds) ? project.memberIds : [];
    const nominations = db.collection("projectNominations");
    await nominations.createIndex({ projectId: 1, nominatedBy: 1 }, { unique: true });
    const activeQuery = { projectId: body.projectId, approvalStatus: { $ne: "rejected" } };
    const projectNomination = await nominations.findOne(activeQuery, { sort: { createdAt: 1 } });
    const now = new Date();
    if (!projectNomination) {
      const rejectedNomination = await nominations.findOne({
        projectId: body.projectId,
        nominatedBy: user._id.toHexString(),
        approvalStatus: "rejected",
      });
      const nominationFields = {
        projectTitle: project.title,
        memberIds,
        nominatedBy: user._id.toHexString(),
        nominatedByName: user.name,
        signoffs: [user._id.toHexString()],
        approvalStatus: "pending",
        createdAt: now,
        updatedAt: now,
      };
      if (rejectedNomination) {
        await nominations.updateOne(
          { _id: rejectedNomination._id },
          { $set: nominationFields, $unset: { reviewedBy: "", reviewedAt: "" } },
        );
      } else {
        await nominations.insertOne({ projectId: body.projectId, ...nominationFields });
      }
    } else {
      const signoffs: string[] = Array.isArray(projectNomination.signoffs) ? projectNomination.signoffs : [];
      if (signoffs.includes(user._id.toHexString())) {
        return NextResponse.json({ error: "You have already signed off on this nomination." }, { status: 409 });
      }
      await nominations.updateOne(
        { _id: projectNomination._id },
        { $addToSet: { signoffs: user._id.toHexString() }, $set: { updatedAt: now } },
      );
    }
    const updatedNomination = await nominations.findOne({ projectId: body.projectId, approvalStatus: { $ne: "rejected" } }, { sort: { createdAt: 1 } });
    const signedOff = Array.isArray(updatedNomination?.signoffs) ? updatedNomination.signoffs : [];
    return NextResponse.json({
      nominated: signedOff.includes(user._id.toHexString()),
      count: updatedNomination ? 1 : 0,
      signoffs: memberIds.map((memberId) => ({ memberId, signed: signedOff.includes(memberId) })),
      signoffsComplete: memberIds.every((memberId) => signedOff.includes(memberId)),
      approvalStatus: updatedNomination?.approvalStatus ?? "pending",
    }, { status: projectNomination ? 200 : 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
