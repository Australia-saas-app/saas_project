import { NextResponse } from "next/server";
import { readPersistentData, writePersistentData } from "../persistent-storage";

export const dynamic = "force-dynamic";

const FILE_NAME = "live-chat-presence.json";

export interface UserPresence {
  isOnline: boolean;
  lastSeen: number;
  lastSeenFormatted: string;
}

function readDbPresence(): Record<string, UserPresence> {
  return readPersistentData<Record<string, UserPresence>>(FILE_NAME, {});
}

function writeDbPresence(data: Record<string, UserPresence>): void {
  writePersistentData<Record<string, UserPresence>>(FILE_NAME, data);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const presenceMap = readDbPresence();

  if (email) {
    return NextResponse.json({
      success: true,
      data: presenceMap[email] || {
        isOnline: false,
        lastSeen: 0,
        lastSeenFormatted: "Offline",
      },
    });
  }

  return NextResponse.json({ success: true, data: presenceMap });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, isOnline } = body || {};

    if (!email) {
      return NextResponse.json(
        { success: false, message: "email is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const presenceMap = readDbPresence();

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const dateStr = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const lastSeenFormatted = isOnline ? "Active now" : `${dateStr} at ${timeStr}`;

    presenceMap[cleanEmail] = {
      isOnline: Boolean(isOnline),
      lastSeen: Date.now(),
      lastSeenFormatted,
    };

    writeDbPresence(presenceMap);

    return NextResponse.json({
      success: true,
      data: presenceMap[cleanEmail],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update presence" },
      { status: 500 }
    );
  }
}
