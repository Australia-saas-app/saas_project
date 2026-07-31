import { scopedStorageKey } from "@/src/shared/lib/storage-scope"

const BASE_KEY = "account_security_settings"

export interface SecuritySettings {
  twoFactorEnabled: boolean
  twoFactorMethod: string
  updatedAt: string
}

const DEFAULT: SecuritySettings = {
  twoFactorEnabled: false,
  twoFactorMethod: "",
  updatedAt: "",
}

function key(): string {
  return scopedStorageKey(BASE_KEY)
}

export function getSecuritySettings(emailOrUserId?: string): SecuritySettings {
  if (typeof window === "undefined") return DEFAULT
  try {
    // 1. If email or userId is provided, look up email key first
    if (emailOrUserId && emailOrUserId.trim()) {
      const cleanKey = emailOrUserId.toLowerCase().trim()
      const emailKey = `account_security_2fa_${cleanKey}`
      const rawEmail = localStorage.getItem(emailKey)
      if (rawEmail) return { ...DEFAULT, ...(JSON.parse(rawEmail) as SecuritySettings) }
    }

    // 2. Look up active user scoped key
    const rawScoped = localStorage.getItem(key())
    if (rawScoped) return { ...DEFAULT, ...(JSON.parse(rawScoped) as SecuritySettings) }

    // 3. Fallback to global setting
    const rawGlobal = localStorage.getItem("account_security_global_2fa")
    if (rawGlobal) return { ...DEFAULT, ...(JSON.parse(rawGlobal) as SecuritySettings) }

    return DEFAULT
  } catch {
    return DEFAULT
  }
}

export function saveSecuritySettings(patch: Partial<SecuritySettings>, emailOrUserId?: string): SecuritySettings {
  const current = getSecuritySettings(emailOrUserId)
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("account_security_global_2fa", JSON.stringify(next))
    try {
      localStorage.setItem(key(), JSON.stringify(next))
    } catch {}
    if (emailOrUserId && emailOrUserId.trim()) {
      const cleanKey = emailOrUserId.toLowerCase().trim()
      const emailKey = `account_security_2fa_${cleanKey}`
      localStorage.setItem(emailKey, JSON.stringify(next))
    }
  }
  return next
}
