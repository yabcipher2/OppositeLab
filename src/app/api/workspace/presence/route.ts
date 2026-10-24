import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

async function getProjectAccess(projectId: string, userId: string) {
  if (!ObjectId.isValid(projectId)) return null;
  return (await getDatabase()).collection("projects").findOne({ _id: new ObjectId(projectId), memberIds: userId }, { projection: { _id: 1 } });
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const projectId = request.nextUrl.searchParams.get("projectId") ?? "";
    if (!await getProjectAccess(projectId, user._id.toHexString())) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const db = await getDatabase();
    const activeSince = new Date(Date.now() - 45000);
    const presence = await db.collection("projectPresence").find({ projectId, lastSeen: { $gte: activeSince } }).toArray();
    const userIds = presence.map((entry) => ObjectId.isValid(entry.userId) ? new ObjectId(entry.userId) : null).filter(Boolean);
    const users = await db.collection("users").find({ _id: { $in: userIds } }, { projection: { name: 1, preferences: 1 } }).toArray();
    const names = new Map(users.map((item) => [item._id.toHexString(), item.name]));
    const visibleIds = new Set(users.filter((item) => item.preferences?.showOnlineStatus !== false).map((item) => item._id.toHexString()));
    return NextResponse.json({ online: presence.filter((entry) => visibleIds.has(entry.userId)).map((entry) => ({
      userId: entry.userId,
      name: names.get(entry.userId) ?? "Collaborator",
      cursorOffset: typeof entry.cursorOffset === "number" ? entry.cursorOffset : null,
      isTyping: Boolean(entry.isTyping && entry.typingAt && Date.now() - new Date(entry.typingAt).getTime() < 10000),
    })) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const userId = user._id.toHexString();
    if (!await getProjectAccess(projectId, userId)) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (body.cursorOffset !== undefined && (!Number.isSafeInteger(body.cursorOffset) || body.cursorOffset < 0 || body.cursorOffset > 200000)) {
      return NextResponse.json({ error: "Invalid cursor position." }, { status: 400 });
    }
    if (body.isTyping !== undefined && typeof body.isTyping !== "boolean") {
      return NextResponse.json({ error: "Invalid typing status." }, { status: 400 });
    }
    const now = new Date();
    await (await getDatabase()).collection("projectPresence").updateOne(
      { projectId, userId },
      {
        $set: {
          lastSeen: now,
          ...(body.cursorOffset !== undefined ? { cursorOffset: body.cursorOffset } : {}),
          ...(body.isTyping !== undefined ? { isTyping: body.isTyping, typingAt: body.isTyping ? now : null } : {}),
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    return NextResponse.json({ seenAt: now });
  } catch (error) {
    return handleApiError(error);
  }
}
