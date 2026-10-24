import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";
const canModerate = (user: unknown) => {
  const role = (user as { role?: string } | null)?.role;
  return role === "admin" || role === "moderator";
};

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    if (!canModerate(user)) return NextResponse.json({ error: "Moderator access is required." }, { status: 403 });
    const db = await getDatabase();
    if (request.nextUrl.searchParams.get("countOnly") === "1") {
      return NextResponse.json({ openCount: await db.collection("reports").countDocuments({ status: "open" }) });
    }
    const reports = await db.collection("reports").find({ status: "open" }).sort({ createdAt: 1 }).toArray();
    return NextResponse.json({ reports: reports.map((report) => ({ ...report, id: report._id.toHexString(), _id: undefined })) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (typeof body.target !== "string" || typeof body.reason !== "string" || body.target.length > 500 || body.reason.length > 120) {
      return NextResponse.json({ error: "A valid target and reason are required." }, { status: 400 });
    }
    const db = await getDatabase();
    if (body.communityId !== undefined || body.messageId !== undefined) {
      if (typeof body.communityId !== "string" || !ObjectId.isValid(body.communityId) || typeof body.messageId !== "string" || !ObjectId.isValid(body.messageId)) {
        return NextResponse.json({ error: "Invalid community message report." }, { status: 400 });
      }
      const communityId = body.communityId;
      const userId = user._id.toHexString();
      const isMember = await db.collection("communityMemberships").findOne({ communityId, userId });
      const message = await db.collection("communityMessages").findOne({ _id: new ObjectId(body.messageId), communityId });
      if (!isMember || !message) return NextResponse.json({ error: "You must be a member to report a message in this community." }, { status: 403 });
    }
    const result = await db.collection("reports").insertOne({
      target: body.target,
      reason: body.reason,
      details: typeof body.details === "string" ? body.details.slice(0, 2000) : "",
      ...(typeof body.communityId === "string" && typeof body.messageId === "string" ? { communityId: body.communityId, messageId: body.messageId } : {}),
      reporterId: user._id.toHexString(),
      reportedBy: user.name,
      status: "open",
      createdAt: new Date(),
    });
    return NextResponse.json({ id: result.insertedId.toHexString() }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    if (!canModerate(user)) return NextResponse.json({ error: "Moderator access is required." }, { status: 403 });
    const body = await request.json();
    if (typeof body.id !== "string" || !ObjectId.isValid(body.id) || !["dismissed", "removed"].includes(body.decision)) {
      return NextResponse.json({ error: "Choose a report and a valid decision." }, { status: 400 });
    }
    const db = await getDatabase();
    const reportId = new ObjectId(body.id);
    const report = await db.collection("reports").findOne({ _id: reportId, status: "open" });
    if (!report) return NextResponse.json({ error: "Open report not found." }, { status: 404 });
    if (body.decision === "removed" && typeof report.communityId === "string" && typeof report.messageId === "string" && ObjectId.isValid(report.messageId)) {
      await db.collection("communityMessages").deleteOne({ _id: new ObjectId(report.messageId), communityId: report.communityId });
    }
    const result = await db.collection("reports").updateOne(
      { _id: reportId, status: "open" },
      { $set: { status: body.decision, decisionBy: user._id.toHexString(), decisionAt: new Date() } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Open report not found." }, { status: 404 });
    await db.collection("moderationActions").insertOne({ reportId: body.id, moderatorId: user._id.toHexString(), decision: body.decision, createdAt: new Date() });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
