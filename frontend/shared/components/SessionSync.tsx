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
    
    bc.onmessage = (event) => {
      if (event.data && event.data.type === "LOGIN") {
        const loginRole = event.data.role;
        // If another tab logs into the SAME role, we are locked out
        // "agency" and "affiliate" are technically the same portal role
        const isSameRole = (loginRole === currentRole) || 
                           (loginRole === "affiliate" && currentRole === "agency") ||
                           (loginRole === "agency" && currentRole === "affiliate");
        
        if (isSameRole) {
          setIsLocked(true);
        }
      }
    };

    // Polling backend to check for session validity (cross-device logout)
    const pollInterval = setInterval(async () => {
      try {
        const { getCurrentUser } = await import("@/src/shared/server/AuthService");
        const user = await getCurrentUser();
        if (!user) {
          // backend session is invalidated, show popup
          setIsLocked(true);
        }
      } catch (err) {}
    }, 15000);

    return () => {
      bc.close();
      clearInterval(pollInterval);
    };
  }, [pathname]);

  const handleClose = async () => {
    // Clear frontend state
    try {
      const { logout } = await import("@/src/shared/server/AuthService");
      await logout();
    } catch {}
    
    // Hard reload and redirect to login page
    window.location.href = "/login";
  };

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 overflow-y-auto">
      <div
        style={{ width: "360px", maxWidth: "calc(100vw - 32px)" }}
        className="bg-card rounded-2xl shadow-2xl p-7 text-center mx-auto border border-border animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <LogOut className="w-6 h-6 text-red-500" strokeWidth={1.8} />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Session Expired</h3>
        <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
          You have been logged out of this tab because a new login was detected on another tab or device for this account role.
        </p>
        <Button onClick={handleClose} className="w-full font-semibold">
          Go to Login
        </Button>
      </div>
    </div>
  );
}
