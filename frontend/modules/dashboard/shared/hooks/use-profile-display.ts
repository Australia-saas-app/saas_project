"use client"

import { useMemo, useState, useEffect } from "react"
import { useUser } from "@/src/context/user.provider"
import {
  getProfileOverrides,
  saveProfileOverrides,
  type ProfileDataPatch,
  type ProfileField,
} from "@/src/shared/utils/profile-storage"
import { getUserIdFromAuthUser, isDemoAuthUser, getDisplayUserId, getInitials } from "@/src/shared/lib/demo-user"
import { completeUserProfile } from "@/src/shared/server/AuthService";

export const PROFILE_UPDATED_EVENT = "vero:profile_updated";

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
  const { user } = useUser()
  const rawUserId = getUserIdFromAuthUser(user) ?? "guest"
  const isDemo = isDemoAuthUser(user)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const handleProfileUpdate = () => setRevision(n => n + 1);
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
  }, []);

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
      { label: "National Identity", value: nationalIdentity || "—" },
      { label: "Phone Number", value: phone ? `${countryCode} ${phone}` : "—" },
      { label: "Secondary Email", value: secondaryEmail || "—" },
      { label: "Email Address", value: email || "—" },
      { label: "Preferred Currency", value: currency },
    ],
    [fullName, nationality, dateOfBirth, nationalIdentity, phone, countryCode, secondaryEmail, email, currency]
  )

  const updateProfile = async (patch: ProfileDataPatch) => {
    saveProfileOverrides(rawUserId, patch)
    setRevision((n) => n + 1)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    }
    try {
      if (!isDemo) {
        const payload: Record<string, any> = {};
        if (patch.fullName) payload.fullName = patch.fullName;
        if (patch.dateOfBirth) payload.dateOfBirth = patch.dateOfBirth;
        if (patch.nationality) payload.nationality = patch.nationality;
        if (patch.nationalIdentity) payload.governmentId = patch.nationalIdentity;
        if (patch.documentUrl) payload.idDocument = patch.documentUrl;
        if (patch.avatarUrl) payload.profilePhoto = patch.avatarUrl;
        if (patch.currency) payload.currency = patch.currency;
        if (patch.phone) payload.phone = patch.phone;
        if (patch.accountType) payload.accountType = String(patch.accountType).toLowerCase();

        const profileResult = await completeUserProfile(payload);
        
        if (profileResult && !profileResult.success) {
          throw new Error(profileResult.message || "Failed to sync profile to backend");
        }
      }
    } catch (e) {
      console.error("Failed to sync profile to backend", e);
    }
  }

  const status = String(overrides.status ?? (user && "status" in user && user.status ? user.status : "pending")).toLowerCase();
  const kycStatus = String(overrides.kycStatus ?? (user && "kycStatus" in user && user.kycStatus ? user.kycStatus : "none")).toLowerCase();
  
  // Account status is active if it's active or verified
  const isActive = status === "active" || status === "verified" || status === "approved";
  
  // KYC is verified if it's approved
  const isKycVerified = kycStatus === "approved" || status === "verified"; // Fallback for old accounts
  
  const documentUrl = overrides.documentUrl || (user && "idDocument" in user ? String(user.idDocument) : "");
  
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
    currency,
    joiningDate,
    avatarUrl,
    initials,
    hasCustomAvatar,
    status,
    kycStatus,
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

