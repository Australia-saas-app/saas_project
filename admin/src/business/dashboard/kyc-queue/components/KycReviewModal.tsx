"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, X, FileText, ShieldAlert } from "lucide-react";
import { useAppSelector } from "@/src/core/store/hooks";

interface KycReviewModalProps {
  user: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function KycReviewModal({ user, isOpen, onClose, onSuccess }: KycReviewModalProps) {
  const [loadingAction, setLoadingAction] = useState<'approved' | 'rejected' | null>(null);
  const [localKycStatus, setLocalKycStatus] = useState<string | null>(null);
  const token = useAppSelector((state) => state.auth.token);

  useEffect(() => {
    // Reset local overrides when a new user is opened
    setLocalKycStatus(null);
    setLoadingAction(null);
  }, [user?.userId, user?.id]);

  if (!isOpen || !user) return null;

  const handleUpdateStatus = async (kycStatus: string) => {
    if (!token || loadingAction) return;
    setLoadingAction(kycStatus as 'approved' | 'rejected');
    try {
      const response = await fetch(`/admin/api/sso/auth/admin/users/${user.userId || user.id}/kyc-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ kycStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update KYC status');
      
      // Instant local stamp update — no need to wait for server refresh
      setLocalKycStatus(kycStatus);
      toast.success(`Application ${kycStatus === 'approved' ? 'approved' : 'rejected'} successfully.`);
      if (typeof window !== "undefined") {
        const uid = user.userId || user.id;
        // 1. Local DOM CustomEvent
        window.dispatchEvent(new CustomEvent("vero:kyc_updated", {
          detail: {
            userId: uid,
            kycStatus,
          }
        }));

        // 2. Cross-tab BroadcastChannel
        try {
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("vero_channel");
            bc.postMessage({ type: "vero:kyc_updated", userId: uid, kycStatus });
            bc.close();
          }
        } catch {}

        // 3. Cross-tab Storage Event
        try {
          localStorage.setItem("vero_kyc_sync", JSON.stringify({
            userId: uid,
            kycStatus,
            t: Date.now()
          }));
        } catch {}
      }
      onSuccess();
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        style={{ maxWidth: '850px', width: '92%', margin: '0 auto' }} 
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
        <div className="px-10 py-8 relative bg-white dark:bg-slate-900 max-h-[70vh] overflow-y-auto">
          
          {/* Watermark/Stamp */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20 rotate-[-15deg]">
            <div className={`border-[8px] ${stampColor} rounded-lg px-8 py-4`}>
              <span className={`text-6xl font-black tracking-widest ${stampColor}`}>
                {stampText}
              </span>
            </div>
          </div>

          {/* Declaration Text */}
          <div className="mb-8">
            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">To The System Authority</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Request for KYC approval. I hereby declare that the details furnished below are true and correct to the best of my knowledge and belief and I undertake to inform you of any changes therein, immediately. In case any of the above information is found to be false or untrue or misleading or misrepresenting, I am aware that I may be held liable for it and my application is subject to rejection under standard system laws.
            </p>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 w-full mb-8" />

          {/* Details grid */}
          {(() => {
            const snap = user.kycApplicationData || {};
            const fullName = snap.fullName || user.fullName;
            const email = snap.email || user.email || user.phone;
            const nationality = snap.nationality || user.nationality;
            const govtIdType = snap.governmentIdType || user.governmentIdType || "NID";
            const govtId = snap.governmentId || user.governmentId || user.nationalIdentity;
            const dob = snap.dateOfBirth || user.dateOfBirth;
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
                <div className="flex items-start gap-8 relative z-10">
                  {/* Left side info */}
                  <div className="flex-1 space-y-4">
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
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Nationality</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{nationality || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Government ID Type</span>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{govtIdType}</p>
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
                  <div className="flex-1 space-y-4">
                    <div className="flex justify-end mb-4">
                      <div className="h-28 w-28 overflow-hidden rounded-md border-4 border-slate-100 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-800/50">
                        {user.profilePhoto || user.avatarUrl ? (
                          <img src={user.profilePhoto || user.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-300 dark:text-slate-600 font-bold text-2xl">
                            {(fullName || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">KYC Application ID</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {user.userId ? `KYC-${user.userId}` : (user.id ? `KYC-${user.id}` : "N/A")}
                      </p>
                    </div>
                    <div className="text-right">
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
              </>
            );
          })()}

          <div className="h-px bg-slate-200 dark:bg-slate-800 w-full my-8" />

          {/* Attached Document Preview */}
          <div className="mb-4 relative z-10">
             <h4 className="font-bold text-md text-slate-800 dark:text-slate-100 mb-3">Attached Documents</h4>
             {(() => {
                const docUrl = user.idDocument || user.documentUrl;
                if (!docUrl) {
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
             })()}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={onClose}
            disabled={isAnyLoading}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          {(kycStatus === 'pending' || kycStatus === 'submitted') && (
            <>
              <button 
                onClick={() => handleUpdateStatus('rejected')}
                disabled={isAnyLoading}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 min-w-[100px] flex items-center justify-center gap-2"
              >
                {loadingAction === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
              </button>
              
              <button 
                onClick={() => handleUpdateStatus('approved')}
                disabled={isAnyLoading}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 min-w-[120px] flex items-center justify-center gap-2"
              >
                {loadingAction === 'approved' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
