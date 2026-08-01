"use client"

import { useMemo, useState, useEffect } from "react"
import { useUser } from "@/src/context/user.provider"
import {
  getProfileOverrides,
  saveProfileOverrides,
  clearAllUserStorage,
  clearProfileOverrides,
  type ProfileDataPatch,
  type ProfileField,
} from "@/src/shared/utils/profile-storage"
import { getUserIdFromAuthUser, isDemoAuthUser, getDisplayUserId, getInitials } from "@/src/shared/lib/demo-user"
import { completeUserProfile } from "@/src/shared/server/AuthService";
import { getSecuritySettings } from "@/src/shared/lib/security-settings-store";

export const PROFILE_UPDATED_EVENT = "vero:profile_updated";

export const getStatusBadgeStyle = (statusStr: string) => {
  switch (statusStr?.toLowerCase()) {
    case 'active':
    case 'approved':
    case 'verified':
      return {
        label: 'Active',
        pill: 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500',
      };
    case 'pending':
    case 'unverified':
    case 'submitted':
      return {
        label: 'Pending',
        pill: 'border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
      };
    case 'suspend':
    case 'suspended':
    case 'deactivated':
      return {
        label: 'Suspended',
        pill: 'border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400',
        dot: 'bg-red-500',
      };
    case 'block':
    case 'blocked':
    case 'banned':
      return {
        label: 'Blocked',
        pill: 'border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400',
        dot: 'bg-rose-500',
      };
    case 'dormant':
      return {
        label: 'Dormant',
        pill: 'border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400',
        dot: 'bg-purple-500',
      };
    case 'closed':
    case 'inactive':
      return {
        label: 'Closed',
        pill: 'border border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
        dot: 'bg-zinc-500',
      };
    default:
      return {
        label: statusStr ? statusStr.charAt(0).toUpperCase() + statusStr.slice(1) : 'Active',
        pill: 'border border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400',
        dot: 'bg-slate-500',
      };
  }
};

function displayName(user: any) {
  if (!user) return "Account"
  if ("fullName" in user && user.fullName) return String(user.fullName)
  if ("firstName" in user && user.firstName) {
    return `${user.firstName} ${user.lastName ?? ""}`.trim()
  }
  if ("name" in user && user.name) return String(user.name)
  return user.email?.split("@")[0] ?? "Account"
}

