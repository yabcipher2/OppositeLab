import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (typeof body.projectId !== "string" || !ObjectId.isValid(body.projectId)) {
      return NextResponse.json({ error: "Choose a valid project." }, { status: 400 });
    }
    const resonancePoint = typeof body.resonancePoint === "string" ? body.resonancePoint.trim() : "";
    if (!resonancePoint || resonancePoint.length > 500) {
      return NextResponse.json({ error: "A resonance point must contain 1 to 500 characters." }, { status: 400 });
    }
    const db = await getDatabase();
    const project = await db.collection("projects").findOne(
      { _id: new ObjectId(body.projectId), memberIds: user._id.toHexString() },
      { projection: { memberIds: 1 } },
    );
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const activeMatches = await db.collection("matches").find({
      status: "active",
      memberIds: { $all: project.memberIds },
    }).toArray();
    const projectMemberIds = new Set(project.memberIds);
    const match = activeMatches.find((item) =>
      Array.isArray(item.memberIds) &&
      item.memberIds.length === projectMemberIds.size &&
      item.memberIds.every((id: string) => projectMemberIds.has(id)),
    );
    if (!match) return NextResponse.json({ error: "This project is not connected to a matching pair." }, { status: 404 });
    await db.collection("matches").updateOne({ _id: match._id }, { $set: { resonancePoint, updatedAt: new Date() } });
    return NextResponse.json({ resonancePoint });
  } catch (error) {
    return handleApiError(error);
  }
}
