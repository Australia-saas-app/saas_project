"use client";

import React, { useState } from "react";
import { X, ShieldAlert, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { applyForKyc } from "@/src/shared/server/AuthService";
import { saveProfileOverrides, getProfileOverrides } from "@/src/shared/utils/profile-storage";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";

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
  onSuccess,
}: KycApplicationModalProps) {
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const isViewMode =
    kycStatus === "pending" || kycStatus === "submitted" || isKycVerified;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const targetUid = user.userId || user.id || user.rawUserId || "self";
      const res = await applyForKyc(targetUid);
      if (res && res.success !== false) {
        toast.success("KYC Application submitted successfully!");

        const uid = user.rawUserId || targetUid;
        saveProfileOverrides(uid, { kycStatus: "pending", resubmitted: true, unverifiedByAdmin: false });
        if (user.updateProfile) {
          await user.updateProfile({ kycStatus: "pending" }).catch(() => {});
        }

        // Record Real Activity Log
        recordRealActivity(
          "KYC_SUBMITTED",
          "Submitted KYC verification application documents for review",
          { email: user.email, userId: uid }
        );

        // Broadcast to admin side and other tabs
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("vero:kyc_updated", { detail: { userId: uid, kycStatus: "pending" } }));
          try {
            if ("BroadcastChannel" in window) {
              const bc = new BroadcastChannel("vero_channel");
              bc.postMessage({ type: "vero:kyc_updated", userId: uid, kycStatus: "pending" });
              bc.close();
            }
          } catch {}
          try {
            localStorage.setItem("vero_kyc_sync", JSON.stringify({ userId: uid, kycStatus: "pending", t: Date.now() }));
          } catch {}
        }

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
    ? "text-green-600 border-green-600 dark:text-green-400 dark:border-green-400"
    : kycStatus === "rejected"
    ? "text-red-600 border-red-600 dark:text-red-400 dark:border-red-400"
    : "text-amber-600 border-amber-600 dark:text-amber-400 dark:border-amber-400";

  const stampText = isKycVerified
    ? "VERIFIED"
    : kycStatus === "rejected"
    ? "REJECTED"
    : "PENDING";

  /* ---- Document rendering helper ---- */
  const renderDocuments = () => {
    const docUrl = user.documentUrl;
    const hasDoc = docUrl || user.documentFrontUrl;

    if (!hasDoc) {
      return (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          No ID Document attached. Please upload your ID document before applying.
        </div>
      );
    }

    let front = user.documentFrontUrl || "";
    let back = user.documentBackUrl || "";
    try {
      if (!front && !back && docUrl?.startsWith("[") && docUrl?.endsWith("]")) {
        const parsed = JSON.parse(docUrl);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          front = parsed[0];
          back = parsed[1];
        } else if (Array.isArray(parsed) && parsed.length === 1) {
          front = parsed[0];
        }
      }
    } catch {}

    if (!front) front = docUrl || "";

    const imgClass =
      "w-full h-full object-contain hover:scale-105 transition-transform duration-200 cursor-pointer";
    const wrapClass =
      "rounded-xl border border-border dark:border-slate-700 overflow-hidden bg-muted dark:bg-slate-800/60 aspect-video w-full";

    const renderImg = (src: string, alt: string) =>
      src.toLowerCase().endsWith(".pdf") ? (
        <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
          <FileText className="h-10 w-10 mb-2" />
          <span className="text-sm font-medium">PDF Document</span>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="mt-2 text-xs underline text-primary"
          >
            Open PDF
          </a>
        </div>
      ) : (
        <a href={src} target="_blank" rel="noreferrer" className="block h-full">
          <img src={src} alt={alt} className={imgClass} />
        </a>
      );

    if (front && back) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Front ID</p>
            <div className={wrapClass}>{renderImg(front, "Front ID Document")}</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Back ID</p>
            <div className={wrapClass}>{renderImg(back, "Back ID Document")}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID Document</p>
        <div className={`${wrapClass} max-w-sm`}>{renderImg(front, "ID Document")}</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        style={{ maxWidth: "850px", width: "92%", margin: "0 auto" }}
        className="relative bg-background border border-border shadow-2xl overflow-hidden rounded-2xl my-6"
      >
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border bg-muted/40">
          <h3 className="text-xl font-bold text-foreground tracking-tight">
            {isViewMode ? "View KYC Application" : "KYC Application"}
          </h3>
          <button
            onClick={onClose}
            disabled={isApplying}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Body ─── */}
        <div className="px-10 py-8 relative bg-background max-h-[70vh] overflow-y-auto">
          {/* Watermark stamp */}
          {isViewMode && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.08] rotate-[-15deg] z-0">
              <div className={`border-[8px] ${stampColor} rounded-lg px-8 py-4`}>
                <span className={`text-6xl font-black tracking-widest ${stampColor}`}>
                  {stampText}
                </span>
              </div>
            </div>
          )}

          {/* Preamble / Formal Application Format */}
          <div className="mb-8 relative z-10 space-y-3">
            <div>
              <p className="font-bold text-base text-foreground">To</p>
              <p className="font-bold text-base text-foreground pl-6">The System Administrator</p>
            </div>
            <p className="font-bold text-sm text-foreground pt-1">
              <span className="underline">Subject</span>: Request for KYC Verification & Approval
            </p>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed pl-6">
              I hereby declare that the details furnished below are true and correct to the best of my knowledge and belief and I undertake to inform you of any changes therein, immediately. In case any of the above information is found to be false or untrue or misleading or misrepresenting, I am aware that I may be held liable for it and my application is subject to rejection under standard system laws.
            </p>
          </div>

          <div className="h-px bg-border w-full mb-8" />

          {/* Details grid */}
          {(() => {
            const snap = user.kycApplicationData || {};
            const displayFullName = snap.fullName || user.fullName;
            const displayEmail = snap.email || user.email;
            const displayNationality = snap.nationality || user.nationality;
            const displayGovtIdType = snap.governmentIdType || user.governmentIdType || "NID";
            const displayGovtId = snap.governmentId || user.nationalIdentity;
            const displayDob = snap.dateOfBirth || user.dateOfBirth;
            const displayPermAddress = (() => {
              let addr = snap.permanentAddress || user.permanentAddress;
              if (!addr && typeof window !== "undefined") {
                try {
                  const o = getProfileOverrides(user.rawUserId || user.userId || user.id);
                  addr = o.permanentAddress;
                } catch {}
              }
              if (typeof addr === "string") {
                try {
                  return JSON.parse(addr);
                } catch {
                  return { address: addr };
                }
              }
              return addr || {};
            })();
            const displayAccountType = (() => {
              const rawType = String(snap.accountType || user.accountType || user.accountLabel || user.role || "user").toLowerCase();
              if (rawType.includes("agency") || rawType.includes("affiliate")) return "Affiliate";
              if (rawType.includes("business")) return "Business";
              return "User";
            })();
            const displayAppliedAt = snap.appliedAt ? new Date(snap.appliedAt).toLocaleDateString() : new Date().toLocaleDateString();

            return (
              <>
                <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8 relative z-10">
                  {/* Left col */}
                  <div className="flex-1 space-y-4 w-full">
                    {[
                      { label: "Account ID", value: user.displayUserId || user.rawUserId || user.id },
                      { label: "Full Name", value: displayFullName },
                      { label: "Email Address", value: displayEmail },
                      { label: "Account Type", value: displayAccountType },
                      { label: "Nationality", value: displayNationality },
                      { label: "Government ID Type", value: displayGovtIdType },
                      { label: "Government ID", value: displayGovtId },
                      { label: "Date of Birth", value: displayDob },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">
                          {label}
                        </span>
                        <p className={`font-bold text-foreground text-sm sm:text-base ${label === "Account ID" ? "font-mono" : ""}`}>{value || "N/A"}</p>
                      </div>
                    ))}
                  </div>

                  {/* Right col */}
                  <div className="flex-1 space-y-4 w-full">
                    {/* Profile photo */}
                    <div className="flex sm:justify-end mb-4">
                      <div className="h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-md border-4 border-border shadow-sm bg-muted">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold text-2xl">
                            {(displayFullName || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">
                        KYC Application ID
                      </span>
                      <p className="font-mono font-bold text-foreground text-sm">
                        {user.displayUserId
                          ? `KYC-${user.displayUserId}`
                          : user.rawUserId
                          ? `KYC-${user.rawUserId}`
                          : "N/A"}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">
                        Application Date
                      </span>
                      <p className="font-bold text-foreground text-sm">
                        {displayAppliedAt}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border w-full my-6" />

                {/* Permanent Address Section */}
                <div className="mb-6 relative z-10">
                  <h4 className="font-bold text-base text-foreground mb-3 uppercase tracking-wide text-xs">Permanent Address</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border border-border bg-muted/20">
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">Country</span>
                      <p className="font-bold text-foreground text-xs sm:text-sm">{displayPermAddress?.country || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">City</span>
                      <p className="font-bold text-foreground text-xs sm:text-sm">{displayPermAddress?.city || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">State</span>
                      <p className="font-bold text-foreground text-xs sm:text-sm">{displayPermAddress?.state || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">Zip Code</span>
                      <p className="font-bold text-foreground text-xs sm:text-sm">{displayPermAddress?.zipCode || "N/A"}</p>
                    </div>
                    <div className="sm:col-span-2 md:col-span-4 mt-2 border-t border-border/50 pt-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">Address</span>
                      <p className="font-medium text-foreground text-xs sm:text-sm leading-relaxed">{displayPermAddress?.address || "N/A"}</p>
                    </div>
                  </div>
                </div>
                  <div className="h-px bg-border w-full my-6" />

                  {/* Documents */}
                  <div className="mb-4 relative z-10">
                    <h4 className="font-bold text-base text-foreground mb-3">Attached Documents</h4>
                    {renderDocuments()}
                  </div>

                  {/* Applicant Signature Section */}
                  <div className="mt-8 pt-4 flex justify-end relative z-10">
                    <div className="text-right space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Applicant Signature
                      </span>
                      <p className="font-serif italic font-bold text-xl text-primary tracking-wide border-b-2 border-primary/40 pb-1 px-6 inline-block">
                        {displayFullName || "Applicant Signature"}
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground pt-1">
                        Verified Digital Signee — {displayEmail || displayFullName}
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

        {/* ─── Footer ─── */}
        <div className="flex items-center justify-end gap-3 px-8 py-4 bg-muted/40 border-t border-border">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isViewMode ? "Close" : "Cancel"}
          </button>

          {!isViewMode && (
            <button
              onClick={handleApply}
              disabled={isApplying || (!user.documentUrl && !user.documentFrontUrl)}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 min-w-[150px] justify-center"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {kycStatus === "rejected" ? "Re-Applying..." : "Submitting..."}
                </>
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
