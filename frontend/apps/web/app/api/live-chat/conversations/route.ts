import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DELETED_FILE = path.join(process.cwd(), "data", "live-chat-deleted.json");
const MESSAGES_FILE = path.join(process.cwd(), "data", "live-chat-messages.json");

function readDeleted(): Record<string, string[]> {
  try {
    if (!fs.existsSync(DELETED_FILE)) return {};
    const raw = fs.readFileSync(DELETED_FILE, "utf-8");
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function writeDeleted(data: Record<string, string[]>): void {
  try {
    const dir = path.dirname(DELETED_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DELETED_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase();

  const deletedStore = readDeleted();
  if (email) {
    return NextResponse.json({
      success: true,
      data: deletedStore[email] || [],
    });
  }

  return NextResponse.json({ success: true, data: deletedStore });
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");
    const userEmail = searchParams.get("email")?.trim().toLowerCase();

    if (!contactId || !userEmail) {
      return NextResponse.json(
        { success: false, message: "contactId and email are required" },
        { status: 400 }
      );
    }

    const deletedStore = readDeleted();
    const list = deletedStore[userEmail] || [];
    if (!list.includes(contactId)) {
      deletedStore[userEmail] = [...list, contactId];
      writeDeleted(deletedStore);
    }

    // Also clean messages for this contact from DB if exists
    if (fs.existsSync(MESSAGES_FILE)) {
      try {
        const raw = fs.readFileSync(MESSAGES_FILE, "utf-8");
        const messagesStore = JSON.parse(raw) || {};
        if (messagesStore[contactId]) {
          delete messagesStore[contactId];
          fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messagesStore, null, 2), "utf-8");
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Conversation deleted from database",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
