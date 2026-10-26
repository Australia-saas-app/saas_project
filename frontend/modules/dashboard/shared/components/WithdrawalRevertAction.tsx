"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import AppModal from "./AppModal";
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

  const isPending = String(withdrawal.status || "").toLowerCase() === "pending";
  const isExpired = remainingMs <= 0;
  const { user } = useUser();
  const canRevert = isPending && !isExpired && !reverting;

  const handleConfirmRevert = async () => {
    if (!canRevert) return;
    setReverting(true);
    try {
      await revertWithdrawalRequest(withdrawal.id, withdrawal.amount, withdrawal.userId);

      // Record activity log with user metadata
      const uEmail = user && "email" in user && user.email ? String(user.email).trim() : "";
      const uName =
        user && "name" in user && user.name
          ? String(user.name).trim()
          : user && "fullName" in user && user.fullName
          ? String(user.fullName).trim()
          : "User";
      const uId = withdrawal.userId || (user && "id" in user ? String(user.id) : "") || uEmail || "user";
      const uRole = String((user as any)?.role || (user as any)?.accountType || "USER").toUpperCase();

      try {
        await recordRealActivity(
          "WITHDRAWAL_REVERTED",
          `Reverted withdrawal request ${withdrawal.id} (${withdrawal.amount}). Funds restored to wallet balance.`,
          {
            userId: uId,
            email: uEmail,
            name: uName,
            id: withdrawal.id,
          }
        );
      } catch {}

      // Add revert notification for user and admin
      if (typeof window !== "undefined") {
        try {
          const revertNotif = {
            id: `rev-with-${withdrawal.id}-${Date.now()}`,
            title: "Withdrawal Request Reverted",
            message: `Withdrawal request ${withdrawal.id} (${withdrawal.amount}) has been reverted and funds returned to wallet balance.`,
            time: "Just now",
            createdAt: new Date().toISOString(),
            read: false,
            type: "withdrawal_reverted",
            data: {
              requestId: withdrawal.id,
              amount: withdrawal.amount,
              userId: uId,
            },
          };

          const storageKeys = ["app_notifs_all", `app_notifs_${uId}`, `app_notifs_${uRole.toLowerCase()}`];
          if (uEmail) storageKeys.push(`app_notifs_${uEmail}`);
          storageKeys.forEach((key) => {
            try {
              const existing = JSON.parse(localStorage.getItem(key) || "[]");
              localStorage.setItem(key, JSON.stringify([revertNotif, ...existing]));
            } catch {}
          });

          // Also notify admin
          ["admin_notifications", "app_notifs_admin"].forEach((key) => {
            try {
              const existing = JSON.parse(localStorage.getItem(key) || "[]");
              localStorage.setItem(key, JSON.stringify([revertNotif, ...existing]));
            } catch {}
          });

          window.dispatchEvent(new Event("notifications_updated"));
          window.dispatchEvent(new CustomEvent("vero:log_added"));

          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("vero_channel");
            bc.postMessage({ type: "vero:log_added" });
            bc.postMessage({ type: "vero:withdrawal_updated" });
            bc.close();
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
        {/* Real-time decreasing countdown timer on top of the button (strictly only the timer numbers) */}
        {canRevert && (
          <span className="font-mono text-[10px] font-bold leading-none mb-1 tracking-tight select-none text-amber-600 dark:text-amber-400">
            {timerText}
          </span>
        )}

        {/* Revert button */}
        <button
          type="button"
          disabled={!canRevert}
          onClick={() => setConfirmOpen(true)}
          className={`inline-flex items-center justify-center rounded px-2.5 py-0.5 text-[11px] font-semibold transition-all select-none ${
            canRevert
              ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 shadow-xs cursor-pointer active:scale-95 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300"
              : "border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500"
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

      {/* Confirmation Modal */}
      <AppModal
        open={confirmOpen}
        onClose={() => {
          if (!reverting) setConfirmOpen(false);
        }}
        title="Confirm Revert Withdrawal"
        description="Are you sure you want to revert this withdrawal request?"
        size="sm"
        icon={
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <RotateCcw className="h-5 w-5" />
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              disabled={reverting}
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
            >
              No, Keep Request
            </button>
            <button
              type="button"
              disabled={reverting || !canRevert}
              onClick={handleConfirmRevert}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {reverting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Reverting...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Yes, Revert</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-3 py-1">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            By reverting, request <span className="font-mono font-bold text-gray-900 dark:text-white">{withdrawal.id}</span> will be removed, and <span className="font-bold text-emerald-600 dark:text-emerald-400">{withdrawal.amount}</span> will be immediately refunded back to your wallet balance.
          </p>

          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 text-xs space-y-1.5 dark:bg-gray-800/50 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Transaction ID:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-200">{withdrawal.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Amount to Refund:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{withdrawal.amount}</span>
            </div>
            {withdrawal.method && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Method:</span>
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{withdrawal.method}</span>
              </div>
            )}
            {canRevert && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Timer:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{timerText}</span>
              </div>
            )}
          </div>
        </div>
      </AppModal>
    </>
  );
}
