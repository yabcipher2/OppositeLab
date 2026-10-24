import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, profilePhotoUrl, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const db = await getDatabase();
    const projects = await db.collection("projects").find({ memberIds: user._id.toHexString() }).sort({ updatedAt: -1 }).toArray();
    const memberIds = [...new Set(projects.flatMap((project) => Array.isArray(project.memberIds) ? project.memberIds : []))]
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const members = await db.collection("users").find({ _id: { $in: memberIds } }, { projection: { name: 1, role: 1, photoFileId: 1, photo: 1 } }).toArray();
    const memberMap = new Map(members.map((member) => [member._id.toHexString(), {
      id: member._id.toHexString(),
      name: member.name,
      role: member.role,
      photo: profilePhotoUrl(member.photoFileId, Boolean(member.photo), member._id),
    }]));
    const projectIds = projects.map((project) => project._id.toHexString());
    const activity = projectIds.length
      ? await db.collection("workspaceActivity").find({ projectId: { $in: projectIds } }).sort({ createdAt: -1 }).limit(100).toArray()
      : [];
    return NextResponse.json({ projects: projects.map((project) => {
      const id = project._id.toHexString();
      const projectActivity = activity.filter((item) => item.projectId === id).map((item) => ({
        id: item._id.toHexString(),
        actorId: item.actorId,
        actorName: memberMap.get(item.actorId)?.name ?? "Collaborator",
        kind: item.kind,
        createdAt: item.createdAt,
      }));
      return {
        id,
        title: project.title,
        content: project.content ?? "",
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        memberIds: Array.isArray(project.memberIds) ? project.memberIds : [],
        collaborators: (Array.isArray(project.memberIds) ? project.memberIds : []).map((memberId: string) => memberMap.get(memberId)).filter(Boolean),
        activity: projectActivity,
      };
    }) });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 120) return NextResponse.json({ error: "Project title must contain 1 to 120 characters." }, { status: 400 });
    const now = new Date();
    const ownerId = user._id.toHexString();
    const activeMatch = await (await getDatabase()).collection("matches").findOne({ memberIds: ownerId, status: "active" });
    const memberIds: string[] = Array.isArray(activeMatch?.memberIds) ? [...new Set(activeMatch.memberIds as string[])] : [ownerId];
    const project = { title, memberIds, content: "", createdBy: ownerId, createdAt: now, updatedAt: now };
    const result = await (await getDatabase()).collection("projects").insertOne(project);
    return NextResponse.json({ project: { ...project, id: result.insertedId.toHexString() } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (typeof body.id !== "string" || !ObjectId.isValid(body.id)) return NextResponse.json({ error: "Invalid project id." }, { status: 400 });
    const update: Record<string, string | Date> = {};
    if (typeof body.title === "string" && body.title.trim() && body.title.length <= 120) update.title = body.title.trim();
    if (typeof body.content === "string" && body.content.length <= 200000) update.content = body.content;
    const db = await getDatabase();
    const projectFilter = { _id: new ObjectId(body.id), memberIds: user._id.toHexString() };
    const project = await db.collection("projects").findOne(projectFilter);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const titleChanged = typeof update.title === "string" && update.title !== project.title;
    const contentChanged = typeof update.content === "string" && update.content !== (project.content ?? "");
    if (!titleChanged && !contentChanged) return NextResponse.json({ saved: true, updatedAt: project.updatedAt });

    const updatedAt = new Date();
    await db.collection("projectVersions").insertOne({
      projectId: project._id.toHexString(),
      memberIds: project.memberIds,
      title: project.title,
      content: project.content ?? "",
      savedBy: user._id.toHexString(),
      createdAt: updatedAt,
    });
    update.updatedAt = updatedAt;
    const result = await db.collection("projects").updateOne(projectFilter, { $set: update });
    if (!result.matchedCount) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const nextTitle = titleChanged ? update.title : project.title;
    await db.collection("workspaceActivity").insertOne({
      projectId: project._id.toHexString(),
      projectTitle: nextTitle,
      memberIds: project.memberIds,
      actorId: user._id.toHexString(),
      kind: "edited",
      createdAt: updatedAt,
    });
    return NextResponse.json({ saved: true, updatedAt });
  } catch (error) { return handleApiError(error); }
}
