import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const form = await request.formData();
    const projectId = form.get("projectId");
    const file = form.get("file");
    if (typeof projectId !== "string" || !ObjectId.isValid(projectId) || !(file instanceof File)) {
      return NextResponse.json({ error: "Choose a valid project and file." }, { status: 400 });
    }
    if (!file.size || file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Workspace attachments must be between 1 byte and 8 MB." }, { status: 413 });
    }
    const db = await getDatabase();
    const project = await db.collection("projects").findOne(
      { _id: new ObjectId(projectId), memberIds: user._id.toHexString() },
      { projection: { memberIds: 1 } },
    );
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const safeName = file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 180) || "attachment";
    const type = file.type && /^[\w.+-]+\/[\w.+-]+$/.test(file.type) ? file.type : "application/octet-stream";
    const result = await db.collection("workspaceAttachments").insertOne({
      projectId,
      memberIds: project.memberIds,
      name: safeName,
      type,
      data: Buffer.from(await file.arrayBuffer()),
      createdBy: user._id.toHexString(),
      createdAt: new Date(),
    });
    return NextResponse.json({
      attachment: {
        id: result.insertedId.toHexString(),
        name: safeName,
        type,
        url: `/api/workspace/attachments?id=${result.insertedId.toHexString()}`,
      },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const id = request.nextUrl.searchParams.get("id") ?? "";
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    const attachment = await (await getDatabase()).collection("workspaceAttachments").findOne(
      { _id: new ObjectId(id), memberIds: user._id.toHexString() },
    );
    if (!attachment || !Buffer.isBuffer(attachment.data)) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
    return new NextResponse(new Uint8Array(attachment.data), {
      headers: {
        "Content-Type": attachment.type,
        "Content-Disposition": `attachment; filename="${String(attachment.name).replace(/["\\]/g, "_")}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
