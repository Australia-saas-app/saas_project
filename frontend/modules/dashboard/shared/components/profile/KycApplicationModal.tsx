"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldAlert, FileText, Loader2, Camera, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { applyForKyc } from "@/src/shared/server/AuthService";
import { saveProfileOverrides, getProfileOverrides } from "@/src/shared/utils/profile-storage";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";
import KycRejectionBanner from "./KycRejectionBanner";

interface KycApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  kycStatus: string;
  isKycVerified: boolean;
  onSuccess: () => void;
  initialLivePhoto?: string | null;
  onRetakeLivePhoto?: () => void;
}

export default function KycApplicationModal({
  isOpen,
  onClose,
  user,
  kycStatus,
  isKycVerified,
  onSuccess,
  initialLivePhoto,
  onRetakeLivePhoto,
}: KycApplicationModalProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [livePhoto, setLivePhoto] = useState<string | null>(initialLivePhoto || null);

  useEffect(() => {
    if (initialLivePhoto) {
      setLivePhoto(initialLivePhoto);
    }
  }, [initialLivePhoto]);

  if (!isOpen) return null;

  const isViewMode =
    kycStatus === "pending" || kycStatus === "submitted" || isKycVerified;

  const effectivePhoto = livePhoto || user.avatarUrl || user.profilePhoto;

  const handleApply = async () => {
    if (!isViewMode) {
      const missing: string[] = [];
      const hasPhoto = Boolean(effectivePhoto);
      const hasFrontDoc = Boolean(user.documentFrontUrl || user.documentUrl);
      const hasBackDoc = Boolean(user.documentBackUrl);
      const isDualDoc =
        user.documentUrl?.startsWith("[") ||
        Boolean(user.documentFrontUrl && user.documentBackUrl) ||
        (user.governmentIdType || user.idType) !== "Passport";

      if (!hasPhoto) missing.push("Live Face Capture");
      if (!user.fullName?.trim()) missing.push("Full Name");
      if (!user.phone?.trim() && !user.email?.trim()) missing.push("Phone or Email");
      if (!user.dateOfBirth) missing.push("Date of Birth");
      if (!user.nationality?.trim()) missing.push("Nationality");
      if (!user.governmentId?.trim() && !user.nationalIdentity?.trim()) missing.push("ID Number");

      // Mandatory Address validation
      const uid = user.rawUserId || user.userId || user.id;
      const addr = user.permanentAddress || (getProfileOverrides(uid) as any)?.permanentAddress;
      const hasCountry = Boolean(addr?.country?.trim());
      const hasState = Boolean(addr?.state?.trim());
      const hasCity = Boolean(addr?.city?.trim());
      const hasStreet = Boolean(addr?.address?.trim());
      if (!hasCountry || !hasState || !hasCity || !hasStreet) {
        missing.push("Permanent Address (Country, State, City, Street Address)");
      }

      if (!hasFrontDoc) missing.push("Front ID Document");
      if (isDualDoc && !hasBackDoc) missing.push("Back ID Document");

      const isBusiness = String(user.accountType || user.accountLabel || user.role || "").toLowerCase().includes("business");
      if (isBusiness) {
        const bName = (user as any).businessName || (user as any).businessInfo?.businessName;
        const bType = (user as any).businessType || (user as any).businessInfo?.businessIndustry;
        if (!bName || !bName.trim()) missing.push("Business Name");
        if (!bType || !bType.trim()) missing.push("Business Type");
      }

      if (missing.length > 0) {
        toast.error(`Please complete the following before applying for KYC: ${missing.join(", ")}`);
        return;
      }
    }

    setIsApplying(true);
    try {
      const targetUid = user.userId || user.id || user.rawUserId || "self";
      const uid = user.rawUserId || targetUid;
      const isBusiness = String(user.accountType || user.accountLabel || user.role || "").toLowerCase().includes("business") || String(user.role || "").toLowerCase() === "seller";
      const snapData = {
        fullName: user.fullName,
        email: user.email,
        gender: user.gender,
        nationality: user.nationality,
        governmentId: user.nationalIdentity || user.governmentId,
        governmentIdType: user.governmentIdType || (getProfileOverrides(uid) as any).governmentIdType || "NID",
        dateOfBirth: user.dateOfBirth,
        permanentAddress: user.permanentAddress,
        idDocument: user.documentUrl || user.idDocument,
        documentFrontUrl: user.documentFrontUrl,
        documentBackUrl: user.documentBackUrl,
        avatarUrl: effectivePhoto,
        livePhotoUrl: effectivePhoto,
        isLiveCapture: Boolean(livePhoto),
        accountType: isBusiness ? "business" : (user.accountType || user.role || "user"),
        role: isBusiness ? "business" : (user.role || "user"),
        // Business KYC Details Snapshot (Strictly for Business Accounts)
        ...(isBusiness ? {
          businessName: (user as any).businessName || (user as any).businessInfo?.businessName || "",
          businessType: (user as any).businessType || (user as any).businessInfo?.businessIndustry || (user as any).businessInfo?.businessType || "",
          commissionRate: (user as any).percentageRate || (user as any).commissionRate || 20,
          percentageRate: (user as any).percentageRate || (user as any).commissionRate || 20,
        } : {}),
        appliedAt: new Date().toISOString(),
      };
      const res = await applyForKyc(targetUid, snapData);
      if (res && res.success !== false) {
        toast.success("KYC Application submitted successfully!");

        saveProfileOverrides(uid, {
          kycStatus: "pending",
          kycApplicationData: snapData,
          avatarUrl: effectivePhoto,
          resubmitted: true,
          unverifiedByAdmin: false,
          rejectionReasons: null,
          kycRejectionReasons: null,
          kycRejectionReason: null
        });
        if (user.updateProfile) {
          await user.updateProfile({
            kycStatus: "pending",
            kycApplicationData: snapData,
            avatarUrl: effectivePhoto,
            kycRejectionReasons: null,
            kycRejectionReason: null
          }).catch(() => {});
        }

        // Record Real Activity Log
        await recordRealActivity(
          "KYC_SUBMITTED",
          "Submitted KYC verification application documents for review",
          { email: user.email, userId: uid, name: user.fullName || user.firstName || "User" }
        ).catch(() => {});

        // Dispatch notification to Admin
        try {
          const notifItem = {
            id: `notif-kyc-${Date.now()}`,
            title: "New KYC Verification Application",
            description: `${user.fullName || user.email || "User"} submitted KYC verification documents for approval.`,
            time: "Just now",
            read: false,
            href: "/admin/users",
            type: "kyc_application",
          };
          ["app_notifs_admin", "admin_notifications"].forEach((k) => {
            const existing = JSON.parse(localStorage.getItem(k) || "[]");
            localStorage.setItem(k, JSON.stringify([notifItem, ...existing]));
          });
          window.dispatchEvent(new Event("notifications_updated"));
        } catch {}

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
    const snap = (() => {
      const d = user.kycApplicationData || {};
      if (typeof d === "string") {
        try { return JSON.parse(d); } catch { return {}; }
      }
      return d;
    })();
    // In view mode, ONLY use documents from the saved snapshot
    const docUrl = isViewMode
      ? (snap.idDocument || snap.documentUrl || null)
      : user.documentUrl;
    const hasFrontDoc = isViewMode
      ? Boolean(docUrl || snap.documentFrontUrl)
      : Boolean(docUrl || user.documentFrontUrl);

    if (!hasFrontDoc) {
      return (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          No ID Document attached. Please upload your ID document before applying.
        </div>
      );
    }

    let front = (isViewMode ? snap.documentFrontUrl : user.documentFrontUrl) || "";
    let back = (isViewMode ? snap.documentBackUrl : user.documentBackUrl) || "";
    
    if (Array.isArray(docUrl)) {
      if (!front && docUrl.length > 0) front = docUrl[0] || "";
      if (!back && docUrl.length > 1) back = docUrl[1] || "";
    } else if (typeof docUrl === "string") {
      try {
        if (!front && !back && docUrl.startsWith("[") && docUrl.endsWith("]")) {
          const parsed = JSON.parse(docUrl);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            front = parsed[0];
            back = parsed[1];
          } else if (Array.isArray(parsed) && parsed.length === 1) {
            front = parsed[0];
          }
        }
      } catch {}
    }

    if (!front) {
      front = (typeof docUrl === "string" ? docUrl : "") || "";
    }

    const imgClass =
      "w-full h-full object-contain hover:scale-105 transition-transform duration-200";
    const wrapClass =
      "rounded-xl border border-border dark:border-slate-700 overflow-hidden bg-muted dark:bg-slate-800/60 aspect-video w-full";

    const renderImg = (src: any, alt: string) => {
      if (typeof src !== "string" || !src) return null;
      return src.toLowerCase().endsWith(".pdf") ? (
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
        <div className="block h-full">
          <img src={src} alt={alt} className={imgClass} />
        </div>
      );
    };

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto overflow-x-hidden">
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
        <div className="px-10 py-8 relative bg-background max-h-[70vh] overflow-y-auto overflow-x-hidden">
          {isViewMode && kycStatus === "rejected" && (
            <div className="mb-6">
              <KycRejectionBanner user={user} />
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
            const snap = (() => {
              const d = user.kycApplicationData || {};
              if (typeof d === "string") {
                try { return JSON.parse(d); } catch { return {}; }
              }
              return d;
            })();
            // In view mode (pending/approved/rejected), ONLY show data from the saved snapshot.
            // Never fall back to live profile — changes to profile must NOT affect the frozen application.
            const displayFullName = isViewMode ? (snap.fullName || "N/A") : (user.fullName || "N/A");
            const displayEmail = isViewMode ? (snap.email || "N/A") : (user.email || "N/A");
            const displayNationality = isViewMode ? (snap.nationality || "N/A") : (user.nationality || "N/A");
            const displayGovtIdType = isViewMode
              ? (snap.governmentIdType || "Not Selected")
              : (user.governmentIdType || (() => {
                  if (typeof window !== "undefined") {
                    try {
                      const o = getProfileOverrides(user.rawUserId || user.userId || user.id);
                      return (o as any).governmentIdType;
                    } catch {}
                  }
                  return undefined;
                })() || "Not Selected");
            const displayGovtId = isViewMode
              ? (snap.governmentId || "N/A")
              : (user.nationalIdentity || user.governmentId || "N/A");
            const displayDob = isViewMode
              ? (snap.dateOfBirth || "N/A")
              : (user.dateOfBirth || "N/A");
            const rawGender = isViewMode
              ? (snap.gender || "N/A")
              : (user.gender || "N/A");
            const displayGender = rawGender && rawGender !== "N/A"
              ? (rawGender.charAt(0).toUpperCase() + rawGender.slice(1))
              : "N/A";
            const displayPermAddress = (() => {
              let addr = isViewMode
                ? snap.permanentAddress
                : (user.permanentAddress || (() => {
                    if (typeof window !== "undefined") {
                      try {
                        const o = getProfileOverrides(user.rawUserId || user.userId || user.id);
                        return o.permanentAddress;
                      } catch {}
                    }
                    return undefined;
                  })());
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
              const rawAccountType = String(snap.accountType || user.accountType || user.accountLabel || user.role || "user");
              return rawAccountType.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            })();
            const displayAppliedAt = snap.appliedAt ? new Date(snap.appliedAt).toLocaleDateString() : new Date().toLocaleDateString();

            return (
              <>
                <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8 relative z-10">
                  {/* Watermark stamp */}
                  {isViewMode && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20 rotate-[-15deg] z-0 flex items-center justify-center w-full h-full">
                      <div className={`border-[8px] ${stampColor} rounded-lg px-8 py-4`}>
                        <span className={`text-5xl sm:text-6xl font-black tracking-widest ${stampColor}`}>
                          {stampText}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Left col */}
                  <div className="flex-1 space-y-4 w-full relative z-10">
                    {[
                      { label: "Account ID", value: user.displayUserId || user.rawUserId || user.id },
                      { label: "Full Name", value: displayFullName },
                      { label: "Email Address", value: displayEmail },
                      { label: "Account Type", value: displayAccountType },
                      { label: "Gender", value: displayGender },
                      { label: "Nationality", value: displayNationality },
                      { label: "Government ID Type", value: displayGovtIdType },
                      { label: "Government ID", value: displayGovtId },
                      { label: "Date of Birth", value: displayDob },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">
                          {label}
                        </span>
                        <p className={`font-bold text-foreground text-sm sm:text-base ${label === "Account ID" ? "font-mono" : ""} ${label === "Gender" ? "capitalize" : ""}`}>{value || "N/A"}</p>
                      </div>
                    ))}
                  </div>

                  {/* Right col */}
                  <div className="flex-1 space-y-4 w-full">
                    {/* Profile photo */}
                    <div className="flex flex-col sm:items-end mb-4">
                      <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-md border-4 border-border shadow-sm bg-muted">
                        {(isViewMode ? (snap.avatarUrl || snap.profilePhoto || snap.livePhotoUrl) : effectivePhoto) ? (
                          <img
                            src={isViewMode ? (snap.avatarUrl || snap.profilePhoto || snap.livePhotoUrl) : effectivePhoto}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-muted-foreground font-bold text-2xl">
                            {(displayFullName || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        {(snap.isLiveCapture || livePhoto) && (
                          <div
                            className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-1 shadow-md"
                            title="Live Biometric Capture Verified"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      {!isViewMode && onRetakeLivePhoto && (
                        <button
                          type="button"
                          onClick={onRetakeLivePhoto}
                          className="mt-1.5 text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                        >
                          <Camera className="h-3 w-3" />
                          Retake Live Photo
                        </button>
                      )}
                    </div>

                    <div className="sm:text-right">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">
                        KYC Application ID
                      </span>
                      <p className="font-mono font-bold text-foreground text-sm">
                        {(() => {
                          const id = user.displayUserId || user.rawUserId || user.id;
                          return id ? `KYC-${id}` : "N/A";
                        })()}
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

                {/* Business Information Section (Strictly for Business Accounts Only) */}
                {(displayAccountType.toLowerCase() === "business" || String(user.role || "").toLowerCase() === "business" || String(user.role || "").toLowerCase() === "seller") && (
                  <div className="mb-6 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-base text-foreground uppercase tracking-wide text-xs">
                        Business Information
                      </h4>
                      <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-500">
                        {snap.commissionRate || (user as any).percentageRate || (user as any).commissionRate || 20}% Platform Commission
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-muted/20">
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">
                          Registered Business Name
                        </span>
                        <p className="font-bold text-foreground text-xs sm:text-sm">
                          {snap.businessName || (user as any).businessName || (user as any).businessInfo?.businessName || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">
                          Business Type / Sector
                        </span>
                        <p className="font-bold text-foreground text-xs sm:text-sm">
                          {snap.businessType || (user as any).businessType || (user as any).businessInfo?.businessIndustry || (user as any).businessInfo?.businessType || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">
                          Platform Commission Rate
                        </span>
                        <p className="font-bold text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">
                          {snap.commissionRate || (user as any).percentageRate || (user as any).commissionRate || 20}% (Standard Rate)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
              disabled={
                isApplying ||
                !effectivePhoto ||
                !(user.documentUrl || user.documentFrontUrl)
              }
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
