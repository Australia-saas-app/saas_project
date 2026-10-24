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

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Withdrawal Request Details"
      description={`Transaction reference ${withdrawal.id}`}
      size="sm"
      icon={<Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
      footer={
        <div className="flex justify-end w-full">
          <Button
            type="button"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 shadow-sm"
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
                  ? "Withdrawal Failed"
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
                ? "The withdrawal could not be completed. Please check your payout details or contact support."
                : "Your withdrawal request has been submitted and is currently awaiting administrator review. Processing typically takes 1–3 business days."}
            </p>
          </div>
        </div>

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
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="font-medium text-muted-foreground">Estimated Processing</span>
              <span className="font-medium text-foreground">1–3 Business Days</span>
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
            Status updates will be notified automatically once the admin reviews your request.
          </span>
        </div>
      </div>
    </AppModal>
  );
}
