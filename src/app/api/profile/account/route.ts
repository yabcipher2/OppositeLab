import { compare } from "bcryptjs";
import { GridFSBucket, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { currentUser, SESSION_COOKIE, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    if (user.role === "admin") return NextResponse.json({ error: "Administrator accounts cannot be deactivated or deleted here. Transfer administrator access first." }, { status: 403 });
    const body = await request.json();
    if (!["deactivate", "delete"].includes(body.action) || typeof body.password !== "string" || !body.password) {
      return NextResponse.json({ error: "Choose an account action and confirm your password." }, { status: 400 });
    }
    if (body.action === "delete" && body.confirmation !== "DELETE") {
      return NextResponse.json({ error: "Type DELETE to confirm permanent account deletion." }, { status: 400 });
    }
    const db = await getDatabase();
    const account = await db.collection("users").findOne({ _id: user._id }, { projection: { passwordHash: 1, photoFileId: 1 } });
    if (!account || typeof account.passwordHash !== "string" || !(await compare(body.password, account.passwordHash))) {
      return NextResponse.json({ error: "Your password is incorrect." }, { status: 400 });
    }
    const userId = user._id.toHexString();
    const response = NextResponse.json({ success: true, action: body.action });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });

    if (body.action === "deactivate") {
      await db.collection("users").updateOne({ _id: user._id }, { $set: { status: "suspended", deactivatedAt: new Date(), updatedAt: new Date() } });
      await db.collection("sessions").deleteMany({ userId });
      return response;
    }

    const matches = await db.collection("matches").find({ memberIds: userId }, { projection: { _id: 1, memberIds: 1 } }).toArray();
    for (const match of matches) {
      const remainingMembers = Array.isArray(match.memberIds) ? match.memberIds.filter((id: string) => id !== userId) : [];
      if (remainingMembers.length < 2) await db.collection("matches").deleteOne({ _id: match._id });
      else await db.collection("matches").updateOne({ _id: match._id }, { $set: { memberIds: remainingMembers } });
    }

    const ownedProjects = await db.collection("projects").find({ memberIds: userId }, { projection: { _id: 1, memberIds: 1 } }).toArray();
    const orphanedProjectIds: string[] = [];
    for (const project of ownedProjects) {
      const remainingMembers = Array.isArray(project.memberIds) ? project.memberIds.filter((id: string) => id !== userId) : [];
      if (!remainingMembers.length) orphanedProjectIds.push(project._id.toHexString());
      else await db.collection("projects").updateOne(
        { _id: project._id },
        { $set: { memberIds: remainingMembers, ...(project.createdBy === userId ? { createdBy: remainingMembers[0] } : {}), updatedAt: new Date() } },
      );
    }
    if (orphanedProjectIds.length) {
      await Promise.all([
        db.collection("projects").deleteMany({ _id: { $in: orphanedProjectIds.map((id) => new ObjectId(id)) } }),
        db.collection("projectVersions").deleteMany({ projectId: { $in: orphanedProjectIds } }),
        db.collection("workspaceActivity").deleteMany({ projectId: { $in: orphanedProjectIds } }),
        db.collection("milestones").deleteMany({ projectId: { $in: orphanedProjectIds } }),
        db.collection("projectNominations").deleteMany({ projectId: { $in: orphanedProjectIds } }),
        db.collection("projectVotes").deleteMany({ projectId: { $in: orphanedProjectIds } }),
        db.collection("workspaceComments").deleteMany({ projectId: { $in: orphanedProjectIds } }),
        db.collection("workspaceAttachments").deleteMany({ projectId: { $in: orphanedProjectIds } }),
      ]);
    }

    await Promise.all([
      db.collection("sessions").deleteMany({ userId }),
      db.collection("passwordResets").deleteMany({ userId }),
      db.collection("matchRequests").deleteMany({ $or: [{ requesterId: userId }, { recipientId: userId }] }),
      db.collection("communityMemberships").deleteMany({ userId }),
      db.collection("milestones").updateMany({ memberIds: userId }, { $pull: { memberIds: userId } }),
      db.collection("projects").updateMany({ createdBy: userId }, { $unset: { createdBy: "" } }),
      db.collection("communityMessages").updateMany({ authorId: userId }, { $set: { authorId: "deleted-user", authorName: "Deleted user" } }),
      db.collection("workspaceActivity").updateMany({ actorId: userId }, { $set: { actorId: "deleted-user", actorName: "Deleted user" } }),
      db.collection("workspaceComments").updateMany({ authorId: userId }, { $set: { authorId: "deleted-user" } }),
      db.collection("projectVersions").updateMany({ savedBy: userId }, { $unset: { savedBy: "" } }),
      db.collection("projectVotes").deleteMany({ voterId: userId }),
      db.collection("projectNominations").deleteMany({ nominatedBy: userId, approvalStatus: { $ne: "approved" } }),
      db.collection("projectNominations").updateMany({ nominatedBy: userId, approvalStatus: "approved" }, { $set: { nominatedBy: "deleted-user", nominatedByName: "Deleted user" } }),
      db.collection("communities").updateMany({ createdBy: userId }, { $unset: { createdBy: "" } }),
      db.collection("moderatorRoleChanges").deleteMany({ userId }),
      db.collection("adminActions").updateMany({ actorId: userId }, { $set: { actorId: "deleted-user" } }),
    ]);

    if (account.photoFileId && ObjectId.isValid(account.photoFileId)) {
      try { await new GridFSBucket(db, { bucketName: "profilePhotos" }).delete(new ObjectId(account.photoFileId)); }
      catch (error) {
        if (!(error instanceof Error) || !error.message.includes("FileNotFound")) throw error;
      }
    }
    await db.collection("users").deleteOne({ _id: user._id });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
