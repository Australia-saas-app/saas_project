import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_FILE = path.join(process.cwd(), "data", "live-chat-requests.json");

function readDbRequests(): any[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

function writeDbRequests(data: any[]): void {
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
