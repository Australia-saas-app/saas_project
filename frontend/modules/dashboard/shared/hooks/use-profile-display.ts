"use client"

import { useMemo, useState } from "react"
import { useUser } from "@/src/context/user.provider"
import {
  getProfileOverrides,
  saveProfileOverrides,
  type ProfileDataPatch,
  type ProfileField,
} from "@/src/shared/utils/profile-storage"
import { getUserIdFromAuthUser, isDemoAuthUser, getDisplayUserId, getInitials } from "@/src/shared/lib/demo-user"

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
    (user && "createdAt" in user && user.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : isDemo
        ? "Jan 1, 2024"
        : "—")

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

  const updateProfile = (patch: ProfileDataPatch) => {
    saveProfileOverrides(rawUserId, patch)
    setRevision((n) => n + 1)
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
    fields,
    overrides,
    updateProfile,
    isDemo,
  }
}
