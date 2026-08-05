"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, LogOut, UserRoundPen } from "lucide-react";
import { useUser } from "@/src/context/user.provider";
import { accountTypeFromRole, resolveDashboardAccess } from "@/src/shared/lib/verification-access";
import { logout } from "@/src/server/AuthService";

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
    if (typeof window !== "undefined") {
      let isManualLogout = false;
      try {
        isManualLogout = sessionStorage.getItem("manual_logout") === "true";
      } catch {}

      if (isManualLogout) {
        window.location.replace("/account/user/login");
      } else {
        const returnUrl = encodeURIComponent(pathname || "/dashboard");
        window.location.replace(`/account/user/login?redirect=${returnUrl}`);
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

  return <>{children}</>;
}
