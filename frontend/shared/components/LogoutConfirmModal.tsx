"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";
import { deleteCookie } from "@/src/utils/cookie-utils";
import { logout } from "@/src/shared/server/AuthService";
import { useUser } from "@/src/context/user.provider";
import { toast } from "sonner";

interface LogoutConfirmModalProps {
  open: boolean;
  onClose: () => void;
  targetPath?: string;
}

export function LogoutConfirmModal({ open, onClose, targetPath = "/" }: LogoutConfirmModalProps) {
  const { user, setUser } = useUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    let accountType = "user";
    try {
      if (user) {
        accountType = ((user as any)?.accountType || (user as any)?.role || "user").toLowerCase();
        const userEmail = (user as any)?.email;
        if (userEmail) {
          try {
            const { setUserOnlineStatus } = await import("@/src/shared/lib/live-chat-store");
            setUserOnlineStatus(userEmail, false);
            if ("BroadcastChannel" in window) {
              const bc = new BroadcastChannel("platform_live_chat_rooms");
              bc.postMessage({
                type: "USER_PRESENCE",
                payload: { email: userEmail, isOnline: false },
              });
              bc.close();
            }
          } catch {}
        }
        const { recordRealActivity } = await import("@/src/shared/lib/real-activity-logger");
        await recordRealActivity(
          "USER_LOGOUT",
          "User logged out successfully",
          { userId: (user as any)?.userId || (user as any)?.id || "user", email: (user as any)?.email, name: (user as any)?.fullName }
        ).catch(() => undefined);
      }
      await logout().catch(() => undefined);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }

    // ── Security: wipe ALL client-side cookies and storage on logout ──────────────────
    const cookieNames = ["accessToken", "client_access_token", "refreshToken", "user", "next-auth.session-token"];
    cookieNames.forEach(deleteCookie);

    if (typeof window !== "undefined") {
      try {
        const deviceId = localStorage.getItem("vero_device_id");
        
        // Clear every localStorage entry
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem("manual_logout", "true");
        
        if (deviceId) {
          localStorage.setItem("vero_device_id", deviceId);
        }
      } catch {
        const knownKeys = [
          "accessToken",
          "token",
          "user_profile_overrides_v2",
          "user_profile_documents_v2",
          "user_storage_scope",
          "profile_complete",
          "profile_account_type",
        ];
        knownKeys.forEach(k => {
          try { localStorage.removeItem(k); } catch { /* ignore */ }
        });
      }

      // Broadcast logout to all other open tabs
      try {
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("vero_channel");
          bc.postMessage({ type: "USER_LOGGED_OUT" });
          bc.close();
        }
      } catch {}

      setIsLoggingOut(false);
      onClose();

      const pathname = window.location.pathname;
      const isLandingPage = pathname === "/" || pathname === "";
      if (isLandingPage) {
        window.location.href = "/";
        return;
      }

      const isAdminApp =
        window.location.port === "3001" ||
        window.location.hostname.startsWith("admin.") ||
        window.location.pathname.startsWith("/admin") ||
        window.location.pathname.startsWith("/account/admin");

      let cleanPath = "/account/user/login";
      if (isAdminApp) {
        cleanPath = "/account/admin/login";
      } else if (accountType === "affiliate" || pathname.includes("/affiliate")) {
        cleanPath = "/account/affiliate/login";
      } else if (accountType === "business" || pathname.includes("/business")) {
        cleanPath = "/account/business/login";
      }
      window.location.href = cleanPath;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4 overflow-y-auto">
      <div
        style={{ width: "340px", maxWidth: "calc(100vw - 32px)" }}
        className="bg-card rounded-2xl shadow-2xl p-7 text-center mx-auto border border-border animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Icon */}
        <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <LogOut className="w-6 h-6 text-red-500" strokeWidth={1.8} />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Confirm Logout</h3>
        <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
          Are you sure you want to log out of your session?<br />
          You will need to log in again to access the dashboard.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 bg-muted hover:bg-muted/80 rounded-xl font-semibold text-foreground text-sm transition-colors disabled:opacity-50"
          >
            No, Cancel
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl font-semibold text-white text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Logout"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default LogoutConfirmModal;
