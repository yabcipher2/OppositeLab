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
    const records = await db.collection("adminActions").find({}).sort({ createdAt: -1 }).limit(50).toArray();
    const actorIds = [...new Set(records.map((record) => record.actorId).filter((id): id is string => typeof id === "string"))];
    const userTargetIds = [...new Set(records.filter((record) => record.action === "update_user").map((record) => record.targetId).filter((id): id is string => typeof id === "string"))];
    const communityTargetIds = [...new Set(records.filter((record) => ["update_community", "create_community"].includes(record.action)).map((record) => record.targetId).filter((id): id is string => typeof id === "string"))];
    const users = [...new Set([...actorIds, ...userTargetIds])].filter(ObjectId.isValid).length ? await db.collection("users").find({ _id: { $in: [...new Set([...actorIds, ...userTargetIds])].filter(ObjectId.isValid).map((id) => new ObjectId(id)) } }, { projection: { name: 1 } }).toArray() : [];
    const communities = communityTargetIds.filter(ObjectId.isValid).length ? await db.collection("communities").find({ _id: { $in: communityTargetIds.filter(ObjectId.isValid).map((id) => new ObjectId(id)) } }, { projection: { name: 1 } }).toArray() : [];
    const names = new Map(users.map((user) => [user._id.toHexString(), user.name]));
    const communityNames = new Map(communities.map((community) => [community._id.toHexString(), community.name]));
    return NextResponse.json({ actions: records.map((record) => ({
      id: record._id.toHexString(),
      actor: names.get(record.actorId) ?? "Administrator",
      action: record.action,
      target: record.changes?.name ?? record.changes?.projectTitle ?? names.get(record.targetId) ?? communityNames.get(record.targetId) ?? record.targetId ?? "record",
      changes: record.changes ?? {},
      createdAt: record.createdAt,
    })) });
  } catch (error) { return handleApiError(error); }
}
