/**
 * Extended wallet ledger: deposits, security deposits, withdraw holds, refunds.
 * Complements withdrawals in wallet-store.ts.
 */

import { addAdminTransaction } from "./admin-transactions-store"

const LEDGER_KEY = "platform_wallet_ledger"

export type LedgerKind = "deposit" | "security_deposit" | "withdraw_hold" | "refund"

export interface WalletLedgerRecord {
  id: string
  kind: LedgerKind
  userId: string
  userName: string
  amount: string
  method: string
  note?: string
  status: "Pending" | "Processing" | "Complete" | "Completed" | "Held" | "Released" | "Failed" | "Rejected" | "Reject"
  date: string
}

function readAll(): WalletLedgerRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LEDGER_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WalletLedgerRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(records: WalletLedgerRecord[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(LEDGER_KEY, JSON.stringify(records))
}

function stampId(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`
}

function stampDate() {
  return new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getLedgerForUser(userId: string, kind?: LedgerKind): WalletLedgerRecord[] {
  return readAll().filter((r) => r.userId === userId && (!kind || r.kind === kind))
}

export function submitDeposit(input: {
  userId: string
  userName: string
  amount: number
  method: string
  note?: string
}): WalletLedgerRecord {
  const date = stampDate()
  const record: WalletLedgerRecord = {
    id: stampId("DP"),
    kind: "deposit",
    userId: input.userId,
    userName: input.userName,
    amount: `$${input.amount.toFixed(2)} USD`,
    method: input.method,
    note: input.note,
    status: "Pending",
    date,
  }
  writeAll([record, ...readAll()])
  addAdminTransaction({
    id: record.id,
    type: "Deposit",
    user: input.userName,
    amount: record.amount,
    method: input.method,
    status: "Pending",
    date,
  })
  return record
}

export function submitSecurityDeposit(input: {
  userId: string
  userName: string
  amount: number
  projectLabel: string
}): WalletLedgerRecord {
  const date = stampDate()
  const record: WalletLedgerRecord = {
    id: stampId("SD"),
    kind: "security_deposit",
    userId: input.userId,
    userName: input.userName,
    amount: `$${input.amount.toFixed(2)} USD`,
    method: input.projectLabel,
    note: "Security deposit",
    status: "Held",
    date,
  }
  writeAll([record, ...readAll()])
  addAdminTransaction({
    id: record.id,
    type: "Security Deposit",
    user: input.userName,
    amount: record.amount,
    method: input.projectLabel,
    status: "Pending",
    date,
  })
  return record
}

export function placeWithdrawHold(input: {
  userId: string
  userName: string
  amount: number
  reason: string
}): WalletLedgerRecord {
  const date = stampDate()
  const record: WalletLedgerRecord = {
    id: stampId("WH"),
    kind: "withdraw_hold",
    userId: input.userId,
    userName: input.userName,
    amount: `$${input.amount.toFixed(2)} USD`,
    method: input.reason,
    status: "Held",
    date,
  }
  writeAll([record, ...readAll()])
  return record
}

export const DEMO_LEDGER_SEED: Omit<WalletLedgerRecord, "userId" | "userName">[] = [
  {
    id: "DP-100201",
    kind: "deposit",
    amount: "$250.00 USD",
    method: "Card · Visa ****4242",
    status: "Complete",
    date: "03/12/2026, 10:20 AM",
  },
  {
    id: "SD-100088",
    kind: "security_deposit",
    amount: "$100.00 USD",
    method: "Technical Project TP-204",
    status: "Held",
    date: "03/01/2026, 02:15 PM",
  },
  {
    id: "WH-100044",
    kind: "withdraw_hold",
    amount: "$40.00 USD",
    method: "Compliance review",
    status: "Held",
    date: "02/28/2026, 09:00 AM",
  },
  {
    id: "RF-100011",
    kind: "refund",
    amount: "$55.00 USD",
    method: "Order #504 return",
    status: "Complete",
    date: "02/20/2026, 04:40 PM",
  },
]
