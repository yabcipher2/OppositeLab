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
    const userId = user._id.toHexString();
    const db = await getDatabase();
    const milestones = await db.collection("milestones")
      .find({ memberIds: userId })
      .sort({ dueDate: 1, createdAt: -1 })
      .toArray();
    const projects = await db.collection("projects")
      .find({ memberIds: userId }, { projection: { title: 1 } })
      .toArray();
    const titles = new Map(projects.map((project) => [project._id.toHexString(), project.title]));
    return NextResponse.json({
      milestones: milestones.map((milestone) => ({
        ...milestone,
        id: milestone._id.toHexString(),
        projectTitle: titles.get(milestone.projectId) ?? "Project",
      })),
      projects: projects.map((project) => ({ id: project._id.toHexString(), title: project.title })),
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
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (typeof body.projectId !== "string" || !ObjectId.isValid(body.projectId)) {
      return NextResponse.json({ error: "Choose a valid workspace project." }, { status: 400 });
    }
    if (!title || title.length > 120) {
      return NextResponse.json({ error: "Milestone title must contain 1 to 120 characters." }, { status: 400 });
    }
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.dueDate && (!dueDate || Number.isNaN(dueDate.getTime()))) {
      return NextResponse.json({ error: "Enter a valid due date." }, { status: 400 });
    }

    const db = await getDatabase();
    const userId = user._id.toHexString();
    const project = await db.collection("projects").findOne({ _id: new ObjectId(body.projectId), memberIds: userId });
    if (!project) return NextResponse.json({ error: "Workspace project not found." }, { status: 404 });
    const now = new Date();
    const milestone = {
      projectId: project._id.toHexString(),
      memberIds: project.memberIds,
      title,
      dueDate,
      completedAt: null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection("milestones").insertOne(milestone);
    return NextResponse.json({ milestone: { ...milestone, id: result.insertedId.toHexString(), projectTitle: project.title } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (typeof body.id !== "string" || !ObjectId.isValid(body.id) || typeof body.completed !== "boolean") {
      return NextResponse.json({ error: "Invalid milestone update." }, { status: 400 });
    }
    const now = new Date();
    const result = await (await getDatabase()).collection("milestones").updateOne(
      { _id: new ObjectId(body.id), memberIds: user._id.toHexString() },
      { $set: { completedAt: body.completed ? now : null, updatedAt: now } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    return NextResponse.json({ saved: true, completedAt: body.completed ? now : null });
  } catch (error) {
    return handleApiError(error);
  }
}
