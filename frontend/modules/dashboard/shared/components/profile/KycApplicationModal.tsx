"use client";

import React, { useState } from "react";
import { X, ShieldAlert, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { applyForKyc } from "@/src/shared/server/AuthService";

interface KycApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  kycStatus: string;
  isKycVerified: boolean;
  onSuccess: () => void;
}

export default function KycApplicationModal({
  isOpen,
  onClose,
  user,
  kycStatus,
  isKycVerified,
  onSuccess
}: KycApplicationModalProps) {
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const isViewMode = kycStatus === "pending" || kycStatus === "submitted" || isKycVerified;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const res = await applyForKyc(user.rawUserId);
      if (res && res.success !== false) {
        toast.success("KYC Application submitted successfully!");
        onSuccess();
        onClose();
      } else {
        toast.error(res?.message || "Failed to submit application");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit application");
    } finally {
      setIsApplying(false);
    }
  };

  const stampColor = isKycVerified
    ? "text-green-600 border-green-600"
    : kycStatus === "rejected"
      ? "text-red-600 border-red-600"
      : "text-amber-600 border-amber-600";
  const stampText = isKycVerified ? "VERIFIED" : kycStatus === "rejected" ? "REJECTED" : "PENDING";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        style={{ maxWidth: "850px", width: "92%", margin: "0 auto" }}
        className="relative bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isViewMode ? "View KYC Application" : "KYC Application"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-10 py-8 relative bg-white dark:bg-slate-900 max-h-[70vh] overflow-y-auto">
          {isViewMode && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20 rotate-[-15deg]">
              <div className={`border-[8px] ${stampColor} rounded-lg px-8 py-4`}>
                <span className={`text-6xl font-black tracking-widest ${stampColor}`}>
                  {stampText}
                </span>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">To The System Authority</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Request for KYC approval. I hereby declare that the details furnished below are true and correct to the best of my knowledge and belief and I undertake to inform you of any changes therein, immediately.
            </p>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 w-full mb-8" />

          <div className="flex items-start gap-8 relative z-10">
            <div className="flex-1 space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Full Name</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{user.fullName || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Email Address</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{user.email || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Nationality</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{user.nationality || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">National Identity Number</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{user.nationalIdentity || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Date of Birth</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{user.dateOfBirth || "N/A"}</p>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex justify-end mb-4">
                <div className="h-28 w-28 overflow-hidden rounded-md border-4 border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-800/50">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300 dark:text-slate-600 font-bold text-2xl">
                      {(user.fullName || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">KYC Application ID</span>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {user.displayUserId ? `KYC-${user.displayUserId}` : (user.rawUserId ? `KYC-${user.rawUserId}` : "N/A")}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Application Date</span>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 w-full my-8" />

          <div className="mb-4 relative z-10">
            <h4 className="font-bold text-md text-slate-800 dark:text-slate-100 mb-3">Attached Documents</h4>
            {(() => {
              const docUrl = user.documentUrl;
              if (!docUrl && !user.documentFrontUrl) {
                return (
                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    No ID Document attached
                  </div>
                );
              }

              let front = user.documentFrontUrl || "";
              let back = user.documentBackUrl || "";
              try {
                if (!front && !back && docUrl && docUrl.startsWith("[") && docUrl.endsWith("]")) {
                  const parsed = JSON.parse(docUrl);
                  if (Array.isArray(parsed) && parsed.length >= 2) {
                    front = parsed[0];
                    back = parsed[1];
                  }
                }
              } catch(e) {}

              if (front && back) {
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Front ID</p>
                      <div className="relative group rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800/50 aspect-video w-full">
                        <a href={front} target="_blank" rel="noreferrer">
                          <img src={front} alt="Front ID Document" className="w-full h-full object-contain p-1" />
                        </a>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Back ID</p>
                      <div className="relative group rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800/50 aspect-video w-full">
                        <a href={back} target="_blank" rel="noreferrer">
                          <img src={back} alt="Back ID Document" className="w-full h-full object-contain p-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              }

              if (docUrl) {
                return (
                  <div className="relative group rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800/50 aspect-video w-full max-w-md">
                    {docUrl.toLowerCase().endsWith(".pdf") ? (
                      <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-12">
                        <FileText className="h-12 w-12 mb-2" />
                        <span className="text-sm font-medium">PDF Document</span>
                      </div>
                    ) : (
                      <a href={docUrl} target="_blank" rel="noreferrer">
                        <img src={docUrl} alt="ID Document" className="w-full h-full object-contain p-1" />
                      </a>
                    )}
                  </div>
                );
              }

              return null;
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isViewMode ? "Close" : "Cancel"}
          </button>

          {!isViewMode && (
            <button
              onClick={handleApply}
              disabled={isApplying || (!user.documentUrl && !user.documentFrontUrl)}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 min-w-[150px] justify-center"
            >
              {isApplying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {kycStatus === "rejected" ? "Re-Applying..." : "Submitting..."}</>
              ) : kycStatus === "rejected" ? (
                "Re-Apply"
              ) : (
                "Submit Application"
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
