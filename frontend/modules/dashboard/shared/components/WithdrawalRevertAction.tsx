"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { revertWithdrawalRequest } from "@/src/shared/lib/wallet-store";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";
import { useUser } from "@/src/context/user.provider";

export interface WithdrawalRevertActionProps {
  withdrawal: {
    id: string;
    amount: string | number;
    method?: string;
    date?: string;
    createdAt?: string;
    status: string;
    userId?: string;
  };
  onReverted?: (id: string) => void;
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function parseStartTimeMs(createdAt?: string, date?: string): number {
  if (createdAt) {
    const ms = new Date(createdAt).getTime();
    if (!isNaN(ms) && ms > 0) return ms;
  }
  if (date) {
    const ms = new Date(date).getTime();
    if (!isNaN(ms) && ms > 0) return ms;
    const parsed = Date.parse(date);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return Date.now();
}

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "00:00:00";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function WithdrawalRevertAction({
  withdrawal,
  onReverted,
}: WithdrawalRevertActionProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const startTimeMs = useMemo(() => {
    return parseStartTimeMs(withdrawal.createdAt, withdrawal.date);
  }, [withdrawal.createdAt, withdrawal.date]);

  const [remainingMs, setRemainingMs] = useState<number>(() => {
    return Math.max(0, startTimeMs + TWENTY_FOUR_HOURS_MS - Date.now());
  });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, startTimeMs + TWENTY_FOUR_HOURS_MS - Date.now());
      setRemainingMs(diff);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startTimeMs]);

  useEffect(() => {
    if (!confirmOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !reverting) {
        setConfirmOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmOpen, reverting]);

  const isPending = String(withdrawal.status || "").toLowerCase() === "pending";
  const isExpired = remainingMs <= 0;
  const { user } = useUser();
  const canRevert = isPending && !isExpired && !reverting;

  const handleConfirmRevert = async () => {
    if (!canRevert) return;
    setReverting(true);
    try {
      await revertWithdrawalRequest(withdrawal.id, withdrawal.amount, withdrawal.userId);

      // Format amount cleanly
      const amtStr = typeof withdrawal.amount === "number"
        ? `$${withdrawal.amount.toFixed(2)}`
        : String(withdrawal.amount).startsWith("$")
        ? withdrawal.amount
        : `$${withdrawal.amount}`;

      // Resolve user metadata
      let effectiveUserId = withdrawal.userId && withdrawal.userId !== "user" ? withdrawal.userId : "";
      let effectiveEmail = user && "email" in user && user.email ? String(user.email).trim() : "";
      let effectiveName =
        user && "firstName" in user && user.firstName
          ? `${user.firstName} ${(user as any).lastName || ""}`.trim()
          : user && "name" in user && user.name
          ? String(user.name).trim()
          : user && "fullName" in user && user.fullName
          ? String(user.fullName).trim()
          : "";

      if (!effectiveUserId && user) {
        effectiveUserId = (user as any).id || (user as any).userId || (user as any)._id || (user as any).sub || "";
      }

      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("auth_user") || localStorage.getItem("user");
          if (stored) {
            const u = JSON.parse(stored);
            if (!effectiveUserId) effectiveUserId = u.id || u.userId || u._id || u.sub || "";
            if (!effectiveEmail && u.email) effectiveEmail = u.email;
            if (!effectiveName) {
              effectiveName = u.fullName || u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "";
            }
          }
        } catch {}
      }

      if (!effectiveName) effectiveName = effectiveEmail || "User";
      if (!effectiveUserId) effectiveUserId = effectiveEmail || "user";
      const uRole = String((user as any)?.role || (user as any)?.accountType || "USER").toUpperCase();

      try {
        await recordRealActivity(
          "WITHDRAWAL_REVERTED",
          `Reverted withdrawal request ${withdrawal.id} (${amtStr}). Funds restored to wallet balance.`,
          {
            userId: effectiveUserId,
            email: effectiveEmail,
            name: effectiveName,
          }
        );
      } catch (logErr) {
        console.error("Failed to record WITHDRAWAL_REVERTED log:", logErr);
      }

      // NOTE: On revert, NO bell notifications are generated (only Activity Log added).
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(new Event("wallet_updated"));
          window.dispatchEvent(new CustomEvent("vero:withdrawal_updated"));
          window.dispatchEvent(new CustomEvent("vero:log_added"));
          window.dispatchEvent(new Event("activity_logs_updated"));

          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("vero_channel");
            bc.postMessage({ type: "vero:log_added" });
            bc.postMessage({ type: "vero:withdrawal_updated" });
            bc.close();

            const bc2 = new BroadcastChannel("wallet_channel");
            bc2.postMessage({ type: "wallet_updated" });
            bc2.close();
          }
        } catch {}
      }

      toast.success(
        `Withdrawal request ${withdrawal.id} reverted. ${withdrawal.amount} restored to your balance.`
      );
      setConfirmOpen(false);
      onReverted?.(withdrawal.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to revert withdrawal request.");
    } finally {
      setReverting(false);
    }
  };

  const timerText = isPending ? formatCountdown(remainingMs) : "00:00:00";

  return (
    <>
      <div className="inline-flex flex-col items-center justify-center">
        {/* Real-time decreasing countdown timer on top of the button */}
        {canRevert && (
          <span className="font-mono text-[10px] font-bold leading-none mb-1 tracking-tight select-none text-amber-600 dark:text-amber-400">
            {timerText}
          </span>
        )}

        {/* Revert button with rich responsive hover styling */}
        <button
          type="button"
          disabled={!canRevert}
          onClick={() => setConfirmOpen(true)}
          className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all duration-150 select-none shadow-xs ${
            canRevert
              ? "border border-rose-300/80 bg-rose-50/90 text-rose-700 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md cursor-pointer active:scale-95 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white dark:hover:border-rose-600"
              : "border border-border bg-muted/50 text-muted-foreground/50 cursor-not-allowed opacity-50"
          }`}
          title={
            !isPending
              ? "Request already actioned by admin"
              : isExpired
              ? "24-hour window ended. Cannot revert."
              : "Revert request and refund money to balance"
          }
        >
          Revert
        </button>
      </div>

      {/* Confirmation Modal styled exactly like the centered Logout confirmation modal */}
      {confirmOpen && mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-3.5 sm:p-4 overflow-y-auto">
          <div
            style={{ width: "380px", maxWidth: "calc(100vw - 28px)" }}
            className="bg-card rounded-2xl shadow-2xl p-5 sm:p-7 text-center mx-auto border border-border animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Centered Circular Icon */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-rose-500/10 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5">
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 dark:text-rose-400" strokeWidth={1.8} />
            </div>

            {/* Centered Title */}
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5 sm:mb-2">
              Confirm Revert Withdrawal
            </h3>

            {/* Centered Subtitle */}
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 leading-relaxed">
              Are you sure you want to revert this withdrawal request?<br />
              <span className="text-[11px] sm:text-xs text-muted-foreground/90">
                The request will be removed, and <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{withdrawal.amount}</strong> will be refunded to your balance.
              </span>
            </p>

            {/* Structured Info Card (visible, styled with theme variables) */}
            <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-3.5 text-xs space-y-2 mb-5 sm:mb-6 text-left">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono font-semibold text-foreground">{withdrawal.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount to Refund:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{withdrawal.amount}</span>
              </div>
              {withdrawal.method && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Method:</span>
                  <span className="font-medium text-foreground truncate max-w-[190px]">{withdrawal.method}</span>
                </div>
              )}
              {canRevert && (
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-muted-foreground">Timer:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{timerText}</span>
                </div>
              )}
            </div>

            {/* Centered Side-by-Side Action Buttons */}
            <div className="flex gap-2.5 sm:gap-3">
              <button
                type="button"
                disabled={reverting}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2 sm:py-2.5 px-2 bg-muted hover:bg-muted/80 rounded-xl font-semibold text-foreground text-xs sm:text-sm transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                No, Keep
              </button>
              <button
                type="button"
                disabled={reverting || !canRevert}
                onClick={handleConfirmRevert}
                className="flex-1 py-2 sm:py-2.5 px-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl font-semibold text-white text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {reverting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                    <span>Reverting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Yes, Revert</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
