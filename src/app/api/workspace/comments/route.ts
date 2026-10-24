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
    const projectId = request.nextUrl.searchParams.get("projectId") ?? "";
    if (!ObjectId.isValid(projectId)) return NextResponse.json({ error: "Choose a valid project." }, { status: 400 });
    const db = await getDatabase();
    const project = await db.collection("projects").findOne({ _id: new ObjectId(projectId), memberIds: user._id.toHexString() });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const records = await db.collection("workspaceComments").find({ projectId }).sort({ createdAt: 1 }).limit(100).toArray();
    const authorIds = [...new Set(records.map((item) => item.authorId))].filter(ObjectId.isValid).map((id) => new ObjectId(id));
    const authors = await db.collection("users").find({ _id: { $in: authorIds } }, { projection: { name: 1 } }).toArray();
    const names = new Map(authors.map((author) => [author._id.toHexString(), author.name]));
    return NextResponse.json({ comments: records.map((item) => ({ id: item._id.toHexString(), authorId: item.authorId, authorName: names.get(item.authorId) ?? "Collaborator", text: item.text, createdAt: item.createdAt })) });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!ObjectId.isValid(projectId)) return NextResponse.json({ error: "Choose a valid project." }, { status: 400 });
    if (!text || text.length > 2000) return NextResponse.json({ error: "Comments must contain 1 to 2,000 characters." }, { status: 400 });
    const db = await getDatabase();
    const project = await db.collection("projects").findOne({ _id: new ObjectId(projectId), memberIds: user._id.toHexString() });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const comment = { projectId, authorId: user._id.toHexString(), text, createdAt: new Date() };
    const result = await db.collection("workspaceComments").insertOne(comment);
    return NextResponse.json({ comment: { id: result.insertedId.toHexString(), authorId: comment.authorId, authorName: user.name, text, createdAt: comment.createdAt } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
