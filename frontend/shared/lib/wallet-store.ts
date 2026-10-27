import type { WithdrawRequestResult } from "@/src/modules/dashboard/shared/components/WithdrawRequestModal"
import { addAdminTransaction, removeAdminTransaction } from "./admin-transactions-store"

const WITHDRAWALS_KEY = "platform_wallet_withdrawals"

export interface WalletWithdrawalRecord extends WithdrawRequestResult {
  userId: string
  userName: string
  status: "Pending" | "Processing" | "Complete" | "Failed"
  methodType: string
  createdAt?: string
}

function readWithdrawals(): WalletWithdrawalRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(WITHDRAWALS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WalletWithdrawalRecord[]
    if (!Array.isArray(parsed)) return []
    const unique = new Map<string, WalletWithdrawalRecord>()
    for (const item of parsed) {
      if (item && item.id && !unique.has(item.id)) {
        unique.set(item.id, item)
      }
    }
    return Array.from(unique.values())
  } catch {
    return []
  }
}

function writeWithdrawals(records: WalletWithdrawalRecord[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(records))
}

import axiosInstance from "./axiosInstance";

export function getWithdrawalsForUser(userId?: string, extraIds?: string[]): WalletWithdrawalRecord[] {
  const all = readWithdrawals();
  if (!userId) return all;
  const matchSet = new Set(
    [userId, ...(extraIds || [])]
      .filter(Boolean)
      .map((s) => String(s).trim().toLowerCase())
  );
  return all.filter((r) => {
    const rUid = String(r.userId || "").trim().toLowerCase();
    return !rUid || matchSet.has(rUid);
  });
}

export async function fetchWalletWithdrawalsFromDb(): Promise<WalletWithdrawalRecord[]> {
  try {
    const res = await axiosInstance.get("/sso/wallet/transactions?all=true");
    const list = res?.data?.data || res?.data || [];
    if (!Array.isArray(list)) return [];

    const mapped = list
      .filter((t: any) => {
        const typeStr = String(t.type || "").toUpperCase();
        const desc = String(t.description || "").toLowerCase();
        const statusRaw = String(t.status || "").toLowerCase();
        const isReverted = desc.includes("revert") || statusRaw === "reverted";
        return (typeStr === "WITHDRAWAL" || typeStr.includes("WITHDRAW")) && !isReverted;
      })
      .map((t: any) => {
        const amt = typeof t.amount === "number" ? `$${t.amount.toFixed(2)}` : String(t.amount || "$0.00");
        const txId = t.transactionId || t.id || "";
        const methodStr = t.paymentMethod || t.description || "Wallet Withdrawal";
        const dateStr = t.createdAt
          ? new Date(t.createdAt).toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Recently";

        const statusRaw = String(t.status || "").toUpperCase();
        const status =
          statusRaw === "COMPLETED" || statusRaw === "COMPLETE" || statusRaw === "APPROVED" || statusRaw === "PAID"
            ? "Complete"
            : statusRaw === "FAILED" || statusRaw === "REJECTED"
              ? "Failed"
              : "Pending";

        return {
          id: txId,
          amount: amt.startsWith("$") ? amt : `$${amt}`,
          method: methodStr,
          date: dateStr,
          createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
          status,
          userId: String(t.userId || ""),
          userName: String(t.userName || "User"),
          methodType: "Withdrawal",
        } as WalletWithdrawalRecord;
      });

    // Sync into localStorage cache so immediate render on reload has these without delay
    if (mapped.length > 0 && typeof window !== "undefined") {
      try {
        const existing = readWithdrawals();
        const map = new Map<string, WalletWithdrawalRecord>();
        mapped.forEach((m) => map.set(m.id, m));
        existing.forEach((e) => {
          if (!map.has(e.id)) map.set(e.id, e);
        });
        writeWithdrawals(Array.from(map.values()));
      } catch {}
    }

    return mapped;
  } catch {
    return [];
  }
}

function generateMixedAlphaNumericTxId(prefix = "WD"): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomPart = "";
  for (let i = 0; i < 12; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${randomPart}`;
}

export function submitWithdrawalRequest(input: {
  id?: string
  userId: string
  userName: string
  amount: number | string
  methodId?: string
  methodLabel?: string
  methodType?: string
  method?: string
}): WalletWithdrawalRecord {
  const id = input.id || generateMixedAlphaNumericTxId("WD");
  const nowIso = new Date().toISOString();
  const date = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const amountStr =
    typeof input.amount === "number"
      ? `$${input.amount.toFixed(2)}`
      : input.amount.startsWith("$")
        ? input.amount
        : `$${input.amount}`;
  const methodStr = input.method || `${input.methodType || "Payout"} · ${input.methodLabel || ""}`;

  const record: WalletWithdrawalRecord = {
    id,
    amount: amountStr,
    method: methodStr,
    date,
    createdAt: nowIso,
    userId: input.userId,
    userName: input.userName,
    status: "Pending",
    methodType: input.methodType || "Withdrawal",
  };

  const filtered = readWithdrawals().filter((r) => r.id !== id);
  writeWithdrawals([record, ...filtered]);

  addAdminTransaction({
    id,
    type: "Withdrawal",
    user: input.userName,
    amount: record.amount,
    method: record.method,
    status: "Pending",
    date,
  });

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("wallet_updated"));
      window.dispatchEvent(new CustomEvent("vero:withdrawal_updated"));
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("wallet_channel");
        bc.postMessage({ type: "wallet_updated" });
        bc.close();
      }
    } catch {}
  }

  return record;
}

export function updateWithdrawalStatus(id: string, status: WalletWithdrawalRecord["status"]) {
  writeWithdrawals(
    readWithdrawals().map((r) => (r.id === id ? { ...r, status } : r))
  );
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("wallet_updated"));
      window.dispatchEvent(new CustomEvent("vero:withdrawal_updated"));
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("wallet_channel");
        bc.postMessage({ type: "wallet_updated" });
        bc.close();
      }
    } catch {}
  }
}

export function removeWithdrawalRequest(id: string) {
  writeWithdrawals(readWithdrawals().filter((r) => r.id !== id));
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("wallet_updated"));
      window.dispatchEvent(new CustomEvent("vero:withdrawal_updated"));
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("wallet_channel");
        bc.postMessage({ type: "wallet_updated" });
        bc.close();
      }
    } catch {}
  }
}

export async function revertWithdrawalRequest(
  id: string,
  amount?: number | string,
  userId?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await axiosInstance.post(`/sso/wallet/withdrawals/${encodeURIComponent(id)}/revert`, { userId });
  } catch (err: any) {
    try {
      await axiosInstance.post(`/sso/wallet/admin/withdrawals/${encodeURIComponent(id)}/revert`, { userId });
    } catch {}
  }

  // 1. Remove from user local storage withdrawals
  removeWithdrawalRequest(id);

  // 2. Remove from admin transactions store
  removeAdminTransaction(id);

  // 3. Dispatch global sync events across tabs & components
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("wallet_updated"));
      window.dispatchEvent(new CustomEvent("vero:withdrawal_updated"));

      if ("BroadcastChannel" in window) {
        const bc1 = new BroadcastChannel("vero_channel");
        bc1.postMessage({ type: "vero:withdrawal_updated" });
        bc1.close();

        const bc2 = new BroadcastChannel("wallet_channel");
        bc2.postMessage({ type: "wallet_updated" });
        bc2.close();
      }
    } catch {}
  }

  return { success: true };
}
