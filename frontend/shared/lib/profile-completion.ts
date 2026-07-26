/**
 * Client-side profile completion for registered (non-demo) accounts.
 * Sign up stays lightweight; work unlocks only after role-specific profile + admin review.
 */

const STORAGE_KEY = "profile-completion"

export type ProfileAccountType = "user" | "affiliate" | "business"

export interface ProfileCompletionRecord {
  complete: boolean
  accountType: ProfileAccountType
  completedAt?: string
  data?: Record<string, unknown>
}

type CompletionMap = Record<string, ProfileCompletionRecord>

function readAll(): CompletionMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CompletionMap
  } catch {
    return {}
  }
}

function writeAll(map: CompletionMap) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function getProfileCompletion(userId: string): ProfileCompletionRecord | null {
  if (!userId) return null
  return readAll()[userId] ?? null
}

import { getProfileOverrides } from "@/src/shared/utils/profile-storage"

export function isProfileComplete(userId: string | undefined | null): boolean {
  if (!userId) return false
  if (getProfileCompletion(userId)?.complete === true) return true
  const overrides = getProfileOverrides(userId)
  const status = String(overrides?.status ?? "").toLowerCase()
  return status === "active" || status === "verified" || status === "approved"
}

export function markProfileComplete(
  userId: string,
  accountType: ProfileAccountType,
  data: Record<string, unknown> = {}
): ProfileCompletionRecord {
  const record: ProfileCompletionRecord = {
    complete: true,
    accountType,
    completedAt: new Date().toISOString(),
    data,
  }
  const all = readAll()
  all[userId] = record
  writeAll(all)
  return record
}

export function clearProfileCompletion(userId: string) {
  const all = readAll()
  delete all[userId]
  writeAll(all)
}

export function completeProfilePath(accountType: ProfileAccountType): string {
  return `/${accountType}/complete-profile`
}

export function isCompleteProfilePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  return /^\/(user|affiliate|business)\/complete-profile\/?$/.test(pathname)
}

/** Map onboarding wizard fields into profile display overrides. */
export function profileOverridesFromOnboarding(data: Record<string, unknown>): Record<string, string> {
  const pick = (key: string) => {
    const value = data[key]
    return typeof value === "string" && value.trim() ? value.trim() : undefined
  }

  const overrides: Record<string, string> = {}
  const fullName = pick("fullName")
  if (fullName) overrides["Full Name"] = fullName

  const nationality = pick("nationality")
  if (nationality) overrides.Nationality = nationality

  const dob = pick("dateOfBirth")
  if (dob) overrides["Date of Birth"] = dob

  const phone = pick("phoneNumber") ?? pick("businessPhone")
  if (phone) overrides.Phone = phone

  const email = pick("email") ?? pick("businessEmail")
  if (email) overrides.Email = email

  const brand = pick("brandName") ?? pick("businessName")
  if (brand) overrides["Brand / Business"] = brand

  return overrides
}
