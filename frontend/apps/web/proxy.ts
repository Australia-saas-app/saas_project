import { NextRequest, NextResponse } from "next/server";

interface JwtPayload {
  id?: string;
  sub?: string;
  role?: string;
  accountType?: string;
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const json = atob(b64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(payload: JwtPayload): boolean {
  if (!payload.exp) return false;
  return Date.now() / 1000 > payload.exp;
}

function getUserRole(payload: JwtPayload | null): string {
  if (!payload) return "";
  return String(payload.role || payload.accountType || "").toUpperCase();
}

function getDashboardPrefixForRole(role: string): string {
  if (role.includes("AFFILIATE") || role.includes("AGENCY")) return "/dashboard/affiliate";
  if (role.includes("BUSINESS") || role.includes("SELLER")) return "/dashboard/business";
  return "/dashboard/user";
}

function getDashboardForRole(role: string): string {
  if (role.includes("AFFILIATE") || role.includes("AGENCY")) return "/dashboard/affiliate/dashboard";
  if (role.includes("BUSINESS") || role.includes("SELLER")) return "/dashboard/business/dashboard";
  return "/dashboard/user/dashboard";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static assets, images, and API routes instantly for maximum performance
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const rawToken = request.cookies.get("accessToken")?.value;
  let payload: JwtPayload | null = null;
  let isAuthenticated = false;

  if (rawToken) {
    payload = decodeJwtPayload(rawToken);
    if (payload && !isTokenExpired(payload)) {
      isAuthenticated = true;
    }
  }

  const isProtectedRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/user" ||
    pathname.startsWith("/user/") ||
    pathname === "/affiliate" ||
    pathname.startsWith("/affiliate/") ||
    pathname === "/business" ||
    pathname.startsWith("/business/");

  // 2. Unauthenticated protection: redirect to login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/account/user/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. RBAC: Enforce role-scoped dashboard isolation for authenticated users
  if (isAuthenticated && pathname.startsWith("/dashboard/")) {
    const role = getUserRole(payload);
    if (role && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      const allowedPrefix = getDashboardPrefixForRole(role);
      if (!pathname.startsWith(allowedPrefix)) {
        return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
