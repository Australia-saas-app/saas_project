"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export function SessionSync() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    // Only apply logic inside dashboards
    const isDashboard = pathname.includes("/dashboard/");
    if (!isDashboard) return;

    // Identify current dashboard role
    const isUserDashboard = pathname.includes("/dashboard/user");
    const isAffiliateDashboard = pathname.includes("/dashboard/affiliate");
    const isBusinessDashboard = pathname.includes("/dashboard/business");

    const currentRole: string | null = isUserDashboard 
      ? "user" 
      : isAffiliateDashboard 
        ? "agency" // backend returns agency for affiliate
        : isBusinessDashboard
          ? "business"
          : null;

    if (!currentRole) return;

    const bc = new BroadcastChannel("session-sync");
    
    const handleLock = async () => {
      setIsLocked(true);
      try {
        const { logout } = await import("@/src/shared/server/AuthService");
        await logout();
      } catch {}
      window.location.href = "/login?reason=session_superseded";
    };

    bc.onmessage = (event) => {
      if (event.data && event.data.type === "LOGIN") {
        const loginRole = event.data.role;
        const isSameRole = (loginRole === currentRole) || 
                           (loginRole === "affiliate" && currentRole === "agency") ||
                           (loginRole === "agency" && currentRole === "affiliate");
        if (isSameRole) handleLock();
      }
    };

    const checkSession = async () => {
      try {
        const { getCurrentUser } = await import("@/src/shared/server/AuthService");
        const user = await getCurrentUser();
        if (!user) {
          handleLock();
        }
      } catch (err) {}
    };

    checkSession();
    const pollInterval = setInterval(checkSession, 15000);

    return () => {
      bc.close();
      clearInterval(pollInterval);
    };
  }, [pathname]);

  return null;
}
