import { NextResponse } from "next/server";
import { readPersistentData, writePersistentData } from "../persistent-storage";

export const dynamic = "force-dynamic";

const FILE_NAME = "live-chat-requests.json";

function deduplicateRequests(requests: any[]): any[] {
  const map = new Map<string, any>();
  const sorted = [...requests].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  sorted.forEach((r) => {
    if (r && r.senderEmail && r.receiverEmail) {
      const pairKey = `${r.senderEmail.toLowerCase().trim()}::${r.receiverEmail.toLowerCase().trim()}`;
      map.set(pairKey, r);
    }
  });
  return Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function readDbRequests(): any[] {
  const raw = readPersistentData<any[]>(FILE_NAME, []);
  return deduplicateRequests(raw);
}

function writeDbRequests(data: any[]): void {
  const clean = deduplicateRequests(data);
  writePersistentData<any[]>(FILE_NAME, clean);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userEmail = searchParams.get("email")?.trim().toLowerCase();

  const requests = readDbRequests();
  if (!userEmail) {
    return NextResponse.json({ success: true, data: requests });
  }

  const userRequests = requests.filter(
    (r) =>
      r.senderEmail?.toLowerCase() === userEmail ||
      r.receiverEmail?.toLowerCase() === userEmail
  );

  return NextResponse.json({ success: true, data: userRequests });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sender, receiver } = body || {};

    if (!sender?.email || !receiver?.email) {
      return NextResponse.json(
        { success: false, message: "Sender and receiver emails are required" },
        { status: 400 }
      );
    }

    const sEmail = sender.email.trim().toLowerCase();
    const rEmail = receiver.email.trim().toLowerCase();
    const requests = readDbRequests();

    // Filter out existing request between these two users
    const filtered = requests.filter(
      (r) =>
        !(
          r.senderEmail?.toLowerCase() === sEmail &&
          r.receiverEmail?.toLowerCase() === rEmail
        )
    );

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const newRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderEmail: sEmail,
      senderName: sender.name || "User",
      senderRole: sender.role || "User",
      senderAvatar: sender.avatar,
      receiverEmail: rEmail,
      receiverName: receiver.name || "User",
      receiverRole: receiver.role || "User",
      receiverAvatar: receiver.avatar,
      status: "pending",
      createdAt: Date.now(),
      formattedDate,
    };

    const updated = [newRequest, ...filtered];
    writeDbRequests(updated);

    return NextResponse.json({ success: true, data: newRequest }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create request" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const senderEmail = searchParams.get("senderEmail")?.trim().toLowerCase();
    const receiverEmail = searchParams.get("receiverEmail")?.trim().toLowerCase();
    const requestId = searchParams.get("id");

    const requests = readDbRequests();
    const filtered = requests.filter((r) => {
      if (requestId) return r.id !== requestId;
      if (senderEmail && receiverEmail) {
        return !(
          r.senderEmail?.toLowerCase() === senderEmail &&
          r.receiverEmail?.toLowerCase() === receiverEmail
        );
      }
      return true;
    });

    writeDbRequests(filtered);
    return NextResponse.json({ success: true, message: "Request removed" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to cancel request" },
      { status: 500 }
    );
  }
}
