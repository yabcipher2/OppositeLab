import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, profilePhotoUrl, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const { passwordHash: _secret, photo: _photo, photoFileId, ...profile } = user;
    return NextResponse.json({ profile: { ...profile, _id: profile._id.toHexString(), photo: profilePhotoUrl(photoFileId, Boolean(_photo)) } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    const allowed = ["name", "roleLabel", "location", "bio", "interests", "portfolioUrl", "githubUrl", "socialUrl"] as const;
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }
    if (typeof update.name === "string" && (update.name.trim().length < 2 || update.name.length > 80)) {
      return NextResponse.json({ error: "Name must contain 2 to 80 characters." }, { status: 400 });
    }
    if (update.interests !== undefined && (!Array.isArray(update.interests) || update.interests.some((item) => typeof item !== "string"))) {
      return NextResponse.json({ error: "Interests must be a list of text values." }, { status: 400 });
    }
    for (const key of ["portfolioUrl", "githubUrl", "socialUrl"] as const) {
      if (update[key] !== undefined) {
        if (typeof update[key] !== "string" || update[key].length > 300) {
          return NextResponse.json({ error: "Social links must be text values under 300 characters." }, { status: 400 });
        }
        const value = update[key].trim();
        if (value) {
          try {
            const url = new URL(value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`);
            if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid URL");
          } catch {
            return NextResponse.json({ error: "Enter a valid web URL for each social link." }, { status: 400 });
          }
        }
        update[key] = value;
      }
    }
    update.updatedAt = new Date();
    const db = await getDatabase();
    await db.collection("users").updateOne({ _id: new ObjectId(user._id) }, { $set: update });
    const profile = await db.collection("users").findOne({ _id: new ObjectId(user._id) }, { projection: { passwordHash: 0 } });
    if (profile) {
      profile.photo = profilePhotoUrl(profile.photoFileId, Boolean(profile.photo));
      delete profile.photoFileId;
    }
    return NextResponse.json({ profile });
  } catch (error) {
    return handleApiError(error);
  }
}
