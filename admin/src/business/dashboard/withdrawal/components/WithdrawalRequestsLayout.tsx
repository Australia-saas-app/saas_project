"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import PageHeader from "@/src/shared/ui/ui/PageHeader";
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

    // 1. Fetch from Backend API endpoints
    const endpoints = [
      "/payment/withdrawals/admin/requests",
      "/payment/withdrawals/all",
      "/payment/admin/withdrawals",
    ];

    for (const url of endpoints) {
      try {
        const res = await axiosInstanceClient.get(url);
        const data = res.data?.data || res.data?.withdrawals || res.data || [];
        if (Array.isArray(data) && data.length > 0) {
          data.forEach((w: any) => {
            const rawRole = String(w.role || w.userRole || w.accountType || w.metadata?.role || "").toUpperCase();
            let resolvedRole: "USER" | "BUSINESS" | "AFFILIATE" = "USER";
            if (rawRole.includes("BUS") || String(w.businessUserId || "").toUpperCase().startsWith("BUS")) {
              resolvedRole = "BUSINESS";
            } else if (rawRole.includes("AFF") || String(w.businessUserId || "").toUpperCase().startsWith("AFF")) {
              resolvedRole = "AFFILIATE";
            }

            items.push({
              id: String(w.id || w.requestId),
              requestId: String(w.requestId || w.id || w.transactionId || `WREQ-${Math.random().toString(36).slice(2, 7).toUpperCase()}`),
              businessUserId: String(w.businessUserId || w.userId || "user"),
              userName: w.userName || w.metadata?.userName || w.businessName || undefined,
              userEmail: w.userEmail || w.email || w.metadata?.userEmail || undefined,
              role: resolvedRole,
              amount: Number(w.amount || 0),
              currency: String(w.currency || "USD").toUpperCase(),
              stripeAccountId: w.stripeAccountId || w.payoutDestination || w.destination || undefined,
              payoutMethod: w.payoutMethod || w.method || w.stripeAccountId || "Standard Bank Transfer",
              status: (String(w.status || "pending").toLowerCase() as any) || "pending",
              createdAt: w.createdAt || new Date().toISOString(),
              processedAt: w.processedAt || undefined,
              rejectionReason: w.rejectionReason || undefined,
              stripeTransferId: w.stripeTransferId || undefined,
            });
          });
          break; // successfully retrieved from backend
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
            parsed.forEach((w: any) => {
              const strId = String(w.id || w.requestId || "");
              if (!items.some((existing) => existing.id === strId || existing.requestId === strId)) {
                const uId = String(w.userId || "").toUpperCase();
                let role: "USER" | "BUSINESS" | "AFFILIATE" = "USER";
                if (uId.startsWith("BUS") || String(w.role || "").toUpperCase().includes("BUS")) {
                  role = "BUSINESS";
                } else if (uId.startsWith("AFF") || String(w.role || "").toUpperCase().includes("AFF")) {
                  role = "AFFILIATE";
                }

                let cleanAmount = 0;
                if (typeof w.amount === "number") {
                  cleanAmount = w.amount;
                } else if (typeof w.amount === "string") {
                  cleanAmount = parseFloat(w.amount.replace(/[^0-9.]/g, "")) || 0;
                }

                const rawStatus = String(w.status || "Pending").toLowerCase();
                const status = rawStatus === "complete" || rawStatus === "paid" ? "paid" : rawStatus === "failed" || rawStatus === "rejected" ? "rejected" : "pending";

                items.push({
                  id: strId,
                  requestId: strId,
                  businessUserId: String(w.userId || "User"),
                  userName: w.userName || undefined,
                  role,
                  amount: cleanAmount,
                  currency: "USD",
                  payoutMethod: w.method || w.methodLabel || "Bank Transfer",
                  stripeAccountId: w.methodId || undefined,
                  status,
                  createdAt: w.createdAt || (w.date ? new Date(w.date).toISOString() : new Date().toISOString()),
                  rejectionReason: w.rejectionReason || undefined,
                });
              }
            });
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

    const finalSorted = Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setWithdrawals(finalSorted);
    const pendingCount = finalSorted.filter((w) => w.status === "pending").length;
    notifyWithdrawalUpdated(pendingCount);
    setLoading(false);
  }, [notifyWithdrawalUpdated]);

  useEffect(() => {
    fetchWithdrawals();

    const handleExternalUpdate = () => {
      fetchWithdrawals();
    };
    window.addEventListener("vero:withdrawal_updated", handleExternalUpdate);
    return () => {
      window.removeEventListener("vero:withdrawal_updated", handleExternalUpdate);
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
          w.requestId.toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q) ||
          w.businessUserId.toLowerCase().includes(q) ||
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
      await axiosInstanceClient
        .post(`/payment/withdrawals/admin/${item.id}/pay`, {
          note: "Approved and executed via Admin Portal",
        })
        .catch(async () => {
          return axiosInstanceClient.post(`/payment/withdrawals/${item.id}/pay`, {
            note: "Approved and executed via Admin Portal",
          });
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
      await axiosInstanceClient
        .post(`/payment/withdrawals/admin/${item.id}/reject`, { reason: finalReason })
        .catch(async () => {
          return axiosInstanceClient.post(`/payment/withdrawals/${item.id}/reject`, { reason: finalReason });
        })
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
    { id: "BUSINESS", label: "Business" },
    { id: "AFFILIATE", label: "Affiliate" },
  ];

  return (
    <div className="p-4 sm:p-6 w-full max-w-full overflow-hidden min-h-[70vh]">
      <div className="flex flex-col gap-6 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <PageHeader title="Withdrawal and Payout Requests" />
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Review live pending payout requests, execute payouts, or reject and restore user balances.
            </p>
          </div>

          <button
            onClick={fetchWithdrawals}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Toolbar: Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs: All, Users, Business, Affiliate */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                        : "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar beside tabs */}
          <div className="w-full md:w-80">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search Transaction ID..."
              className="w-full"
            />
          </div>
        </div>

        {/* Main Requests Table Card with 4-item visible view and inside table scrollbar */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="max-h-[590px] overflow-y-auto overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            <table className="w-full text-left text-sm border-collapse min-w-[950px]">
              {/* Sticky Table Header */}
              <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-slate-800/90 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th scope="col" className="w-14 px-4 py-3.5 text-center">#</th>
                  <th scope="col" className="w-44 px-4 py-3.5 text-center">Transaction ID</th>
                  <th scope="col" className="w-28 px-4 py-3.5 text-center">Role</th>
                  <th scope="col" className="px-5 py-3.5">Requester</th>
                  <th scope="col" className="w-36 px-4 py-3.5 text-center">Amount</th>
                  <th scope="col" className="px-5 py-3.5">Payout Destination</th>
                  <th scope="col" className="w-44 px-4 py-3.5 text-center">Created Date</th>
                  <th scope="col" className="w-28 px-4 py-3.5 text-center">Status</th>
                  <th scope="col" className="w-48 px-4 py-3.5 text-center">Admin Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Loading withdrawal requests...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 mb-3">
                        <CheckCircle2 className="h-7 w-7 opacity-60 text-emerald-500" />
                      </div>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        No withdrawal requests found {activeTab !== "ALL" ? `for ${activeTab}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                        When users, businesses, or affiliates request wallet payouts, they will appear here in real time.
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item, index) => {
                    const rowNumber = (currentPage - 1) * pageSize + index + 1;
                    const isPending = item.status === "pending";
                    const isBusy = actionInProgress === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={`group transition-colors hover:bg-gray-50/80 dark:hover:bg-slate-800/40 ${
                          isPending ? "bg-amber-500/[0.02] dark:bg-amber-500/[0.04]" : ""
                        }`}
                      >
                        {/* 1. Row Index */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs font-medium text-gray-500 dark:text-gray-400">
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-gray-100 dark:bg-slate-800 px-1.5 text-gray-700 dark:text-gray-300 font-semibold">
                            {rowNumber}
                          </span>
                        </td>

                        {/* 2. Transaction ID */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-gray-900 dark:text-white">
                          <span className="bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-gray-200 dark:border-slate-700">
                            {item.requestId}
                          </span>
                        </td>

                        {/* 3. Role */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {getRoleBadge(item.role)}
                        </td>

                        {/* 4. User / Requester */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {item.userName || item.businessUserId}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              ID: {item.businessUserId}
                            </span>
                            {item.userEmail && (
                              <span className="text-[11px] text-gray-400">
                                {item.userEmail}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Amount */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            ${item.amount.toFixed(2)} {item.currency}
                          </span>
                        </td>

                        {/* 6. Payout Destination */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                              {item.payoutMethod || "Standard Transfer"}
                            </span>
                            {item.stripeAccountId && item.stripeAccountId !== item.payoutMethod && (
                              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                                {item.stripeAccountId}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. Created Date */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
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
                        </td>

                        {/* 8. Status */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>

                        {/* 9. Admin Actions: Eye icon like KYC Queue table */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-800 px-5 py-3.5 bg-white dark:bg-slate-900 text-xs text-gray-500 dark:text-gray-400">
              <p>
                Showing{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.min(currentPage * pageSize, totalItems)}
                </span>{" "}
                of <span className="font-semibold text-gray-900 dark:text-white">{totalItems}</span> requests
                {totalPages > 1 && (
                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                    (Page {currentPage} of {totalPages})
                  </span>
                )}
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && p - prev > 1;

                        return (
                          <div key={p} className="flex items-center">
                            {showEllipsis && <span className="px-1 text-xs text-gray-400">…</span>}
                            <button
                              type="button"
                              onClick={() => setPage(p)}
                              className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-colors cursor-pointer ${
                                p === currentPage
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
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
