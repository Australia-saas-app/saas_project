import { getVerificationByUserId } from "@/src/shared/lib/verification-store";
import {
  getUserIdFromAuthUser,
  isDemoAuthUser,
  isRegisteredAuthUser,
} from "@/src/shared/lib/demo-user";
import {
  completeProfilePath,
  isCompleteProfilePath,
  isProfileComplete,
  type ProfileAccountType,
} from "@/src/shared/lib/profile-completion";
import type { IDecodedToken, IUser } from "@/src/shared/types/auth.types";
import { getProfileOverrides } from "@/src/shared/utils/profile-storage";

export type DashboardAccessResult =
  | { allowed: true }
  | {
      allowed: false;
      status: string;
      message: string;
      reason: "profile" | "verification" | "auth";
      ctaHref?: string;
      ctaLabel?: string;
      appealAvailable?: boolean;
      recoveryAvailable?: boolean;
    };

export interface AccountActionPermission {
  allowed: boolean;
  message?: string;
}

export function normalizeUserStatus(status?: string): string {
  const raw = String(status || "pending").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (raw === "suspend") return "suspended";
  if (raw === "block") return "blocked";
  if (raw === "deactivate") return "deactivated";
  if (raw === "close") return "closed";
  if (raw === "review" || raw === "underreview") return "under_review";
  if (raw === "verified" || raw === "approved" || raw === "activate") return "active";
  if (raw === "unverify" || raw === "rejected") return "pending";
  return raw;
}

export function getUserAccountStatus(user: any): string {
  if (!user) return "unauthenticated";
  const directStatus = (user as any)?.status;
  const userId = getUserIdFromAuthUser(user) || (user && "id" in user ? String(user.id) : undefined);
  if (userId) {
    const overrides = getProfileOverrides(userId);
    if (overrides?.status) {
      return normalizeUserStatus(overrides.status);
    }
  }
  return normalizeUserStatus(directStatus);
}

// ── Action Guards Across All 3 Portals (Image 1) ───────────────────────────

// 1. Can Deposit Funds (User / Business / Affiliate)
export function checkDepositPermission(user: any): AccountActionPermission {
  const status = getUserAccountStatus(user);
  if (status === "active") return { allowed: true };
  if (status === "pending") {
    return { allowed: false, message: "Verification Pending: Complete profile and verification to deposit funds." };
  }
  if (status === "under_review") {
    return { allowed: false, message: "Account Under Review: Adding new deposits is paused during compliance audit." };
  }
  if (status === "suspended") {
    return { allowed: false, message: "Account Suspended: Wallet deposits are disabled. Please contact support or appeal." };
  }
  if (status === "dormant") {
    return { allowed: false, message: "Account Dormant: Please complete OTP verification to unlock wallet deposits." };
  }
  return { allowed: false, message: `Deposits disabled for account status: ${status}.` };
}

// 2. Can Create New Orders / Escrow Projects (User)
export function checkOrderCreationPermission(user: any): AccountActionPermission {
  const status = getUserAccountStatus(user);
  if (status === "active") return { allowed: true };
  if (status === "pending") {
    return { allowed: false, message: "Verification Pending: Complete your verification to unlock order creation." };
  }
  if (status === "under_review") {
    return { allowed: false, message: "Account Under Review: New project creation is paused during compliance audit." };
  }
  if (status === "suspended") {
    return { allowed: false, message: "Account Suspended: You cannot place new orders while account is suspended." };
  }
  if (status === "dormant") {
    return { allowed: false, message: "Account Dormant: Enter reactivation code to place orders." };
  }
  return { allowed: false, message: `Ordering disabled for account status: ${status}.` };
}

// 3. Can Withdraw Funds / Earnings (Business / Affiliate / User)
export function checkWithdrawalPermission(user: any): AccountActionPermission {
  const status = getUserAccountStatus(user);
  if (status === "active") return { allowed: true };
  if (status === "pending") {
    return { allowed: false, message: "Verification Pending: Withdrawals are locked until identity/business verification is approved." };
  }
  if (status === "under_review") {
    return { allowed: false, message: "Account Under Review: Withdrawals are temporarily frozen pending compliance review." };
  }
  if (status === "suspended") {
    return { allowed: false, message: "Account Suspended: Payouts and withdrawals are disabled. Submit documentation to appeal." };
  }
  if (status === "dormant") {
    return { allowed: false, message: "Account Dormant: Please reactivate your account with OTP before requesting withdrawals." };
  }
  return { allowed: false, message: `Withdrawals disabled for account status: ${status}.` };
}

