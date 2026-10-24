import type { PaymentMethodType } from "@/src/shared/lib/payment-method-config"
import { WITHDRAWAL_METHOD_TYPES } from "@/src/shared/lib/payment-method-config"

import { scopedStorageKey } from "@/src/shared/lib/storage-scope"

export interface SavedPaymentMethod {
  id: string
  type: PaymentMethodType
  label: string
  summary: string
  details: Record<string, string>
  isDefault: boolean
}

const STORAGE_KEY = "platform_payment_methods"

function storageKey() {
  return scopedStorageKey(STORAGE_KEY)
}

export function readPaymentMethods(): SavedPaymentMethod[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedPaymentMethod[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writePaymentMethods(methods: SavedPaymentMethod[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(storageKey(), JSON.stringify(methods))
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
