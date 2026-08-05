"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";

export function SessionExpiredLandingModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reason = searchParams.get("reason");

  const [showModalReason, setShowModalReason] = useState<string | null>(null);

  useEffect(() => {
    if (reason === "session_superseded" || reason === "inactivity") {
      setShowModalReason(reason);
    }
  }, [reason]);

  if (!showModalReason) return null;

  const handleClose = () => {
    setShowModalReason(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleLogin = () => {
    handleClose();
    router.push("/account/user/login");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 overflow-y-auto">
      <div
        style={{ width: "380px", maxWidth: "calc(100vw - 32px)" }}
        className="bg-card rounded-2xl shadow-2xl p-7 text-center mx-auto border border-border animate-in fade-in zoom-in-95 duration-200 relative"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <LogOut className="w-6 h-6 text-red-500" strokeWidth={1.8} />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Session Expired</h3>
        <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
          {showModalReason === "inactivity"
            ? "You have been logged out due to inactivity."
            : "You have been logged out because a new login was detected on another tab or device for this account role."}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-lg border border-input bg-background hover:bg-muted text-foreground text-sm font-semibold transition-colors"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleLogin}
            className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors"
          >
            Log In Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionExpiredLandingModal;
