import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_FILE = path.join(process.cwd(), "data", "live-chat-presence.json");

export interface UserPresence {
  isOnline: boolean;
  lastSeen: number;
  lastSeenFormatted: string;
}

function readDbPresence(): Record<string, UserPresence> {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function writeDbPresence(data: Record<string, UserPresence>): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // ignore
  }
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
