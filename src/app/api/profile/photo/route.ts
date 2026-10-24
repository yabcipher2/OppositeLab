import { Readable } from "node:stream";
import { GridFSBucket, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function isAllowedImage(type: string, bytes: Buffer) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/gif") return bytes.subarray(0, 6).toString("ascii").match(/^GIF8[79]a$/) !== null;
  if (type === "image/webp") return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const viewer = await currentUser(request);
    if (!viewer) return unauthorized();

    const requestedUserId = request.nextUrl.searchParams.get("userId");
    const version = request.nextUrl.searchParams.get("v");
    const ownerId = requestedUserId ?? viewer._id.toHexString();
    if (!ObjectId.isValid(ownerId)) return NextResponse.json({ error: "Profile photo not found." }, { status: 404 });
    const db = await getDatabase();
    const user = requestedUserId
      ? await db.collection("users").findOne({ _id: new ObjectId(ownerId) })
      : viewer;
    if (!user) return NextResponse.json({ error: "Profile photo not found." }, { status: 404 });
    if (requestedUserId && ownerId !== viewer._id.toHexString() && user.preferences?.discoverable === false) {
      const viewerId = viewer._id.toHexString();
      const [sharedProject, sharedMatch] = await Promise.all([
        db.collection("projects").findOne({ memberIds: { $all: [viewerId, ownerId] } }, { projection: { _id: 1 } }),
        db.collection("matches").findOne({ memberIds: { $all: [viewerId, ownerId] } }, { projection: { _id: 1 } }),
      ]);
      if (!sharedProject && !sharedMatch) return NextResponse.json({ error: "Profile photo not found." }, { status: 404 });
    }

    if (version && version !== "legacy" && ObjectId.isValid(version)) {
      const bucket = new GridFSBucket(db, { bucketName: "profilePhotos" });
      const fileId = new ObjectId(version);
      const file = await bucket.find({ _id: fileId }).next();
      const contentType = file?.metadata?.contentType;
      if (
        !file ||
        file.metadata?.userId !== ownerId ||
        !user.photoFileId ||
        String(user.photoFileId) !== version ||
        typeof contentType !== "string" ||
        !allowedTypes.has(contentType)
      ) {
        return NextResponse.json({ error: "Profile photo not found." }, { status: 404 });
      }
      const stream = bucket.openDownloadStream(fileId);
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(file.length),
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (version && version !== "legacy") return NextResponse.json({ error: "Profile photo not found." }, { status: 404 });
    if (version === "legacy" && user.photoFileId) return NextResponse.json({ error: "Profile photo not found." }, { status: 404 });
    const legacyPhoto = typeof user.photo === "string" ? user.photo.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]*={0,2})$/) : null;
    if (!legacyPhoto || !allowedTypes.has(legacyPhoto[1])) {
      return NextResponse.json({ error: "Profile photo not found." }, { status: 404 });
    }
    const bytes = Buffer.from(legacyPhoto[2], "base64");
    if (bytes.byteLength > MAX_PHOTO_BYTES || bytes.toString("base64") !== legacyPhoto[2] || !isAllowedImage(legacyPhoto[1], bytes)) {
      return NextResponse.json({ error: "Profile photo is invalid." }, { status: 415 });
    }
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": legacyPhoto[1],
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const formData = await request.formData();
    const uploaded = formData.get("photo");
    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: "Choose a profile photo to upload." }, { status: 400 });
    }
    if (!allowedTypes.has(uploaded.type)) {
      return NextResponse.json({ error: "Choose a JPG, PNG, WebP, or GIF photo." }, { status: 415 });
    }
    if (uploaded.size < 1 || uploaded.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Profile photos must be smaller than 4 MB." }, { status: 413 });
    }

    const bytes = Buffer.from(await uploaded.arrayBuffer());
    if (!isAllowedImage(uploaded.type, bytes)) {
      return NextResponse.json({ error: "The selected file is not a valid image." }, { status: 415 });
    }

    const db = await getDatabase();
    const bucket = new GridFSBucket(db, { bucketName: "profilePhotos" });
    const upload = bucket.openUploadStream(uploaded.name, {
      metadata: { userId: user._id.toHexString(), contentType: uploaded.type },
    });
    await new Promise<void>((resolve, reject) => {
      upload.once("error", reject);
      upload.once("finish", resolve);
      upload.end(bytes);
    });

    const oldFileId = user.photoFileId && ObjectId.isValid(user.photoFileId) ? new ObjectId(user.photoFileId) : null;
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { photoFileId: upload.id, updatedAt: new Date() }, $unset: { photo: "" } },
    );
    if (oldFileId) await bucket.delete(oldFileId);

    return NextResponse.json({ photo: `/api/profile/photo?v=${upload.id.toHexString()}` }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const db = await getDatabase();
    const oldFileId = user.photoFileId && ObjectId.isValid(user.photoFileId) ? new ObjectId(user.photoFileId) : null;
    await db.collection("users").updateOne(
      { _id: user._id },
      { $unset: { photoFileId: "", photo: "" }, $set: { updatedAt: new Date() } },
    );
    if (oldFileId) await new GridFSBucket(db, { bucketName: "profilePhotos" }).delete(oldFileId);
    return NextResponse.json({ photo: null });
  } catch (error) {
    return handleApiError(error);
  }
}
