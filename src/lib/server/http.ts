import { MongoParseError, MongoServerSelectionError } from "mongodb";
import { NextResponse } from "next/server";

export function handleApiError(error: unknown) {
  console.error("API request failed:", error);
  if (error instanceof MongoParseError) {
    return NextResponse.json(
      { error: "MONGODB_URI is invalid. Check the Atlas URI format and percent-encode reserved characters in the username or password." },
      { status: 500 },
    );
  }
  if (error instanceof MongoServerSelectionError) {
    return NextResponse.json(
      { error: "MongoDB is unavailable. Check MONGODB_URI, the database user credentials, and your Atlas IP access list." },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
}
