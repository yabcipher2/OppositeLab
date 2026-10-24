import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

export const SESSION_COOKIE = "oppositelab_session";
const SESSION_LENGTH_DAYS = 30;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function currentUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDatabase();
  const session = await db.collection("sessions").findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });
  if (!user || user.status === "suspended") {
    await db.collection("sessions").deleteOne({ tokenHash: hashToken(token) });
    return null;
  }
  return user;
}

export function unauthorized() {
  return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
}

export async function createSession(userId: ObjectId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_DAYS * 86400000);
  const db = await getDatabase();
  await db.collection("sessions").insertOne({
    tokenHash: hashToken(token),
    userId: userId.toHexString(),
    expiresAt,
    createdAt: new Date(),
  });
  return { token, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function profilePhotoUrl(fileId?: ObjectId | string | null, hasLegacyPhoto = false, userId?: ObjectId | string | null) {
  const ownerId = userId instanceof ObjectId ? userId.toHexString() : userId;
  const ownerParam = ownerId ? `&userId=${encodeURIComponent(ownerId)}` : "";
  if (fileId) {
    const version = fileId instanceof ObjectId ? fileId.toHexString() : fileId;
    return `/api/profile/photo?v=${encodeURIComponent(version)}${ownerParam}`;
  }
  return hasLegacyPhoto ? `/api/profile/photo?v=legacy${ownerParam}` : null;
}

export async function deleteSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return;
  const db = await getDatabase();
  await db.collection("sessions").deleteOne({ tokenHash: hashToken(token) });
}

export function publicUser<T extends { _id: ObjectId; passwordHash?: string; photo?: string | null; photoFileId?: ObjectId | string | null }>(user: T) {
  const { passwordHash: _passwordHash, photo: _photo, photoFileId, ...safe } = user;
  return { ...safe, _id: user._id.toHexString(), photo: profilePhotoUrl(photoFileId, Boolean(_photo)) };
}
