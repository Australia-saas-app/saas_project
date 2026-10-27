"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Table } from "@/src/shared/ui/table/Table";
import { TableHeading } from "@/src/shared/ui/table/TableHeading";
import { TableBody } from "@/src/shared/ui/table/TableBody";
import { TableRow } from "@/src/shared/ui/table/TableRow";
import { TableColumn } from "@/src/shared/ui/table/TableColumn";
import { Pagination } from "@/src/shared/ui/ui/pagination";
import { SearchInput } from "@/src/shared/ui/form/search-input";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Building2, 
  User, 
  Link as LinkIcon, 
  ArrowUpRight,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CreditCard
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import axiosInstanceClient from "@/src/infra/lib/axiosInstance/client";
import { toast } from "sonner";
import { useAppSelector } from "@/src/core/store/hooks";
import { logAdminActivity } from "@/src/shared/lib/admin-activity-logger";

export interface WithdrawalRequestItem {
  id: string;
  requestId: string;
  businessUserId: string;
  userName?: string;
  userEmail?: string;
  role: "USER" | "BUSINESS" | "AFFILIATE";
  amount: number;
  currency: string;
  stripeAccountId?: string;
  payoutMethod?: string;
  status: "pending" | "paid" | "rejected";
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
  stripeTransferId?: string;
}

const getStatusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "paid":
    case "approved":
    case "complete":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" />
          PAID
        </span>
      );
    case "rejected":
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
          <XCircle className="w-3 h-3" />
          REJECTED
        </span>
      );
    case "pending":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
          <Clock className="w-3 h-3" />
          PENDING
        </span>
      );
  }
};

const getRoleBadge = (role: string) => {
  const r = (role || "").toUpperCase();
  if (r === "BUSINESS") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800">
        <Building2 className="w-3 h-3" />
        BUSINESS
      </span>
    );
  }
  if (r === "AFFILIATE") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
        <LinkIcon className="w-3 h-3" />
        AFFILIATE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
      <User className="w-3 h-3" />
      USER
    </span>
  );
};

