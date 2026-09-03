import { NextResponse } from "next/server";
import { readPersistentData, writePersistentData } from "../persistent-storage";

export const dynamic = "force-dynamic";

const FILE_NAME = "live-chat-notifications.json";

function readDbNotifications(): any[] {
  return readPersistentData<any[]>(FILE_NAME, []);
}

function writeDbNotifications(data: any[]): void {
  writePersistentData<any[]>(FILE_NAME, data);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase();

  const all = readDbNotifications();
  if (!email) {
    return NextResponse.json({ success: true, data: all });
  }

  const filtered = all.filter((n) => {
    const rEmail = (n.recipientEmail || n.targetEmail || "").trim().toLowerCase();
    return !rEmail || rEmail === email;
  });

  return NextResponse.json({ success: true, data: filtered });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { notification } = body || {};

    if (!notification || !notification.id) {
      return NextResponse.json(
        { success: false, message: "Notification item with ID is required" },
        { status: 400 }
      );
    }

    const all = readDbNotifications();
    const filtered = all.filter((n) => n.id !== notification.id);
    const updated = [notification, ...filtered].slice(0, 200);

    writeDbNotifications(updated);
    return NextResponse.json({ success: true, data: notification }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save notification" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, readAll, email } = body || {};

    const all = readDbNotifications();
    let updated: any[] = [];

    if (readAll) {
      const targetEmail = email ? email.trim().toLowerCase() : "";
      updated = all.map((n) => {
        const rEmail = (n.recipientEmail || n.targetEmail || "").trim().toLowerCase();
        if (!targetEmail || !rEmail || rEmail === targetEmail) {
          return { ...n, read: true, isRead: true };
        }
        return n;
      });
    } else if (id) {
      updated = all.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n));
    } else {
      updated = all;
    }

    writeDbNotifications(updated);
    return NextResponse.json({ success: true, message: "Notifications updated" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update notification" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email")?.trim().toLowerCase();
    const deleteAll = searchParams.get("all") === "true";

    const all = readDbNotifications();
    let updated: any[] = [];

    if (deleteAll) {
      if (email) {
        updated = all.filter((n) => {
          const rEmail = (n.recipientEmail || n.targetEmail || "").trim().toLowerCase();
          return rEmail && rEmail !== email;
        });
      } else {
        updated = [];
      }
    } else if (id) {
      updated = all.filter((n) => n.id !== id);
    } else {
      updated = all;
    }

    writeDbNotifications(updated);
    return NextResponse.json({ success: true, message: "Notification(s) deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete notification" },
      { status: 500 }
    );
  }
}
