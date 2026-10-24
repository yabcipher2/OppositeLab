import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const admin = await currentUser(request);
    if (!admin) return unauthorized();
    if (admin.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const db = await getDatabase();
    const search = request.nextUrl.searchParams.get("q")?.trim();
    const query = search ? { $or: [
      { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      { email: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
    ] } : {};
    const users = await db.collection("users").find(query, { projection: { name: 1, email: 1, role: 1, status: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(250).toArray();
    return NextResponse.json({ users: users.map((user) => ({ id: user._id.toHexString(), name: user.name, email: user.email, role: user.role ?? "creator", status: user.status ?? "active", createdAt: user.createdAt })) });
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await currentUser(request);
    if (!admin) return unauthorized();
    if (admin.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json();
    if (typeof body.userId !== "string" || !ObjectId.isValid(body.userId) || (body.role === undefined && body.status === undefined) || (body.role !== undefined && !["creator", "moderator"].includes(body.role)) || (body.status !== undefined && !["active", "suspended"].includes(body.status))) {
      return NextResponse.json({ error: "Choose a valid account role or status." }, { status: 400 });
    }
    if (body.userId === admin._id.toHexString()) return NextResponse.json({ error: "You cannot change your own account." }, { status: 400 });
    const db = await getDatabase();
    const userId = new ObjectId(body.userId);
    const target = await db.collection("users").findOne({ _id: userId, role: { $in: ["creator", "moderator"] } });
    if (!target) return NextResponse.json({ error: "Account not found or administrators cannot be edited here." }, { status: 404 });
    const update: Record<string, string | Date> = { updatedAt: new Date() };
    if (body.role !== undefined) update.role = body.role;
    if (body.status !== undefined) update.status = body.status;
    await db.collection("users").updateOne({ _id: userId, role: target.role }, { $set: update });
    await db.collection("adminActions").insertOne({ actorId: admin._id.toHexString(), targetId: body.userId, action: "update_user", changes: { ...(body.role !== undefined ? { role: body.role } : {}), ...(body.status !== undefined ? { status: body.status } : {}) }, createdAt: new Date() });
    if (body.status === "suspended") await db.collection("sessions").deleteMany({ userId: body.userId });
    return NextResponse.json({ user: { id: body.userId, name: target.name, email: target.email, role: body.role ?? target.role, status: body.status ?? target.status ?? "active" } });
  } catch (error) { return handleApiError(error); }
}
