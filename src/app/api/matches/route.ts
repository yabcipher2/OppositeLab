import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, profilePhotoUrl, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";
import { calculateDivergence, findResonancePoint, sharedInterests } from "@/lib/server/matching";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const db = await getDatabase();
    const id = user._id.toHexString();
    const matches = await db.collection("matches").find({ memberIds: id }).sort({ createdAt: -1 }).toArray();
    const users = db.collection("users");
    const hydratedMatches = await Promise.all(matches.map(async (match) => {
      if (match.status !== "active" || match.scoreVersion === 1 || !Array.isArray(match.memberIds)) return match;
      const memberObjectIds = match.memberIds.filter((memberId: string) => ObjectId.isValid(memberId)).map((memberId: string) => new ObjectId(memberId));
      const profiles = await users.find({ _id: { $in: memberObjectIds } }, { projection: { interests: 1, microHobbies: 1, worldviewSliders: 1 } }).toArray();
      const current = profiles.find((profile) => profile._id.toHexString() === id);
      const partnerProfile = profiles.find((profile) => profile._id.toHexString() !== id);
      const divergence = calculateDivergence(current?.worldviewSliders, partnerProfile?.worldviewSliders);
      if (divergence.score === null) return match;
      const resonancePoint = findResonancePoint(current?.microHobbies, partnerProfile?.microHobbies)
        || sharedInterests(current?.interests, partnerProfile?.interests)[0]
        || "";
      const scoreFields = {
        divergenceScore: divergence.score,
        divergenceAxes: divergence.axes,
        scoreVersion: 1,
        scoreBasis: "current-onboarding",
        scoreCalculatedAt: new Date(),
        ...(match.resonancePoint || !resonancePoint ? {} : { resonancePoint }),
      };
      await db.collection("matches").updateOne({ _id: match._id, scoreVersion: { $ne: 1 } }, { $set: scoreFields });
      return { ...match, ...scoreFields };
    }));
    const serialized = await Promise.all(hydratedMatches.map(async (match) => {
      const partnerId = Array.isArray(match.memberIds) ? match.memberIds.find((memberId: string) => memberId !== id) : undefined;
      const partner = partnerId && ObjectId.isValid(partnerId)
        ? await users.findOne(
          { _id: new ObjectId(partnerId) },
          { projection: { name: 1, roleLabel: 1, location: 1, interests: 1, worldviewSliders: 1, photoFileId: 1, photo: 1 } },
        )
        : null;
      return {
        ...match,
        id: match._id.toHexString(),
        partner: partner ? {
          name: partner.name,
          photo: profilePhotoUrl(partner.photoFileId, Boolean(partner.photo), partner._id),
          roleLabel: partner.roleLabel ?? "Creator",
          location: partner.location ?? "",
          interests: partner.interests ?? [],
          worldviewSliders: partner.worldviewSliders ?? {},
        } : null,
      };
    }));
    return NextResponse.json({ matches: serialized, currentUser: { id, name: user.name, photo: profilePhotoUrl(user.photoFileId, Boolean(user.photo), user._id), roleLabel: user.roleLabel ?? "Creator", location: user.location ?? "", interests: user.interests ?? [], worldviewSliders: user.worldviewSliders ?? {} } });
  } catch (error) {
    return handleApiError(error);
  }
}