// 4. Can Bid on Projects / Accept New Client Contracts (Business)
export function checkContractBiddingPermission(user: any): AccountActionPermission {
  const status = getUserAccountStatus(user);
  if (status === "active") return { allowed: true };
  if (status === "under_review") {
    return { allowed: false, message: "Account Under Review: You can deliver active milestones, but new bidding is paused." };
  }
  if (status === "suspended") {
    return { allowed: false, message: "Account Suspended: Bidding on new contracts is frozen. Submit appeal to restore." };
  }
  return { allowed: false, message: `Bidding disabled for account status: ${status}.` };
}

function isAccountMaintenancePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^\/(dashboard\/)?(user|affiliate|business)\/(profile|settings|complete-profile|log|appeal)(\/|$)/.test(pathname);
}

export function resolveDashboardAccess(
  user: IUser | IDecodedToken | null,
  pathname?: string | null
): DashboardAccessResult {
  if (!user) {
    return {
      allowed: false,
      status: "Unauthenticated",
      message: "Please sign in to continue.",
      reason: "auth",
    };
  }

  const role = String(user.role ?? "").toUpperCase();
  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return { allowed: true };
  }

  const userStatus = getUserAccountStatus(user);

  // Severe Restriction Statuses (Image 1)
  if (userStatus === "blocked") {
    return {
      allowed: false,
      status: "Blocked",
      message: "Your account is blocked due to serious policy or security violations. A secure appeal channel is available.",
      reason: "auth",
      appealAvailable: true,
      ctaHref: "/live-chat",
      ctaLabel: "Contact Support / Appeal",
    };
  }

  if (userStatus === "deactivated") {
    return {
      allowed: false,
      status: "Deactivated",
      message: "Your account has been deactivated. You may request account restoration within the 60-day recovery window.",
      reason: "auth",
      recoveryAvailable: true,
      ctaHref: "/account/recovery",
      ctaLabel: "Restore Account",
    };
  }

  if (userStatus === "closed") {
    return {
      allowed: false,
      status: "Closed",
      message: "Your account is permanently closed after the recovery period ended. Normal access is disabled.",
      reason: "auth",
    };
  }

  // Active accounts: Full access
  if (userStatus === "active") {
    return { allowed: true };
  }

  // Under Review & Suspended accounts: Permitted limited dashboard view (Image 1)
  // They can view orders, check status, access support, and submit appeals
  if (userStatus === "under_review" || userStatus === "suspended" || userStatus === "dormant") {
    return { allowed: true };
  }

  const userId = getUserIdFromAuthUser(user) || (user && "id" in user ? String(user.id) : undefined);
  if (!userId) {
    return {
      allowed: false,
      status: "Unknown",
      message: "We could not verify your account status.",
      reason: "auth",
    };
  }

  const accountType = accountTypeFromRole(user.role);

  if (!isProfileComplete(userId)) {
    if (isAccountMaintenancePath(pathname)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      status: "Profile incomplete",
      message: "Please complete your profile to unlock full dashboard features.",
      reason: "profile",
      ctaHref: `/${accountType}/profile`,
      ctaLabel: "Complete profile",
    };
  }

  const verification = getVerificationByUserId(userId);
  if (!verification) {
    if (isAccountMaintenancePath(pathname)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      status: "Not submitted",
      message:
        "Your documents are queued for review. You will get full access once an admin approves your account.",
      reason: "verification",
      ctaHref: `/account/${accountType}/pending-verification`,
      ctaLabel: "View review status",
    };
  }

  if (verification.status === "Approved") {
    return { allowed: true };
  }

  if (isAccountMaintenancePath(pathname)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    status: verification.status,
    message:
      verification.status === "Rejected"
        ? "Your verification was rejected. Update your profile details and contact support if you need help."
        : "Your account is under review. Full access unlocks after admin approval.",
    reason: "verification",
    ctaHref: `/account/${accountType}/pending-verification`,
    ctaLabel: "View review status",
  };
}

export function accountTypeFromRole(role?: string): ProfileAccountType {
  const normalized = role?.toUpperCase();
  if (normalized === "AFFILIATE" || normalized === "AGENCY") return "affiliate";
  if (normalized === "SELLER" || normalized === "BUSINESS") return "business";
  return "user";
}

