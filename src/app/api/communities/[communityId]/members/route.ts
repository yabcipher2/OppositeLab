import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";
type Context = { params: Promise<{ communityId: string }> };

async function getCommunity(db: Awaited<ReturnType<typeof getDatabase>>, communityId: string) {
  if (!ObjectId.isValid(communityId)) return null;
  return db.collection("communities").findOne({ _id: new ObjectId(communityId) });
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const { communityId } = await context.params;
    const db = await getDatabase();
    const community = await getCommunity(db, communityId);
    if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });
    if (community.status === "archived") return NextResponse.json({ error: "This community is archived." }, { status: 410 });
    const userId = user._id.toHexString();
    const membership = await db.collection("communityMemberships").findOne({ communityId, userId });
    if (!membership) return NextResponse.json({ error: "Join this community to view its members." }, { status: 403 });
    const memberships = await db.collection("communityMemberships").find({ communityId }).sort({ joinedAt: 1 }).toArray();
    const presence = await db.collection("communityPresence").find({ communityId, lastSeen: { $gte: new Date(Date.now() - 45_000) } }, { projection: { userId: 1 } }).toArray();
    const onlineIds = new Set(presence.map((item) => item.userId));
    const members = await Promise.all(memberships.map(async (item) => {
      const member = await db.collection("users").findOne({ _id: new ObjectId(item.userId) }, { projection: { name: 1, role: 1, roleLabel: 1 } });
      const role = member?.role === "admin" || member?.role === "moderator" ? "Admin" : member?.roleLabel ?? "Creator";
      return member ? { id: member._id.toHexString(), name: member.name, role, owner: community.createdBy === item.userId, online: onlineIds.has(item.userId) } : null;
    }));
    return NextResponse.json({
      members: members.filter(Boolean),
      canManage: community.createdBy === userId,
      canAddMembers: community.visibility !== "private" || community.createdBy === userId,
    });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const { communityId } = await context.params;
    const db = await getDatabase();
    const community = await getCommunity(db, communityId);
    if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });
    if (community.status === "archived") return NextResponse.json({ error: "This community is archived." }, { status: 410 });
    const userId = user._id.toHexString();
    const membership = await db.collection("communityMemberships").findOne({ communityId, userId });
    if (!membership) return NextResponse.json({ error: "Join this community before adding people." }, { status: 403 });
    if (community.visibility === "private" && community.createdBy !== userId) {
      return NextResponse.json({ error: "Only the owner can invite people to a private community." }, { status: 403 });
    }
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter the email address of a registered user." }, { status: 400 });
    const invitee = await db.collection("users").findOne({ email }, { projection: { name: 1, preferences: 1 } });
    if (!invitee) return NextResponse.json({ error: "No registered account uses that email address." }, { status: 404 });
    if (invitee.preferences?.allowCommunityInvites === false) return NextResponse.json({ error: "This user is not accepting community invitations." }, { status: 403 });
    const inviteeId = invitee._id.toHexString();
    await db.collection("communityMemberships").createIndex({ communityId: 1, userId: 1 }, { unique: true });
    const membershipResult = await db.collection("communityMemberships").updateOne(
      { communityId, userId: inviteeId },
      { $setOnInsert: { communityId, userId: inviteeId, joinedAt: new Date(), addedBy: userId } },
      { upsert: true },
    );
    if (membershipResult.upsertedCount) {
      await db.collection("communityMessages").insertOne({ communityId, authorId: userId, type: "system", text: `${invitee.name} joined the community.`, createdAt: new Date() });
    }
    const members = await db.collection("communityMemberships").countDocuments({ communityId });
    return NextResponse.json({ added: true, members, member: { id: inviteeId, name: invitee.name } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const { communityId } = await context.params;
    if (!ObjectId.isValid(communityId)) return NextResponse.json({ error: "Invalid community." }, { status: 400 });
    const body = await request.json();
    if (typeof body.memberId !== "string" || !ObjectId.isValid(body.memberId)) return NextResponse.json({ error: "Choose a valid participant." }, { status: 400 });
    const db = await getDatabase();
    const community = await getCommunity(db, communityId);
    if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });
    if (community.status === "archived") return NextResponse.json({ error: "This community is archived." }, { status: 410 });
    const ownerId = user._id.toHexString();
    if (community.createdBy !== ownerId) return NextResponse.json({ error: "Only the community owner can remove participants." }, { status: 403 });
    if (body.memberId === ownerId) return NextResponse.json({ error: "The community owner cannot be removed." }, { status: 400 });
    const result = await db.collection("communityMemberships").deleteOne({ communityId, userId: body.memberId });
    if (!result.deletedCount) return NextResponse.json({ error: "Participant is not a member of this community." }, { status: 404 });
    const removedUser = await db.collection("users").findOne({ _id: new ObjectId(body.memberId) }, { projection: { name: 1 } });
    await db.collection("communityMessages").insertOne({ communityId, authorId: ownerId, type: "system", text: `${removedUser?.name ?? "A member"} was removed from the community.`, createdAt: new Date() });
    const members = await db.collection("communityMemberships").countDocuments({ communityId });
    return NextResponse.json({ removed: true, members });
  } catch (error) { return handleApiError(error); }
}
