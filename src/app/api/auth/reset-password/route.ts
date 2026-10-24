import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getDatabase } from "@/lib/mongodb";
import { hashToken } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token) {
      return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
    }

    if (password.length < 10) {
      return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    const db = await getDatabase();

    const resetRecord = await db.collection("passwordResets").findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);

    await db.collection("users").updateOne(
      { _id: new ObjectId(resetRecord.userId) },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    await db.collection("passwordResets").deleteOne({ tokenHash });

    await db.collection("sessions").deleteMany({ userId: resetRecord.userId });

    return NextResponse.json({ message: "Password has been reset. You can now sign in." });
  } catch (error) {
    return handleApiError(error);
  }
}