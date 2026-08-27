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
    const { contactId, message, senderEmail, receiverEmail } = body || {};

    if (!contactId || !message) {
      return NextResponse.json(
        { success: false, message: "contactId and message are required" },
        { status: 400 }
      );
    }

    const messagesStore = readDbMessages();

    // Determine all relevant keys for this conversation
    const sEmail = (senderEmail || message.senderEmail || "").toLowerCase().trim();
    const rEmail = (receiverEmail || "").toLowerCase().trim();

    const keysToSave = new Set<string>([contactId]);
    if (sEmail) {
      keysToSave.add(`contact-${sEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
      keysToSave.add(sEmail);
    }
    if (rEmail) {
      keysToSave.add(`contact-${rEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
      keysToSave.add(rEmail);
    }

    keysToSave.forEach((key) => {
      const existing = messagesStore[key] || [];
      if (!existing.some((m) => m.id === message.id)) {
        messagesStore[key] = [...existing, message];
      }
    });

    writeDbMessages(messagesStore);

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
    const { contactId, readerEmail, senderEmail } = body || {};

    if (!contactId && !senderEmail) {
      return NextResponse.json(
        { success: false, message: "contactId or senderEmail is required" },
        { status: 400 }
      );
    }

    const messagesStore = readDbMessages();
    const keysToUpdate = new Set<string>();
    if (contactId) keysToUpdate.add(contactId);
    if (senderEmail) {
      const s = senderEmail.toLowerCase().trim();
      keysToUpdate.add(`contact-${s.replace(/[^a-zA-Z0-9]/g, "_")}`);
      keysToUpdate.add(s);
    }
    if (readerEmail) {
      const r = readerEmail.toLowerCase().trim();
      keysToUpdate.add(`contact-${r.replace(/[^a-zA-Z0-9]/g, "_")}`);
      keysToUpdate.add(r);
    }

    keysToUpdate.forEach((key) => {
      const contactMsgs = messagesStore[key] || [];
      messagesStore[key] = contactMsgs.map((m) => ({ ...m, status: "seen" }));
    });

    writeDbMessages(messagesStore);

    return NextResponse.json({ success: true, message: "Messages marked as seen" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update messages" },
      { status: 500 }
    );
  }
}
