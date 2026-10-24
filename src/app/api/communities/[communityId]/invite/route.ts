import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";
type Context = { params: Promise<{ communityId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { communityId } = await context.params;
    if (!ObjectId.isValid(communityId)) {
      return NextResponse.json({ error: "Invalid community." }, { status: 400 });
    }
    const db = await getDatabase();
    const community = await db.collection("communities").findOne(
      { _id: new ObjectId(communityId), status: { $ne: "archived" } },
      { projection: { name: 1, description: 1, category: 1, visibility: 1, inviteToken: 1 } },
    );
    if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });

    const user = await currentUser(request);
    const userId = user?._id.toHexString();
    const membership = userId
      ? await db.collection("communityMemberships").findOne({ communityId, userId })
      : null;
    const suppliedToken = request.nextUrl.searchParams.get("token");
    const validInvite = Boolean(suppliedToken && community.inviteToken === suppliedToken);
    if (suppliedToken && !validInvite) {
      return NextResponse.json({ error: "This invitation link is invalid or expired." }, { status: 403 });
    }
    const visibility = community.visibility === "private" ? "private" : "public";
    if (visibility === "private" && !membership && !validInvite) {
      return NextResponse.json({ error: "This community is private. Open a valid invitation link to continue." }, { status: 404 });
    }
    const members = await db.collection("communityMemberships").countDocuments({ communityId });
    return NextResponse.json({
      community: {
        id: communityId,
        name: community.name,
        description: community.description ?? "",
        category: community.category ?? "Community",
        visibility,
        members,
        joined: Boolean(membership),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const { communityId } = await context.params;
    if (!ObjectId.isValid(communityId)) {
      return NextResponse.json({ error: "Invalid community." }, { status: 400 });
    }

    const db = await getDatabase();
    const community = await db.collection("communities").findOne({
      _id: new ObjectId(communityId),
      status: { $ne: "archived" },
    });
    if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });

    const userId = user._id.toHexString();
    const membership = await db.collection("communityMemberships").findOne({ communityId, userId });
    if (!membership) {
      return NextResponse.json({ error: "Join this community before creating an invitation link." }, { status: 403 });
    }

    let inviteToken = typeof community.inviteToken === "string" ? community.inviteToken : "";
    if (!inviteToken) {
      inviteToken = randomBytes(32).toString("hex");
      await db.collection("communities").updateOne(
        { _id: new ObjectId(communityId), $or: [{ inviteToken: { $exists: false } }, { inviteToken: null }] },
        { $set: { inviteToken, inviteTokenCreatedAt: new Date() } },
      );
      const updated = await db.collection("communities").findOne(
        { _id: new ObjectId(communityId) },
        { projection: { inviteToken: 1 } },
      );
      if (typeof updated?.inviteToken !== "string") {
        return NextResponse.json({ error: "Could not create an invitation link." }, { status: 500 });
      }
      inviteToken = updated.inviteToken;
    }

    const inviteUrl = new URL(`/communities/${communityId}?invite=${encodeURIComponent(inviteToken)}`, request.nextUrl.origin);
    return NextResponse.json({ inviteUrl: inviteUrl.toString() });
  } catch (error) {
    return handleApiError(error);
  }
}
