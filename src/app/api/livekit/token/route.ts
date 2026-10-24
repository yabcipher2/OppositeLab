import { AccessToken } from "livekit-server-sdk";
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
    const type = body?.type;
    const resourceId = body?.resourceId;
    if ((type !== "community" && type !== "workspace") || typeof resourceId !== "string" || !ObjectId.isValid(resourceId)) {
      return NextResponse.json({ error: "Choose a valid community or workspace project." }, { status: 400 });
    }

    const db = await getDatabase();
    const userId = user._id.toHexString();
    if (type === "community") {
      const community = await db.collection("communities").findOne({
        _id: new ObjectId(resourceId),
        status: { $ne: "archived" },
      });
      if (!community) return NextResponse.json({ error: "This community is unavailable." }, { status: 404 });
      const membership = await db.collection("communityMemberships").findOne({ communityId: resourceId, userId });
      if (!membership) return NextResponse.json({ error: "Join this community before entering its call." }, { status: 403 });
    } else {
      const project = await db.collection("projects").findOne({
        _id: new ObjectId(resourceId),
        memberIds: userId,
      });
      if (!project) return NextResponse.json({ error: "You must be a member of this workspace project to enter its call." }, { status: 403 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !url) {
      return NextResponse.json({ error: "Video calls are not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET on the server." }, { status: 503 });
    }

    const room = `${type}-${resourceId}`;
    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: user.name,
      ttl: "4h",
    });
    accessToken.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({ token: await accessToken.toJwt(), url, room });
  } catch (error) {
    return handleApiError(error);
  }
}
