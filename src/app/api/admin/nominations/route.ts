import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";
import { evaluateBreakthroughEligibility } from "@/lib/server/breakthroughs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const admin = await currentUser(request);
    if (!admin) return unauthorized();
    if (admin.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const db = await getDatabase();
    const nominations = await db.collection("projectNominations").find({ approvalStatus: { $ne: "rejected" } }).sort({ createdAt: 1 }).limit(100).toArray();
    const distinctNominations = [...new Map(nominations.map((item) => [item.projectId, item])).values()];
    const projectIds = [...new Set(distinctNominations.map((item) => item.projectId).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))];
    const projects = projectIds.length ? await db.collection("projects").find({ _id: { $in: projectIds.map((id) => new ObjectId(id)) } }).toArray() : [];
    const milestones = projectIds.length ? await db.collection("milestones").find({ projectId: { $in: projectIds } }).toArray() : [];
    const users = await db.collection("users").find({}, { projection: { name: 1 } }).toArray();
    const names = new Map(users.map((user) => [user._id.toHexString(), user.name]));
    const projectMap = new Map(projects.map((project) => [project._id.toHexString(), project]));
    const itemResults = await Promise.all(distinctNominations.map(async (nomination) => {
      const project = projectMap.get(nomination.projectId);
      if (!project) return null;
      const projectMilestones = milestones.filter((milestone) => milestone.projectId === nomination.projectId);
      const eligibility = await evaluateBreakthroughEligibility(db, project);
      const memberIds: string[] = Array.isArray(project.memberIds) ? project.memberIds : [];
      const signoffs: string[] = Array.isArray(nomination.signoffs) ? nomination.signoffs : [];
      return {
        id: nomination._id.toHexString(),
        projectId: nomination.projectId,
        title: project.title ?? nomination.projectTitle ?? "Untitled project",
        content: typeof project.content === "string" ? project.content : typeof project.canvas === "string" ? project.canvas : "",
        members: (Array.isArray(project.memberIds) ? project.memberIds : []).map((id: string) => ({ id, name: names.get(id) ?? "Collaborator" })),
        nominatedBy: nomination.nominatedByName ?? names.get(nomination.nominatedBy) ?? "Collaborator",
        createdAt: nomination.createdAt,
        status: nomination.approvalStatus === "approved" ? "approved" : "pending",
        signoffs: memberIds.map((id) => ({ id, name: names.get(id) ?? "Collaborator", signed: signoffs.includes(id) })),
        eligibility,
        milestones: projectMilestones.map((milestone) => ({ title: milestone.title ?? "Milestone", completed: Boolean(milestone.completed || milestone.status === "completed" || milestone.completedAt) })),
        contribution: { first: eligibility.contribution[0]?.percent ?? 0, second: eligibility.contribution[1]?.percent ?? 0 },
      };
    }));
    const items = itemResults.filter((item): item is NonNullable<typeof item> => item !== null);
    return NextResponse.json({ nominations: items });
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await currentUser(request);
    if (!admin) return unauthorized();
    if (admin.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json();
    if (typeof body.id !== "string" || !ObjectId.isValid(body.id) || !["approved", "rejected"].includes(body.status)) {
      return NextResponse.json({ error: "Choose a nomination and an approval decision." }, { status: 400 });
    }
    const db = await getDatabase();
    const nomination = await db.collection("projectNominations").findOne({ _id: new ObjectId(body.id) });
    if (!nomination) return NextResponse.json({ error: "Nomination not found." }, { status: 404 });
    if (body.status === "approved") {
      const project = await db.collection("projects").findOne({ _id: new ObjectId(nomination.projectId) });
      if (!project) return NextResponse.json({ error: "The nominated project no longer exists." }, { status: 404 });
      const memberIds: string[] = Array.isArray(project.memberIds) ? project.memberIds : [];
      const signoffs: string[] = Array.isArray(nomination.signoffs) ? nomination.signoffs : [];
      const eligibility = await evaluateBreakthroughEligibility(db, project);
      if (!eligibility.eligible || memberIds.length !== 2 || !memberIds.every((memberId) => signoffs.includes(memberId))) {
        return NextResponse.json({ error: eligibility.reason ?? "Both collaborators must sign off before the project can be published." }, { status: 409 });
      }
    }
    const updatedAt = new Date();
    await db.collection("projectNominations").updateOne(
      { _id: nomination._id },
      { $set: { approvalStatus: body.status, reviewedBy: admin._id.toHexString(), reviewedAt: updatedAt } },
    );
    await db.collection("adminActions").insertOne({
      actorId: admin._id.toHexString(),
      targetId: nomination.projectId,
      action: body.status === "approved" ? "approve_nomination" : "reject_nomination",
      changes: { projectTitle: nomination.projectTitle ?? "", status: body.status },
      createdAt: updatedAt,
    });
    return NextResponse.json({ saved: true, status: body.status });
  } catch (error) { return handleApiError(error); }
}
