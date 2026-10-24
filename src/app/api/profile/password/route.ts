import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword || newPassword.length < 10 || newPassword.length > 128) {
      return NextResponse.json({ error: "Enter your current password and a new password between 10 and 128 characters." }, { status: 400 });
    }
    const db = await getDatabase();
    const account = await db.collection("users").findOne({ _id: user._id }, { projection: { passwordHash: 1 } });
    if (!account || typeof account.passwordHash !== "string" || !(await compare(currentPassword, account.passwordHash))) {
      return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
    }
    const passwordHash = await hash(newPassword, 12);
    await db.collection("users").updateOne({ _id: user._id }, { $set: { passwordHash, updatedAt: new Date() } });
    return NextResponse.json({ saved: true });
  } catch (error) {
    return handleApiError(error);
  }
}
