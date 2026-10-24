import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getDatabase } from "@/lib/mongodb";
import { createSession, publicUser, setSessionCookie } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const db = await getDatabase();
    const user = await db.collection("users").findOne({ email });

    if (!user || typeof user.passwordHash !== "string" || !(await compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    if (user.status === "suspended") return NextResponse.json({ error: "This account is suspended. Contact an administrator for help." }, { status: 403 });

    const { token, expiresAt } = await createSession(user._id);
    const response = NextResponse.json({ user: publicUser(user) });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
