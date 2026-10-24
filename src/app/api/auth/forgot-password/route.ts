import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getDatabase } from "@/lib/mongodb";
import { hashToken } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { sendPasswordResetEmail } from "@/lib/server/email";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection("passwordResets").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const user = await db.collection("users").findOne({ email }, { projection: { _id: 1, name: 1, email: 1 } });

    if (!user) {
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.collection("passwordResets").insertOne({
      tokenHash,
      userId: user._id.toHexString(),
      expiresAt,
      createdAt: new Date(),
    });

    await sendPasswordResetEmail(user.email, user.name, token);

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (error) {
    return handleApiError(error);
  }
}