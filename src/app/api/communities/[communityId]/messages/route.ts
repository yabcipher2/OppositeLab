import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";
type Context = { params: Promise<{ communityId: string }> };
type MessageAttachment = { name: string; type: string; dataUrl: string };
type CommunityMessageDocument = {
  _id: ObjectId;
  communityId: string;
  reactions?: Array<{ emoji: string; userIds: string[] }>;
};
type CommunityDocument = { _id: ObjectId; pinnedMessageIds?: string[]; pinnedMessageId?: string };

async function isMember(request: NextRequest, communityId: string) {
  const user = await currentUser(request);
  if (!user) return { response: unauthorized() };
  const db = await getDatabase();
  const community = await db.collection("communities").findOne({ _id: new ObjectId(communityId), status: { $ne: "archived" } });
  if (!community) return { response: NextResponse.json({ error: "Community is unavailable." }, { status: 404 }) };
  const member = await db.collection("communityMemberships").findOne({ communityId, userId: user._id.toHexString() });
  if (!member) return { response: NextResponse.json({ error: "Join this community to read or send messages." }, { status: 403 }) };
  return { user, community };
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const { communityId } = await context.params;
    if (!ObjectId.isValid(communityId)) return NextResponse.json({ error: "Invalid community." }, { status: 400 });
    const access = await isMember(request, communityId);
    if (access.response) return access.response;
    const db = await getDatabase();
    const attachmentRequest = request.nextUrl.searchParams.get("attachment");
    if (attachmentRequest) {
      const [messageId, attachmentIndex, ...extra] = attachmentRequest.split(":");
      const index = Number(attachmentIndex);
      if (extra.length || !ObjectId.isValid(messageId) || !Number.isSafeInteger(index) || index < 0) {
        return NextResponse.json({ error: "Invalid attachment." }, { status: 400 });
      }
      const message = await db.collection("communityMessages").findOne({ _id: new ObjectId(messageId), communityId });
      const attachment = message?.attachments?.[index];
      const match = attachment?.dataUrl?.match(/^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/);
      if (!attachment || !match || match[1] !== attachment.type) {
        return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
      }
      const inline = /^(image\/(?!svg\+xml$)[\w.+-]+|video\/[\w.+-]+|audio\/[\w.+-]+)$/.test(attachment.type);
      return new NextResponse(new Uint8Array(Buffer.from(match[2], "base64")), {
        headers: {
          "Content-Type": attachment.type,
          "Content-Disposition": inline ? "inline" : "attachment",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    await db.collection("communityMessages").createIndex({ communityId: 1, createdAt: -1 });
    const userId = access.user._id.toHexString();
    await db.collection("communityPresence").updateOne(
      { communityId, userId },
      { $set: { lastSeen: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    await db.collection("communityMemberships").updateOne(
      { communityId, userId },
      { $set: { lastReadAt: new Date() } },
    );
    const pinnedIds = [
      ...(Array.isArray(access.community.pinnedMessageIds) ? access.community.pinnedMessageIds : []),
      ...(typeof access.community.pinnedMessageId === "string" ? [access.community.pinnedMessageId] : []),
    ].filter((id, index, list) => typeof id === "string" && list.indexOf(id) === index);
    const pinnedObjectIds = pinnedIds.filter(ObjectId.isValid).map((id) => new ObjectId(id));
    const [records, pinnedRecords] = await Promise.all([
      db.collection("communityMessages").find({ communityId }, { projection: { "attachments.dataUrl": 0 } }).sort({ createdAt: -1 }).limit(100).toArray(),
      pinnedObjectIds.length
        ? db.collection("communityMessages").find({ communityId, _id: { $in: pinnedObjectIds } }, { projection: { "attachments.dataUrl": 0 } }).sort({ createdAt: -1 }).toArray()
        : Promise.resolve([]),
    ]);
    const visibleIds = records.map((message) => message._id);
    if (visibleIds.length) {
      await db.collection("communityMessages").updateMany(
        { _id: { $in: visibleIds }, communityId, authorId: { $ne: userId }, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } },
      );
      for (const message of records) {
        if (message.authorId !== userId && !message.readBy?.includes(userId)) {
          message.readBy = [...(message.readBy ?? []), userId];
        }
      }
    }
    const authorIds = [...new Set([...records, ...pinnedRecords].map((message) => message.authorId).filter((id) => typeof id === "string" && ObjectId.isValid(id)))].map((id) => new ObjectId(id));
    const authors = await db.collection("users").find({ _id: { $in: authorIds } }, { projection: { name: 1, role: 1, roleLabel: 1 } }).toArray();
    const authorMap = new Map(authors.map((author) => [author._id.toHexString(), {
      name: author.name,
      role: author._id.toHexString() === access.community.createdBy ? "Owner" : author.role === "admin" || author.role === "moderator" ? "Admin" : author.roleLabel ?? "Creator",
      admin: author.role === "admin" || author.role === "moderator",
    }]));
    const serializeMessage = (message: (typeof records)[number]) => {
      const author = authorMap.get(message.authorId);
      return {
        id: message._id.toHexString(),
        authorId: message.authorId,
        authorName: author?.name ?? "Former member",
        authorRole: author?.role ?? "Creator",
        authorIsAdmin: author?.admin ?? false,
        text: message.text ?? "",
        type: message.type ?? "message",
        attachments: (message.attachments ?? []).map((attachment, index) => ({ name: attachment.name, type: attachment.type, url: `/api/communities/${communityId}/messages?attachment=${message._id.toHexString()}:${index}` })),
        createdAt: message.createdAt,
        editedAt: message.editedAt ?? null,
        replyTo: message.replyTo ?? null,
        reactions: message.reactions ?? [],
        readBy: message.readBy ?? [],
        pinned: pinnedIds.includes(message._id.toHexString()),
      };
    };
    return NextResponse.json({
      messages: records.reverse().map(serializeMessage),
      pinnedMessages: pinnedRecords.reverse().map(serializeMessage),
      canPinMessages: access.community.createdBy === access.user._id.toHexString() || access.user.role === "admin" || access.user.role === "moderator",
      currentUserId: userId,
      muted: Boolean((await db.collection("communityMemberships").findOne({ communityId, userId }))?.notificationsMuted),
    });
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { communityId } = await context.params;
    if (!ObjectId.isValid(communityId)) return NextResponse.json({ error: "Invalid community." }, { status: 400 });
    const access = await isMember(request, communityId);
    if (access.response) return access.response;
    const body = await request.json();
    const db = await getDatabase();
    const userId = access.user._id.toHexString();
    if (body.action === "mute") {
      if (typeof body.muted !== "boolean") return NextResponse.json({ error: "Choose whether to mute notifications." }, { status: 400 });
      await db.collection("communityMemberships").updateOne({ communityId, userId }, { $set: { notificationsMuted: body.muted } });
      return NextResponse.json({ muted: body.muted });
    }
    if (typeof body.messageId !== "string" || !ObjectId.isValid(body.messageId)) return NextResponse.json({ error: "Choose a valid message." }, { status: 400 });
    const messageId = new ObjectId(body.messageId);
    const message = await db.collection("communityMessages").findOne({ _id: messageId, communityId });
    if (!message || message.type === "system") return NextResponse.json({ error: "The message is not available." }, { status: 404 });
    const isOwner = access.community.createdBy === userId;
    const isAdmin = access.user.role === "admin" || access.user.role === "moderator";
    const isAuthor = message.authorId === userId;

    if (body.action === "pin" || body.action === "unpin") {
      if (!isOwner && !isAdmin) return NextResponse.json({ error: "Only the community owner or an admin can pin messages." }, { status: 403 });
      const query = { _id: new ObjectId(communityId), createdBy: access.community.createdBy };
      const existingPins = Array.isArray(access.community.pinnedMessageIds) ? access.community.pinnedMessageIds.filter((id: unknown): id is string => typeof id === "string") : [];
      if (typeof access.community.pinnedMessageId === "string") existingPins.push(access.community.pinnedMessageId);
      const nextPins = body.action === "pin"
        ? [...new Set([...existingPins, body.messageId])]
        : [...new Set(existingPins)].filter((id) => id !== body.messageId);
      const pinUpdate = nextPins.length
        ? { $set: { pinnedMessageIds: nextPins, pinnedAt: new Date() }, $unset: { pinnedMessageId: "" } }
        : { $set: { pinnedMessageIds: [] }, $unset: { pinnedMessageId: "", pinnedAt: "" } };
      await db.collection("communities").updateOne(query, pinUpdate);
      const actorName = access.user.name ?? "A community admin";
      const actionText = body.action === "pin" ? "pinned a message" : "unpinned a message";
      await db.collection("communityMessages").insertOne({
        communityId,
        authorId: userId,
        type: "system",
        text: `${actorName} ${actionText}.`,
        createdAt: new Date(),
      });
      return NextResponse.json({ pinned: body.action === "pin" });
    }
    if (body.action === "edit") {
      if (!isAuthor) return NextResponse.json({ error: "Only the message sender can edit it." }, { status: 403 });
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text || text.length > 2000) return NextResponse.json({ error: "Edited messages must contain 1 to 2,000 characters." }, { status: 400 });
      await db.collection("communityMessages").updateOne({ _id: messageId, communityId, authorId: userId }, { $set: { text, editedAt: new Date() } });
      return NextResponse.json({ edited: true });
    }
    if (body.action === "react") {
      const emoji = body.emoji;
      if (!["👍", "❤️", "🔥", "🚀"].includes(emoji)) return NextResponse.json({ error: "Choose a supported reaction." }, { status: 400 });
      const existingReaction = message.reactions?.find((reaction: { emoji: string }) => reaction.emoji === emoji);
      if (existingReaction?.userIds?.includes(userId)) {
        await db.collection<CommunityMessageDocument>("communityMessages").updateOne({ _id: messageId, communityId }, { $pull: { "reactions.$[reaction].userIds": userId } }, { arrayFilters: [{ "reaction.emoji": emoji }] });
      } else {
        await db.collection<CommunityMessageDocument>("communityMessages").updateOne(
          { _id: messageId, communityId, "reactions.emoji": emoji },
          { $addToSet: { "reactions.$.userIds": userId } },
        ).then(async (result) => {
          if (!result.matchedCount) await db.collection<CommunityMessageDocument>("communityMessages").updateOne({ _id: messageId, communityId }, { $push: { reactions: { emoji, userIds: [userId] } } });
        });
      }
      return NextResponse.json({ updated: true });
    }
    if (body.action === "delete") {
      if (!isAuthor && !isOwner && !isAdmin) return NextResponse.json({ error: "Only the sender, owner, or an admin can delete this message." }, { status: 403 });
      await db.collection("communityMessages").deleteOne({ _id: messageId, communityId });
      await db.collection<CommunityDocument>("communities").updateOne(
        { _id: new ObjectId(communityId) },
        { $pull: { pinnedMessageIds: body.messageId }, $unset: { ...(access.community.pinnedMessageId === body.messageId ? { pinnedMessageId: "" } : {}) } },
      );
      return NextResponse.json({ deleted: true });
    }
    return NextResponse.json({ error: "Unsupported message action." }, { status: 400 });
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { communityId } = await context.params;
    if (!ObjectId.isValid(communityId)) return NextResponse.json({ error: "Invalid community." }, { status: 400 });
    const access = await isMember(request, communityId);
    if (access.response) return access.response;
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const attachments: MessageAttachment[] = [];
    if (body.attachments !== undefined) {
      if (!Array.isArray(body.attachments) || body.attachments.length > 5) {
        return NextResponse.json({ error: "Attach up to 5 files per message." }, { status: 400 });
      }
      let totalBytes = 0;
      for (const attachment of body.attachments) {
        if (
          !attachment ||
          typeof attachment.name !== "string" ||
          typeof attachment.type !== "string" ||
          typeof attachment.dataUrl !== "string" ||
          attachment.name.length < 1 ||
          attachment.name.length > 255 ||
          !/^[\w.+-]+\/[\w.+-]+$/.test(attachment.type)
        ) {
          return NextResponse.json({ error: "One of the attached files is invalid." }, { status: 400 });
        }
        const match = attachment.dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/);
        if (!match || match[1] !== attachment.type) {
          return NextResponse.json({ error: "One of the attached files is invalid." }, { status: 400 });
        }
        const bytes = Buffer.from(match[2], "base64");
        if (bytes.toString("base64") !== match[2]) {
          return NextResponse.json({ error: "One of the attached files is invalid." }, { status: 400 });
        }
        totalBytes += bytes.byteLength;
        if (totalBytes > 8 * 1024 * 1024) {
          return NextResponse.json({ error: "Attachments must total 8 MB or less." }, { status: 413 });
        }
        attachments.push({ name: attachment.name, type: attachment.type, dataUrl: attachment.dataUrl });
      }
    }
    if ((!text && attachments.length === 0) || text.length > 2000) {
      return NextResponse.json({ error: "Messages need text or an attachment and can contain up to 2,000 characters." }, { status: 400 });
    }
    const user = access.user!;
    let replyTo: { id: string; authorName: string; text: string } | null = null;
    if (body.replyToId !== undefined && body.replyToId !== null) {
      if (typeof body.replyToId !== "string" || !ObjectId.isValid(body.replyToId)) return NextResponse.json({ error: "Choose a valid message to reply to." }, { status: 400 });
      const parent = await (await getDatabase()).collection("communityMessages").findOne({ _id: new ObjectId(body.replyToId), communityId });
      if (!parent) return NextResponse.json({ error: "The message you are replying to was not found." }, { status: 404 });
      const parentAuthor = ObjectId.isValid(parent.authorId) ? await (await getDatabase()).collection("users").findOne({ _id: new ObjectId(parent.authorId) }, { projection: { name: 1 } }) : null;
      replyTo = { id: parent._id.toHexString(), authorName: parentAuthor?.name ?? "Former member", text: parent.text };
    }
    const message = { communityId, authorId: user._id.toHexString(), text, ...(attachments.length ? { attachments } : {}), createdAt: new Date(), ...(replyTo ? { replyTo } : {}) };
    const result = await (await getDatabase()).collection("communityMessages").insertOne(message);
    const messageId = result.insertedId.toHexString();
    return NextResponse.json({ message: { id: messageId, authorId: message.authorId, authorName: user.name, authorRole: user._id.toHexString() === access.community.createdBy ? "Owner" : user.role === "admin" || user.role === "moderator" ? "Admin" : "Creator", authorIsAdmin: user.role === "admin" || user.role === "moderator", text, attachments: attachments.map((attachment, index) => ({ name: attachment.name, type: attachment.type, url: `/api/communities/${communityId}/messages?attachment=${messageId}:${index}` })), createdAt: message.createdAt, replyTo, reactions: [], readBy: [], pinned: false } }, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
