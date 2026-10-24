import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getDatabase } from "@/lib/mongodb";
import { handleApiError } from "@/lib/server/http";
import { INTEREST_CATALOG, interestId, interestLabel } from "@/lib/interest-catalog";
import { normalizedWorldview } from "@/lib/server/matching";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const oldOrientation = user.orientation && typeof user.orientation === "object" ? user.orientation : {};
    return NextResponse.json({ onboarding: {
      interests: Array.isArray(user.interests) ? user.interests.map((value: string) => {
        const normalized = value.startsWith("custom-interest:") ? value.slice("custom-interest:".length) : value;
        const id = interestId(normalized);
        return id === normalized && !INTEREST_CATALOG.some((item) => item.id === normalized)
          ? `custom-interest:${normalized}`
          : id;
      }) : [],
      worldviewSliders: Object.keys(normalizedWorldview(user.worldviewSliders)).length
        ? normalizedWorldview(user.worldviewSliders)
        : normalizedWorldview({
          "wv-order": Number(oldOrientation["slider-structure"] ?? 50),
          "wv-local": 50,
          "wv-empirical": Number(oldOrientation["slider-concrete"] ?? 50),
          "wv-individual": Number(oldOrientation["slider-solo"] ?? 50),
        }),
      worldviewPicks: Array.isArray(user.worldviewPicks) ? user.worldviewPicks : [],
      microHobbies: Array.isArray(user.microHobbies) ? user.microHobbies : [],
      completed: Boolean(user.onboardingCompletedAt),
      draft: user.onboardingDraft && typeof user.onboardingDraft === "object" ? user.onboardingDraft : null,
    } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    const data = body.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ error: "Invalid onboarding draft." }, { status: 400 });
    const isStringList = (value: unknown, limit: number) => Array.isArray(value) && value.length <= limit && value.every((item) => typeof item === "string" && item.trim().length > 0 && item.length <= 160);
    if (!isStringList(data.interests, 100) || !isStringList(data.worldviewPicks, 100) || !isStringList(data.microHobbies, 100)) {
      return NextResponse.json({ error: "The onboarding draft contains invalid selections." }, { status: 400 });
    }
    if (!data.worldviewSliders || typeof data.worldviewSliders !== "object" || Array.isArray(data.worldviewSliders)) return NextResponse.json({ error: "Invalid worldview settings." }, { status: 400 });
    if (Object.values(data.worldviewSliders).some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)) return NextResponse.json({ error: "Worldview values must be between 0 and 100." }, { status: 400 });
    const sliders = normalizedWorldview(data.worldviewSliders);
    const step = Number.isInteger(body.step) ? Math.max(0, Math.min(2, body.step)) : 0;
    const draft = {
      step,
      data: {
        interests: [...new Set(data.interests.map((value: string) => interestId(value.trim())))],
        worldviewSliders: sliders,
        worldviewPicks: [...new Set(data.worldviewPicks.map((value: string) => value.trim()))],
        microHobbies: [...new Set(data.microHobbies.map((value: string) => value.trim()))],
        customHobby: typeof data.customHobby === "string" ? data.customHobby.slice(0, 160) : "",
      },
      updatedAt: new Date(),
    };
    await (await getDatabase()).collection("users").updateOne({ _id: user._id }, { $set: { onboardingDraft: draft, updatedAt: new Date() } });
    return NextResponse.json({ saved: true, draft });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return unauthorized();
    const body = await request.json();
    if (!Array.isArray(body.interests) || body.interests.length < 3 || body.interests.length > 100 || body.interests.some((value: unknown) => {
      if (typeof value !== "string" || !value.trim()) return true;
      const label = value.startsWith("custom-interest:") ? value.slice("custom-interest:".length) : value;
      return label.length > 120;
    })) {
      return NextResponse.json({ error: "Choose at least three interests." }, { status: 400 });
    }
    if (!Array.isArray(body.worldviewPicks) || body.worldviewPicks.length < 1 || body.worldviewPicks.length > 100 || body.worldviewPicks.some((value: unknown) => typeof value !== "string" || !value.trim() || value.length > 120)) {
      return NextResponse.json({ error: "Choose at least one worldview anchor." }, { status: 400 });
    }
    if (!Array.isArray(body.microHobbies) || body.microHobbies.length < 1 || body.microHobbies.length > 100 || body.microHobbies.some((value: unknown) => typeof value !== "string" || !value.trim() || value.length > 160)) {
      return NextResponse.json({ error: "Add at least one micro-hobby." }, { status: 400 });
    }
    if (!body.worldviewSliders || typeof body.worldviewSliders !== "object" || Array.isArray(body.worldviewSliders) || Object.values(body.worldviewSliders).some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)) {
      return NextResponse.json({ error: "Worldview values must be between 0 and 100." }, { status: 400 });
    }
    const db = await getDatabase();
    await db.collection("users").updateOne(
      { _id: new ObjectId(user._id) },
      { $set: {
        interests: [...new Set(body.interests.map((value: string) => interestLabel(value.startsWith("custom-interest:") ? value.slice("custom-interest:".length).trim() : value.trim())))],
        worldviewSliders: normalizedWorldview(body.worldviewSliders),
        worldviewPicks: [...new Set(body.worldviewPicks.map((value: string) => value.trim()))],
        microHobbies: [...new Set(body.microHobbies.map((value: string) => value.trim()))],
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      }, $unset: { onboardingDraft: "" } },
    );
    return NextResponse.json({ saved: true });
  } catch (error) {
    return handleApiError(error);
  }
}
