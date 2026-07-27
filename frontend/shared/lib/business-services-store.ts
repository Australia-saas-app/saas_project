import {
  BUSINESS_SERVICE_ROWS,
  type BusinessServiceRow,
  type ServiceStatus,
} from "@/src/modules/dashboard/business/data/business-demo-data"
import { isDemoAccountUserId } from "@/src/shared/lib/demo-user"
import { getStorageUserScope, scopedStorageKey } from "@/src/shared/lib/storage-scope"

const STORAGE_BASE = "business_service_rows"

function storageKey(): string {
  return scopedStorageKey(STORAGE_BASE)
}

function readAll(): BusinessServiceRow[] {
  if (typeof window === "undefined") return []
  try {
    const rawScoped = localStorage.getItem(storageKey())
    const rawGlobal = localStorage.getItem("business_service_rows")
    const itemsMap = new Map<string, BusinessServiceRow>()
    
    if (rawGlobal) {
      const parsed = JSON.parse(rawGlobal) as BusinessServiceRow[]
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => itemsMap.set(item.id, item))
      }
    }
    
    if (rawScoped) {
      const parsed = JSON.parse(rawScoped) as BusinessServiceRow[]
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => itemsMap.set(item.id, item))
      }
    }

    return Array.from(itemsMap.values())
  } catch {
    return []
  }
}

function writeAll(rows: BusinessServiceRow[]) {
  if (typeof window === "undefined") return
  const data = JSON.stringify(rows)
  localStorage.setItem(storageKey(), data)
  localStorage.setItem("business_service_rows", data)
}

function seedDemoIfNeeded(): BusinessServiceRow[] {
  const scope = getStorageUserScope()
  if (!isDemoAccountUserId(scope)) return []
  const demoRows = [...BUSINESS_SERVICE_ROWS]
  writeAll(demoRows)
  return demoRows
}

export function getBusinessServices(): BusinessServiceRow[] {
  const existing = readAll()
  if (existing.length > 0) return existing
  return seedDemoIfNeeded()
}

export function addBusinessService(row: BusinessServiceRow) {
  writeAll([row, ...readAll()])
}

export function updateBusinessService(id: string, updates: Partial<BusinessServiceRow>) {
  writeAll(readAll().map((r) => (r.id === id ? { ...r, ...updates } : r)))
}

export function deleteBusinessService(id: string) {
  writeAll(readAll().filter((r) => r.id !== id))
}

export function formatDeadlineDisplay(isoDate: string): string {
  if (!isoDate) return ""
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}

export function serviceStatsFromRows(rows: BusinessServiceRow[]) {
  return {
    active: rows.filter((r) => r.status === "Active").length,
    pending: rows.filter((r) => r.status === "Pending").length,
    completed: rows.filter((r) => r.status === "Completed").length,
  }
}

export type { BusinessServiceRow, ServiceStatus }
