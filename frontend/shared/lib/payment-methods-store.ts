import type { PaymentMethodType } from "@/src/shared/lib/payment-method-config"
import { WITHDRAWAL_METHOD_TYPES } from "@/src/shared/lib/payment-method-config"
import { scopedStorageKey } from "@/src/shared/lib/storage-scope"
import axiosInstance from "@/src/shared/lib/axiosInstance"

export interface SavedPaymentMethod {
  id: string
  type: PaymentMethodType
  label: string
  summary: string
  details: Record<string, string>
  isDefault: boolean
  createdAt?: string
}

const STORAGE_KEY = "platform_payment_methods"
const GLOBAL_KEY = "platform_payment_methods:global"

function storageKey() {
  return scopedStorageKey(STORAGE_KEY)
}

export function readPaymentMethods(): SavedPaymentMethod[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey())
    if (raw) {
      const parsed = JSON.parse(raw) as SavedPaymentMethod[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    // Fallback across scope transitions / relogin
    const globalRaw = localStorage.getItem(GLOBAL_KEY) || localStorage.getItem(STORAGE_KEY)
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw) as SavedPaymentMethod[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    return []
  } catch {
    return []
  }
}

export function writePaymentMethods(methods: SavedPaymentMethod[]) {
  if (typeof window === "undefined") return
  try {
    const serialized = JSON.stringify(methods)
    localStorage.setItem(storageKey(), serialized)
    localStorage.setItem(GLOBAL_KEY, serialized)
    localStorage.setItem(STORAGE_KEY, serialized)
  } catch {}
}

export async function fetchPaymentMethodsFromDb(): Promise<SavedPaymentMethod[]> {
  try {
    const res = await axiosInstance.get("/sso/wallet/payment-methods", { timeout: 7000 })
    const list = Array.isArray(res?.data) ? (res.data as SavedPaymentMethod[]) : []
    if (list.length > 0) {
      writePaymentMethods(list)
      return list
    }
    // If DB is currently empty but we have local methods, auto-persist them to DB
    const local = readPaymentMethods()
    if (local.length > 0) {
      for (const m of local) {
        axiosInstance.post("/sso/wallet/payment-methods", m).catch(() => undefined)
      }
      return local
    }
  } catch {
    // Fallback to local storage if API call fails
  }
  return readPaymentMethods()
}

export async function savePaymentMethodDb(
  method: Omit<SavedPaymentMethod, "id">,
  existingId?: string
): Promise<SavedPaymentMethod> {
  const localRecord = existingId
    ? updatePaymentMethod(existingId, method) || { id: existingId, ...method }
    : savePaymentMethod(method)

  writePaymentMethods(readPaymentMethods())

  try {
    const res = await axiosInstance.post("/sso/wallet/payment-methods", localRecord)
    if (res?.data?.id) {
      const serverRecord = res.data as SavedPaymentMethod
      const current = readPaymentMethods()
      const next = current.map((m) => (m.id === localRecord.id ? serverRecord : m))
      writePaymentMethods(next)
      return serverRecord
    }
  } catch (err) {
    console.warn("Save payment method to DB error:", err)
  }

  return localRecord
}

export async function deletePaymentMethodDb(id: string): Promise<boolean> {
  deletePaymentMethod(id)
  try {
    await axiosInstance.delete(`/sso/wallet/payment-methods/${encodeURIComponent(id)}`)
    return true
  } catch {
    return false
  }
}

export async function setDefaultPaymentMethodDb(id: string): Promise<SavedPaymentMethod | undefined> {
  const localDefault = setDefaultPaymentMethod(id)
  try {
    await axiosInstance.post(`/sso/wallet/payment-methods/${encodeURIComponent(id)}/default`)
  } catch {
    // Keep local default
  }
  return localDefault
}

export function savePaymentMethod(method: Omit<SavedPaymentMethod, "id">): SavedPaymentMethod {
  const existing = readPaymentMethods()
  const record: SavedPaymentMethod = {
    id: `PM-${Date.now().toString(36).toUpperCase()}`,
    ...method,
  }
  const next = method.isDefault
    ? [record, ...existing.map((m) => ({ ...m, isDefault: false }))]
    : [record, ...existing]
  writePaymentMethods(next)
  return record
}

export function updatePaymentMethod(
  id: string,
  updates: Partial<Omit<SavedPaymentMethod, "id">>
): SavedPaymentMethod | undefined {
  const existing = readPaymentMethods()
  const idx = existing.findIndex((m) => m.id === id)
  if (idx === -1) return undefined
  const updated: SavedPaymentMethod = { ...existing[idx], ...updates }
  const next = [...existing]
  next[idx] = updated
  if (updates.isDefault) {
    writePaymentMethods(next.map((m) => ({ ...m, isDefault: m.id === id })))
  } else {
    writePaymentMethods(next)
  }
  return updated
}

export function deletePaymentMethod(id: string): boolean {
  const existing = readPaymentMethods()
  const next = existing.filter((m) => m.id !== id)
  if (next.length === existing.length) return false
  if (next.length > 0 && !next.some((m) => m.isDefault)) {
    next[0] = { ...next[0], isDefault: true }
  }
  writePaymentMethods(next)
  return true
}

export function setDefaultPaymentMethod(id: string): SavedPaymentMethod | undefined {
  const existing = readPaymentMethods()
  const target = existing.find((m) => m.id === id)
  if (!target) return undefined
  writePaymentMethods(existing.map((m) => ({ ...m, isDefault: m.id === id })))
  return { ...target, isDefault: true }
}

export function isWithdrawalEligible(type: PaymentMethodType): boolean {
  return WITHDRAWAL_METHOD_TYPES.includes(type as (typeof WITHDRAWAL_METHOD_TYPES)[number])
}

export function getWithdrawalEligibleMethods(): SavedPaymentMethod[] {
  return readPaymentMethods().filter((m) => isWithdrawalEligible(m.type))
}

export async function getWithdrawalEligibleMethodsFromDb(): Promise<SavedPaymentMethod[]> {
  const all = await fetchPaymentMethodsFromDb()
  return all.filter((m) => isWithdrawalEligible(m.type))
}

