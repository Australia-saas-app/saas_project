"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";
import { logout } from "@/src/shared/server/AuthService";
import { useUser } from "@/src/context/user.provider";
import { toast } from "sonner";

interface LogoutConfirmModalProps {
  open: boolean;
  onClose: () => void;
  targetPath?: string;
}

export function LogoutConfirmModal({ open, onClose, targetPath = "/" }: LogoutConfirmModalProps) {
  const { setUser } = useUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { recordRealActivity } = await import("@/src/shared/lib/real-activity-logger");
      await recordRealActivity(
        "USER_LOGOUT",
        "User logged out successfully",
        { userId: (setUser as any)?.userId || "user" }
      ).catch(() => undefined);
      await logout();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
    setIsLoggingOut(false);
    onClose();

    // ── Security: wipe ALL client-side storage on logout ──────────────────
    // No cached profile, KYC, session or auth data should remain in the browser.
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

      const cleanPath = isAdminApp ? "/account/admin/login" : "/account/user/login";
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
