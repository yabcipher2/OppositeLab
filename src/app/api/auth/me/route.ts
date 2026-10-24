import { NextRequest, NextResponse } from "next/server";
import { currentUser, publicUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    return NextResponse.json({ user: user ? publicUser(user) : null });
  } catch (error) {
    return handleApiError(error);
  }
}
