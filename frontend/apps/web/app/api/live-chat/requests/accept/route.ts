import { NextResponse } from "next/server";
import { readPersistentData, writePersistentData } from "../../persistent-storage";

export const dynamic = "force-dynamic";

const FILE_NAME = "live-chat-requests.json";

function readDbRequests(): any[] {
  return readPersistentData<any[]>(FILE_NAME, []);
}

function writeDbRequests(data: any[]): void {
  writePersistentData<any[]>(FILE_NAME, data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { requestId, userEmail } = body || {};

    if (!requestId) {
      return NextResponse.json(
        { success: false, message: "requestId is required" },
        { status: 400 }
      );
    }

    const requests = readDbRequests();
    let acceptedReq: any = null;

    const updated = requests.map((r) => {
      if (r.id === requestId) {
        acceptedReq = { ...r, status: "accepted" };
        return acceptedReq;
      }
      return r;
    });

    writeDbRequests(updated);

    return NextResponse.json({ success: true, data: acceptedReq });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to accept request" },
      { status: 500 }
    );
  }
}
