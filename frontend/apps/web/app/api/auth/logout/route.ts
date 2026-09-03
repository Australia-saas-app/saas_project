import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { writePersistentData, readPersistentData } from "../../live-chat/persistent-storage";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let bodyEmail = "";
    try {
      const body = await req.json();
      bodyEmail = body?.email ? String(body.email).trim().toLowerCase() : "";
    } catch {}

    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value;
    let cookieEmail = "";
    if (userCookie) {
      try {
        const parsed = JSON.parse(userCookie);
        cookieEmail = (parsed?.email || parsed?.contact || "").trim().toLowerCase();
      } catch {}
    }

    const email = bodyEmail || cookieEmail;

    // 1. Mark user offline in persistent presence store
    if (email) {
      try {
        const presence = readPersistentData<Record<string, any>>("live-chat-presence.json", {});
        presence[email] = {
          isOnline: false,
          lastSeen: Date.now(),
          lastSeenFormatted: "Just now",
        };
        writePersistentData("live-chat-presence.json", presence);
      } catch {}
    }

    // 2. Clear all auth cookies via response headers
    const cookieNames = [
      "accessToken",
      "client_access_token",
      "refreshToken",
      "user",
      "next-auth.session-token",
      "next-auth.csrf-token",
      "session",
      "auth_token",
    ];

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    for (const name of cookieNames) {
      response.cookies.set({
        name,
        value: "",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        sameSite: "lax",
      });
      try {
        cookieStore.delete(name);
        cookieStore.delete({ name, path: "/" });
      } catch {}
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Logout failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