export function useProfileDisplay() {
  const { user, refreshUser } = useUser()
  const rawUserId = getUserIdFromAuthUser(user) ?? "guest"
  const isDemo = isDemoAuthUser(user)
  const [revision, setRevision] = useState(0)

  // Ensure local overrides remain in sync when DB updates
  useEffect(() => {
    if (!rawUserId || !user) return;
    const dbKyc = (user as any).kycStatus ? String((user as any).kycStatus).toLowerCase() : "none";
    if (dbKyc !== "none" && dbKyc !== "unverified" && dbKyc !== "") {
      saveProfileOverrides(rawUserId, { kycStatus: dbKyc });
    }
  }, [rawUserId, user]);

  useEffect(() => {
    const handleProfileUpdate = () => setRevision(n => n + 1);
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
  }, []);

  // When admin changes KYC status or account status, instantly persist the new value in overrides
  // and refresh the user context from the DB so all components update across tabs
  useEffect(() => {
    const isTargetUser = (tId?: string) => {
      if (!tId || !rawUserId) return true;
      if (tId === rawUserId) return true;
      if (user && ((user as any).id === tId || (user as any).userId === tId || (user as any).internalId === tId || (user as any).publicId === tId)) return true;
      return false;
    };

    const processKycChange = (targetUserId?: string, newKycStatus?: string) => {
      if (!newKycStatus) return;
      if (!isTargetUser(targetUserId)) return;

      const lowerStatus = newKycStatus.toLowerCase();
      if (lowerStatus === "none" || lowerStatus === "deleted") {
        clearAllUserStorage(targetUserId || rawUserId);
      } else {
        saveProfileOverrides(rawUserId, { kycStatus: lowerStatus });
      }
      setRevision(n => n + 1); // trigger re-read of overrides
      if (refreshUser) refreshUser().catch(() => {});
    };

    const processStatusChange = (targetUserId?: string, newStatus?: string) => {
      if (!newStatus) return;
      if (!isTargetUser(targetUserId)) return;

      const lowerStatus = newStatus.toLowerCase();
      saveProfileOverrides(rawUserId, { status: lowerStatus });
      setRevision(n => n + 1);
      if (refreshUser) refreshUser().catch(() => {});
    };

    // 1. Local DOM CustomEvents
    const handleKycUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      processKycChange(detail?.userId, detail?.kycStatus);
    };
    const handleStatusUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      processStatusChange(detail?.userId, detail?.status);
    };
    window.addEventListener("vero:kyc_updated", handleKycUpdate);
    window.addEventListener("vero:user_status_updated", handleStatusUpdate);

    // 2. Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("vero_channel");
        bc.onmessage = (event) => {
          if (event.data?.type === "vero:kyc_updated") {
            processKycChange(event.data.userId, event.data.kycStatus);
          } else if (event.data?.type === "vero:user_status_updated") {
            processStatusChange(event.data.userId, event.data.status);
          } else if (event.data?.type === "vero:profile_updated") {
            setRevision((n) => n + 1);
            if (refreshUser) refreshUser().catch(() => {});
          }
        };
      }
    } catch {}

    // 3. Cross-tab Storage Event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vero_kyc_sync" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          processKycChange(parsed.userId, parsed.kycStatus);
        } catch {}
      } else if (e.key === "vero_profile_sync" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.status) processStatusChange(parsed.userId, parsed.status);
          setRevision((n) => n + 1);
          if (refreshUser) refreshUser().catch(() => {});
        } catch {
          setRevision((n) => n + 1);
          if (refreshUser) refreshUser().catch(() => {});
        }
      } else if (e.key === "user_profile_overrides_v2") {
        setRevision((n) => n + 1);
        if (refreshUser) refreshUser().catch(() => {});
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Tab Focus & 5-Second Background Polling for DB sync
    const handleFocus = () => {
      if (refreshUser) refreshUser().catch(() => {});
    };
    window.addEventListener("focus", handleFocus);

    const pollInterval = setInterval(() => {
      if (refreshUser) refreshUser().catch(() => {});
    }, 5000);

    return () => {
      window.removeEventListener("vero:kyc_updated", handleKycUpdate);
      window.removeEventListener("vero:user_status_updated", handleStatusUpdate);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      clearInterval(pollInterval);
      if (bc) bc.close();
    };
  }, [rawUserId, refreshUser]);

  const overrides = useMemo(() => getProfileOverrides(rawUserId), [rawUserId, revision])

  const fullName =
    overrides.fullName ??
    (user && "fullName" in user && user.fullName ? String(user.fullName) : displayName(user))

  const accountLabel = fullName

  const email =
    overrides.email ??
    (user && "email" in user && user.email ? String(user.email) : isDemo ? "user@demo.com" : "")

  const secondaryEmail = overrides.secondaryEmail ?? ""

  const phone =
    overrides.phone ??
    (user && "phone" in user && user.phone
      ? String(user.phone)
      : user && "mobileNumber" in user && user.mobileNumber
        ? String(user.mobileNumber)
        : isDemo
          ? "5551234567"
          : "")

  const countryCode = overrides.countryCode ?? (isDemo ? "+1" : "+92")

  const nationality =
    overrides.nationality ??
    (user && "nationality" in user && user.nationality
      ? String(user.nationality)
      : user && "country" in user && user.country
        ? String(user.country)
        : "")

  const dateOfBirth =
    overrides.dateOfBirth ??
    (user && "dateOfBirth" in user && user.dateOfBirth
      ? String(user.dateOfBirth).split("T")[0]
      : isDemo
        ? "2000-01-01"
        : "")

  const nationalIdentity =
    overrides.nationalIdentity ??
    (user && "nationalIdentity" in user && user.nationalIdentity
      ? String(user.nationalIdentity)
      : user && "governmentId" in user && user.governmentId
        ? String(user.governmentId)
        : "")

  const governmentIdType =
    (overrides as any).governmentIdType ??
    (user && "governmentIdType" in user && (user as any).governmentIdType
      ? String((user as any).governmentIdType)
      : "NID")

  const permanentAddress = useMemo(() => {
    const oAddr = (overrides as any).permanentAddress;
    const uAddr = user && "permanentAddress" in user ? (user as any).permanentAddress : null;
    return {
      country: oAddr?.country ?? uAddr?.country ?? "",
      city: oAddr?.city ?? uAddr?.city ?? "",
      state: oAddr?.state ?? uAddr?.state ?? "",
      zipCode: oAddr?.zipCode ?? uAddr?.zipCode ?? "",
      address: oAddr?.address ?? uAddr?.address ?? "",
    };
  }, [overrides, user]);

  const currency =
    overrides.currency ??
    (user && "currency" in user && user.currency
      ? String(user.currency).toUpperCase()
      : "USD")

  const joiningDate =
    overrides.joiningDate ??
    (user && "createdAt" in user && user.createdAt && !isNaN(new Date(user.createdAt).getTime())
      ? new Date(user.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }))

  const initials = getInitials(fullName);
  const hasCustomAvatar = Boolean(overrides.avatarUrl || (user && "profilePhoto" in user && user.profilePhoto));

  const avatarUrl =
    overrides.avatarUrl ??
    (user && "profilePhoto" in user && user.profilePhoto
      ? String(user.profilePhoto)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=58719b&color=fff&font-size=0.45&bold=true`)

  const fields: ProfileField[] = useMemo(
    () => [
      { label: "Full Name", value: fullName },
      { label: "Nationality", value: nationality || "—" },
      { label: "Date of Birth", value: dateOfBirth || "—" },
      { label: "Government ID", value: nationalIdentity ? `${governmentIdType}: ${nationalIdentity}` : "—" },
      { label: "Phone Number", value: phone ? `${countryCode} ${phone}` : "—" },
      { label: "Secondary Email", value: secondaryEmail || "—" },
      { label: "Email Address", value: email || "—" },
      { label: "Preferred Currency", value: currency },
    ],
    [fullName, nationality, dateOfBirth, nationalIdentity, governmentIdType, phone, countryCode, secondaryEmail, email, currency]
  )

  const updateProfile = async (patch: ProfileDataPatch) => {
    saveProfileOverrides(rawUserId, patch)
    setRevision((n) => n + 1)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      
      // Broadcast across tabs via BroadcastChannel
      try {
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("vero_channel");
          bc.postMessage({ type: "vero:profile_updated", userId: rawUserId });
          bc.close();
        }
      } catch {}

      // Broadcast across tabs via Storage Event
      try {
        localStorage.setItem("vero_profile_sync", JSON.stringify({ userId: rawUserId, timestamp: Date.now() }));
      } catch {}
    }
    try {
      if (!isDemo) {
        const payload: Record<string, any> = {};
        if (patch.fullName) payload.fullName = patch.fullName;
        if (patch.dateOfBirth) payload.dateOfBirth = patch.dateOfBirth;
        if (patch.nationality) payload.nationality = patch.nationality;
        if (patch.nationalIdentity) payload.governmentId = patch.nationalIdentity;
        if ((patch as any).governmentIdType) payload.governmentIdType = (patch as any).governmentIdType;
        if ((patch as any).permanentAddress) payload.permanentAddress = (patch as any).permanentAddress;
        if (patch.documentUrl) payload.idDocument = patch.documentUrl;
        if (patch.avatarUrl) payload.profilePhoto = patch.avatarUrl;
        if (patch.currency) payload.currency = patch.currency;
        if (patch.phone) payload.phone = patch.phone;
        if (patch.accountType) payload.accountType = String(patch.accountType).toLowerCase();
        if ((patch as any).twoFactorEnabled !== undefined) payload.twoFactorEnabled = (patch as any).twoFactorEnabled;
        if ((patch as any).twoFactorMethod !== undefined) payload.twoFactorMethod = (patch as any).twoFactorMethod;

        const profileResult = await completeUserProfile(payload);
        
        if (profileResult && !profileResult.success) {
          throw new Error(profileResult.message || "Failed to sync profile to backend");
        }
      }
    } catch (e) {
      console.error("Failed to sync profile to backend", e);
    }
  }

  const status = String((user && "status" in user && user.status) ? user.status : (overrides.status ?? "pending")).toLowerCase();
  
  const dbKycStatus = (user && "kycStatus" in user && user.kycStatus) ? String(user.kycStatus).toLowerCase() : "none";
  const overrideKyc = (overrides.kycStatus ? String(overrides.kycStatus).toLowerCase() : "");

  const kycStatus = (
    overrideKyc && overrideKyc !== "none"
      ? overrideKyc
      : (dbKycStatus !== "none" ? dbKycStatus : "none")
  ).toLowerCase();

  const twoFactorEnabled =
    (overrides as any).twoFactorEnabled !== undefined
      ? Boolean((overrides as any).twoFactorEnabled)
      : ((user as any)?.twoFactorEnabled !== undefined
          ? Boolean((user as any).twoFactorEnabled)
          : getSecuritySettings(email).twoFactorEnabled);

  const twoFactorMethod =
    (overrides as any).twoFactorMethod ??
    ((user as any)?.twoFactorMethod
      ? String((user as any).twoFactorMethod)
      : getSecuritySettings(email).twoFactorMethod);
  
  // Account status is active if it's active or verified
  const isActive = status === "active" || status === "verified" || status === "approved";
  
  // KYC is verified if it's approved
  const isKycVerified = kycStatus === "approved" || status === "verified"; // Fallback for old accounts
  
  const documentUrl = overrides.documentUrl !== undefined
    ? overrides.documentUrl
    : (user && "idDocument" in user && user.idDocument ? String(user.idDocument) : "");
  
  let documentFrontUrl = "";
  let documentBackUrl = "";
  try {
    if (documentUrl.startsWith("[") && documentUrl.endsWith("]")) {
      const parsed = JSON.parse(documentUrl);
      if (Array.isArray(parsed)) {
        documentFrontUrl = parsed[0] || "";
        documentBackUrl = parsed[1] || "";
      }
    } else {
      documentFrontUrl = documentUrl;
    }
  } catch(e) {
    documentFrontUrl = documentUrl;
  }

  return {
    user,
    rawUserId,
    displayUserId: getDisplayUserId(user),
    fullName,
    accountLabel,
    email,
    secondaryEmail,
    phone,
    countryCode,
    nationality,
    dateOfBirth,
    nationalIdentity,
    governmentIdType,
    permanentAddress,
    kycApplicationData: (user as any)?.kycApplicationData || null,
    currency,
    joiningDate,
    avatarUrl,
    initials,
    hasCustomAvatar,
    status,
    kycStatus,
    twoFactorEnabled,
    twoFactorMethod,
    isActive,
    isKycVerified,
    isVerified: isKycVerified, // backwards compatibility
    documentUrl,
    documentFrontUrl,
    documentBackUrl,
    fields,
    overrides,
    updateProfile,
    isDemo,
  }
}

