/**
 * Next.js Proxy – Route Protection & RBAC
 *
 * Replaces the deprecated middleware.ts convention (Next.js 16+).
 * Primary runtime target is Node (standalone / GCP VM).
 */
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/affiliate", "/user", "/business"];

const AUTH_PREFIXES = ["/account"];

/** Auth pages that remain accessible while logged in. */
const AUTH_ROUTE_EXCEPTIONS: string[] = [];

function isAuthRouteException(pathname: string): boolean {
  if (AUTH_ROUTE_EXCEPTIONS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  return /^\/account\/(user|affiliate|business)\/pending-verification$/.test(pathname);
}

/** Public paths that require authentication (business-only where noted). */
const AUTH_GATED_PATHS = ["/courses/create"];

type UserRole = "USER" | "BUYER" | "SELLER" | "AFFILIATE" | "AGENCY" | "ADMIN" | "SUPER_ADMIN" | "BUSINESS" | string;

const ROLE_DASHBOARD_PREFIX: Record<string, string> = {
  AFFILIATE: "/dashboard/affiliate",
  AGENCY: "/dashboard/affiliate",
  BUSINESS: "/dashboard/business",
  SELLER: "/dashboard/business",
  USER: "/dashboard/user",
  BUYER: "/dashboard/user",
};

function getDashboardForRole(role?: UserRole): string {
  const normalized = (role || "").toUpperCase();
  if (normalized.includes("AFFILIATE") || normalized.includes("AGENCY")) return "/dashboard/affiliate/dashboard";
  if (normalized.includes("BUSINESS") || normalized.includes("SELLER")) return "/dashboard/business/dashboard";
  return "/dashboard/user/dashboard";
}

function getDashboardPrefixForRole(role?: UserRole): string {
  const normalized = (role || "").toUpperCase();
  if (normalized.includes("AFFILIATE") || normalized.includes("AGENCY")) return "/dashboard/affiliate";
  if (normalized.includes("BUSINESS") || normalized.includes("SELLER")) return "/dashboard/business";
  return "/dashboard/user";
}

function isBusinessRole(role?: UserRole): boolean {
  const normalized = role?.toUpperCase();
  return normalized === "SELLER" || normalized === "BUSINESS";
}

function isRoleScopedDashboardRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard/") ||
    pathname === "/affiliate" ||
    pathname.startsWith("/affiliate/") ||
    pathname === "/user" ||
    pathname.startsWith("/user/") ||
    pathname === "/business" ||
    pathname.startsWith("/business/")
  );
}

interface JwtPayload {
  id?: string;
  role?: UserRole;
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

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (matchesPrefix(pathname, ["/_next", "/favicon", "/api", "/newLogo", "/placeholder"])) {
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

  const isProtectedRoute = matchesPrefix(pathname, PROTECTED_PREFIXES);
  const isAuthRoute = matchesPrefix(pathname, AUTH_PREFIXES);
  const isAuthGatedPublic = matchesPrefix(pathname, AUTH_GATED_PATHS);

  if ((isProtectedRoute || isAuthGatedPublic) && !isAuthenticated) {
    const loginUrl = new URL("/account/user/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthGatedPublic && isAuthenticated) {
    if (!isBusinessRole(payload?.role)) {
      return NextResponse.redirect(new URL("/courses", request.url));
    }
    return NextResponse.redirect(new URL("/business/courses/create", request.url));
  }

  if (isAuthRoute && isAuthenticated && !isAuthRouteException(pathname)) {
    const dashboard = getDashboardForRole(payload?.role);
    return NextResponse.redirect(new URL(dashboard, request.url));
  }

  if (isAuthenticated && isRoleScopedDashboardRoute(pathname)) {
    const allowedPrefix = getDashboardPrefixForRole(payload?.role);
    if (!pathname.startsWith(allowedPrefix)) {
      return NextResponse.redirect(new URL(getDashboardForRole(payload?.role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
