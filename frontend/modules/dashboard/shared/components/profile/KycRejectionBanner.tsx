"use client";

import React from "react";
import { AlertTriangle, FileX, CameraOff, UserX, ArrowRight } from "lucide-react";

export interface KycRejectionReasons {
  documentsNotVerified?: boolean;
  livenessNotVerified?: boolean;
  personalData?: boolean;
  personalDataDetails?: string;
}

export function parseKycRejectionReasons(user: any): KycRejectionReasons | null {
  if (!user) return null;

  // 1. Direct from kycApplicationData (saved in DB kyc_application table)
  const snap = typeof user.kycApplicationData === "string"
    ? (() => { try { return JSON.parse(user.kycApplicationData); } catch { return null; } })()
    : user.kycApplicationData;

  if (snap?.rejectionReasons) {
    return snap.rejectionReasons;
  }

  // 2. Direct from user.kycRejectionReasons
  if (user.kycRejectionReasons) {
    return typeof user.kycRejectionReasons === "string"
      ? (() => { try { return JSON.parse(user.kycRejectionReasons); } catch { return null; } })()
      : user.kycRejectionReasons;
  }

  // 3. From user.kycRejectionReason (stored as JSON string)
  if (user.kycRejectionReason && typeof user.kycRejectionReason === "string") {
    try {
      const parsed = JSON.parse(user.kycRejectionReason);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // plain text string fallback
    }
  }

  return null;
}

interface KycRejectionBannerProps {
  user: any;
  onReApply?: () => void;
  className?: string;
}

export default function KycRejectionBanner({ user, onReApply, className = "" }: KycRejectionBannerProps) {
  const reasons = parseKycRejectionReasons(user);

  const hasDocsReason = Boolean(reasons?.documentsNotVerified);
  const hasLivenessReason = Boolean(reasons?.livenessNotVerified);
  const hasPersonalDataReason = Boolean(reasons?.personalData);

  const hasAnyStructuredReason = hasDocsReason || hasLivenessReason || hasPersonalDataReason;

  return (
    <div className={`rounded-xl border border-red-500/30 bg-red-500/10 dark:bg-red-950/30 p-4 sm:p-5 text-red-900 dark:text-red-100 ${className}`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="h-9 w-9 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="text-sm sm:text-base font-bold text-red-700 dark:text-red-400">
              KYC Application Rejected
            </h4>

            {hasAnyStructuredReason ? (
              <div className="space-y-2 pt-0.5">
                <p className="text-xs text-red-600/90 dark:text-red-300/90 font-medium">
                  Your application was reviewed and rejected for the following reason{((Number(hasDocsReason) + Number(hasLivenessReason) + Number(hasPersonalDataReason)) > 1) ? "s" : ""}:
                </p>

                <div className="space-y-1.5 pt-0.5">
                  {hasDocsReason && (
                    <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300 bg-red-500/10 dark:bg-red-900/30 px-3 py-2 rounded-lg border border-red-500/20">
                      <FileX className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <div>
                        <strong className="font-bold">Documents not Verified:</strong> Please check and reupload again
                      </div>
                    </div>
                  )}

                  {hasLivenessReason && (
                    <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300 bg-red-500/10 dark:bg-red-900/30 px-3 py-2 rounded-lg border border-red-500/20">
                      <CameraOff className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <div>
                        <strong className="font-bold">Liveness not verified:</strong> Not verified capture again
                      </div>
                    </div>
                  )}

                  {hasPersonalDataReason && (
                    <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300 bg-red-500/10 dark:bg-red-900/30 px-3 py-2 rounded-lg border border-red-500/20">
                      <UserX className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <div>
                        <strong className="font-bold">Personal Data:</strong>{" "}
                        <span>{reasons?.personalDataDetails || "Information missing or incorrect. Please review and update."}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-red-600/90 dark:text-red-300/90">
                {typeof user?.kycRejectionReason === "string" && !user.kycRejectionReason.startsWith("{")
                  ? user.kycRejectionReason
                  : "Your KYC application was rejected. Please review your information and re-upload clear documents, then re-apply."}
              </p>
            )}
          </div>
        </div>

        {onReApply && (
          <button
            type="button"
            onClick={onReApply}
            className="shrink-0 self-end sm:self-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Re Apply KYC</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
