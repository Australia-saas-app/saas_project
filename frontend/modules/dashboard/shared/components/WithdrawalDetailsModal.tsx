"use client";

import React from "react";
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";
import AppModal from "./AppModal";
import { Button } from "@/src/components/ui/button";

interface WithdrawalDetailsModalProps {
  open: boolean;
  onClose: () => void;
  withdrawal: {
    id: string;
    method: string;
    amount: string;
    date: string;
    status: string;
    rejectionReason?: string;
    failureReason?: string;
    description?: string;
    [key: string]: any;
  } | null;
}

export default function WithdrawalDetailsModal({
  open,
  onClose,
  withdrawal,
}: WithdrawalDetailsModalProps) {
  if (!withdrawal) return null;

  const isComplete = withdrawal.status === "Complete" || withdrawal.status === "Approved";
  const isFailed = withdrawal.status === "Failed" || withdrawal.status === "Rejected";
  const isPending = !isComplete && !isFailed;

  // Retrieve rejection reason from multiple resilient sources
  const rejectionReason =
    withdrawal.rejectionReason ||
    withdrawal.failureReason ||
    (withdrawal.description && withdrawal.description.includes("Rejected:")
      ? withdrawal.description.split("Rejected:")[1]?.trim()
      : "") ||
    (typeof window !== "undefined"
      ? (() => {
          try {
            const raw = localStorage.getItem("platform_wallet_withdrawals");
            if (raw) {
              const list = JSON.parse(raw);
              const found = list.find(
                (item: any) => item.id === withdrawal.id || item.requestId === withdrawal.id
              );
              return (
                found?.rejectionReason ||
                (found?.description && found.description.includes("Rejected:")
                  ? found.description.split("Rejected:")[1]?.trim()
                  : "")
              );
            }
          } catch {}
          return "";
        })()
      : "");

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Withdrawal Request Details"
      description={`Transaction reference ${withdrawal.id}`}
      size="sm"
      icon={<Wallet className="h-5 w-5 text-primary" />}
      footer={
        <div className="flex justify-end w-full">
          <Button
            type="button"
            onClick={onClose}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 shadow-sm transition-all cursor-pointer"
          >
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status card */}
        <div
          className={`rounded-xl border p-4 flex items-start gap-3 ${
            isComplete
              ? "border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
              : isFailed
              ? "border-red-500/30 bg-red-50/60 dark:bg-red-950/30 text-red-900 dark:text-red-200"
              : "border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
          }`}
        >
          {isComplete ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          ) : isFailed ? (
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          ) : (
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold">
                {isComplete
                  ? "Withdrawal Complete"
                  : isFailed
                  ? "Withdrawal Rejected"
                  : "Withdrawal Pending Admin Review"}
              </h4>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  isComplete
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : isFailed
                    ? "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                }`}
              >
                {withdrawal.status}
              </span>
            </div>
            <p className="text-xs opacity-90 leading-relaxed">
              {isComplete
                ? "The withdrawal has been verified and processed to your payout destination."
                : isFailed
                ? rejectionReason
                  ? `Your withdrawal request was rejected by admin: "${rejectionReason}". The requested amount has been refunded back into your wallet balance.`
                  : "The withdrawal request was rejected by admin. The requested amount has been refunded back into your wallet balance."
                : "Your withdrawal request has been submitted and is currently awaiting administrator review. Processing typically takes 1–3 business days."}
            </p>
          </div>
        </div>

        {/* Rejection Details Callout */}
        {isFailed && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 p-3.5 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>Reason for Rejection</span>
            </div>
            <p className="text-xs font-semibold text-red-900 dark:text-red-200 leading-relaxed pl-6">
              {rejectionReason || "Documentation verification required - funds refunded to balance"}
            </p>
            <p className="text-[11px] text-red-600 dark:text-red-400 pl-6">
              Note: The requested withdrawal amount has been restored to your available wallet balance.
            </p>
          </div>
        )}

        {/* Detailed Info Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/40 font-semibold text-xs text-foreground uppercase tracking-wider">
            Transaction Information
          </div>
          <div className="divide-y divide-border text-xs sm:text-sm">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-medium text-muted-foreground">Request ID</span>
              <span className="font-mono font-bold text-foreground">{withdrawal.id}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-medium text-muted-foreground">Amount</span>
              <span className="font-bold text-base text-blue-600 dark:text-blue-400">
                {withdrawal.amount}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-medium text-muted-foreground">Payout Method</span>
              <span className="font-semibold text-foreground text-right">{withdrawal.method}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-medium text-muted-foreground">Request Date</span>
              <span className="font-medium text-foreground">{withdrawal.date}</span>
            </div>
            {isFailed && (
              <div className="flex items-start justify-between px-4 py-2.5 bg-red-50/40 dark:bg-red-950/20">
                <span className="font-medium text-red-700 dark:text-red-400">Rejection Reason</span>
                <span className="font-semibold text-red-800 dark:text-red-300 text-right max-w-[65%] break-words">
                  {rejectionReason || "Documentation verification required"}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-medium text-muted-foreground">Estimated Processing</span>
              <span className="font-medium text-foreground">{isFailed ? "Completed (Refunded)" : "1–3 Business Days"}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-medium text-muted-foreground">Processing Fee</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">$0.00 (Free)</span>
            </div>
          </div>
        </div>

        {/* Informative Note */}
        <div className="rounded-lg bg-muted/40 border border-border px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            {isFailed
              ? "This request was rejected. The full amount has been refunded to your wallet."
              : "Status updates will be notified automatically once the admin reviews your request."}
          </span>
        </div>
      </div>
    </AppModal>
  );
}
