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
    const [users, moderators, suspendedUsers, communities, activeMatches, pendingRequests, openReports, recentUsers, recentReports, requestRecords] = await Promise.all([
      db.collection("users").countDocuments({}),
      db.collection("users").countDocuments({ role: "moderator" }),
      db.collection("users").countDocuments({ status: "suspended" }),
      db.collection("communities").countDocuments({}),
      db.collection("matches").countDocuments({ status: "active" }),
      db.collection("matchRequests").countDocuments({ status: "pending" }),
      db.collection("reports").countDocuments({ status: "open" }),
      db.collection("users").find({}, { projection: { name: 1, email: 1, role: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(6).toArray(),
      db.collection("reports").find({ status: "open" }, { projection: { target: 1, reason: 1, reportedBy: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(5).toArray(),
      db.collection("matchRequests").find({ status: "pending" }).sort({ createdAt: -1 }).limit(10).toArray(),
    ]);
    const requestUserIds = [...new Set(requestRecords.flatMap((item) => [item.requesterId, item.recipientId]).filter((id): id is string => typeof id === "string"))];
    const requestUsers = requestUserIds.filter(ObjectId.isValid).length ? await db.collection("users").find({ _id: { $in: requestUserIds.filter(ObjectId.isValid).map((id) => new ObjectId(id)) } }, { projection: { name: 1 } }).toArray() : [];
    const requestNames = new Map(requestUsers.map((user) => [user._id.toHexString(), user.name]));

    return NextResponse.json({
      counts: { users, moderators, suspendedUsers, communities, activeMatches, pendingRequests, openReports },
      recentUsers: recentUsers.map((user) => ({ id: user._id.toHexString(), name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })),
      recentReports: recentReports.map((report) => ({ id: report._id.toHexString(), target: report.target, reason: report.reason, reportedBy: report.reportedBy, createdAt: report.createdAt })),
      pendingRequests: requestRecords.map((item) => ({ id: item._id.toHexString(), requester: requestNames.get(item.requesterId) ?? "Member", recipient: requestNames.get(item.recipientId) ?? "Member", createdAt: item.createdAt })),
    });
  } catch (error) { return handleApiError(error); }
}
