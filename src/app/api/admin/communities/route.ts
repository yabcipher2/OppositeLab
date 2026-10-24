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
    const communities = await db.collection("communities").find({}).sort({ createdAt: -1 }).limit(250).toArray();
    const result = await Promise.all(communities.map(async (community) => {
      const creator = ObjectId.isValid(community.createdBy) ? await db.collection("users").findOne({ _id: new ObjectId(community.createdBy) }, { projection: { name: 1 } }) : null;
      return { id: community._id.toHexString(), name: community.name, category: community.category ?? "General", description: community.description ?? "", status: community.status ?? "active", creatorName: creator?.name ?? "Unknown account", members: await db.collection("communityMemberships").countDocuments({ communityId: community._id.toHexString() }), createdAt: community.createdAt };
    }));
    return NextResponse.json({ communities: result });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await currentUser(request);
    if (!admin) return unauthorized();
    if (admin.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "General";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (name.length < 3 || name.length > 80 || category.length > 40 || description.length < 10 || description.length > 500) {
      return NextResponse.json({ error: "Enter a name (3–80 characters), topic (up to 40), and description (10–500)." }, { status: 400 });
    }
    const db = await getDatabase();
    const createdAt = new Date();
    const result = await db.collection("communities").insertOne({
      name,
      category: category || "General",
      description,
      status: "active",
      createdBy: admin._id.toHexString(),
      createdAt,
      updatedAt: createdAt,
    });
    const communityId = result.insertedId.toHexString();
    await db.collection("communityMemberships").createIndex({ communityId: 1, userId: 1 }, { unique: true });
    await db.collection("communityMemberships").insertOne({ communityId, userId: admin._id.toHexString(), joinedAt: createdAt });
    await db.collection("adminActions").insertOne({
      actorId: admin._id.toHexString(),
      targetId: communityId,
      action: "create_community",
      changes: { name, category: category || "General" },
      createdAt,
    });
    return NextResponse.json({ community: { id: communityId, name, category: category || "General", description, status: "active", creatorName: admin.name, members: 1, createdAt } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await currentUser(request);
    if (!admin) return unauthorized();
    if (admin.role !== "admin") return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json();
    if (typeof body.communityId !== "string" || !ObjectId.isValid(body.communityId)) return NextResponse.json({ error: "Choose a valid community." }, { status: 400 });
    const update: Record<string, string | Date> = { updatedAt: new Date() };
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length < 3 || body.name.length > 80) return NextResponse.json({ error: "Community name must be 3 to 80 characters." }, { status: 400 });
      update.name = body.name.trim();
    }
    if (body.category !== undefined) {
      if (typeof body.category !== "string" || body.category.length > 40) return NextResponse.json({ error: "Topic must be 40 characters or fewer." }, { status: 400 });
      update.category = body.category.trim() || "General";
    }
    if (body.description !== undefined) {
      if (typeof body.description !== "string" || body.description.trim().length < 10 || body.description.length > 500) return NextResponse.json({ error: "Description must be 10 to 500 characters." }, { status: 400 });
      update.description = body.description.trim();
    }
    if (body.status !== undefined) {
      if (!(["active", "archived"] as string[]).includes(body.status)) return NextResponse.json({ error: "Community status must be active or archived." }, { status: 400 });
      update.status = body.status;
      if (body.status === "archived") update.archivedAt = new Date();
    }
    const db = await getDatabase();
    const result = await db.collection("communities").updateOne({ _id: new ObjectId(body.communityId) }, { $set: update, ...(body.status === "active" ? { $unset: { archivedAt: "" } } : {}) });
    if (!result.matchedCount) return NextResponse.json({ error: "Community not found." }, { status: 404 });
    await db.collection("adminActions").insertOne({ actorId: admin._id.toHexString(), targetId: body.communityId, action: "update_community", changes: Object.fromEntries(Object.entries(update).filter(([key]) => key !== "updatedAt")), createdAt: new Date() });
    return NextResponse.json({ saved: true });
  } catch (error) { return handleApiError(error); }
}
