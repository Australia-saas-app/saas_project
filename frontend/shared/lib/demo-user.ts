import { DEMO_ACCOUNTS, type DemoAccountType } from "@/src/constants/demo-accounts"
import { normalizeContact } from "@/src/lib/normalize-contact"
import type { IDecodedToken, IUser } from "@/src/shared/types/auth.types"

/** Platform display IDs for seeded demo / test accounts (see mock-admin-users). */
export const DEMO_DISPLAY_IDS: Record<string, string> = {
  "demo-user": "00001",
  "demo-affiliate": "00002",
  "demo-business": "00003",
  "demo-admin": "ADM-001",
}

export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "US";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const word = parts[0];
  if (word.length >= 2) {
    return word.slice(0, 2).toUpperCase();
  }
  return word.charAt(0).toUpperCase();
}

export function getUserIdFromAuthUser(user: IUser | IDecodedToken | null): string | undefined {
  if (!user) return undefined
  if ("userId" in user && user.userId) return String(user.userId)
  if ("publicId" in user && user.publicId) return String(user.publicId)
  if ("id" in user && user.id) return String(user.id)
  return undefined
}

export function getUserEmailFromAuthUser(user: IUser | IDecodedToken | null): string | undefined {
  if (!user) return undefined
  if ("email" in user && user.email) return String(user.email)
  return undefined
}

export function resolveDemoAccountType(user: IUser | IDecodedToken | null): DemoAccountType | null {
  const id = getUserIdFromAuthUser(user)
  if (id?.startsWith("demo-")) {
    const type = id.replace(/^demo-/, "") as DemoAccountType
    if (type in DEMO_ACCOUNTS) return type
  }
  const email = getUserEmailFromAuthUser(user)
  if (email) {
    const normalized = normalizeContact(email)
    const match = Object.values(DEMO_ACCOUNTS).find(
      (account) => normalizeContact(account.email) === normalized
    )
    if (match) return match.type
  }
  return null
}

export function isDemoAccountUserId(id?: string | null): boolean {
  if (!id) return false
  return id.startsWith("demo-")
}

export function isDemoAuthUser(user: IUser | IDecodedToken | null): boolean {
  return resolveDemoAccountType(user) !== null
}

export function isRegisteredAuthUser(user: IUser | IDecodedToken | null): boolean {
  const id = getUserIdFromAuthUser(user)
  return !!id && id.startsWith("registered-")
}

function looksLikeEmail(value: string): boolean {
  return value.includes("@")
}

function registeredDisplayCode(id: string): string {
  const core = id.replace(/^registered-/, "")
  const stable = core.replace(/-\d+$/, "").replace(/-/g, "").toUpperCase()
  const suffix = stable.slice(-6) || stable.slice(0, 6) || "NEW"
  return `USR-${suffix}`
}

export function getDisplayUserId(user: IUser | IDecodedToken | null): string {
  const demoType = resolveDemoAccountType(user)
  if (demoType) {
    const demoKey = `demo-${demoType}`
    return DEMO_DISPLAY_IDS[demoKey] ?? demoKey
  }

  const id = getUserIdFromAuthUser(user)
  if (!id) return "—"
  if (DEMO_DISPLAY_IDS[id]) return DEMO_DISPLAY_IDS[id]

  if (id.startsWith("registered-")) {
    return registeredDisplayCode(id)
  }

  if (looksLikeEmail(id)) {
    return registeredDisplayCode(`registered-${id}`)
  }

  return id.length > 16 ? `${id.slice(0, 16)}…` : id
}

export function getAffiliateReferralCode(user: IUser | IDecodedToken | null): string {
  const displayId = getDisplayUserId(user)
  if (displayId === "—") return "AFF-PENDING"
  const digits = displayId.replace(/\D/g, "")
  if (digits.length >= 3) return `AFF${digits.padStart(5, "0").slice(-5)}`
  return `AFF-${displayId.replace(/\s/g, "")}`
}

export function formatAccountIdLabel(user: IUser | IDecodedToken | null): string {
  return `ID : ${getDisplayUserId(user)}`
}

export function demoOrEmpty<T>(user: IUser | IDecodedToken | null, demoValue: T, emptyValue: T): T {
  return isDemoAuthUser(user) ? demoValue : emptyValue
}
