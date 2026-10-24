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
    const db = await getDatabase();
    const circles = await db.collection("communities").find({ status: { $ne: "archived" } }).sort({ name: 1 }).toArray();
    const memberships = await db.collection("communityMemberships").find({ userId: user._id.toHexString() }).toArray();
    const membershipMap = new Map(memberships.map((membership) => [membership.communityId, membership]));
    const inAppCommunityActivity = typeof user.preferences?.inAppCommunityActivity === "boolean"
      ? user.preferences.inAppCommunityActivity
      : true;
    const storedReadAt = user.sidebarNotificationsReadAt as Record<string, Date | string> | undefined;
    const fallbackReadAt = storedReadAt?.community
      ? storedReadAt.community instanceof Date ? storedReadAt.community : new Date(storedReadAt.community)
      : new Date();
    const visibleCircles = circles.filter((circle) =>
      circle.visibility !== "private" || membershipMap.has(circle._id.toHexString()),
    );
    const result = await Promise.all(visibleCircles.map(async (circle) => ({
      id: circle._id.toHexString(),
      name: circle.name,
      category: circle.category ?? "Community",
      description: circle.description ?? "",
      visibility: circle.visibility === "private" ? "private" : "public",
      creator: circle.createdBy === user._id.toHexString(),
      members: await db.collection("communityMemberships").countDocuments({ communityId: circle._id.toHexString() }),
      joined: membershipMap.has(circle._id.toHexString()),
      unreadCount: membershipMap.has(circle._id.toHexString()) && !membershipMap.get(circle._id.toHexString())?.notificationsMuted &&
        inAppCommunityActivity
        ? await db.collection("communityMessages").countDocuments({
            communityId: circle._id.toHexString(),
            authorId: { $ne: user._id.toHexString() },
            $or: [
              { createdAt: { $gt: membershipMap.get(circle._id.toHexString())?.lastReadAt ?? membershipMap.get(circle._id.toHexString())?.joinedAt ?? fallbackReadAt } },
              { editedAt: { $gt: membershipMap.get(circle._id.toHexString())?.lastReadAt ?? membershipMap.get(circle._id.toHexString())?.joinedAt ?? fallbackReadAt } },
            ],
          })
        : 0,
    })));
    return NextResponse.json({ communities: result });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    const db = await getDatabase();

    if (body.action === "create") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const category = typeof body.category === "string" ? body.category.trim() : "General";
      if (name.length < 3 || name.length > 80 || description.length < 10 || description.length > 500) {
        return NextResponse.json({ error: "Enter a circle name and a description between 10 and 500 characters." }, { status: 400 });
      }
      const created = await db.collection("communities").insertOne({ name, description, category, visibility: "public", status: "active", createdBy: user._id.toHexString(), createdAt: new Date() });
      await db.collection("communityMemberships").createIndex({ communityId: 1, userId: 1 }, { unique: true });
      await db.collection("communityMemberships").insertOne({ communityId: created.insertedId.toHexString(), userId: user._id.toHexString(), joinedAt: new Date() });
      return NextResponse.json({ id: created.insertedId.toHexString() }, { status: 201 });
    }

    if (typeof body.communityId !== "string" || !ObjectId.isValid(body.communityId)) {
      return NextResponse.json({ error: "Choose a valid community." }, { status: 400 });
    }
    const communityId = body.communityId;
    const community = await db.collection("communities").findOne({ _id: new ObjectId(communityId) });
    if (!community) {
      return NextResponse.json({ error: "Community not found." }, { status: 404 });
    }
    if (community.status === "archived") return NextResponse.json({ error: "This community is archived." }, { status: 410 });
    const membership = { communityId, userId: user._id.toHexString() };
    if (body.action === "join") {
      const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken : "";
      const validInvite = Boolean(inviteToken && community.inviteToken === inviteToken);
      if (inviteToken && !validInvite) {
        return NextResponse.json({ error: "This invitation link is invalid or expired." }, { status: 403 });
      }
      if (community.visibility === "private" && !await db.collection("communityMemberships").findOne(membership) && !validInvite) {
        return NextResponse.json({ error: "This community is private. Ask its owner for an invitation." }, { status: 403 });
      }
      await db.collection("communityMemberships").createIndex({ communityId: 1, userId: 1 }, { unique: true });
      const result = await db.collection("communityMemberships").updateOne(membership, { $setOnInsert: { ...membership, joinedAt: new Date() } }, { upsert: true });
      if (result.upsertedCount) await db.collection("communityMessages").insertOne({ communityId, authorId: user._id.toHexString(), type: "system", text: `${user.name} joined the community.`, createdAt: new Date() });
    } else if (body.action === "leave") {
      const result = await db.collection("communityMemberships").deleteOne(membership);
      if (result.deletedCount) await db.collection("communityMessages").insertOne({ communityId, authorId: user._id.toHexString(), type: "system", text: `${user.name} left the community.`, createdAt: new Date() });
    } else {
      return NextResponse.json({ error: "Unsupported community action." }, { status: 400 });
    }
    const [members, joined] = await Promise.all([
      db.collection("communityMemberships").countDocuments({ communityId }),
      db.collection("communityMemberships").findOne(membership),
    ]);
    return NextResponse.json({ success: true, members, joined: Boolean(joined) });
  } catch (error) {
    return handleApiError(error);
  }
}
