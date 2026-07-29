"use client";

import React, { useState } from "react";
import { X, CheckCircle, ShieldAlert, FileText, Loader2 } from "lucide-react";
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

  const stampColor = isKycVerified ? "text-green-600 border-green-600" : "text-amber-600 border-amber-600";
  const stampText = isKycVerified ? "VERIFIED" : kycStatus === "rejected" ? "REJECTED" : "PENDING";

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-10 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden mb-10 mt-4 rounded-xl">
        
        {/* Top bar with close button only (no header text) */}
        <div className="flex justify-end p-4 absolute top-0 right-0 z-10">
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - A4 Document Style */}
        <div className="px-10 py-12 relative bg-white">
          
          {/* Watermark/Stamp if View Mode */}
          {isViewMode && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20 rotate-[-15deg]">
              <div className={`border-[8px] ${stampColor} rounded-lg px-8 py-4`}>
                <span className={`text-6xl font-black tracking-widest ${stampColor}`}>
                  {stampText}
                </span>
              </div>
            </div>
          )}

          {/* Document Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900 mb-2">KYC Application</h1>
            <div className="h-1 w-24 bg-slate-900 mx-auto rounded-full" />
          </div>

          {/* Declaration Text */}
          <div className="mb-10 text-slate-800">
            <p className="font-bold text-lg mb-1">To,</p>
            <p className="font-bold text-lg mb-6">The System Authority</p>
            <p className="text-sm font-medium leading-relaxed text-justify">
              Request for KYC approval. I hereby declare that the details furnished below are true and correct to the best of my knowledge and belief and I undertake to inform you of any changes therein, immediately. In case any of the above information is found to be false or untrue or misleading or misrepresenting, I am aware that I may be held liable for it and my application is subject to rejection under standard system laws.
            </p>
          </div>

          <div className="h-px bg-slate-200 w-full mb-8" />

          {/* User Data (Half page style) */}
          <div className="flex items-start gap-8">
            {/* Left side info */}
            <div className="flex-1 space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Full Name</span>
                <p className="font-bold text-slate-900 text-base">{user.fullName}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Email Address</span>
                <p className="font-bold text-slate-900 text-base">{user.email}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Nationality</span>
                <p className="font-bold text-slate-900 text-base">{user.nationality || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">National Identity Number</span>
                <p className="font-bold text-slate-900 text-base">{user.nationalIdentity || "N/A"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Date of Birth</span>
                <p className="font-bold text-slate-900 text-base">{user.dateOfBirth || "N/A"}</p>
              </div>
            </div>

            {/* Right side info & Photo */}
            <div className="flex-1 space-y-4">
              <div className="flex justify-end mb-4">
                <div className="h-32 w-32 overflow-hidden rounded-md border-2 border-slate-200 shadow-sm bg-slate-50">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      No Photo
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 uppercase">KYC Application ID</span>
                <p className="font-mono font-bold text-slate-900 text-sm">
                  {user.displayUserId ? `KYC-${user.displayUserId}` : "N/A"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 uppercase">Application Date</span>
                <p className="font-bold text-slate-900 text-sm">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200 w-full my-8" />

          {/* Attached Document Preview */}
          <div className="mb-4">
             <h4 className="font-bold text-md text-slate-900 mb-3">Attached Documents</h4>
             {user.documentFrontUrl && user.documentBackUrl ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Front ID</p>
                    <div className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video">
                      <img src={user.documentFrontUrl} alt="Front ID Document" className="absolute inset-0 w-full h-full object-contain p-1" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Back ID</p>
                    <div className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video">
                      <img src={user.documentBackUrl} alt="Back ID Document" className="absolute inset-0 w-full h-full object-contain p-1" />
                    </div>
                  </div>
                </div>
             ) : user.documentUrl ? (
                <div className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video max-w-sm">
                  {user.documentUrl.toLowerCase().endsWith(".pdf") ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                      <FileText className="h-12 w-12 mb-2" />
                      <span className="text-sm font-medium">PDF Document</span>
                    </div>
                  ) : (
                    <img src={user.documentUrl} alt="ID Document" className="absolute inset-0 w-full h-full object-contain p-1" />
                  )}
                </div>
             ) : (
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  No ID Document attached
                </div>
              )}
          </div>
        </div>

        {/* Footer Actions */}
        {!isViewMode && (
          <div className="flex items-center justify-end gap-3 px-8 py-4 bg-slate-50 border-t border-slate-200">
            <button 
              onClick={onClose}
              disabled={isApplying}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors border border-transparent"
            >
              Cancel
            </button>
            <button 
              onClick={handleApply}
              disabled={isApplying || !user.documentUrl}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isApplying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {kycStatus === 'rejected' ? 'Re-Applying...' : 'Submitting...'}</>
              ) : kycStatus === 'rejected' ? (
                "Re-Apply"
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
