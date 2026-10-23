"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, X, FileText, ShieldAlert } from "lucide-react";
import { useAppSelector } from "@/src/core/store/hooks";
import { logAdminActivity } from "@/src/shared/lib/admin-activity-logger";

interface KycReviewModalProps {
  user: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newStatus?: string, rejectionReasons?: any) => void;
}

export function KycReviewModal({ user, isOpen, onClose, onSuccess }: KycReviewModalProps) {
  const [loadingAction, setLoadingAction] = useState<'approved' | 'rejected' | null>(null);
  const [localKycStatus, setLocalKycStatus] = useState<string | null>(null);
  const [localRejectionReasons, setLocalRejectionReasons] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectDocs, setRejectDocs] = useState(false);
  const [rejectLiveness, setRejectLiveness] = useState(false);
  const [rejectPersonalData, setRejectPersonalData] = useState(false);
  const [personalDataDetails, setPersonalDataDetails] = useState("");
  const token = useAppSelector((state) => state.auth.token);
  const adminUser = useAppSelector((state: any) => state.auth.user);

  useEffect(() => {
    // Reset local overrides when a new user is opened
    setLocalKycStatus(null);
    setLoadingAction(null);
    setLocalRejectionReasons(null);
    setShowRejectModal(false);
    setRejectDocs(false);
    setRejectLiveness(false);
    setRejectPersonalData(false);
    setPersonalDataDetails("");
  }, [user?.userId, user?.id]);

  const isRejectValid =
    (rejectDocs || rejectLiveness || rejectPersonalData) &&
    (!rejectPersonalData || personalDataDetails.trim().length > 0);

  const handleUpdateStatus = async (kycStatus: string, rejectionReasons?: any) => {
    if (!token || loadingAction) return;
    setLoadingAction(kycStatus as 'approved' | 'rejected');
    try {
      const response = await fetch(`/admin/api/sso/auth/admin/users/${user.userId || user.id}/kyc-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          kycStatus,
          reason: kycStatus === 'rejected' ? 'KYC application rejected by administrator' : 'KYC application approved by administrator',
          rejectionReasons: rejectionReasons || undefined,
        })
      });

      if (!response.ok) throw new Error('Failed to update KYC status');

      // Instant local stamp update — no need to wait for server refresh
      setLocalKycStatus(kycStatus);
      if (kycStatus === 'rejected' && rejectionReasons) {
        setLocalRejectionReasons(rejectionReasons);
      } else if (kycStatus === 'approved') {
        setLocalRejectionReasons(null);
      }
      setShowRejectModal(false);
      toast.success(`Application ${kycStatus === 'approved' ? 'approved' : 'rejected'} successfully.`);
      // Log admin KYC action with real IP — admin email in details only
        const uid = user.userId || user.id;
        logAdminActivity(token || "", {
          action: kycStatus === "approved" ? "KYC_APPROVED" : "KYC_REJECTED",
          resource: `KYC application ${kycStatus} by administrator`,
          targetUserId: uid,
          targetUserEmail: user.email,
          targetUserName: user.fullName || user.agencyInfo?.agencyName || user.businessInfo?.companyName,
          adminEmail: adminUser?.email,
          adminName: adminUser?.fullName || adminUser?.name,
          extra: { kycStatus, rejectionReasons },
        });

        if (typeof window !== "undefined") {

        // 1. Local DOM CustomEvents
        window.dispatchEvent(new CustomEvent("vero:kyc_updated", {
          detail: { userId: uid, kycStatus, rejectionReasons }
        }));
        window.dispatchEvent(new CustomEvent("vero:account_changed", { detail: { userId: uid } }));

        if (kycStatus === "approved") {
          window.dispatchEvent(new CustomEvent("vero:user_status_updated", {
            detail: { userId: uid, status: "active" }
          }));
        }

        // 2. Cross-tab BroadcastChannel
        try {
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("vero_channel");
            bc.postMessage({ type: "vero:kyc_updated", userId: uid, kycStatus, rejectionReasons });
            bc.postMessage({ type: "vero:account_changed", userId: uid });
            if (kycStatus === "approved") {
              bc.postMessage({ type: "vero:user_status_updated", userId: uid, status: "active" });
            }
            bc.close();
          }
        } catch { }

        // 3. User notification dispatch & persistent DB write
        try {
          const isApprove = kycStatus === "approved";
          const userNotif = {
            id: `notif-kyc-res-${Date.now()}`,
            userId: uid,
            title: isApprove ? "KYC Verification Approved" : "KYC Verification Update",
            description: isApprove
              ? "Congratulations! Your KYC verification has been reviewed and approved."
              : "Your KYC verification was not approved. Please review your documents and resubmit.",
            message: isApprove
              ? "Congratulations! Your KYC verification has been reviewed and approved."
              : "Your KYC verification was not approved. Please review your documents and resubmit.",
            time: "Just now",
            read: false,
            href: "/dashboard/user/profile",
            type: isApprove ? "kyc_approved" : "kyc_rejected",
          };

          ["app_notifs_user", "app_notifs_all", "notifications"].forEach((k) => {
            const existing = JSON.parse(localStorage.getItem(k) || "[]");
            localStorage.setItem(k, JSON.stringify([userNotif, ...existing]));
          });

          window.dispatchEvent(new Event("notifications_updated"));

          fetch("/admin/api/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              userId: uid,
              title: userNotif.title,
              message: userNotif.message,
              type: userNotif.type,
              priority: "high",
              data: { href: userNotif.href },
            }),
          }).catch(() => {});
        } catch {}

        try {
          localStorage.setItem("vero_account_sync", JSON.stringify({ userId: uid, action: kycStatus, t: Date.now() }));
          localStorage.setItem("vero_kyc_sync", JSON.stringify({
            userId: uid,
            kycStatus,
            rejectionReasons,
            t: Date.now()
          }));
          if (kycStatus === "approved") {
            localStorage.setItem("vero_profile_sync", JSON.stringify({
              userId: uid,
              status: "active",
              timestamp: Date.now()
            }));
          }
        } catch {}
      }
      onSuccess(kycStatus, rejectionReasons);
    } catch (error) {
      toast.error('Failed to update KYC status');
      console.error(error);
    } finally {
      setLoadingAction(null);
    }
  };

  const kycStatus = localKycStatus ?? (user.kycStatus?.toLowerCase() || 'pending');
  const isKycVerified = kycStatus === 'approved';
  const isAnyLoading = loadingAction !== null;

  const stampColor = isKycVerified ? "text-green-600 border-green-600" : kycStatus === "rejected" ? "text-red-600 border-red-600" : "text-amber-600 border-amber-600";
  const stampText = isKycVerified ? "VERIFIED" : kycStatus === "rejected" ? "REJECTED" : "PENDING";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto overflow-x-hidden">
      <div
        style={{ maxWidth: '850px', width: '100%', margin: '0 auto' }}
        className="relative bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl my-6"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Review KYC Application</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - A4 Document Style */}
        <div className="px-10 pt-8 pb-2 relative bg-white dark:bg-slate-900 overflow-y-auto overflow-x-hidden flex flex-col" style={{ maxHeight: 'calc(80vh - 140px)' }}>

          {/* Rejection Reasons Alert Box (shown when application is currently rejected) */}
          {kycStatus === 'rejected' && (() => {
            const reasons = localRejectionReasons ?? (() => {
              const snap = typeof user.kycApplicationData === "string"
                ? (() => { try { return JSON.parse(user.kycApplicationData); } catch { return {}; } })()
                : (user.kycApplicationData || {});
              if (snap.rejectionReasons) return snap.rejectionReasons;
              if (user.kycRejectionReasons) return user.kycRejectionReasons;
              if (user.rejectionReasons) return user.rejectionReasons;
              if (typeof user.kycRejectionReason === "string") {
                try {
                  const parsed = JSON.parse(user.kycRejectionReason);
                  if (parsed && typeof parsed === "object") return parsed;
                } catch {}
              }
              return null;
            })();

            return (
              <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/30 p-4 text-rose-800 dark:text-rose-200 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300">
                      Application Rejected by Administrator
                    </h4>
                    <div className="text-xs space-y-1.5 text-rose-700/90 dark:text-rose-300/90">
                      {reasons?.documentsNotVerified && (
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span><strong>Documents not Verified:</strong> Please check and reupload again</span>
                        </div>
                      )}
                      {reasons?.livenessNotVerified && (
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span><strong>Liveness not verified:</strong> Not verified capture again</span>
                        </div>
                      )}
                      {reasons?.personalData && (
                        <div className="flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                          <span><strong>Personal Data:</strong> {reasons.personalDataDetails || "Information missing or incorrect"}</span>
                        </div>
                      )}
                      {!reasons?.documentsNotVerified && !reasons?.livenessNotVerified && !reasons?.personalData && (
                        <p>Application was rejected. Awaiting user resubmission.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Declaration Text / Formal Application Format */}
          <div className="mb-8 relative z-10 space-y-3">
            <div>
              <p className="font-bold text-base text-slate-900 dark:text-slate-100">To</p>
              <p className="font-bold text-base text-slate-900 dark:text-slate-100 pl-6">The System Administrator</p>
            </div>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100 pt-1">
              <span className="underline">Subject</span>: Request for KYC Verification & Approval
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed pl-6">
              I hereby declare that the details furnished below are true and correct to the best of my knowledge and belief and I undertake to inform you of any changes therein, immediately. In case any of the above information is found to be false or untrue or misleading or misrepresenting, I am aware that I may be held liable for it and my application is subject to rejection under standard system laws.
            </p>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 w-full mb-8" />

          {/* Details grid */}
          {(() => {
            const snap = (() => {
              const d = user.kycApplicationData || {};
              if (typeof d === "string") {
                try { return JSON.parse(d); } catch { return {}; }
              }
              return d;
            })();
            const liveSnapshotPhoto = (() => {
              if (snap.livePhotoUrl) return snap.livePhotoUrl;
              if (snap.liveCapturedPhoto) return snap.liveCapturedPhoto;
              if (snap.livePhoto) return snap.livePhoto;
              if (snap.isLiveCapture) {
                return snap.avatarUrl || snap.profilePhoto || null;
              }
              if (user.livePhotoUrl) return user.livePhotoUrl;
              if (user.liveCapturedPhoto) return user.liveCapturedPhoto;
              return null;
            })();
            const hasLiveCapture = Boolean(liveSnapshotPhoto || snap.isLiveCapture || snap.livePhotoUrl);
            const fullName = snap.fullName || user.fullName;
            const email = snap.email || user.email || user.phone;
            const nationality = snap.nationality || user.nationality;
            const govtIdType = snap.governmentIdType || user.governmentIdType || "NID";
            const govtId = snap.governmentId || user.governmentId || user.nationalIdentity;
            const dob = snap.dateOfBirth || user.dateOfBirth;
            const gender = snap.gender || user.gender;
            const address = (() => {
              let addr = snap.permanentAddress || user.permanentAddress;
              if (typeof addr === "string") {
                try {
                  return JSON.parse(addr);
                } catch {
                  return { address: addr };
                }
              }
              return addr || {};
            })();
            const accountType = (() => {
              const rawType = String(snap.accountType || user.accountType || user.role || "user").toLowerCase();
              if (rawType.includes("agency") || rawType.includes("affiliate")) return "Affiliate";
              if (rawType.includes("business")) return "Business";
              return "User";
            })();
            const appliedDate = snap.appliedAt ? new Date(snap.appliedAt).toLocaleDateString() : (user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A");

            return (
              <>
                <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
                  {/* Watermark/Stamp */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20 rotate-[-15deg] z-0 flex items-center justify-center w-full h-full">
                    <div className={`border-[8px] ${stampColor} rounded-lg px-8 py-4`}>
                      <span className={`text-5xl sm:text-6xl font-black tracking-widest ${stampColor}`}>
                        {stampText}
                      </span>
                    </div>
                  </div>

                  {/* Left side info */}
                  <div className="flex-1 space-y-4 relative z-10">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Account ID</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-base">{user.displayUserId || user.userId || user.publicId || user.id || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Full Name</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{fullName || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Email Address</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{email || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Account Type</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{accountType}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Gender</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base capitalize">{gender || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Nationality</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{nationality || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Government ID</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{govtId || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Date of Birth</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{dob || "N/A"}</p>
                    </div>
                  </div>

                  {/* Right side info & Photo */}
                  <div className="flex-1 space-y-4 w-full">
                    <div className="flex flex-col items-center md:items-end mb-4">
                      <div className="relative h-28 w-28 overflow-hidden rounded-md border-4 border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-800/50">
                        {liveSnapshotPhoto ? (
                          <img src={liveSnapshotPhoto} alt="Live Biometric Snapshot" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 font-bold p-1 text-center bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-2xl">{(fullName || "U").charAt(0).toUpperCase()}</span>
                            <span className="text-[9px] text-slate-400 font-medium mt-0.5">No Live Photo</span>
                          </div>
                        )}
                        {hasLiveCapture && (
                          <div className="absolute top-1 right-1 bg-emerald-600 text-white rounded-full p-1 shadow" title="Live Biometric Capture Verified">
                            <ShieldAlert className="h-3.5 w-3.5 rotate-180" />
                          </div>
                        )}
                      </div>
                      {hasLiveCapture && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Live Biometric Capture
                        </span>
                      )}
                    </div>
                    <div className="text-center md:text-right">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">KYC Application ID</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {(() => {
                          const id = user.displayUserId || user.userId || user.id;
                          return id ? `KYC-${id}` : "N/A";
                        })()}
                      </p>
                    </div>
                    <div className="text-center md:text-right">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Application Date</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{appliedDate}</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800 w-full my-6" />

                {/* Permanent Address Snapshot */}
                <div className="mb-6 relative z-10">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">Permanent Address</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Country</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{address?.country || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">City</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{address?.city || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">State</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{address?.state || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Zip Code</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{address?.zipCode || "N/A"}</p>
                    </div>
                    <div className="md:col-span-4 mt-2 border-t border-slate-200 dark:border-slate-800 pt-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Address</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{address?.address || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Business Information Snapshot Section (Strictly for Business Accounts Only) */}
                {(accountType.toLowerCase() === "business" || String(user.role || "").toLowerCase() === "business" || String(user.role || "").toLowerCase() === "seller" || String((user as any).accountType || "").toLowerCase() === "business") && (
                  <div className="mb-6 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                        Business Information
                      </h4>
                      <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                        {snap.commissionRate || user.percentageRate || 20}% Platform Commission Rate
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">
                          Registered Business Name
                        </span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {snap.businessName || user.businessName || user.businessInfo?.businessName || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">
                          Business Type / Industry
                        </span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {snap.businessType || user.businessType || user.businessInfo?.businessIndustry || user.businessInfo?.businessType || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">
                          Percentage / Commission Rate
                        </span>
                        <p className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                          {snap.commissionRate || user.percentageRate || 20}% (Standard Rate)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          <div className="h-px bg-slate-200 dark:bg-slate-800 w-full my-8" />

          {/* Attached Document Preview */}
          <div className="mb-4 relative z-10">
            {(() => {
              const snap = (() => {
                const d = user.kycApplicationData || {};
                if (typeof d === "string") {
                  try { return JSON.parse(d); } catch { return {}; }
                }
                return d;
              })();
              const govtIdType = snap.governmentIdType || user.governmentIdType || "NID";
              return (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-0.5">
                    Government ID Type
                  </span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    {govtIdType}
                  </p>
                </div>
              );
            })()}
            <h4 className="font-bold text-md text-slate-800 dark:text-slate-100 mb-3">Attached Documents</h4>
            {(() => {
              const snap = (() => {
                const d = user.kycApplicationData || {};
                if (typeof d === "string") {
                  try { return JSON.parse(d); } catch { return {}; }
                }
                return d;
              })();
              const rawDocUrl = snap.idDocument || snap.documentUrl || user.idDocument || user.documentUrl;
              
              if (!rawDocUrl && !snap.documentFrontUrl && !user.documentFrontUrl) {
                return (
                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    No ID Document attached
                  </div>
                );
              }

              let front = snap.documentFrontUrl || user.documentFrontUrl || "";
              let back = snap.documentBackUrl || user.documentBackUrl || "";
              
              let parsedDocUrl = rawDocUrl;

              if (Array.isArray(rawDocUrl)) {
                if (!front && rawDocUrl.length > 0) front = rawDocUrl[0] || "";
                if (!back && rawDocUrl.length > 1) back = rawDocUrl[1] || "";
              } else if (typeof rawDocUrl === "string") {
                try {
                  if (!front && !back && rawDocUrl.startsWith("[") && rawDocUrl.endsWith("]")) {
                    const parsed = JSON.parse(rawDocUrl);
                    if (Array.isArray(parsed) && parsed.length >= 2) {
                      front = parsed[0];
                      back = parsed[1];
                      parsedDocUrl = parsed[0]; // fallback for single doc view
                    } else if (Array.isArray(parsed) && parsed.length === 1) {
                      front = parsed[0];
                      parsedDocUrl = parsed[0];
                    }
                  }
                } catch (e) { }
              }

              if (front && back) {
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Front ID</p>
                      <div className="relative group rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800/50 aspect-video w-full">
                          <img src={front} alt="Front ID Document" className="w-full h-full object-contain p-1 hover:scale-105 transition-transform duration-200" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Back ID</p>
                      <div className="relative group rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800/50 aspect-video w-full">
                          <img src={back} alt="Back ID Document" className="w-full h-full object-contain p-1 hover:scale-105 transition-transform duration-200" />
                      </div>
                    </div>
                  </div>
                );
              }

              const docStr = (typeof parsedDocUrl === "string" ? parsedDocUrl : "");
              
              return (
                <div className="relative group rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-800/50 aspect-video w-full max-w-md">
                  {docStr.toLowerCase().endsWith(".pdf") ? (
                    <a href={docStr} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-12 hover:text-primary transition-colors cursor-pointer w-full h-full">
                      <FileText className="h-12 w-12 mb-2" />
                      <span className="text-sm font-medium underline">Open PDF Document</span>
                    </a>
                  ) : (
                      <img src={docStr} alt="ID Document" className="w-full h-full object-contain p-1 hover:scale-105 transition-transform duration-200" />
                  )}
                </div>
              );
            })()}
          </div>

          {/* Applicant Signature Section */}
          <div className="mt-4 flex justify-end relative z-10 mb-2">
            <div className="text-right space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Applicant Signature
              </span>
              <p className="font-serif italic font-bold text-xl text-blue-600 dark:text-blue-500 tracking-wide border-b-2 border-blue-600/40 pb-1 px-6 inline-block">
                {(() => {
                  const snap = (() => {
                    const d = user.kycApplicationData || {};
                    if (typeof d === "string") {
                      try { return JSON.parse(d); } catch { return {}; }
                    }
                    return d;
                  })();
                  return snap.fullName || user.fullName || "Applicant Signature";
                })()}
              </p>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1">
                Verified Digital Signee — {(() => {
                  const snap = (() => {
                    const d = user.kycApplicationData || {};
                    if (typeof d === "string") {
                      try { return JSON.parse(d); } catch { return {}; }
                    }
                    return d;
                  })();
                  return snap.email || user.email || snap.fullName || user.fullName;
                })()}
              </p>
            </div>
          </div>
          </div>
          {/* END OF SCROLLABLE BODY */}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-8 py-4 bg-background border-t border-border mt-auto">
            {(kycStatus === 'pending' || kycStatus === 'submitted') ? (
              <>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={isAnyLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 min-w-[110px] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loadingAction === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject Application"}
                </button>

                <button
                  onClick={() => handleUpdateStatus('approved')}
                  disabled={isAnyLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 min-w-[130px] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loadingAction === 'approved' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve Application"}
                </button>
              </>
            ) : kycStatus === 'rejected' ? (
              <button
                onClick={() => handleUpdateStatus('approved')}
                disabled={isAnyLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 min-w-[140px] flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingAction === 'approved' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Re-evaluate & Approve"}
              </button>
            ) : (
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isAnyLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50 min-w-[140px] flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingAction === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Revoke & Reject"}
              </button>
            )}
          </div>
      </div>

      {/* ─── REASON OF REJECTION MODAL ─── */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && loadingAction !== 'rejected') {
              setShowRejectModal(false);
            }
          }}
        >
          <div
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-all flex flex-col"
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '90vh',
              margin: '0 auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              borderRadius: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Reason of Rejection</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Specify why this application is rejected</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={loadingAction === 'rejected'}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Checklist */}
            <div className="p-5 space-y-3.5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Select one or more rejection reasons to notify the user:
              </p>

              <div className="space-y-2.5">
                {/* Option 1: Documents not Verified */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rejectDocs}
                    onChange={(e) => setRejectDocs(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block">Documents not Verified</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Document is unreadable, expired, cropped, or not official.</span>
                  </div>
                </label>

                {/* Option 2: Liveness not verified */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rejectLiveness}
                    onChange={(e) => setRejectLiveness(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 dark:text-white block">Liveness not verified</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Live selfie failed anti-spoofing check, dim room, or face obstructed.</span>
                  </div>
                </label>

                {/* Option 3: Personal Data */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 overflow-hidden">
                  <label className="flex items-start gap-3 p-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rejectPersonalData}
                      onChange={(e) => setRejectPersonalData(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 dark:text-white block">Personal Data</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Details do not match identity documents or required fields are missing.</span>
                    </div>
                  </label>

                  {/* When Personal Data is checked: show text box */}
                  {rejectPersonalData && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 animate-in fade-in duration-150">
                      <label className="block text-[11px] font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        Specify details about incorrect or missing data <span className="text-rose-500">*</span>:
                      </label>
                      <textarea
                        value={personalDataDetails}
                        onChange={(e) => setPersonalDataDetails(e.target.value)}
                        placeholder="e.g., Full name does not match passport, permanent address is incomplete, birth date mismatch..."
                        rows={3}
                        className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={loadingAction === 'rejected'}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isRejectValid) return;
                  handleUpdateStatus('rejected', {
                    documentsNotVerified: rejectDocs,
                    livenessNotVerified: rejectLiveness,
                    personalData: rejectPersonalData,
                    personalDataDetails: rejectPersonalData ? personalDataDetails.trim() : "",
                  });
                }}
                disabled={!isRejectValid || loadingAction === 'rejected'}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {loadingAction === 'rejected' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Reject</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

