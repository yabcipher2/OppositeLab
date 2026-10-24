import { NextRequest, NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await deleteSession(request);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
