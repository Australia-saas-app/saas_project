"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AppModal from "./AppModal";
import {
  getWithdrawalEligibleMethods,
  getWithdrawalEligibleMethodsFromDb,
  type SavedPaymentMethod,
} from "@/src/shared/lib/payment-methods-store";
import { useUser } from "@/src/context/user.provider";
import { submitWithdrawalRequest } from "@/src/shared/lib/wallet-store";
import axiosInstance from "@/src/shared/lib/axiosInstance";
import { checkWithdrawalPermission } from "@/src/shared/lib/verification-access";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";
import {
  KycVerificationGateModal,
  getLiveKycStatus,
  type KycGateStatus,
} from "./KycVerificationGateModal";

export interface WithdrawRequestResult {
  amount: string;
  method: string;
  id: string;
  date: string;
  createdAt?: string;
}

interface WithdrawRequestModalProps {
  open: boolean;
  onClose: () => void;
  availableBalance: string;
  onSubmit: (result: WithdrawRequestResult) => void;
}

function getUserIdentity(user: NonNullable<ReturnType<typeof useUser>["user"]>) {
  const id =
    "id" in user && user.id
      ? String(user.id)
      : "email" in user && user.email
        ? user.email
        : "guest";
  const name =
    "firstName" in user && user.firstName
      ? `${user.firstName} ${"lastName" in user && user.lastName ? user.lastName : ""}`.trim()
      : "name" in user && user.name
        ? user.name
        : "email" in user && user.email
          ? user.email
          : "Account";
  return { id, name };
}

const MIN_WITHDRAWAL = 20;

