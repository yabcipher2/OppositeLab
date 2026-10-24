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
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId || !ObjectId.isValid(projectId)) return NextResponse.json({ error: "Choose a valid project." }, { status: 400 });
    const db = await getDatabase();
    const project = await db.collection("projects").findOne({ _id: new ObjectId(projectId), memberIds: user._id.toHexString() }, { projection: { _id: 1 } });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const versions = await db.collection("projectVersions").find({ projectId }).sort({ createdAt: -1 }).limit(20).toArray();
    const authorIds = [...new Set(versions.map((version) => version.savedBy).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))].map((id) => new ObjectId(id));
    const authors = await db.collection("users").find({ _id: { $in: authorIds } }, { projection: { name: 1 } }).toArray();
    const authorNames = new Map(authors.map((author) => [author._id.toHexString(), author.name]));
    return NextResponse.json({ versions: versions.map((version) => ({
      id: version._id.toHexString(),
      title: version.title,
      content: version.content,
      createdAt: version.createdAt,
      author: authorNames.get(version.savedBy) ?? "Collaborator",
    })) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (typeof body.projectId !== "string" || !ObjectId.isValid(body.projectId) || typeof body.versionId !== "string" || !ObjectId.isValid(body.versionId)) {
      return NextResponse.json({ error: "Invalid version restore request." }, { status: 400 });
    }
    const db = await getDatabase();
    const userId = user._id.toHexString();
    const projectFilter = { _id: new ObjectId(body.projectId), memberIds: userId };
    const project = await db.collection("projects").findOne(projectFilter);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const version = await db.collection("projectVersions").findOne({ _id: new ObjectId(body.versionId), projectId: body.projectId, memberIds: userId });
    if (!version) return NextResponse.json({ error: "Version not found." }, { status: 404 });

    const now = new Date();
    await db.collection("projectVersions").insertOne({ projectId: body.projectId, memberIds: project.memberIds, title: project.title, content: project.content ?? "", savedBy: userId, createdAt: now });
    await db.collection("projects").updateOne(projectFilter, { $set: { title: version.title, content: version.content ?? "", updatedAt: now } });
    await db.collection("workspaceActivity").insertOne({ projectId: body.projectId, projectTitle: version.title, memberIds: project.memberIds, actorId: userId, kind: "restored", createdAt: now });
    return NextResponse.json({ restored: true, title: version.title, content: version.content ?? "", updatedAt: now });
  } catch (error) {
    return handleApiError(error);
  }
}
