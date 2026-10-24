import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (typeof body.targetId !== "string" || !ObjectId.isValid(body.targetId) || body.targetId === user._id.toHexString() || !["remove", "block"].includes(body.action)) {
      return NextResponse.json({ error: "Choose a creator and a valid action." }, { status: 400 });
    }

    const db = await getDatabase();
    const creator = await db.collection("users").findOne({ _id: new ObjectId(body.targetId), role: "creator" });
    if (!creator) return NextResponse.json({ error: "Creator not found." }, { status: 404 });

    const userId = user._id.toHexString();
    const targetId = body.targetId;
    const exclusions = db.collection("creatorExclusions");
    await exclusions.createIndex({ userId: 1, targetId: 1 }, { unique: true });
    await exclusions.updateOne(
      { userId, targetId },
      { $set: { kind: body.action === "block" ? "blocked" : "dismissed", updatedAt: new Date() }, $setOnInsert: { userId, targetId, createdAt: new Date() } },
      { upsert: true },
    );

    if (body.action === "block") {
      await db.collection("matchRequests").updateMany(
        { status: "pending", $or: [{ requesterId: userId, recipientId: targetId }, { requesterId: targetId, recipientId: userId }] },
        { $set: { status: "blocked", updatedAt: new Date() } },
      );
    }

    return NextResponse.json({ success: true, action: body.action });
  } catch (error) {
    return handleApiError(error);
  }
}
