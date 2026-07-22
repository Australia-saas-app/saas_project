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

export type DashboardAccessResult =
  | { allowed: true }
  | {
      allowed: false;
      status: string;
      message: string;
      reason: "profile" | "verification" | "auth";
      ctaHref?: string;
      ctaLabel?: string;
    };

function isAccountMaintenancePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^\/(user|affiliate|business)\/(profile|settings|complete-profile)(\/|$)/.test(pathname);
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

  if (isDemoAuthUser(user)) {
    return { allowed: true };
  }

  const role = String(user.role ?? "").toUpperCase();
  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return { allowed: true };
  }

  if (!isRegisteredAuthUser(user)) {
    return { allowed: true };
  }

  const userId = getUserIdFromAuthUser(user);
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
  if (normalized === "AFFILIATE") return "affiliate";
  if (normalized === "SELLER" || normalized === "BUSINESS") return "business";
  return "user";
}
