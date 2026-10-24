import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";
import { calculateDivergence, findResonancePoint, sharedInterests } from "@/lib/server/matching";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const db = await getDatabase();
    const id = user._id.toHexString();
    const requests = await db.collection("matchRequests").find({ $or: [{ requesterId: id }, { recipientId: id }] }).sort({ createdAt: -1 }).toArray();
    const enriched = await Promise.all(requests.map(async (item) => {
      const otherId = item.requesterId === id ? item.recipientId : item.requesterId;
      const other = await db.collection("users").findOne({ _id: new ObjectId(otherId) }, { projection: { name: 1 } });
      return { id: item._id.toHexString(), requesterId: item.requesterId, recipientId: item.recipientId, otherId, otherName: other?.name ?? "Creator", status: item.status, createdAt: item.createdAt, direction: item.recipientId === id ? "incoming" : "outgoing" };
    }));
    return NextResponse.json({ requests: enriched });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (typeof body.id !== "string" || !ObjectId.isValid(body.id) || !["accept", "decline"].includes(body.action)) return NextResponse.json({ error: "Invalid match request action." }, { status: 400 });
    const db = await getDatabase();
    const filter = { _id: new ObjectId(body.id), recipientId: user._id.toHexString(), status: "pending" };
    const requestRecord = await db.collection("matchRequests").findOne(filter);
    if (!requestRecord) return NextResponse.json({ error: "Pending request not found." }, { status: 404 });
    if (body.action === "accept" && await db.collection("creatorExclusions").findOne({
      kind: "blocked",
      $or: [
        { userId: requestRecord.requesterId, targetId: requestRecord.recipientId },
        { userId: requestRecord.recipientId, targetId: requestRecord.requesterId },
      ],
    })) return NextResponse.json({ error: "This match cannot be accepted because one creator has blocked the other." }, { status: 409 });
    const acceptedMemberIds = [requestRecord.requesterId, requestRecord.recipientId].sort();
    const status = body.action === "accept" ? "accepted" : "declined";
    const changed = await db.collection("matchRequests").updateOne(filter, { $set: { status, respondedAt: new Date() } });
    if (!changed.modifiedCount) return NextResponse.json({ error: "This request has already been handled." }, { status: 409 });
    if (status === "accepted") {
      const memberIds = acceptedMemberIds;
      const matches = db.collection("matches");
      const memberKey = memberIds.join(":");
      const [requester, recipient] = await Promise.all([
        db.collection("users").findOne({ _id: new ObjectId(requestRecord.requesterId) }),
        db.collection("users").findOne({ _id: new ObjectId(requestRecord.recipientId) }),
      ]);
      const divergence = calculateDivergence(requester?.worldviewSliders, recipient?.worldviewSliders);
      const resonancePoint = findResonancePoint(requester?.microHobbies, recipient?.microHobbies)
        || sharedInterests(requester?.interests, recipient?.interests)[0]
        || "";
      await matches.createIndex({ memberKey: 1 }, { unique: true, sparse: true });
      const existingMatch = await matches.findOne({ memberIds, status: "active" });
      if (!existingMatch) await matches.updateOne(
        { memberKey },
        { $setOnInsert: {
          memberIds,
          memberKey,
          status: "active",
          createdAt: new Date(),
          requestId: requestRecord._id.toHexString(),
          ...(divergence.score === null ? {} : { divergenceScore: divergence.score, divergenceAxes: divergence.axes, scoreVersion: 1 }),
          ...(resonancePoint ? { resonancePoint } : {}),
        } },
        { upsert: true },
      );
    }
    return NextResponse.json({ status });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (typeof body.recipientId !== "string" || !ObjectId.isValid(body.recipientId) || body.recipientId === user._id.toHexString()) {
      return NextResponse.json({ error: "Choose another creator to request a match with." }, { status: 400 });
    }
    const db = await getDatabase();
    // Keep request eligibility aligned with /api/discover. Discover lists active (and
    // legacy status-less) creators who have not opted out. Requiring
    // onboardingCompletedAt here hid registered creators who already have interests
    // and were visible in Discover, so users could see a match button that always failed.
    const recipient = await db.collection("users").findOne({
      _id: new ObjectId(body.recipientId),
      role: "creator",
      $or: [{ status: "active" }, { status: { $exists: false } }],
      "preferences.discoverable": { $ne: false },
    });
    if (!recipient) return NextResponse.json({ error: "Creator is not available for matching." }, { status: 404 });
    const requesterId = user._id.toHexString();
    const blocked = await db.collection("creatorExclusions").findOne({
      kind: "blocked",
      $or: [
        { userId: requesterId, targetId: body.recipientId },
        { userId: body.recipientId, targetId: requesterId },
      ],
    });
    if (blocked) return NextResponse.json({ error: "You cannot request a match with this creator." }, { status: 403 });
    if (!user.onboardingCompletedAt) return NextResponse.json({ error: "Complete onboarding before requesting a match." }, { status: 403 });
    // Shared interests are optional; they only contribute to the resonance point after acceptance.
    const memberIds = [requesterId, body.recipientId].sort();
    const pairKey = memberIds.join(":");
    const alreadyMatched = await db.collection("matches").findOne({ memberIds, status: "active" });
    if (alreadyMatched) return NextResponse.json({ error: "You are already collaborating with this creator." }, { status: 409 });
    const matchRequests = db.collection("matchRequests");
    await matchRequests.createIndex({ pairKey: 1 }, { unique: true, partialFilterExpression: { status: "pending", pairKey: { $exists: true } } });
    const existing = await matchRequests.findOne({ status: "pending", $or: [
      { pairKey },
      { requesterId, recipientId: body.recipientId },
      { requesterId: body.recipientId, recipientId: requesterId },
    ] });
    if (existing) return NextResponse.json({ error: "A match request is already pending between you and this creator." }, { status: 409 });
    await matchRequests.createIndex({ requesterId: 1, recipientId: 1, status: 1 });
    let result;
    try {
      result = await matchRequests.insertOne({ requesterId, recipientId: body.recipientId, pairKey, status: "pending", createdAt: new Date() });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === 11000) return NextResponse.json({ error: "A match request is already pending between you and this creator." }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ id: result.insertedId.toHexString(), status: "pending" }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
