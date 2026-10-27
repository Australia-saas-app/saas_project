"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ShieldAlert, Clock, XCircle, ArrowRight } from "lucide-react";
import axiosInstance from "@/src/shared/lib/axiosInstance";

import { getProfileOverrides } from "@/src/shared/utils/profile-storage";
import { getUserIdFromAuthUser } from "@/src/shared/lib/demo-user";

export type KycGateStatus = "approved" | "pending" | "rejected" | "not_applied";

interface KycVerificationGateModalProps {
  open: boolean;
  onClose: () => void;
  status: "not_applied" | "pending" | "rejected";
  role?: string;
}

/**
 * Fetch fresh real-time KYC status from server and local storage overrides.
 * Accurately determines:
 * - "approved": KYC is verified/approved by admin (deposit/withdraw allowed)
 * - "rejected": KYC application was rejected by admin
 * - "pending": User has applied and application is under review
 * - "not_applied": User has not applied for KYC verification yet
 */
export async function getLiveKycStatus(user: any): Promise<KycGateStatus> {
  const primaryUid = getUserIdFromAuthUser(user) || (user as any)?.id || (user as any)?.userId;
  const candidateUids = [
    primaryUid,
    (user as any)?.userId,
    (user as any)?.id,
    (user as any)?.publicId,
    (user as any)?.internalId,
    (user as any)?.sub,
  ].filter(Boolean) as string[];

  // 1. Fetch latest real-time user record from backend SSO database (/sso/auth/me)
  let serverKyc = "";
  let serverStatus = "";
  try {
    const res = await axiosInstance.get(`/sso/auth/me?t=${Date.now()}`, {
      timeout: 4000,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }).catch(() => null);

    const latestUser = res?.data?.data?.user || res?.data?.user || res?.data?.data || res?.data;
    if (latestUser) {
      if (latestUser.kycStatus) {
        serverKyc = String(latestUser.kycStatus).toLowerCase().trim();
      }
      if (latestUser.status) {
        serverStatus = String(latestUser.status).toLowerCase().trim();
      }
      const sId = latestUser.userId || latestUser.id || latestUser.internalId || latestUser.publicId;
      if (sId && !candidateUids.includes(sId)) {
        candidateUids.push(sId);
      }
    }
  } catch {}

  // 2. Collect Local Storage Overrides (saved when admin approves/rejects or user applies)
  let localKyc = "";
  let localStatus = "";
  for (const uid of candidateUids) {
    const ov = getProfileOverrides(uid);
    if (ov.kycStatus) {
      localKyc = String(ov.kycStatus).toLowerCase().trim();
    }
    if (ov.status) {
      localStatus = String(ov.status).toLowerCase().trim();
    }
    if (localKyc) break;
  }

  // Cross-check real-time sync broadcast keys in localStorage
  if (typeof window !== "undefined") {
    try {
      const syncKyc = localStorage.getItem("vero_kyc_sync");
      if (syncKyc) {
        const parsed = JSON.parse(syncKyc);
        const matchesUser =
          !parsed.userId ||
          candidateUids.length === 0 ||
          candidateUids.includes(parsed.userId);
        if (matchesUser && parsed.kycStatus) {
          const sk = String(parsed.kycStatus).toLowerCase().trim();
          if (sk === "approved" || sk === "rejected" || sk === "pending" || sk === "submitted") {
            localKyc = sk;
          }
        }
      }

      const accSync = localStorage.getItem("vero_account_sync");
      if (accSync) {
        const parsed = JSON.parse(accSync);
        const matchesUser =
          !parsed.userId ||
          candidateUids.length === 0 ||
          candidateUids.includes(parsed.userId);
        if (matchesUser && parsed.action) {
          const act = String(parsed.action).toLowerCase().trim();
          if (act === "approved" || act === "rejected") {
            localKyc = act;
          }
        }
      }
    } catch {}
  }

  // 3. Check auth session user
  const sessionKyc = user && "kycStatus" in user && user.kycStatus ? String(user.kycStatus).toLowerCase().trim() : "";
  const sessionStatus = user && "status" in user && user.status ? String(user.status).toLowerCase().trim() : "";
  const isKycVerifiedFlag = Boolean((user as any)?.isKycVerified);

  // 4. STEP 1: APPROVAL CHECK (Highest Priority)
  // If ANY definitive indicator says approved or verified, the user is APPROVED!
  if (
    serverKyc === "approved" ||
    serverKyc === "verified" ||
    serverStatus === "verified" ||
    localKyc === "approved" ||
    localKyc === "verified" ||
    localStatus === "verified" ||
    sessionKyc === "approved" ||
    sessionKyc === "verified" ||
    sessionStatus === "verified" ||
    isKycVerifiedFlag
  ) {
    return "approved";
  }

  // 5. STEP 2: REJECTION CHECK
  // If explicitly rejected by administrator
  if (serverKyc === "rejected" || localKyc === "rejected" || sessionKyc === "rejected") {
    return "rejected";
  }

  // 6. STEP 3: PENDING APPLICATION CHECK
  // User applied for KYC and it's under review
  const isPendingVal = (val: string) =>
    val === "pending" || val === "submitted" || val === "under_review" || val === "review";

  let hasApplicationData = false;
  for (const uid of candidateUids) {
    const ov = getProfileOverrides(uid);
    if (ov.kycApplicationData) {
      hasApplicationData = true;
      break;
    }
  }
  if (!hasApplicationData && (user as any)?.kycApplicationData) {
    hasApplicationData = true;
  }

  if (
    isPendingVal(serverKyc) ||
    isPendingVal(localKyc) ||
    isPendingVal(sessionKyc) ||
    (hasApplicationData && serverKyc !== "none" && localKyc !== "none")
  ) {
    return "pending";
  }

  // 7. STEP 4: NOT APPLIED (Default)
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
