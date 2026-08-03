"use client";

import React, { useState } from "react";
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

  if (!open) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
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
        
        // Clear every localStorage entry (profile overrides, documents, scope, etc.)
        localStorage.clear();
        // Clear sessionStorage as well (any temp session values)
        sessionStorage.clear();
        
        if (deviceId) {
          localStorage.setItem("vero_device_id", deviceId);
        }
      } catch {
        // Fallback: remove known keys individually if clear() is blocked
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
      // Hard redirect — full page reload clears all in-memory React/query state
      window.location.href = targetPath;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 overflow-y-auto">
      <div
        style={{ width: "360px", maxWidth: "calc(100vw - 32px)" }}
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
    </div>
  );
}

export default LogoutConfirmModal;
