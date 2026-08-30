import { NextResponse } from "next/server";
import { readPersistentData, writePersistentData } from "../persistent-storage";

export const dynamic = "force-dynamic";

const DELETED_FILE_NAME = "live-chat-deleted.json";
const MESSAGES_FILE_NAME = "live-chat-messages.json";

function readDeleted(): Record<string, string[]> {
  return readPersistentData<Record<string, string[]>>(DELETED_FILE_NAME, {});
}

function writeDeleted(data: Record<string, string[]>): void {
  writePersistentData<Record<string, string[]>>(DELETED_FILE_NAME, data);
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

    return NextResponse.json({
      success: true,
      message: "Conversation deleted for user",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
