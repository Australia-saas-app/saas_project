import { NextResponse } from "next/server";
import { readPersistentData, writePersistentData } from "../persistent-storage";

export const dynamic = "force-dynamic";

const FILE_NAME = "registered-users.json";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    const users = readPersistentData<any[]>(FILE_NAME, []);
    const formatted = users
      .filter((u) => u && (u.contact || u.email))
      .map((u) => {
        const email = (u.contact || u.email || "").toLowerCase().trim();
        const name =
          u.fullName ||
          u.name ||
          (email ? email.split("@")[0] : "User");
        let role = u.role || u.accountType || "User";
        if (role) {
          role = role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
        }
        return {
          id: u.id || `user-${email}`,
          name,
          email,
          role,
          avatar: u.avatar || u.profilePicture || "",
          phone: u.phone || "",
        };
      });

    if (!search) {
      return NextResponse.json({ success: true, data: formatted });
    }

    const filtered = formatted.filter(
      (c) =>
        c.email.includes(search) ||
        c.name.toLowerCase().includes(search) ||
        c.role.toLowerCase().includes(search)
    );

    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load users" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, role, avatar, phone, password } = body || {};

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const users = readPersistentData<any[]>(FILE_NAME, []);
    const existingIndex = users.findIndex(
      (u) => (u.contact || u.email || "").toLowerCase().trim() === cleanEmail
    );

    const newUser = {
      id: `registered-${cleanEmail.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}`,
      contact: cleanEmail,
      email: cleanEmail,
      password: password || "12345678",
      accountType: (role || "user").toLowerCase(),
      role: (role || "USER").toUpperCase(),
      fullName: name || cleanEmail.split("@")[0],
      avatar: avatar || "",
      phone: phone || "",
      currency: "USD",
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...newUser };
    } else {
      users.push(newUser);
    }

    writePersistentData<any[]>(FILE_NAME, users);

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save user" },
      { status: 500 }
    );
  }
}
