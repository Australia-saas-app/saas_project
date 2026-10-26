"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ShieldAlert, Clock, XCircle, ArrowRight } from "lucide-react";
import axiosInstance from "@/src/shared/lib/axiosInstance";

export type KycGateStatus = "approved" | "pending" | "rejected" | "not_applied";

interface KycVerificationGateModalProps {
  open: boolean;
  onClose: () => void;
  status: "not_applied" | "pending" | "rejected";
  role?: string;
}

/**
 * Fetch fresh real-time KYC status from server and local storage overrides
 */
export async function getLiveKycStatus(user: any): Promise<KycGateStatus> {
  let dbKyc = "";

  // 1. Fetch latest state from backend server
  try {
    const res = await axiosInstance.get("/users/me").catch(() => null);
    const latestUser = res?.data?.data?.user || res?.data?.user || res?.data;
    if (latestUser?.kycStatus) {
      dbKyc = String(latestUser.kycStatus).toLowerCase().trim();
    }
  } catch {}

  // 2. Fallback to auth session user
  if (!dbKyc && user && "kycStatus" in user && user.kycStatus) {
    dbKyc = String(user.kycStatus).toLowerCase().trim();
  }

  // 3. Check persistent localStorage overrides
  if (typeof window !== "undefined") {
    try {
      const uid = (user as any)?.id || (user as any)?.userId;
      if (uid) {
        const raw = localStorage.getItem(`user_profile_overrides_${uid}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.kycStatus) {
            const overrideKyc = String(parsed.kycStatus).toLowerCase().trim();
            if (overrideKyc === "approved" || overrideKyc === "rejected" || overrideKyc === "pending") {
              dbKyc = overrideKyc;
            }
          }
        }
      }
      const syncKyc = localStorage.getItem("vero_kyc_sync");
      if (syncKyc) {
        const parsed = JSON.parse(syncKyc);
        if (parsed?.kycStatus) {
          dbKyc = String(parsed.kycStatus).toLowerCase().trim();
        }
      }
    } catch {}
  }

  if (dbKyc === "approved" || dbKyc === "verified") return "approved";
  if (dbKyc === "pending" || dbKyc === "submitted" || dbKyc === "under_review") return "pending";
  if (dbKyc === "rejected") return "rejected";
  return "not_applied";
}

export function KycVerificationGateModal({
  open,
  onClose,
  status,
  role = "user",
}: KycVerificationGateModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  const cleanRole = String(role || "user").toLowerCase();
  const profileUrl = cleanRole.includes("bus")
    ? "/dashboard/business/profile"
    : cleanRole.includes("aff")
    ? "/dashboard/affiliate/profile"
    : "/dashboard/user/profile";

  const handleNavigate = () => {
    onClose();
    router.push(profileUrl);
  };

  let icon = <ShieldAlert className="w-7 h-7 text-amber-500" strokeWidth={1.8} />;
  let iconBg = "bg-amber-500/10";
  let title = "Account Not Verified";
  let description =
    "Your account is not verified and you have not applied for KYC verification yet. For payment safety, regulatory compliance, and account security, deposit and withdrawal features are restricted until your KYC verification is completed.";
  let actionLabel = "Apply KYC";

  if (status === "pending") {
    icon = <Clock className="w-7 h-7 text-blue-500" strokeWidth={1.8} />;
    iconBg = "bg-blue-500/10";
    title = "KYC Verification Pending";
    description =
      "You have applied for KYC verification, but your status is currently pending review by our administration team. For your financial safety, wallet deposits and withdrawals remain paused until approval.";
    actionLabel = "Check KYC Status";
  } else if (status === "rejected") {
    icon = <XCircle className="w-7 h-7 text-red-500" strokeWidth={1.8} />;
    iconBg = "bg-red-500/10";
    title = "KYC Application Rejected";
    description =
      "Your KYC verification application was rejected by the administrator. Please check the reason for rejection on your profile page and re-apply with required documents to restore payment features.";
    actionLabel = "Check KYC Status";
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4 overflow-y-auto">
      <div
        style={{ width: "420px", maxWidth: "calc(100vw - 32px)" }}
        className="bg-card rounded-2xl shadow-2xl p-6 sm:p-7 text-center mx-auto border border-border animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Status Icon */}
        <div className={`w-14 h-14 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {description}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-muted hover:bg-muted/80 rounded-xl font-semibold text-foreground text-sm transition-colors cursor-pointer"
          >
            OK
          </button>
          <button
            type="button"
            onClick={handleNavigate}
            className="flex-1 py-2.5 bg-primary hover:bg-primary/90 rounded-xl font-semibold text-white text-sm transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default KycVerificationGateModal;
