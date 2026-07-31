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
    if (emailOrUserId) {
      const emailKey = `account_security_2fa_${emailOrUserId.toLowerCase().trim()}`
      const rawEmail = localStorage.getItem(emailKey)
      if (rawEmail) return { ...DEFAULT, ...(JSON.parse(rawEmail) as SecuritySettings) }
    }
    const rawGlobal = localStorage.getItem("account_security_global_2fa")
    if (rawGlobal) return { ...DEFAULT, ...(JSON.parse(rawGlobal) as SecuritySettings) }

    const raw = localStorage.getItem(key())
    if (!raw) return DEFAULT
    return { ...DEFAULT, ...(JSON.parse(raw) as SecuritySettings) }
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
    if (emailOrUserId) {
      const emailKey = `account_security_2fa_${emailOrUserId.toLowerCase().trim()}`
      localStorage.setItem(emailKey, JSON.stringify(next))
    }
    try {
      localStorage.setItem(key(), JSON.stringify(next))
    } catch {}
  }
  return next
}