export default function WithdrawRequestModal({
  open,
  onClose,
  availableBalance,
  onSubmit,
}: WithdrawRequestModalProps) {
  const { user } = useUser();
  const [amount, setAmount] = useState("");
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [kycGateOpen, setKycGateOpen] = useState(false);
  const [kycGateStatus, setKycGateStatus] = useState<"not_applied" | "pending" | "rejected">("not_applied");

  useEffect(() => {
    if (!open) {
      setAmount("");
      setSubmitting(false);
      return;
    }
    // 1. Instant local render
    const saved = getWithdrawalEligibleMethods();
    setMethods(saved);
    const defaultMethod = saved.find((m) => m.isDefault) ?? saved[0];
    if (defaultMethod) setSelectedMethodId(defaultMethod.id);

    // 2. Fresh fetch from database
    getWithdrawalEligibleMethodsFromDb().then((fresh) => {
      if (Array.isArray(fresh) && fresh.length > 0) {
        setMethods(fresh);
        const def = fresh.find((m) => m.isDefault) ?? fresh[0];
        if (def) setSelectedMethodId(def.id);
      }
    });
  }, [open]);

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === selectedMethodId) ?? null,
    [methods, selectedMethodId]
  );

  const totalBalance = useMemo(() => {
    return Math.max(0, parseFloat(availableBalance.replace(/[^0-9.]/g, "")) || 0);
  }, [availableBalance]);

  const trimmedInput = amount.trim();
  const hasInput = trimmedInput !== "" && !isNaN(Number(trimmedInput));
  const enteredAmount = hasInput ? parseFloat(trimmedInput) : 0;
  const remainingBalance = totalBalance - enteredAmount;

  // Validation flags
  const isInsufficient = hasInput && enteredAmount > totalBalance;
  const isBelowMin = hasInput && enteredAmount < MIN_WITHDRAWAL;
  const isValidWithdrawal = hasInput && enteredAmount >= MIN_WITHDRAWAL && enteredAmount <= totalBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) {
      toast.error("Add a payout method in your wallet before withdrawing.");
      return;
    }
    if (!user) {
      toast.error("Sign in to request a withdrawal.");
      return;
    }

    const withdrawPerm = checkWithdrawalPermission(user);
    if (!withdrawPerm.allowed) {
      toast.error(withdrawPerm.message || "Withdrawal not permitted for your account status.");
      return;
    }

    if (!hasInput || enteredAmount <= 0) {
      toast.error("Enter a valid withdrawal amount.");
      return;
    }
    if (enteredAmount < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal amount is $${MIN_WITHDRAWAL}.00.`);
      return;
    }
    if (enteredAmount > totalBalance) {
      toast.error("Insufficient balance.");
      return;
    }

    setSubmitting(true);

    // 0. Check live KYC verification status with spinner active
    const kycState = await getLiveKycStatus(user);
    if (kycState !== "approved") {
      await new Promise((r) => setTimeout(r, 550));
      setSubmitting(false);
      setKycGateStatus(kycState as "not_applied" | "pending" | "rejected");
      setKycGateOpen(true);
      return;
    }

    let backendTxId: string | null = null;

    try {
      // 1. Immediately deduct amount from wallet balance in PostgreSQL DB and record pending transaction
      const ssoRes = await axiosInstance.post("/sso/wallet/withdraw", {
        amount: enteredAmount,
        method: `${selectedMethod.type} (${selectedMethod.summary})`,
        description: `Withdrawal via ${selectedMethod.label}`,
      });
      if (ssoRes?.data?.transactionId || ssoRes?.data?.transaction?.transactionId) {
        backendTxId = ssoRes.data.transactionId || ssoRes.data.transaction?.transactionId;
      }
    } catch (ssoErr: any) {
      console.warn("SSO wallet withdraw API notice:", ssoErr?.response?.data?.message || ssoErr?.message);
      const errMsg = ssoErr?.response?.data?.message;
      if (errMsg && (errMsg.includes("Insufficient") || errMsg.includes("Minimum"))) {
        toast.error(errMsg);
        setSubmitting(false);
        return;
      }
    }

    // 2. Secondary backup request to payment service if configured
    try {
      const res = await axiosInstance.post("/payment/withdrawals/request", {
        amount: enteredAmount,
        payoutMethod: selectedMethod.label,
        stripeAccountId: selectedMethod.id,
        note: `Withdrawal via ${selectedMethod.label}`,
      });
      if (!backendTxId && (res?.data?.requestId || res?.data?.id)) {
        backendTxId = String(res.data.requestId || res.data.id);
      }
    } catch (apiErr: any) {
      console.warn("Payment live API notice:", apiErr?.response?.data?.message || apiErr?.message);
    }

    const identity = getUserIdentity(user);
    const record = submitWithdrawalRequest({
      id: backendTxId || undefined,
      userId: identity.id,
      userName: identity.name,
      amount: enteredAmount,
      methodId: selectedMethod.id,
      methodLabel: selectedMethod.label,
      methodType: selectedMethod.type,
      method: `${selectedMethod.type} · ${selectedMethod.summary}`,
    });

    // 3. Immediately notify wallet balance observers to refresh live from database
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("wallet_updated"));
    }

    // 4. Record Real Activity Log on Requester's Side (User / Business / Affiliate)
    const userRole = String((user as any)?.role || (user as any)?.accountType || "USER").toUpperCase();
    const userEmail = "email" in user && user.email ? String(user.email).trim() : "";
    try {
      recordRealActivity(
        "WITHDRAWAL_REQUESTED",
        `Requested withdrawal of $${enteredAmount.toFixed(2)} via ${selectedMethod.label} (ID: ${record.id})`,
        {
          userId: identity.id,
          email: userEmail,
          name: identity.name,
        }
      );
    } catch {}

    // 5. Add Notification for User / Business / Affiliate in their Notification Bell
    const userWalletHref = userRole.includes("BUS")
      ? "/dashboard/business/wallet"
      : userRole.includes("AFF")
      ? "/dashboard/affiliate/wallet"
      : "/dashboard/user/wallet";

    const userNotif = {
      id: `notif-with-${record.id}-${Date.now()}`,
      title: "Withdrawal Request Submitted",
      message: `Your withdrawal request of $${enteredAmount.toFixed(2)} via ${selectedMethod.label} (ID: ${record.id}) has been submitted and is pending review.`,
      time: "Just now",
      createdAt: new Date().toISOString(),
      read: false,
      href: userWalletHref,
      type: "withdrawal_requested",
    };

    if (typeof window !== "undefined") {
      try {
        const uEmail = userEmail.toLowerCase();
        const roleKey = userRole.toLowerCase();
        const storageKeys = ["app_notifs_all", `app_notifs_${identity.id}`, `app_notifs_${roleKey}`];
        if (uEmail) {
          storageKeys.push(`app_notifs_${uEmail}`);
          storageKeys.push(`app_notifs_${uEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
        }
        storageKeys.forEach((key) => {
          try {
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            localStorage.setItem(key, JSON.stringify([userNotif, ...existing]));
          } catch {}
        });
        window.dispatchEvent(new Event("notifications_updated"));
      } catch {}
    }

    // 6. Send Notification to Admin (Notification Bell & Toast Alert on Admin Side)
    const adminNotif = {
      id: `adm-with-${record.id}-${Date.now()}`,
      title: "New Withdrawal Request",
      message: `${identity.name} (${userRole}) requested a withdrawal of $${enteredAmount.toFixed(2)} via ${selectedMethod.label} (ID: ${record.id}).`,
      time: "Just now",
      createdAt: new Date().toISOString(),
      read: false,
      targetRole: "admin",
      role: "admin",
      href: "/withdrawal-requests",
      type: "withdrawal_request",
      data: {
        href: "/withdrawal-requests",
        requestId: record.id,
        amount: enteredAmount,
        userId: identity.id,
        userName: identity.name,
        role: userRole,
      },
    };

    axiosInstance
      .post("/notifications", {
        targetRole: "admin",
        role: "admin",
        title: adminNotif.title,
        message: adminNotif.message,
        type: "withdrawal_request",
        priority: "high",
        data: adminNotif.data,
      })
      .catch(() => {});

    if (typeof window !== "undefined") {
      try {
        ["admin_notifications", "app_notifs_admin"].forEach((key) => {
          try {
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            localStorage.setItem(key, JSON.stringify([adminNotif, ...existing]));
          } catch {}
        });

        localStorage.setItem("vero_notif_sync", JSON.stringify({ item: adminNotif, timestamp: Date.now() }));

        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("vero_channel");
          bc.postMessage({ type: "vero:new_notification", payload: adminNotif });
          bc.postMessage({ type: "vero:withdrawal_updated" });
          bc.postMessage({ type: "withdrawal_requested" });
          bc.close();

          const bc2 = new BroadcastChannel("wallet_channel");
          bc2.postMessage({ type: "wallet_updated" });
          bc2.close();
        }
        window.dispatchEvent(new Event("notifications_updated"));
        window.dispatchEvent(new Event("wallet_updated"));
        window.dispatchEvent(new CustomEvent("vero:withdrawal_updated"));
      } catch {}
    }

    onSubmit({
      amount: record.amount,
      method: record.method,
      id: record.id,
      date: record.date,
    });

    toast.success(`Withdrawal request submitted! Transaction ID: ${record.id}`);
    setSubmitting(false);
    onClose();
  };

  return (
    <>
      <AppModal
      open={open}
      onClose={onClose}
      title="Request Withdrawal"
      description={`Available balance: $${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      size="sm"
      icon={<Wallet className="h-5 w-5" />}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-border bg-background hover:bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="withdraw-form"
            disabled={submitting || methods.length === 0 || !isValidWithdrawal}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </button>
        </div>
      }
    >
      <form id="withdraw-form" onSubmit={handleSubmit} className="space-y-4">
        {methods.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs sm:text-sm">
              Save a payout method (Card, Bank Transfer, PayPal, Stripe, Wise, or Payoneer) using <strong>Add method</strong> on this wallet page before submitting a withdrawal.
            </p>
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-foreground">
              Payout method
            </label>
            <select
              value={selectedMethodId}
              onChange={(e) => setSelectedMethodId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground cursor-pointer"
            >
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.type} — {method.summary}
                  {method.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
            {selectedMethod && (
              <p className="mt-1.5 text-xs text-muted-foreground">{selectedMethod.label}</p>
            )}
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs sm:text-sm font-semibold text-foreground">
              Amount (USD)
            </label>
            <span className="text-xs text-muted-foreground">
              Min. withdraw: <span className="font-semibold text-foreground">${MIN_WITHDRAWAL}.00</span>
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
              $
            </span>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full rounded-lg border pl-7 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors dark:bg-card dark:text-foreground ${
                isInsufficient
                  ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : isValidWithdrawal
                    ? "border-emerald-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    : "border-input focus:border-primary focus:ring-1 focus:ring-primary"
              }`}
              required
              disabled={methods.length === 0 || submitting}
            />
          </div>

          {/* Real-time Calculation and Inline Status */}
          {hasInput ? (
            <div
              className={`mt-2.5 rounded-lg border p-3 transition-all ${
                isInsufficient
                  ? "border-red-300 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-red-900 dark:text-red-200"
                  : isValidWithdrawal
                    ? "border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                    : "border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
              }`}
            >
              {/* Formula: Total Balance - Entered Value = Remaining Value */}
              <div className="flex items-center justify-between text-xs font-mono font-medium pb-1.5 border-b border-current/10">
                <span className="opacity-80">Calculation:</span>
                <span className="font-bold tracking-tight">
                  ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} - ${enteredAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} = ${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Status Message */}
              <div className="mt-2 flex items-center justify-between text-xs">
                {isInsufficient ? (
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>Insufficient balance</span>
                  </div>
                ) : isBelowMin ? (
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>Minimum withdrawal amount is ${MIN_WITHDRAWAL}.00</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Accept to withdraw</span>
                  </div>
                )}

                <span className="text-[11px] opacity-80">
                  Remaining: <strong>${Math.max(0, remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>Total Balance: <strong className="text-foreground">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/40 dark:bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Withdrawals are immediately recorded as pending and processed by the system. The requested amount is deducted from your balance in real time.
        </div>
      </form>
    </AppModal>
    <KycVerificationGateModal
      open={kycGateOpen}
      onClose={() => setKycGateOpen(false)}
      status={kycGateStatus}
      role={(user as any)?.role || (user as any)?.accountType}
    />
    </>
  );
}
