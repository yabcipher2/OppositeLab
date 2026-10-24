import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const actor = await currentUser(request);
    if (!actor) return unauthorized();
    if (actor.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const users = await (await getDatabase()).collection("users").find(
      { role: { $in: ["creator", "moderator", "admin"] } },
      { projection: { name: 1, email: 1, role: 1, status: 1, createdAt: 1 } },
    ).sort({ name: 1 }).limit(200).toArray();
    return NextResponse.json({ users: users.map(({ _id, name, email, role, status }) => ({ id: _id.toHexString(), name, email, role, status: status === "suspended" ? "suspended" : "active" })) });
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await currentUser(request);
    if (!actor) return unauthorized();
    if (actor.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json();
    if (typeof body.userId !== "string" || !ObjectId.isValid(body.userId) || !["creator", "moderator"].includes(body.role)) {
      return NextResponse.json({ error: "Choose a valid account and role." }, { status: 400 });
    }
    if (body.userId === actor._id.toHexString()) return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
    const db = await getDatabase();
    const userId = new ObjectId(body.userId);
    const target = await db.collection("users").findOne({ _id: userId, role: { $in: ["creator", "moderator"] } }, { projection: { name: 1, email: 1, role: 1 } });
    if (!target) return NextResponse.json({ error: "Account not found or role cannot be changed here." }, { status: 404 });
    if (target.role !== body.role) {
      await db.collection("users").updateOne({ _id: userId, role: target.role }, { $set: { role: body.role, updatedAt: new Date() } });
      await db.collection("moderatorRoleChanges").insertOne({ userId: body.userId, changedBy: actor._id.toHexString(), from: target.role, to: body.role, createdAt: new Date() });
    }
    return NextResponse.json({ user: { id: body.userId, name: target.name, email: target.email, role: body.role } });
  } catch (error) { return handleApiError(error); }
}
