import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getDatabase } from "@/lib/mongodb";
import { createSession, publicUser, setSessionCookie } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: "Enter a name between 2 and 80 characters." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (password.length < 10) {
      return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
    }

    const db = await getDatabase();
    const users = db.collection("users");
    await users.createIndex({ email: 1 }, { unique: true });
    if (await users.findOne({ email })) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const now = new Date();
    const result = await users.insertOne({
      name,
      email,
      passwordHash: await hash(password, 12),
      role: "creator",
      status: "active",
      location: "",
      bio: "",
      interests: Array.isArray(body.interests) ? body.interests.filter((item: unknown) => typeof item === "string") : [],
      worldviewSliders: body.orientation && typeof body.orientation === "object" ? {
        "wv-order": Number(body.orientation["slider-structure"] ?? 50),
        "wv-local": 50,
        "wv-empirical": Number(body.orientation["slider-concrete"] ?? 50),
        "wv-individual": Number(body.orientation["slider-solo"] ?? 50),
      } : {},
      microHobbies: [],
      worldviewPicks: [],
      preferences: { matchUpdates: true, communityUpdates: true, inAppCommunityActivity: true, discoverable: true, showLocation: true },
      createdAt: now,
      updatedAt: now,
    });
    const user = await users.findOne({ _id: result.insertedId });
    if (!user) throw new Error("Account creation did not return the new user.");

    const { token, expiresAt } = await createSession(result.insertedId);
    const response = NextResponse.json({ user: publicUser(user) }, { status: 201 });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    return handleApiError(error);
  }
}
