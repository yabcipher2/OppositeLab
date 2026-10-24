import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";
type Context = { params: Promise<{ communityId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const { communityId } = await context.params;
    if (!ObjectId.isValid(communityId)) return NextResponse.json({ error: "Invalid community." }, { status: 400 });
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const visibility = body.visibility;
    if (name.length < 3 || name.length > 80) return NextResponse.json({ error: "Community name must contain 3 to 80 characters." }, { status: 400 });
    if (category.length > 40) return NextResponse.json({ error: "Topic must be 40 characters or fewer." }, { status: 400 });
    if (description.length < 10 || description.length > 500) return NextResponse.json({ error: "Description must contain 10 to 500 characters." }, { status: 400 });
    if (visibility !== "public" && visibility !== "private") return NextResponse.json({ error: "Choose whether this community is public or private." }, { status: 400 });

    const db = await getDatabase();
    const filter = { _id: new ObjectId(communityId), createdBy: user._id.toHexString(), status: { $ne: "archived" } };
    const result = await db.collection("communities").updateOne(filter, { $set: { name, category: category || "Community", description, visibility, updatedAt: new Date() } });
    if (!result.matchedCount) {
      const exists = await db.collection("communities").findOne({ _id: new ObjectId(communityId) }, { projection: { status: 1 } });
      if (!exists) return NextResponse.json({ error: "Community not found." }, { status: 404 });
      if (exists.status === "archived") return NextResponse.json({ error: "This community is archived." }, { status: 410 });
      return NextResponse.json({ error: "Only the community owner can edit community details." }, { status: 403 });
    }
    return NextResponse.json({ community: { id: communityId, name, category: category || "Community", description, visibility } });
  } catch (error) { return handleApiError(error); }
}
