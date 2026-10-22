"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, LogOut, UserRoundPen } from "lucide-react";
import { useUser } from "@/src/context/user.provider";
import { accountTypeFromRole, resolveDashboardAccess } from "@/src/shared/lib/verification-access";
import { logout } from "@/src/server/AuthService";

import AccountStatusBanner from "@/src/shared/components/AccountStatusBanner";

export default function DashboardVerificationGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const pathname = usePathname();
  
  // Calculate access synchronously to avoid a race condition where isLoading is false 
  // but access hasn't updated yet.
  const access = resolveDashboardAccess(user, pathname);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!access.allowed && access.reason === "auth") {
    if (access.status === "Blocked" || access.status === "Deactivated" || access.status === "Closed") {
      const accountType = accountTypeFromRole(user?.role);
      return (
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-sm">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Account {access.status}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
            {access.message}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {access.ctaHref && (
              <Link
                href={access.ctaHref}
                className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-lg shadow-sm transition-colors text-center"
              >
                {access.ctaLabel || "Proceed"}
              </Link>
            )}
            <button
              onClick={() => logout()}
              className="w-full sm:w-auto px-6 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      );
    }

    if (typeof window !== "undefined") {
      let isManualLogout = false;
      try {
        isManualLogout = sessionStorage.getItem("manual_logout") === "true";
      } catch {}

      const currentUrl = new URL(window.location.href);
      const reason = currentUrl.searchParams.get("reason");
      
      let rolePath = "user";
      if (pathname.includes("/dashboard/business") || pathname.startsWith("/business")) rolePath = "business";
      if (pathname.includes("/dashboard/affiliate") || pathname.startsWith("/affiliate")) rolePath = "affiliate";
      if (pathname.includes("/admin")) rolePath = "admin";
      
      if (isManualLogout) {
        window.location.replace(rolePath === "admin" ? "/account/admin/login" : `/account/${rolePath}/login`);
      } else {
        const returnUrl = encodeURIComponent(pathname || "/dashboard");
        const loginUrl = rolePath === "admin" 
          ? `/account/admin/login?redirect=${returnUrl}${reason ? `&reason=${reason}` : ""}`
          : `/account/${rolePath}/login?redirect=${returnUrl}${reason ? `&reason=${reason}` : ""}`;
          
        window.location.replace(loginUrl);
      }
    }
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!access.allowed) {
    const accountType = accountTypeFromRole(user?.role);
    const isProfileGate = access.reason === "profile";

    if (isProfileGate && access.ctaHref) {
      if (typeof window !== "undefined" && pathname !== access.ctaHref) {
        window.location.replace(access.ctaHref);
        return (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        );
      }
    }

    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <div
          className={[
            "mb-4 flex h-14 w-14 items-center justify-center rounded-full",
            isProfileGate ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-600",
          ].join(" ")}
        >
          {isProfileGate ? (
            <UserRoundPen className="h-7 w-7" />
          ) : (
            <ShieldAlert className="h-7 w-7" />
          )}
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {isProfileGate ? "Complete your profile" : "Verification required"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{access.message}</p>
        <p className="mt-3 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Status: {access.status === "Not submitted" ? "Pending" : access.status}
        </p>
      </div>
    );
  }

  const accountType = accountTypeFromRole(user?.role);

  return (
    <>
      <AccountStatusBanner user={user} accountType={accountType} />
      {children}
    </>
  );
}