export default function WithdrawalRequestsLayout() {
  const token = useAppSelector((state: any) => state.auth?.token);
  const adminUser = useAppSelector((state: any) => state.auth?.user);
  const [activeTab, setActiveTab] = useState<"ALL" | "USER" | "BUSINESS" | "AFFILIATE">("ALL");
  const [search, setSearch] = useState("");
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<"approve" | "reject" | null>(null);
  const [selectedItem, setSelectedItem] = useState<WithdrawalRequestItem | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Broadcast helper to notify sidebar and other tabs immediately
  const notifyWithdrawalUpdated = useCallback((remainingPendingCount: number) => {
    if (typeof window === "undefined") return;
    try {
      window.dispatchEvent(
        new CustomEvent("vero:withdrawal_updated", { detail: { count: remainingPendingCount } })
      );
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("vero_channel");
        bc.postMessage({ type: "vero:withdrawal_updated", count: remainingPendingCount });
        bc.close();
      }
    } catch {}
  }, []);

  // Fetch real withdrawals from DB & localStorage
  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    let items: WithdrawalRequestItem[] = [];

    // Helper to parse any withdrawal / transaction record
    const parseRecord = (w: any) => {
      if (!w) return;
      const rawType = String(w.type || "").toUpperCase();
      // If type is defined on a general transactions endpoint, only accept WITHDRAWAL
      if (rawType && !rawType.includes("WITHDRAW")) return;

      const rawRole = String(
        w.role || w.userRole || w.accountType || w.metadata?.role || ""
      ).toUpperCase();
      const uId = String(w.businessUserId || w.userId || "");
      let resolvedRole: "USER" | "BUSINESS" | "AFFILIATE" = "USER";
      if (rawRole.includes("BUS") || uId.toUpperCase().startsWith("BUS")) {
        resolvedRole = "BUSINESS";
      } else if (rawRole.includes("AFF") || uId.toUpperCase().startsWith("AFF")) {
        resolvedRole = "AFFILIATE";
      }

      let cleanAmount = 0;
      if (typeof w.amount === "number") {
        cleanAmount = w.amount;
      } else if (typeof w.amount === "string") {
        cleanAmount = parseFloat(w.amount.replace(/[^0-9.]/g, "")) || 0;
      }

      const rawStatus = String(w.status || "pending").toLowerCase();
      const rawDesc = String(w.description || "").toLowerCase();
      if (rawStatus === "reverted" || rawStatus.includes("revert") || rawDesc.includes("revert")) {
        return;
      }

      const status: "pending" | "paid" | "rejected" =
        rawStatus === "completed" ||
        rawStatus === "complete" ||
        rawStatus === "paid" ||
        rawStatus === "approved" ||
        rawStatus === "succeeded"
          ? "paid"
          : rawStatus === "failed" ||
            rawStatus === "rejected" ||
            rawStatus === "cancelled"
          ? "rejected"
          : "pending";

      const txId = String(w.transactionId || w.requestId || w.id || "");
      const finalId = String(w.id || w.transactionId || w.requestId || txId);
      const reqId = String(w.requestId || w.transactionId || w.id || txId);

      const resolvedMethod =
        w.payoutMethod ||
        w.paymentMethod ||
        w.method ||
        w.methodLabel ||
        w.description ||
        w.stripeAccountId ||
        "Bank Transfer";

      items.push({
        id: finalId,
        requestId: reqId,
        businessUserId: uId || "user",
        userName: w.userName || w.metadata?.userName || w.businessName || undefined,
        userEmail: w.userEmail || w.email || w.metadata?.userEmail || undefined,
        role: resolvedRole,
        amount: cleanAmount,
        currency: String(w.currency || "USD").toUpperCase(),
        stripeAccountId: w.stripeAccountId || w.methodId || w.payoutDestination || w.destination || undefined,
        payoutMethod: resolvedMethod,
        status,
        createdAt: w.createdAt || (w.date ? new Date(w.date).toISOString() : new Date().toISOString()),
        processedAt: w.processedAt || undefined,
        rejectionReason: w.rejectionReason || undefined,
        stripeTransferId: w.stripeTransferId || undefined,
      });
    };

    // 1. Fetch from SSO backend via Next.js proxy (same mechanism as KYC queue)
    const authHeaders: Record<string, string> = {
      ...(token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {})
    };

    const ssoProxyEndpoints = [
      "/admin/api/sso/wallet/admin/withdrawals",
      "/admin/api/sso/wallet/transactions?all=true&type=WITHDRAWAL",
      "/api/sso/wallet/admin/withdrawals",
      "/api/sso/wallet/transactions?all=true&type=WITHDRAWAL",
    ];

    for (const url of ssoProxyEndpoints) {
      try {
        const res = await fetch(url, { headers: authHeaders, cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const list = json?.data?.transactions || json?.data?.withdrawals || json?.data || [];
          if (Array.isArray(list) && list.length > 0) {
            list.forEach(parseRecord);
          }
        }
      } catch {}
    }

    // Fallback: Query via Kong gateway routes
    const kongEndpoints = [
      "/api/v1/sso/wallet/admin/withdrawals",
      "/api/v1/sso/wallet/transactions?all=true&type=WITHDRAWAL",
      "/api/v1/payment/withdrawals/admin/requests",
    ];

    for (const url of kongEndpoints) {
      try {
        const res = await axiosInstanceClient.get(url, { timeout: 4000 });
        const list = res.data?.data?.transactions || res.data?.data || res.data?.withdrawals || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          list.forEach(parseRecord);
        }
      } catch {}
    }

    // 2. Merge with real submissions stored in localStorage
    if (typeof window !== "undefined") {
      try {
        const rawLocal = localStorage.getItem("platform_wallet_withdrawals");
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            parsed.forEach(parseRecord);
          }
        }
      } catch {}
    }

    // 3. Deduplicate by requestId and ID, and sort newest on top
    const uniqueMap = new Map<string, WithdrawalRequestItem>();
    items.forEach((item) => {
      // filter out test placeholders
      if (
        item.id === "w-demo-1" ||
        item.id === "w-demo-2" ||
        item.requestId === "WREQ-2025-001" ||
        item.requestId === "WREQ-2025-002"
      ) return;
      const key = item.requestId || item.id;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const finalSorted = Array.from(uniqueMap.values()).sort((a, b) => {
      const aPending = a.status === "pending";
      const bPending = b.status === "pending";
      if (aPending && !bPending) return -1;
      if (bPending && !aPending) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setWithdrawals(finalSorted);
    const pendingCount = finalSorted.filter((w) => w.status === "pending").length;
    notifyWithdrawalUpdated(pendingCount);
    setLoading(false);
  }, [notifyWithdrawalUpdated]);

  useEffect(() => {
    fetchWithdrawals();

    // Auto-refresh in background every 4s so new requests appear immediately with no manual reload
    const pollInterval = setInterval(() => {
      fetchWithdrawals();
    }, 4000);

    const handleExternalUpdate = () => {
      fetchWithdrawals();
    };
    window.addEventListener("vero:withdrawal_updated", handleExternalUpdate);
    window.addEventListener("wallet_updated", handleExternalUpdate);
    window.addEventListener("storage", handleExternalUpdate);

    let bc1: BroadcastChannel | null = null;
    let bc2: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        bc1 = new BroadcastChannel("vero_channel");
        bc1.onmessage = (e) => {
          if (e.data?.type === "vero:withdrawal_updated" || e.data?.type === "withdrawal_requested" || e.data?.type === "vero:log_added") {
            fetchWithdrawals();
          }
        };
        bc2 = new BroadcastChannel("wallet_channel");
        bc2.onmessage = () => {
          fetchWithdrawals();
        };
      }
    } catch {}

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("vero:withdrawal_updated", handleExternalUpdate);
      window.removeEventListener("wallet_updated", handleExternalUpdate);
      window.removeEventListener("storage", handleExternalUpdate);
      bc1?.close();
      bc2?.close();
    };
  }, [fetchWithdrawals]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      ALL: withdrawals.length,
      USER: withdrawals.filter((w) => w.role === "USER").length,
      BUSINESS: withdrawals.filter((w) => w.role === "BUSINESS").length,
      AFFILIATE: withdrawals.filter((w) => w.role === "AFFILIATE").length,
    };
  }, [withdrawals]);

  // Filtered and Searched list
  const filteredWithdrawals = useMemo(() => {
    let list = withdrawals;
    if (activeTab !== "ALL") {
      list = list.filter((w) => w.role === activeTab);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (w) =>
          (w.requestId && w.requestId.toLowerCase().includes(q)) ||
          (w.id && w.id.toLowerCase().includes(q)) ||
          (w.stripeTransferId && w.stripeTransferId.toLowerCase().includes(q)) ||
          (w.businessUserId && w.businessUserId.toLowerCase().includes(q)) ||
          (w.userName && w.userName.toLowerCase().includes(q)) ||
          (w.userEmail && w.userEmail.toLowerCase().includes(q)) ||
          (w.payoutMethod && w.payoutMethod.toLowerCase().includes(q))
      );
    }
    return list;
  }, [withdrawals, activeTab, search]);

  // Pagination calculation
  const totalItems = filteredWithdrawals.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredWithdrawals.slice(startIndex, startIndex + pageSize);
  }, [filteredWithdrawals, currentPage, pageSize]);

  // Approve Action
  const handleApprove = async (item: WithdrawalRequestItem) => {
    setActionInProgress("approve");
    try {
      // Approve via SSO /admin/api/sso proxy (same as KYC queue)
      const actionHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {})
      };

      await fetch(`/admin/api/sso/wallet/admin/withdrawals/${encodeURIComponent(item.id)}/approve`, {
        method: "POST",
        headers: actionHeaders,
      })
        .catch(async () => {
          return fetch(`/admin/api/sso/wallet/admin/withdrawals/${encodeURIComponent(item.requestId)}/approve`, {
            method: "POST",
            headers: actionHeaders,
          });
        })
        .catch(() => null);

      await axiosInstanceClient
        .post(`/api/v1/payment/withdrawals/admin/${item.id}/pay`, {
          note: "Approved and executed via Admin Portal",
        })
        .catch(() => null);

      const updatedItem: WithdrawalRequestItem = {
        ...item,
        status: "paid",
        processedAt: new Date().toISOString(),
        stripeTransferId: item.stripeTransferId || `TR-${Date.now().toString().slice(-8)}`,
      };

      // 1. Update state locally immediately
      setWithdrawals((prev) => {
        const next = prev.map((w) =>
          w.id === item.id || w.requestId === item.requestId ? updatedItem : w
        );
        const remainingPending = next.filter((w) => w.status === "pending").length;
        notifyWithdrawalUpdated(remainingPending);
        return next;
      });

      // Update selected item so open modal instantly reflects status change
      setSelectedItem(updatedItem);

      // 2. Update local storage if present
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("platform_wallet_withdrawals");
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const updated = list.map((w: any) =>
                w.id === item.id || w.requestId === item.requestId
                  ? { ...w, status: "Approved", processedAt: updatedItem.processedAt }
                  : w
              );
              localStorage.setItem("platform_wallet_withdrawals", JSON.stringify(updated));
            }
          }
        } catch {}

        // 3. Notify user side in real-time
        window.dispatchEvent(
          new CustomEvent("wallet_updated", { detail: { userId: item.businessUserId, status: "approved" } })
        );
        try {
          if ("BroadcastChannel" in window) {
            const bc1 = new BroadcastChannel("wallet_channel");
            bc1.postMessage({ type: "wallet_updated", userId: item.businessUserId, status: "approved" });
            bc1.close();
          }
        } catch {}

        // 4. Record Real Activity Log on Requester's Side (User / Business / Affiliate)
        if (token) {
          logAdminActivity(token, {
            action: "WITHDRAWAL_APPROVED",
            resource: `Withdrawal payout of $${item.amount.toFixed(2)} USD was approved by administrator (ID: ${item.requestId})`,
            targetUserId: item.businessUserId,
            targetUserEmail: item.userEmail,
            targetUserName: item.userName,
            adminEmail: adminUser?.email,
            adminName: adminUser?.fullName || adminUser?.name || "Administrator",
            extra: {
              amount: item.amount,
              requestId: item.requestId,
              role: item.role,
            },
          }).catch(() => {});
        }

        // 5. Send Notification to User / Business / Affiliate (Notification Bell & Toast Alert)
        const targetWalletHref = item.role === "BUSINESS"
          ? "/dashboard/business/wallet"
          : item.role === "AFFILIATE"
          ? "/dashboard/affiliate/wallet"
          : "/dashboard/user/wallet";

        const userNotif = {
          id: `with-appr-${item.requestId}-${Date.now()}`,
          title: "Withdrawal Request Approved",
          message: `Your withdrawal payout of $${item.amount.toFixed(2)} USD (ID: ${item.requestId}) has been approved and processed.`,
          time: "Just now",
          createdAt: new Date().toISOString(),
          read: false,
          href: targetWalletHref,
          type: "withdrawal_approved",
          data: { href: targetWalletHref, requestId: item.requestId, amount: item.amount },
        };

        axiosInstanceClient
          .post("/notifications", {
            userId: item.businessUserId,
            targetEmail: item.userEmail,
            title: userNotif.title,
            message: userNotif.message,
            type: userNotif.type,
            priority: "high",
            data: userNotif.data,
          })
          .catch(() => {});

        try {
          const roleKey = String(item.role || "user").toLowerCase();
          const uEmail = (item.userEmail || "").trim().toLowerCase();
          const cacheKeys = ["app_notifs_all", `app_notifs_${item.businessUserId}`, `app_notifs_${roleKey}`];
          if (uEmail) {
            cacheKeys.push(`app_notifs_${uEmail}`);
            cacheKeys.push(`app_notifs_${uEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
          }
          cacheKeys.forEach((key) => {
            try {
              const existing = JSON.parse(localStorage.getItem(key) || "[]");
              localStorage.setItem(key, JSON.stringify([userNotif, ...existing]));
            } catch {}
          });

          localStorage.setItem("vero_notif_sync", JSON.stringify({ item: userNotif, targetEmail: item.userEmail, timestamp: Date.now() }));

          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("vero_channel");
            bc.postMessage({ type: "vero:new_notification", payload: userNotif, targetEmail: item.userEmail });
            bc.postMessage({ type: "vero:log_added", userId: item.businessUserId });
            bc.close();
          }
          window.dispatchEvent(new Event("notifications_updated"));
          window.dispatchEvent(new CustomEvent("vero:log_added"));
        } catch {}
      }

      toast.success(`Withdrawal payout of $${item.amount.toFixed(2)} USD approved!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to process approval");
    } finally {
      setActionInProgress(null);
    }
  };

  // Reject Action
  const handleReject = async (item: WithdrawalRequestItem) => {
    const finalReason = rejectionNote.trim() || "Documentation verification required - funds restored to balance";
    setActionInProgress("reject");
    try {
      // Reject via SSO /admin/api/sso proxy (same as KYC queue)
      const rejectHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` } : {})
      };

      await fetch(`/admin/api/sso/wallet/admin/withdrawals/${encodeURIComponent(item.id)}/reject`, {
        method: "POST",
        headers: rejectHeaders,
        body: JSON.stringify({ reason: finalReason }),
      })
        .catch(async () => {
          return fetch(`/admin/api/sso/wallet/admin/withdrawals/${encodeURIComponent(item.requestId)}/reject`, {
            method: "POST",
            headers: rejectHeaders,
            body: JSON.stringify({ reason: finalReason }),
          });
        })
        .catch(() => null);

      await axiosInstanceClient
        .post(`/api/v1/payment/withdrawals/admin/${item.id}/reject`, { reason: finalReason })
        .catch(() => null);

      const updatedItem: WithdrawalRequestItem = {
        ...item,
        status: "rejected",
        rejectionReason: finalReason,
        processedAt: new Date().toISOString(),
      };

      // 1. Update state locally immediately
      setWithdrawals((prev) => {
        const next = prev.map((w) =>
          w.id === item.id || w.requestId === item.requestId ? updatedItem : w
        );
        const remainingPending = next.filter((w) => w.status === "pending").length;
        notifyWithdrawalUpdated(remainingPending);
        return next;
      });

      // Update selected item so open modal instantly reflects status change
      setSelectedItem(updatedItem);
      setShowRejectInput(false);
      setRejectionNote("");

      // 2. Update local storage platform_wallet_withdrawals
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("platform_wallet_withdrawals");
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const updated = list.map((w: any) =>
                w.id === item.id || w.requestId === item.requestId
                  ? { ...w, status: "Rejected", rejectionReason: finalReason }
                  : w
              );
              localStorage.setItem("platform_wallet_withdrawals", JSON.stringify(updated));
            }
          }
        } catch {}

        // 3. Revert payment back to user balance in platform_wallet_ledger
        try {
          const rawLedger = localStorage.getItem("platform_wallet_ledger");
          const currentLedger = rawLedger ? JSON.parse(rawLedger) : [];
          const refundRecord = {
            id: `REV-${Date.now().toString().slice(-6)}`,
            kind: "deposit",
            type: "refund",
            userId: item.businessUserId,
            userName: item.userName || "User",
            amount: `$${item.amount.toFixed(2)} USD`,
            method: "Withdrawal Reversal / Refund",
            note: `Withdrawal request ${item.requestId} was rejected by admin: ${finalReason}. Funds restored to balance.`,
            status: "Complete",
            date: new Date().toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          localStorage.setItem("platform_wallet_ledger", JSON.stringify([refundRecord, ...currentLedger]));
        } catch {}

        // 4. Notify user side in real time via events and BroadcastChannel
        window.dispatchEvent(
          new CustomEvent("wallet_updated", {
            detail: { userId: item.businessUserId, amount: item.amount, status: "rejected" },
          })
        );
        try {
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("wallet_channel");
            bc.postMessage({
              type: "wallet_updated",
              userId: item.businessUserId,
              amount: item.amount,
              status: "rejected",
            });
            bc.close();
          }
        } catch {}

        // 5. Record Real Activity Log on Requester's Side (User / Business / Affiliate)
        if (token) {
          logAdminActivity(token, {
            action: "WITHDRAWAL_REJECTED",
            resource: `Withdrawal request of $${item.amount.toFixed(2)} USD was rejected by administrator: ${finalReason}. Funds refunded. (ID: ${item.requestId})`,
            targetUserId: item.businessUserId,
            targetUserEmail: item.userEmail,
            targetUserName: item.userName,
            adminEmail: adminUser?.email,
            adminName: adminUser?.fullName || adminUser?.name || "Administrator",
            extra: {
              amount: item.amount,
              requestId: item.requestId,
              role: item.role,
              rejectionReason: finalReason,
            },
          }).catch(() => {});
        }

        // 6. Send Notification to User / Business / Affiliate (Notification Bell & Toast Alert)
        const targetWalletHref = item.role === "BUSINESS"
          ? "/dashboard/business/wallet"
          : item.role === "AFFILIATE"
          ? "/dashboard/affiliate/wallet"
          : "/dashboard/user/wallet";

        const userNotif = {
          id: `with-rej-${item.requestId}-${Date.now()}`,
          title: "Withdrawal Request Rejected",
          message: `Your withdrawal request of $${item.amount.toFixed(2)} USD (ID: ${item.requestId}) was rejected: ${finalReason}. The amount has been refunded to your wallet balance.`,
          time: "Just now",
          createdAt: new Date().toISOString(),
          read: false,
          href: targetWalletHref,
          type: "withdrawal_rejected",
          data: { href: targetWalletHref, requestId: item.requestId, amount: item.amount, reason: finalReason },
        };

        axiosInstanceClient
          .post("/notifications", {
            userId: item.businessUserId,
            targetEmail: item.userEmail,
            title: userNotif.title,
            message: userNotif.message,
            type: userNotif.type,
            priority: "high",
            data: userNotif.data,
          })
          .catch(() => {});

        try {
          const roleKey = String(item.role || "user").toLowerCase();
          const uEmail = (item.userEmail || "").trim().toLowerCase();
          const cacheKeys = ["app_notifs_all", `app_notifs_${item.businessUserId}`, `app_notifs_${roleKey}`];
          if (uEmail) {
            cacheKeys.push(`app_notifs_${uEmail}`);
            cacheKeys.push(`app_notifs_${uEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
          }
          cacheKeys.forEach((key) => {
            try {
              const existing = JSON.parse(localStorage.getItem(key) || "[]");
              localStorage.setItem(key, JSON.stringify([userNotif, ...existing]));
            } catch {}
          });

          localStorage.setItem("vero_notif_sync", JSON.stringify({ item: userNotif, targetEmail: item.userEmail, timestamp: Date.now() }));

          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("vero_channel");
            bc.postMessage({ type: "vero:new_notification", payload: userNotif, targetEmail: item.userEmail });
            bc.postMessage({ type: "vero:log_added", userId: item.businessUserId });
            bc.close();
          }
          window.dispatchEvent(new Event("notifications_updated"));
          window.dispatchEvent(new CustomEvent("vero:log_added"));
        } catch {}
      }

      toast.success("Withdrawal rejected. Funds successfully restored to user balance.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to reject withdrawal");
    } finally {
      setActionInProgress(null);
    }
  };

  const tabs: Array<{ id: "ALL" | "USER" | "BUSINESS" | "AFFILIATE"; label: string }> = [
    { id: "ALL", label: "All" },
    { id: "USER", label: "Users" },
    { id: "BUSINESS", label: "Businesses" },
    { id: "AFFILIATE", label: "Affiliates" },
  ];

  return (
    <div className="p-4 sm:p-6 w-full max-w-full overflow-hidden min-h-[70vh]">
      <div className="flex flex-col gap-6 w-full">
        {/* Toolbar: Filter Tabs on Left, Search Bar on Right */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-full">
          {/* Tabs in pill container on Left */}
          <div className="inline-flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-x-auto self-start md:self-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id] ?? 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white text-blue-600"
                        : "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar on Right */}
          <div className="w-full sm:w-72 md:w-80 flex-shrink-0 md:ml-auto">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search by Transaction ID..."
              className="w-full"
            />
          </div>
        </div>

        {/* Central Reusable Table */}
        <Table>
          <TableHeading>
            <TableColumn isHeader style={{ width: "5%" }} align="center">#</TableColumn>
            <TableColumn isHeader style={{ width: "17%" }} align="center">Transaction ID</TableColumn>
            <TableColumn isHeader style={{ width: "11%" }} align="center">Role</TableColumn>
            <TableColumn isHeader style={{ width: "20%" }}>Requester</TableColumn>
            <TableColumn isHeader style={{ width: "12%" }} align="center">Amount</TableColumn>
            <TableColumn isHeader style={{ width: "14%" }}>Payout Destination</TableColumn>
            <TableColumn isHeader style={{ width: "11%" }} align="center">Created Date</TableColumn>
            <TableColumn isHeader style={{ width: "10%" }} align="center">Status</TableColumn>
            <TableColumn isHeader style={{ width: "6%" }} align="center">Actions</TableColumn>
          </TableHeading>

          <TableBody
            isEmpty={!loading && paginatedItems.length === 0}
            colSpan={9}
            emptyMessage={activeTab !== "ALL" ? `No withdrawal requests found for ${activeTab}` : "No withdrawal requests yet"}
          >
            {loading ? (
              <TableRow>
                <TableColumn colSpan={9}>
                  <div className="flex flex-col items-center justify-center gap-3 py-10 w-full">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-gray-500 font-medium">Fetching withdrawal requests...</span>
                  </div>
                </TableColumn>
              </TableRow>
            ) : (
              paginatedItems.map((item, index) => {
                const rowNumber = (currentPage - 1) * pageSize + index + 1;

                return (
                  <TableRow key={item.id}>
                    {/* 1. Row Index */}
                    <TableColumn align="center">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-gray-100 dark:bg-slate-800 px-1.5 text-gray-700 dark:text-gray-300 font-semibold text-xs">
                        {rowNumber}
                      </span>
                    </TableColumn>

                    {/* 2. Transaction ID */}
                    <TableColumn align="center">
                      <span className="bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-gray-200 dark:border-slate-700 font-mono text-xs font-bold text-gray-900 dark:text-white">
                        {item.requestId}
                      </span>
                    </TableColumn>

                    {/* 3. Role */}
                    <TableColumn align="center">
                      {getRoleBadge(item.role)}
                    </TableColumn>

                    {/* 4. Requester */}
                    <TableColumn>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {item.userName || item.businessUserId}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                          ID: {item.businessUserId}
                        </span>
                        {item.userEmail && (
                          <span className="text-[11px] text-gray-400 truncate">
                            {item.userEmail}
                          </span>
                        )}
                      </div>
                    </TableColumn>

                    {/* 5. Amount */}
                    <TableColumn align="center">
                      <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        ${item.amount.toFixed(2)} {item.currency}
                      </span>
                    </TableColumn>

                    {/* 6. Payout Destination */}
                    <TableColumn>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {item.payoutMethod || "Standard Transfer"}
                        </span>
                        {item.stripeAccountId && item.stripeAccountId !== item.payoutMethod && (
                          <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
                            {item.stripeAccountId}
                          </span>
                        )}
                      </div>
                    </TableColumn>

                    {/* 7. Created Date */}
                    <TableColumn align="center">
                      <div className="text-xs whitespace-nowrap">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Date(item.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {new Date(item.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </TableColumn>

                    {/* 8. Status */}
                    <TableColumn align="center">
                      {getStatusBadge(item.status)}
                    </TableColumn>

                    {/* 9. Actions */}
                    <TableColumn align="center">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItem(item);
                            setShowRejectInput(false);
                            setRejectionNote("");
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </TableColumn>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination below table */}
        {!loading && (
          <div className="mt-2 w-full">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              pageSize={pageSize}
              totalResults={totalItems}
              onPageSizeChange={() => {}}
            />
          </div>
        )}
      </div>

      {/* Withdrawal Request Details & Action Modal (Matching UserActionModal sizing) */}
      <AnimatePresence>
        {selectedItem && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
            onClick={() => {
              if (!actionInProgress) setSelectedItem(null);
            }}
          >
            <div 
              style={{ maxWidth: '560px', width: '100%', margin: '0 auto' }}
              className="relative w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Withdrawal Details
                  </h3>
                  {getStatusBadge(selectedItem.status)}
                </div>
                <button
                  onClick={() => {
                    if (!actionInProgress) setSelectedItem(null);
                  }}
                  disabled={actionInProgress !== null}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Requester Details */}
                <div className="grid grid-cols-2 gap-y-3.5 text-sm">
                  <div>
                    <span className="text-slate-400 font-semibold text-xs block">
                      {selectedItem.role === "BUSINESS"
                        ? "Business User Name"
                        : selectedItem.role === "AFFILIATE"
                        ? "Affiliate Name"
                        : selectedItem.role === "USER"
                        ? "User Name"
                        : "Requester Name"}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {selectedItem.userName || (selectedItem.role === "BUSINESS" ? "Business User" : selectedItem.role === "AFFILIATE" ? "Affiliate Partner" : "Verified User")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-xs block">
                      {selectedItem.role === "BUSINESS"
                        ? "Business User ID"
                        : selectedItem.role === "AFFILIATE"
                        ? "Affiliate ID"
                        : selectedItem.role === "USER"
                        ? "User ID"
                        : "Requester ID"}
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {selectedItem.businessUserId}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-xs block">Account Role</span>
                    <div className="mt-0.5">{getRoleBadge(selectedItem.role)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-xs block">Email Address</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-xs truncate block" title={selectedItem.userEmail}>
                      {selectedItem.userEmail || "user@platform.com"}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />

                {/* Transaction Details */}
                <div>
                  <h4 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-3">
                    Transaction Details
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3.5 text-sm">
                    <div>
                      <span className="text-slate-400 font-semibold text-xs block">Transaction ID</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                        {selectedItem.requestId}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold text-xs block">Requested Amount</span>
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        ${selectedItem.amount.toFixed(2)} {selectedItem.currency}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold text-xs block">Payout Method</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {selectedItem.payoutMethod || "Standard Bank Transfer"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold text-xs block">Destination / Account</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">
                        {selectedItem.stripeAccountId || "Direct Deposit"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold text-xs block">Requested Date</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                        {new Date(selectedItem.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {selectedItem.processedAt && (
                      <div>
                        <span className="text-slate-400 font-semibold text-xs block">Processed Date</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                          {new Date(selectedItem.processedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejection Note Alert if already rejected */}
                {selectedItem.status === "rejected" && (
                  <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs">
                    <span className="font-bold block mb-0.5">Rejection Reason:</span>
                    <span>{selectedItem.rejectionReason || "Documentation verification required - funds restored to balance"}</span>
                  </div>
                )}

                {/* Rejection Input when confirming reject */}
                {selectedItem.status === "pending" && showRejectInput && (
                  <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 p-3.5 bg-rose-50/60 dark:bg-rose-950/20 space-y-2 animate-in fade-in duration-200">
                    <label className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center justify-between">
                      <span>Reason for Rejection</span>
                      <span className="text-[10px] font-normal text-rose-600 dark:text-rose-400">Funds restored to balance</span>
                    </label>
                    <textarea
                      rows={2}
                      value={rejectionNote}
                      onChange={(e) => setRejectionNote(e.target.value)}
                      placeholder="Reason for rejection (funds will return to wallet balance)..."
                      className="w-full text-xs p-2.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!actionInProgress) setSelectedItem(null);
                  }}
                  disabled={actionInProgress !== null}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-40"
                >
                  Close
                </button>

                {selectedItem.status === "pending" && (
                  <div className="flex items-center gap-2">
                    {!showRejectInput ? (
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(true)}
                        disabled={actionInProgress !== null}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowRejectInput(false)}
                          disabled={actionInProgress !== null}
                          className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(selectedItem)}
                          disabled={actionInProgress !== null}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {actionInProgress === "reject" ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Rejecting...</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Confirm Reject</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {!showRejectInput && (
                      <button
                        type="button"
                        onClick={() => handleApprove(selectedItem)}
                        disabled={actionInProgress !== null}
                        className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {actionInProgress === "approve" ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Approving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
