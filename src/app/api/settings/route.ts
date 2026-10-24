import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";
const defaultPreferences = {
  discoverable: true,
  showLocation: true,
  showInterests: true,
  showBio: true,
  showOnlineStatus: true,
  allowCommunityInvites: true,
  inAppMatchRequests: true,
  emailMatchRequests: true,
  inAppWorkspaceUpdates: true,
  emailWorkspaceUpdates: true,
  inAppCommunityActivity: true,
  emailCommunityActivity: false,
};
const preferenceKeys = Object.keys(defaultPreferences) as (keyof typeof defaultPreferences)[];

function normalizedPreferences(saved: Record<string, unknown> = {}) {
  return {
    ...defaultPreferences,
    ...saved,
    inAppMatchRequests: typeof saved.inAppMatchRequests === "boolean" ? saved.inAppMatchRequests : saved.matchUpdates !== false,
    inAppCommunityActivity: typeof saved.inAppCommunityActivity === "boolean" ? saved.inAppCommunityActivity : true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    return NextResponse.json({ settings: normalizedPreferences(user.preferences) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    const settings: Partial<Record<keyof typeof defaultPreferences, boolean>> = {};
    for (const key of preferenceKeys) {
      if (typeof body[key] === "boolean") settings[key] = body[key];
    }
    if (!Object.keys(settings).length) return NextResponse.json({ error: "Choose at least one valid setting." }, { status: 400 });
    const db = await getDatabase();
    const updateFields: Record<string, boolean | Date> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(settings)) updateFields[`preferences.${key}`] = value;
    await db.collection("users").updateOne(
      { _id: new ObjectId(user._id) },
      { $set: updateFields },
    );
    return NextResponse.json({ settings: normalizedPreferences({ ...(user.preferences ?? {}), ...settings }) });
  } catch (error) {
    return handleApiError(error);
  }
}
