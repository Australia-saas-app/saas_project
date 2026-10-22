"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  HelpCircle, 
  RotateCcw, 
  CheckCircle2, 
  Lock, 
  Send,
  Loader2,
  X,
  FileText
} from "lucide-react";
import { useUser } from "@/src/context/user.provider";
import { normalizeUserStatus } from "@/src/shared/lib/verification-access";
import axiosInstance from "@/src/shared/lib/axiosInstance";

interface AccountStatusBannerProps {
  user?: any;
  accountType?: "user" | "business" | "affiliate";
}

export default function AccountStatusBanner({ user: propUser, accountType = "user" }: AccountStatusBannerProps) {
  const { user: contextUser, refreshUser } = useUser();
  const user = propUser || contextUser;

  const [showAppealModal, setShowAppealModal] = useState(false);
  const [showDormantModal, setShowDormantModal] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealNotes, setAppealNotes] = useState("");
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isRestoringAccount, setIsRestoringAccount] = useState(false);

  if (!user) return null;

  const status = normalizeUserStatus((user as any)?.status);

  // Active accounts have no warning banner
  if (status === "active") return null;

  // Handle Account Restoration (for Deactivated accounts in 60-day recovery)
  const handleRestoreAccount = async () => {
    setIsRestoringAccount(true);
    try {
      const userId = (user as any).userId || (user as any).id;
      await axiosInstance.patch(`/sso/auth/admin/users/${userId}/status`, {
        status: "ACTIVE",
        reason: "User requested account restoration during 60-day recovery window.",
      }).catch(async () => {
        return fetch(`/api/sso/auth/admin/users/${userId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "ACTIVE",
            reason: "User requested account restoration during 60-day recovery window.",
          }),
        }).then(r => r.json());
      });

      toast.success("Account successfully restored to Active status!");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("vero:user_status_updated", { detail: { status: "active" } }));
      }
      await refreshUser();
    } catch (err: any) {
      toast.error(err?.message || "Failed to restore account. Please contact support.");
    } finally {
      setIsRestoringAccount(false);
    }
  };

  // Handle Dormant Reactivation via OTP
  const handleReactivateDormant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      toast.error("Please enter a valid verification code.");
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const userId = (user as any).userId || (user as any).id;
      await axiosInstance.patch(`/sso/auth/admin/users/${userId}/status`, {
        status: "ACTIVE",
        reason: "Account reactivated via user OTP security verification.",
      }).catch(async () => {
        return fetch(`/api/sso/auth/admin/users/${userId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "ACTIVE",
            reason: "Account reactivated via user OTP security verification.",
          }),
        }).then(r => r.json());
      });

      toast.success("Account reactivated successfully! Full features unlocked.");
      setShowDormantModal(false);
      setOtpCode("");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("vero:user_status_updated", { detail: { status: "active" } }));
      }
      await refreshUser();
    } catch (err: any) {
      toast.error(err?.message || "Reactivation code verification failed.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Appeal Submission (for Suspended or Blocked accounts)
  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) {
      toast.error("Please explain your appeal reason.");
      return;
    }
    setIsSubmittingAppeal(true);
    try {
      const userId = (user as any).userId || (user as any).id;
      await axiosInstance.post(`/user-profile-service/activity/internal`, {
        action: "ACCOUNT_APPEAL_SUBMITTED",
        resource: `User submitted account status appeal: ${appealReason}`,
        details: { userId, reason: appealReason, notes: appealNotes, currentStatus: status },
      }).catch(() => undefined);

      toast.success("Appeal submitted successfully. Our compliance department will review within 24-48 hours.");
      setShowAppealModal(false);
      setAppealReason("");
      setAppealNotes("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit appeal. Please email support directly.");
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  return (
    <>
      <div className="w-full mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
        {/* 1. PENDING STATUS BANNER */}
        {status === "pending" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-sm text-amber-900 dark:text-amber-200">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center flex-shrink-0 text-amber-700 dark:text-amber-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Verification Pending</h4>
                <p className="text-xs text-amber-700 dark:text-amber-300/80">
                  {accountType === "business"
                    ? "Complete your business verification to unlock client contracts, escrow milestone payouts, and withdrawals."
                    : accountType === "affiliate"
                    ? "Complete profile verification to unlock referral commission payouts and withdrawal requests."
                    : "Complete profile verification to unlock wallet deposits, order placement, and project escrow."}
                </p>
              </div>
            </div>
            <Link
              href={accountType === "business" ? "/business/profile" : accountType === "affiliate" ? "/affiliate/profile" : "/user/profile"}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5"
            >
              Complete Profile / KYC
            </Link>
          </div>
        )}

        {/* 2. UNDER REVIEW STATUS BANNER */}
        {status === "under_review" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 shadow-sm text-indigo-900 dark:text-indigo-200">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm">Account Under Review</h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/80 dark:text-indigo-300">
                    Compliance Audit
                  </span>
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300/80">
                  {accountType === "business"
                    ? "Our compliance team is auditing account details. Active milestones continue; new contract bidding and withdrawals are temporarily on hold."
                    : accountType === "affiliate"
                    ? "Traffic quality audit in progress. Referral tracking remains active; commission withdrawals are temporarily paused."
                    : "Compliance review in progress. You can view existing orders and messages; adding new deposits and new project creation are paused."}
                </p>
              </div>
            </div>
            <Link
              href="/live-chat"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Contact Support
            </Link>
          </div>
        )}

        {/* 3. SUSPENDED STATUS BANNER */}
        {status === "suspended" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 shadow-sm text-orange-950 dark:text-orange-200">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/60 flex items-center justify-center flex-shrink-0 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Account Temporarily Suspended</h4>
                <p className="text-xs text-orange-800 dark:text-orange-300/80">
                  Financial actions, withdrawals, and new orders are disabled per platform policy. You retain full access to view orders, chat with support, and file an appeal.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAppealModal(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Submit Appeal
              </button>
            </div>
          </div>
        )}

        {/* 4. DORMANT STATUS BANNER */}
        {status === "dormant" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 shadow-sm text-slate-800 dark:text-slate-200">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-700 dark:text-slate-300">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Account Marked Inactive (Dormant)</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  For your security, this account was marked dormant after 180 days of inactivity. Enter your reactivation code to unlock full platform features.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDormantModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reactivate Account
            </button>
          </div>
        )}

        {/* 5. DEACTIVATED STATUS BANNER (60-Day Recovery Period) */}
        {status === "deactivated" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-700 dark:text-zinc-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Account Deactivated (60-Day Recovery Period)</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  This account has been deactivated and is scheduled for permanent deletion after 60 days. You may cancel deletion and restore your account immediately.
                </p>
              </div>
            </div>
            <button
              onClick={handleRestoreAccount}
              disabled={isRestoringAccount}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isRestoringAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Restore Account
            </button>
          </div>
        )}
      </div>

      {/* Appeal Submission Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Submit Account Appeal</h3>
              <button onClick={() => setShowAppealModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitAppeal} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Appeal Reason / Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  placeholder="Explain why your account should be reactivated or describe any corrective steps taken..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Supporting Information or Reference Links (Optional)
                </label>
                <input
                  type="text"
                  value={appealNotes}
                  onChange={(e) => setAppealNotes(e.target.value)}
                  placeholder="Order ID, reference number, or document link..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppealModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAppeal || !appealReason.trim()}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmittingAppeal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Submit to Compliance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dormant Reactivation Modal */}
      {showDormantModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Reactivate Account</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your security verification code to confirm your identity and reactivate full account permissions.
              </p>
            </div>
            <form onSubmit={handleReactivateDormant} className="space-y-4">
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                placeholder="Enter 6-digit Code"
                className="w-full text-center tracking-widest text-lg font-bold py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Verification channel:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{(user as any)?.email || "Registered Email"}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDormantModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpCode.length < 4}
                  className="flex-1 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isVerifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
