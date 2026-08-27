import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_FILE = path.join(process.cwd(), "data", "live-chat-messages.json");

const INITIAL_SUPPORT_MESSAGES = [
  {
    id: "support-msg-1",
    senderId: "support-team",
    senderName: "Customer Support & Escrow",
    senderEmail: "support@saas.com",
    content: "Welcome to Live Support! Feel free to ask any question regarding project escrows, dispute resolution, or milestones.",
    sentAt: "10:00 AM",
    timestamp: Date.now() - 3600000,
    status: "seen",
  },
];

function readDbMessages(): Record<string, any[]> {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const init = { "support-team": INITIAL_SUPPORT_MESSAGES };
      fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2), "utf-8");
      return init;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) || {};
    if (!parsed["support-team"]) {
      parsed["support-team"] = INITIAL_SUPPORT_MESSAGES;
    }
    return parsed;
  } catch {
    return { "support-team": INITIAL_SUPPORT_MESSAGES };
  }
}

function writeDbMessages(data: Record<string, any[]>): void {
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
  const contactId = searchParams.get("contactId");
  const messagesStore = readDbMessages();

  if (contactId) {
    return NextResponse.json({
      success: true,
      data: messagesStore[contactId] || [],
    });
  }

  return NextResponse.json({ success: true, data: messagesStore });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { contactId, message } = body || {};

    if (!contactId || !message) {
      return NextResponse.json(
        { success: false, message: "contactId and message are required" },
        { status: 400 }
      );
    }

    const messagesStore = readDbMessages();
    const existing = messagesStore[contactId] || [];

    if (!existing.some((m) => m.id === message.id)) {
      messagesStore[contactId] = [...existing, message];
      writeDbMessages(messagesStore);
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save message" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { contactId } = body || {};

    if (!contactId) {
      return NextResponse.json(
        { success: false, message: "contactId is required" },
        { status: 400 }
      );
    }

    const messagesStore = readDbMessages();
    const contactMsgs = messagesStore[contactId] || [];
    const updated = contactMsgs.map((m) => ({ ...m, status: "seen" }));
    messagesStore[contactId] = updated;
    writeDbMessages(messagesStore);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update messages" },
      { status: 500 }
    );
  }
}
