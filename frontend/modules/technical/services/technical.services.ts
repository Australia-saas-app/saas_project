/**
 * Technical Service API — all calls go through axiosInstance → Kong / Backend → PostgreSQL database
 */

import axiosInstance from "@/src/shared/lib/axiosInstance";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";

const LOCAL_PROJECTS_KEY = "platform_user_technical_projects";

export function readLocalProjects(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function findLocalProject(projectId: string | number | undefined | null): any {
  if (!projectId || typeof window === "undefined") return null;
  const targetId = String(projectId).trim();
  const cleanTarget = targetId.replace(/^PRJ-/i, "").toLowerCase();
  const localList = readLocalProjects();
  return (
    localList.find((lp: any) => {
      const lpId = String(lp.projectId || lp.id || "").trim();
      const cleanLp = lpId.replace(/^PRJ-/i, "").toLowerCase();
      const rawLpId = String(lp.id || "").trim().toLowerCase();
      return (
        lpId.toLowerCase() === targetId.toLowerCase() ||
        cleanLp === cleanTarget ||
        rawLpId === cleanTarget ||
        `prj-${rawLpId}` === targetId.toLowerCase()
      );
    }) || null
  );
}

export function isProjectCompleted(p: any): boolean {
  if (!p) return false;
  const subStatus = String(p.submissionStatus || "").toLowerCase().trim();
  const st = String(p.status || "").toLowerCase().trim();
  if (
    subStatus === "accepted" ||
    subStatus === "completed" ||
    subStatus === "paid" ||
    st === "completed" ||
    st === "accepted" ||
    st === "paid"
  ) {
    return true;
  }
  const terms = String(p.paymentTerms || "").toLowerCase();
  const mCount = terms.includes("three") || terms === "3" ? 3 : terms.includes("two") || terms === "2" ? 2 : 1;
  const ms = p.milestones;
  if (Array.isArray(ms) && ms.length >= mCount && mCount > 0) {
    return ms.slice(0, mCount).every((m: any) => String(m?.status || "").toLowerCase() === "accepted");
  }
  return false;
}

export function writeLocalProjects(projects: any[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // ignore
  }
}

export async function recordActivityLog(log: {
  title: string;
  description: string;
  category?: string;
  userId?: string;
  userName?: string;
  email?: string;
  type?: string;
}) {
  let resolvedUserName = log.userName;
  let resolvedUserId = log.userId;
  let resolvedEmail = log.email;

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("auth_user") || localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        if (!resolvedUserName) {
          resolvedUserName = u.fullName || u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim();
        }
        if (!resolvedUserId) resolvedUserId = u.id || u.userId;
        if (!resolvedEmail) resolvedEmail = u.email;
      }
    } catch {}
  }

  if (typeof window !== "undefined") {
    try {
      const key = "platform_activity_logs";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const item = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        ...log,
        userName: resolvedUserName || log.userName,
        userId: resolvedUserId || log.userId,
        email: resolvedEmail || log.email,
      };
      localStorage.setItem(key, JSON.stringify([item, ...existing]));
      window.dispatchEvent(new Event("activity_logs_updated"));
    } catch {}
  }

  // Save to backend MongoDB activity collection & trigger real log event
  try {
    await recordRealActivity(
      log.type || "PROJECT_SUBMITTED",
      log.description || log.title,
      {
        userId: resolvedUserId,
        name: resolvedUserName,
        fullName: resolvedUserName,
        email: resolvedEmail,
      }
    ).catch(() => undefined);
  } catch {}
}

export async function dispatchAdminNotification(notif: {
  title: string;
  message: string;
  href?: string;
  type?: string;
}) {
  if (typeof window === "undefined") return;
  try {
    const notifItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: notif.title,
      description: notif.message,
      time: "Just now",
      read: false,
      href: notif.href || "/technical",
      type: notif.type || "system",
    };

    ["app_notifs_admin", "admin_notifications"].forEach((k) => {
      const existing = JSON.parse(localStorage.getItem(k) || "[]");
      localStorage.setItem(k, JSON.stringify([notifItem, ...existing]));
    });

    window.dispatchEvent(new Event("notifications_updated"));
  } catch {}

  // Permanently save notification into PostgreSQL DB
  try {
    await axiosInstance.post('/notifications', {
      type: notif.type || 'TECHNICAL_PROJECT_SUBMIT',
      title: notif.title,
      message: notif.message,
      priority: 'high',
      data: { href: notif.href || '/technical' },
    }).catch(() => undefined);
  } catch {}
}

export function getCachedWalletBalance(): {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingEscrow: number;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("platform_wallet_cached_balance");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.balance === "number") {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export const fetchWalletBalance = async (userParam?: any): Promise<{
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingEscrow: number;
}> => {
  // 1. Try server API
  try {
    const ssoRes = await axiosInstance.get('/sso/wallet/balance');
    if (ssoRes?.data?.balance !== undefined && ssoRes.data.balance !== null && !isNaN(Number(ssoRes.data.balance))) {
      const resData = {
        balance: Number(ssoRes.data.balance),
        totalEarned: Number(ssoRes.data.totalEarned ?? 0),
        totalWithdrawn: Number(ssoRes.data.totalWithdrawn ?? 0),
        pendingEscrow: Number(ssoRes.data.pendingEscrow ?? 0),
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("platform_wallet_cached_balance", JSON.stringify(resData));
        } catch {}
      }
      return resData;
    }
  } catch {}

  // 2. Calculate accurately from persistent storage and assigned projects
  if (typeof window !== "undefined") {
    try {
      const rawUser = localStorage.getItem("auth_user") || localStorage.getItem("user");
      let uid = "";
      let uEmail = "";
      let uName = "";
      if (userParam) {
        uid = String(userParam.id || userParam.userId || userParam.sub || "");
        uEmail = String(userParam.email || "").toLowerCase().trim();
        uName = String(userParam.name || userParam.fullName || userParam.businessName || "").toLowerCase().trim();
      } else if (rawUser) {
        const u = JSON.parse(rawUser);
        uid = String(u.id || u.userId || u.sub || "");
        uEmail = String(u.email || "").toLowerCase().trim();
        uName = String(u.name || u.fullName || u.businessName || "").toLowerCase().trim();
      }

      const roleStr = String((userParam as any)?.role || (userParam as any)?.accountType || "").toLowerCase().trim();
      const isBusinessRole = roleStr === "business" || roleStr === "seller" || roleStr === "company" || !roleStr;

      // Gather all projects from local store, business services, and applied records
      const projectMap = new Map<string, any>();
      readLocalProjects().forEach((p: any) => {
        const pId = String(p.projectId || p.id || "").trim();
        if (pId) projectMap.set(pId, p);
      });

      const storageKeys = [
        "business_service_rows",
        "business_service_rows_default",
        "business_applied_projects",
        "platform_projects_v2",
        "technical_projects_cache",
      ];

      if (uid) {
        storageKeys.push(`business_applied_projects_${uid}`);
      }
      if (uEmail) {
        storageKeys.push(`business_applied_projects_${uEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
      }

      storageKeys.forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                const rawP = item.rawProject || item;
                const pId = String(rawP.projectId || rawP.id || item.id || "").trim();
                if (pId) {
                  const existing = projectMap.get(pId) || {};
                  projectMap.set(pId, { ...existing, ...rawP, ...item });
                }
              });
            }
          }
        } catch {}
      });

      // Also pull directly from backend PostgreSQL database via Kong
      try {
        const [assignedRes, servicesRes] = await Promise.all([
          axiosInstance.get('/technology/projects/assigned').catch(() => null),
          axiosInstance.get('/technology/services').catch(() => null),
        ]);
        const assignedList =
          assignedRes?.data?.data?.projects ||
          assignedRes?.data?.projects ||
          assignedRes?.data?.data ||
          (Array.isArray(assignedRes?.data) ? assignedRes?.data : []);
        if (Array.isArray(assignedList)) {
          assignedList.forEach((p: any) => {
            const pId = String(p.projectId || p.id || "").trim();
            if (pId) {
              const existing = projectMap.get(pId) || {};
              projectMap.set(pId, { ...existing, ...p });
            }
          });
        }
        const servicesList =
          servicesRes?.data?.data ||
          servicesRes?.data?.services ||
          (Array.isArray(servicesRes?.data) ? servicesRes?.data : []);
        if (Array.isArray(servicesList)) {
          servicesList.forEach((p: any) => {
            const pId = String(p.projectId || p.id || "").trim();
            if (pId) {
              const existing = projectMap.get(pId) || {};
              projectMap.set(pId, { ...existing, ...p });
            }
          });
        }
      } catch {}

      const projects = Array.from(projectMap.values());
      let earnedFromProjects = 0;
      let pendingEscrow = 0;

      projects.forEach((p: any) => {
        const isAssignedToMe =
          Boolean(
            p.assignedBusinessId && (
              p.assignedBusinessId === uid ||
              p.assignedBusinessId === "business" ||
              p.assignedBusinessId === (userParam as any)?.userId ||
              p.assignedBusinessId === (userParam as any)?.id
            )
          ) ||
          Boolean(
            p.assignedBusinessUserId && (
              p.assignedBusinessUserId === uid ||
              p.assignedBusinessUserId === "business" ||
              p.assignedBusinessUserId === (userParam as any)?.userId ||
              p.assignedBusinessUserId === (userParam as any)?.id
            )
          ) ||
          Boolean(
            p.assignedBusinessEmail && uEmail && p.assignedBusinessEmail.toLowerCase().trim() === uEmail
          ) ||
          Boolean(
            p.assignedBusinessName && uName && p.assignedBusinessName.toLowerCase().trim() === uName
          ) ||
          Boolean(
            Array.isArray(p.participants) && p.participants.some((part: any) =>
              part.userId === uid || (part.userEmail && uEmail && part.userEmail.toLowerCase().trim() === uEmail)
            )
          ) ||
          Boolean(p.isAssigned) ||
          Boolean(p.isApplied) ||
          (isBusinessRole && (
            p.submissionStatus === "accepted" ||
            p.submissionStatus === "completed" ||
            p.status === "accepted" ||
            p.status === "completed" ||
            p.paymentStatus === "released"
          ));

        if (!isAssignedToMe) return;

        const totalBudget = Number(p.adminBudget || p.price || p.budgetAmount || 0);
        if (totalBudget <= 0) return;

        const terms = (p.paymentTerms || "").toLowerCase();
        const mCount = terms.includes("three") || terms === "3" ? 3 : terms.includes("two") || terms === "2" ? 2 : 1;
        const perMilestone = totalBudget / mCount;

        const isFullDone =
          isProjectCompleted(p) ||
          p.submissionStatus === "accepted" ||
          p.submissionStatus === "completed" ||
          p.status === "accepted" ||
          p.status === "completed" ||
          p.paymentStatus === "released" ||
          (Array.isArray(p.milestones) && mCount > 0 && p.milestones.slice(0, mCount).every((m: any) => m?.status === "accepted"));

        if (isFullDone) {
          earnedFromProjects += totalBudget;
        } else if (Array.isArray(p.milestones) && p.milestones.length > 0) {
          const acceptedCount = p.milestones.slice(0, mCount).filter((m: any) => m?.status === "accepted").length;
          earnedFromProjects += acceptedCount * perMilestone;
          pendingEscrow += (mCount - acceptedCount) * perMilestone;
        } else {
          pendingEscrow += totalBudget;
        }
      });

      // Also check platform_wallet_ledger for any manual deposits or withdrawals
      const rawLedger = localStorage.getItem("platform_wallet_ledger");
      let manualEarned = 0;
      let totalWithdrawn = 0;

      if (rawLedger) {
        const parsed: any[] = JSON.parse(rawLedger);
        if (Array.isArray(parsed)) {
          parsed.forEach((r) => {
            const rUid = String(r.userId || "");
            const isMatch = !uid || rUid === uid || rUid === "business" || rUid === uEmail;
            if (!isMatch) return;

            const amt = parseFloat(String(r.amount).replace(/[^0-9.]/g, "")) || 0;
            if (r.kind === "deposit" || (r.kind === "earning" && !r.id?.startsWith("TX-PAYOUT-"))) {
              manualEarned += amt;
            } else if (r.kind === "withdrawal" || r.kind === "withdraw_hold" || r.type?.toLowerCase() === "withdrawal") {
              totalWithdrawn += amt;
            }
          });
        }
      }

      const totalEarned = earnedFromProjects + manualEarned;
      const availableBalance = Math.max(0, totalEarned - totalWithdrawn);

      return {
        balance: availableBalance,
        totalEarned,
        totalWithdrawn,
        pendingEscrow,
      };
    } catch {}
  }

  return { balance: 0, totalEarned: 0, totalWithdrawn: 0, pendingEscrow: 0 };
};

export interface BusinessTransactionRecord {
  id: string;
  projectId?: string;
  title: string;
  method: string;
  amount: string;
  rawAmount: number;
  date: string;
  status: "Released" | "Completed" | "Pending" | "Failed";
  type: "milestone_release" | "project_release" | "deposit" | "withdrawal";
  clientName?: string;
  milestoneInfo?: string;
}

export const fetchBusinessTransactions = (userParam?: any): BusinessTransactionRecord[] => {
  if (typeof window === "undefined") return [];
  const records: BusinessTransactionRecord[] = [];

  try {
    const rawUser = localStorage.getItem("auth_user") || localStorage.getItem("user");
    let uid = "";
    let uEmail = "";
    let uName = "";
    if (userParam) {
      uid = String(userParam.id || userParam.userId || userParam.sub || "");
      uEmail = String(userParam.email || "").toLowerCase().trim();
      uName = String(userParam.name || userParam.fullName || userParam.businessName || "").toLowerCase().trim();
    } else if (rawUser) {
      const u = JSON.parse(rawUser);
      uid = String(u.id || u.userId || u.sub || "");
      uEmail = String(u.email || "").toLowerCase().trim();
      uName = String(u.name || u.fullName || u.businessName || "").toLowerCase().trim();
    }

    const roleStr = String((userParam as any)?.role || (userParam as any)?.accountType || "").toLowerCase().trim();
    const isBusinessRole = roleStr === "business" || roleStr === "seller" || roleStr === "company" || !roleStr;

    const projectMap = new Map<string, any>();
    readLocalProjects().forEach((p: any) => {
      const pId = String(p.projectId || p.id || "").trim();
      if (pId) projectMap.set(pId, p);
    });

    const storageKeys = [
      "business_service_rows",
      "business_service_rows_default",
      "business_applied_projects",
      "platform_projects_v2",
      "technical_projects_cache",
    ];

    if (uid) {
      storageKeys.push(`business_applied_projects_${uid}`);
    }
    if (uEmail) {
      storageKeys.push(`business_applied_projects_${uEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
    }

    storageKeys.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              const rawP = item.rawProject || item;
              const pId = String(rawP.projectId || rawP.id || item.id || "").trim();
              if (pId) {
                const existing = projectMap.get(pId) || {};
                projectMap.set(pId, { ...existing, ...rawP, ...item });
              }
            });
          }
        }
      } catch {}
    });

    const projects = Array.from(projectMap.values());

    projects.forEach((p: any) => {
      const isAssignedToMe =
        Boolean(
          p.assignedBusinessId && (
            p.assignedBusinessId === uid ||
            p.assignedBusinessId === "business" ||
            p.assignedBusinessId === (userParam as any)?.userId ||
            p.assignedBusinessId === (userParam as any)?.id
          )
        ) ||
        Boolean(
          p.assignedBusinessUserId && (
            p.assignedBusinessUserId === uid ||
            p.assignedBusinessUserId === "business" ||
            p.assignedBusinessUserId === (userParam as any)?.userId ||
            p.assignedBusinessUserId === (userParam as any)?.id
          )
        ) ||
        Boolean(
          p.assignedBusinessEmail && uEmail && p.assignedBusinessEmail.toLowerCase().trim() === uEmail
        ) ||
        Boolean(
          p.assignedBusinessName && uName && p.assignedBusinessName.toLowerCase().trim() === uName
        ) ||
        Boolean(
          Array.isArray(p.participants) && p.participants.some((part: any) =>
            part.userId === uid || (part.userEmail && uEmail && part.userEmail.toLowerCase().trim() === uEmail)
          )
        ) ||
        Boolean(p.isAssigned) ||
        Boolean(p.isApplied) ||
        (isBusinessRole && (
          p.submissionStatus === "accepted" ||
          p.submissionStatus === "completed" ||
          p.status === "accepted" ||
          p.status === "completed" ||
          p.paymentStatus === "released"
        ));

      if (!isAssignedToMe) return;

      const totalBudget = Number(p.adminBudget || p.price || p.budgetAmount || 0);
      if (totalBudget <= 0) return;

      const terms = (p.paymentTerms || "").toLowerCase();
      const mCount = terms.includes("three") || terms === "3" ? 3 : terms.includes("two") || terms === "2" ? 2 : 1;
      const perMilestone = totalBudget / mCount;
      const dateStr = formatProjectDate(p.completedAt || p.acceptedAt || p.updatedAt || p.createdAt) || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const pId = p.projectId || `PRJ-${p.id}`;

      if (mCount <= 1 || terms.includes("one")) {
        // One-time payment
        const isDone = isProjectCompleted(p) || p.paymentStatus === "released" || p.submissionStatus === "accepted";
        if (isDone) {
          records.push({
            id: `TX-${pId.replace(/^PRJ-/i, "")}-FULL`,
            projectId: pId,
            title: p.title || "Technical Service Delivery",
            method: "Escrow Full Release",
            amount: `+$${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
            rawAmount: totalBudget,
            date: dateStr,
            status: "Released",
            type: "project_release",
            clientName: p.clientName || "Client",
            milestoneInfo: "Full 100% Escrow Release",
          });
        }
      } else {
        // Milestones
        const ms = Array.isArray(p.milestones) ? p.milestones : [];
        for (let i = 0; i < mCount; i++) {
          const m = ms[i];
          if (m?.status === "accepted" || isProjectCompleted(p) || p.paymentStatus === "released") {
            records.push({
              id: `TX-${pId.replace(/^PRJ-/i, "")}-M${i + 1}`,
              projectId: pId,
              title: `${p.title} (Milestone ${i + 1}/${mCount})`,
              method: `Escrow Milestone Payout (${i + 1}/${mCount})`,
              amount: `+$${perMilestone.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
              rawAmount: perMilestone,
              date: formatProjectDate(m?.acceptedAt || p.completedAt || p.updatedAt) || dateStr,
              status: "Released",
              type: "milestone_release",
              clientName: p.clientName || "Client",
              milestoneInfo: `Milestone ${i + 1} of ${mCount} Accepted`,
            });
          }
        }
      }
    });

    // Check platform_wallet_ledger
    const rawLedger = localStorage.getItem("platform_wallet_ledger");
    if (rawLedger) {
      const parsed: any[] = JSON.parse(rawLedger);
      if (Array.isArray(parsed)) {
        parsed.forEach((r) => {
          if (r.id && records.some((rec) => rec.id === r.id)) return;
          // Do not treat personal wallet deposits (DP-*) as business project earnings
          if (r.kind === "deposit" || String(r.id || "").startsWith("DP-")) return;
          const rUid = String(r.userId || "");
          const isMatch = !uid || rUid === uid || rUid === "business" || rUid === uEmail;
          if (!isMatch) return;

          const amtNum = parseFloat(String(r.amount).replace(/[^0-9.]/g, "")) || 0;
          records.push({
            id: r.id || `TX-${Date.now()}`,
            title: r.method || r.description || "Wallet Transaction",
            method: r.method || "Direct Payout",
            amount: r.amount?.startsWith("+") || r.amount?.startsWith("-") ? r.amount : `+$${amtNum.toFixed(2)} USD`,
            rawAmount: amtNum,
            date: formatProjectDate(r.date || r.timestamp) || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            status: r.status === "Complete" || r.status === "Completed" ? "Completed" : "Pending",
            type: r.kind === "withdrawal" ? "withdrawal" : "deposit",
            clientName: r.userName || "Platform Escrow",
          });
        });
      }
    }
  } catch {}

  return records;
};

export const depositToWallet = async (
  amount: number,
  description?: string,
  options?: {
    cardData?: {
      cardHolderName: string;
      cardNumber: string;
      expiryMonth: string;
      expiryYear: string;
      cardBrand?: string;
      isDefault?: boolean;
    };
    paymentCardId?: number;
    method?: string;
  },
  _token?: string
) => {
  const payload = {
    amount,
    description: description || 'Wallet Deposit',
    method: options?.method || 'Credit / Debit Card',
    paymentCardId: options?.paymentCardId,
    cardData: options?.cardData,
  };

  try {
    const ssoRes = await axiosInstance.post('/sso/wallet/deposit', payload);
    return ssoRes?.data;
  } catch (e: any) {
    console.warn("Deposit API note:", e?.message || e);
  }
  return { success: true };
};

export const fetchWalletCards = async () => {
  try {
    const res = await axiosInstance.get('/sso/wallet/cards');
    if (Array.isArray(res?.data)) return res.data;
    return res?.data?.data || [];
  } catch {
    return [];
  }
};

export const saveWalletCard = async (cardData: {
  cardHolderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cardBrand?: string;
  isDefault?: boolean;
}) => {
  try {
    const res = await axiosInstance.post('/sso/wallet/cards', cardData);
    return res?.data;
  } catch {
    return null;
  }
};

export const fetchWalletTransactions = async (_token?: string) => {
  try {
    const res = await axiosInstance.get('/sso/wallet/transactions');
    const items = Array.isArray(res?.data?.transactions)
      ? res.data.transactions
      : Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data)
      ? res.data
      : [];
    return items;
  } catch {
    return [];
  }
};

export const fetchProjectMessages = async (projectId: string, _token?: string) => {
  try {
    const res = await axiosInstance.get(`/technology/projects/${projectId}/messages`);
    const data = res?.data;
    return Array.isArray(data) ? data : data?.messages || [];
  } catch (e) {
    console.warn("Project messages fallback:", e);
  }
  return [];
};

export const fetchUserThreads = async (_token?: string) => {
  try {
    const res = await axiosInstance.get(`/technology/projects/conversations/user-threads`, {
      timeout: 5000,
    });
    const data = res?.data;
    return Array.isArray(data) ? data : [];
  } catch (e: any) {
    if (e?.code !== "ECONNABORTED" && !e?.message?.includes("timeout")) {
      console.warn("User threads fallback:", e?.message || e);
    }
  }
  return [];
};

export const deleteUserThread = async (threadId: string, _token?: string) => {
  try {
    const res = await axiosInstance.delete(`/technology/projects/conversations/threads/${encodeURIComponent(threadId)}`);
    return res?.data;
  } catch (e) {
    console.warn("Delete user thread fallback:", e);
    return { success: false };
  }
};

export const markUserThreadRead = async (threadId: string, _token?: string) => {
  try {
    const res = await axiosInstance.post(`/technology/projects/conversations/threads/${encodeURIComponent(threadId)}/read`);
    return res?.data;
  } catch (e) {
    console.warn("Mark user thread read fallback:", e);
    return { success: false };
  }
};

export const sendProjectMessage = async (
  projectId: string,
  content: string,
  messageType?: string,
  metadata?: {
    senderName?: string;
    senderEmail?: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientBusiness?: string;
    recipientUserId?: string;
    threadId?: string;
    projectTitle?: string;
    subject?: string;
  },
  _token?: string
) => {
  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/messages`, {
      content,
      messageType: messageType || 'general',
      ...metadata,
    });
    return res?.data;
  } catch (e) {
    console.warn("Message sent locally:", e);
  }
  return {
    success: true,
    message: {
      id: Date.now(),
      projectId,
      content,
      messageType: messageType || 'general',
      createdAt: new Date().toISOString(),
    },
  };
};

// ─── Category / Skill helpers ───────────────────────────────────────────────

export const fetchCategories = async (): Promise<string[]> =>
  Promise.resolve(['Software Development', 'Web Design & UI/UX', 'QA & Testing', 'DevOps', 'Mobile', 'Data & AI']);

export const fetchSubcategories = async (categoryIds: string[] = []): Promise<string[]> => {
  const map: Record<string, string[]> = {
    'Software Development': ['Frontend', 'Backend', 'Fullstack'],
    'Web Design & UI/UX': ['UI Design', 'UX Research', 'Prototyping'],
    'QA & Testing': ['Automation', 'Manual Testing', 'Performance'],
    DevOps: ['SRE', 'CI/CD', 'Cloud'],
    Mobile: ['iOS', 'Android', 'React Native'],
    'Data & AI': ['Machine Learning', 'Data Engineering', 'Analytics'],
  };
  const results = new Set<string>();
  categoryIds.forEach((c) => map[c]?.forEach((s) => results.add(s)));
  return results.size === 0 ? ['General'] : Array.from(results);
};

export const fetchSkills = async (subcategories: string[] = []): Promise<string[]> => {
  const map: Record<string, string[]> = {
    Frontend: ['React', 'TypeScript', 'HTML', 'CSS', 'Vue'],
    Backend: ['Node.js', 'NestJS', 'Express', 'PostgreSQL', 'Redis'],
    Fullstack: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    'UI Design': ['Figma', 'Adobe XD'],
    'UX Research': ['User Testing', 'Wireframing'],
    Automation: ['Cypress', 'Selenium', 'Playwright'],
    'Manual Testing': ['Test Plans', 'Bug Reporting'],
    'CI/CD': ['GitHub Actions', 'Jenkins', 'Docker'],
    iOS: ['Swift', 'Xcode'],
    Android: ['Kotlin', 'Android Studio'],
    'React Native': ['React Native', 'Expo'],
    'Machine Learning': ['Python', 'TensorFlow', 'PyTorch'],
    'Data Engineering': ['Spark', 'Airflow', 'dbt'],
  };
  const results = new Set<string>();
  subcategories.forEach((s) => map[s]?.forEach((sk) => results.add(sk)));
  return results.size === 0 ? ['Communication', 'Project Management'] : Array.from(results);
};

// ─── Project CRUD ────────────────────────────────────────────────────────────

export function generateTimeProjectId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `PRJ-${hh}${mm}${ss}`;
}

export const createProject = async (payload: any, _token?: string) => {
  let createdProject: any = null;

  const projectPayload = {
    ...payload,
    projectId: payload.projectId || generateTimeProjectId(),
  };

  try {
    const res = await axiosInstance.post('/technology/projects', projectPayload);
    createdProject = res?.data?.data || res?.data;
  } catch (e: any) {
    console.warn("Axios create project failed:", e?.message || e);
  }

  if (!createdProject || !createdProject.projectId) {
    createdProject = {
      id: Date.now(),
      projectId: projectPayload.projectId,
      title: payload.title || "Untitled Project",
      description: payload.description || "",
      submissionStatus: "submitted",
      paymentStatus: "unpaid",
      price: payload.price || 0,
      adminBudget: payload.price || 0,
      currency: payload.currency || "USD",
      category: payload.category || "Software Development",
      subcategory: payload.subcategory || "General",
      projectType: payload.projectType || "New Build",
      skills: payload.skills || [],
      preferredLanguages: payload.preferredLanguages || [],
      paymentTerms: payload.paymentTerms || "One-time",
      clientName: payload.clientName || "Client",
      clientEmail: payload.clientEmail || "",
      clientPhone: payload.clientPhone || "",
      attachmentFile: payload.attachmentFile,
      startDate: payload.startDate,
      endDate: payload.endDate,
      createdAt: new Date().toISOString(),
    };
  }

  const existing = readLocalProjects();
  writeLocalProjects([createdProject, ...existing.filter((p) => p.projectId !== createdProject.projectId)]);

  return { success: true, projectId: createdProject.projectId, data: createdProject };
};

export const fetchMyProjects = async (_token?: string) => {
  try {
    const res = await axiosInstance.get('/technology/projects/mine');
    const data = res?.data;
    const rawList =
      data?.data?.projects ||
      data?.projects ||
      data?.data ||
      (Array.isArray(data) ? data : []);

    if (Array.isArray(rawList) && rawList.length >= 0) {
      const local = readLocalProjects();
      const dbMap = new Map<string, any>();

      // DB is always the source of truth
      rawList.forEach((p: any) => {
        if (p?.projectId) {
          // Map acceptedAt → assignedAt for frontend compatibility
          const mapped = {
            ...p,
            assignedAt: p.assignedAt || p.acceptedAt || null,
          };
          dbMap.set(p.projectId, mapped);
        }
      });

      // Only add local-only projects not yet in DB (e.g. offline-created)
      local.forEach((p: any) => {
        if (p?.projectId && !dbMap.has(p.projectId)) {
          dbMap.set(p.projectId, p);
        }
      });

      const merged = Array.from(dbMap.values());
      writeLocalProjects(merged);
      return { projects: merged };
    }
  } catch (e: any) {
    console.warn("fetchMyProjects axios fallback:", e?.message || e);
  }

  return { projects: readLocalProjects() };
};

export const fetchPublicProjects = async (params?: Record<string, string>) => {
  try {
    const res = await axiosInstance.get('/technology/projects/public', { params, timeout: 8000 });
    const data = res?.data;
    const rawList =
      data?.data?.projects ||
      data?.projects ||
      data?.data ||
      (Array.isArray(data) ? data : []);

    if (Array.isArray(rawList)) {
      return { projects: rawList };
    }
  } catch (e: any) {
    console.warn("fetchPublicProjects axios fallback:", e?.message || e);
  }
  return { projects: readLocalProjects().filter((p) => p.submissionStatus === "active") };
};

export const fetchAssignedProjects = async (_token?: string) => {
  try {
    const res = await axiosInstance.get('/technology/projects/assigned');
    const data = res?.data;
    const rawList =
      data?.data?.projects ||
      data?.projects ||
      data?.data ||
      (Array.isArray(data) ? data : []);

    if (Array.isArray(rawList)) {
      return { projects: rawList };
    }
  } catch (e: any) {
    console.warn("fetchAssignedProjects fallback:", e?.message || e);
  }
  return { projects: readLocalProjects() };
};

export const fetchAllProjects = async (_token?: string) => {
  try {
    const res = await axiosInstance.get('/technology/projects/all');
    const data = res?.data;
    const rawList =
      data?.data?.projects ||
      data?.projects ||
      data?.data ||
      (Array.isArray(data) ? data : []);

    if (Array.isArray(rawList)) {
      return { projects: rawList };
    }
  } catch (e: any) {
    console.warn("fetchAllProjects fallback:", e?.message || e);
  }
  return { projects: readLocalProjects() };
};

export const applyForProject = async (projectId: string, applyDto?: any) => {
  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/apply`, applyDto || {});
    return res?.data;
  } catch (e: any) {
    console.error("applyForProject API error:", e?.response?.data || e?.message || e);
    throw e;
  }
};

export const fetchMyApplications = async () => {
  try {
    const res = await axiosInstance.get('/technology/projects/my-applications');
    if (res?.data) {
      const data = res.data?.data || res.data;
      return {
        appliedProjectIds: Array.isArray(data?.appliedProjectIds) ? data.appliedProjectIds : [],
        projects: Array.isArray(data?.projects) ? data.projects : [],
        proposals: Array.isArray(data?.proposals) ? data.proposals : [],
      };
    }
  } catch (e: any) {
    console.warn("fetchMyApplications fallback:", e?.response?.data || e?.message || e);
  }
  return { appliedProjectIds: [], projects: [], proposals: [] };
};

export const fetchProjectProposals = async (projectId: string) => {
  try {
    const res = await axiosInstance.get(`/technology/projects/${projectId}/proposals`);
    if (res?.data) {
      const data = res.data?.data || res.data;
      const proposals = Array.isArray(data?.proposals) ? data.proposals : Array.isArray(data) ? data : [];
      return { proposals, total: data?.pagination?.total ?? proposals.length };
    }
  } catch (e: any) {
    console.warn(`fetchProjectProposals for ${projectId} fallback:`, e?.response?.data || e?.message || e);
  }
  return { proposals: [], total: 0 };
};

export const assignProjectApplicant = async (
  projectId: string,
  applicant: {
    businessId: string;
    businessName: string;
    businessFullName?: string;
    businessUserId?: string;
    businessEmail?: string;
    businessAvatar?: string;
    businessType?: string;
    proposalId?: string;
  }
) => {
  // Optimistic local update
  const optimistic = {
    assignedBusinessId: applicant.businessUserId || applicant.businessId,
    assignedBusinessUserId: applicant.businessUserId || applicant.businessId,
    assignedBusinessName: applicant.businessName,
    assignedBusinessFullName: applicant.businessFullName,
    assignedBusinessEmail: applicant.businessEmail,
    assignedBusinessAvatar: applicant.businessAvatar || "",
    assignedBusinessType: applicant.businessType || "Technology",
    assignedProposalId: applicant.proposalId,
    submissionStatus: "in_progress",
    status: "in_progress",
    assignedAt: new Date().toISOString(),
  };

  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId || String(p.id) === projectId
      ? { ...p, ...optimistic }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/assign-applicant`, {
      ...applicant,
      businessUserId: applicant.businessUserId || applicant.businessId,
    });
    const dbProject = res?.data?.data || res?.data;

    // Write DB response back into local cache (DB is source of truth)
    if (dbProject?.projectId) {
      const fresh = readLocalProjects();
      const synced = fresh.map((p) =>
        p.projectId === dbProject.projectId
          ? {
              ...p,
              ...dbProject,
              assignedAt: dbProject.assignedAt || dbProject.acceptedAt || optimistic.assignedAt,
            }
          : p
      );
      writeLocalProjects(synced);
    }

    return res?.data;
  } catch (e: any) {
    console.warn("assignProjectApplicant fallback:", e?.response?.data || e?.message || e);
    return { success: true, project: updated.find((p) => p.projectId === projectId || String(p.id) === projectId) };
  }
};

export const deleteProjectProposal = async (projectId: string, proposalId: string) => {
  try {
    const res = await axiosInstance.delete(`/technology/projects/${projectId}/proposals/${proposalId}`);
    return res?.data;
  } catch (e: any) {
    console.error(`deleteProjectProposal error:`, e?.response?.data || e?.message || e);
    throw e;
  }
};

export const submitProject = async (projectId: string, _token?: string) => {
  const local = readLocalProjects();
  const target = local.find((p) => p.projectId === projectId);
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "submitted" }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/submit`);
    if (res?.data) {
      // Record activity log on submit
      const projectTitle = target?.title || projectId;
      recordActivityLog({
        title: `Project Submitted: "${projectTitle}"`,
        description: `Submitted technical service project ${projectId} for admin review`,
        category: "Technical Services",
        userId: target?.clientId || target?.userId,
        userName: target?.clientName,
        email: target?.clientEmail,
        type: "PROJECT_SUBMITTED",
      });
      return res.data;
    }
  } catch (e: any) {
    console.warn("submitProject fallback:", e?.message || e);
  }

  // Record activity log on submit fallback
  const projectTitle = target?.title || projectId;
  recordActivityLog({
    title: `Project Submitted: "${projectTitle}"`,
    description: `Submitted technical service project ${projectId} for admin review`,
    category: "Technical Services",
    userId: target?.clientId || target?.userId,
    userName: target?.clientName,
    email: target?.clientEmail,
    type: "PROJECT_SUBMITTED",
  });

  return { success: true, status: "submitted" };
};

export const payProject = async (projectId: string, _token?: string) => {
  const local = readLocalProjects();
  let paidProject: any = null;
  const updated = local.map((p) => {
    if (p.projectId === projectId) {
      const baseBudget = Number(p.adminBudget || p.price || 0);
      const commPercent = Number(p.commissionPercent !== undefined ? p.commissionPercent : 10);
      const commissionAmount = Number(((baseBudget * commPercent) / 100).toFixed(2));
      const totalPaymentAmount = Number((baseBudget + commissionAmount).toFixed(2));

      paidProject = {
        ...p,
        submissionStatus: "active",
        paymentStatus: "paid",
        status: "active",
        paidAmount: totalPaymentAmount,
        dueAmount: 0,
        totalAmount: totalPaymentAmount,
        commissionAmount,
      };
      return paidProject;
    }
    return p;
  });
  writeLocalProjects(updated);

  // Broadcast real-time payment sync across tabs
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("platform_projects_last_updated", String(Date.now()));
      window.dispatchEvent(new Event("platform_projects_updated"));
      window.dispatchEvent(new Event("notifications_updated"));
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("vero_channel");
        bc.postMessage({ type: "PROJECT_PAID", projectId });
        bc.close();
      }
    } catch {}
  }

  if (paidProject) {
    const budgetVal = Number(paidProject.adminBudget || paidProject.price || 0);
    const commVal = Number(paidProject.commissionAmount || 0);
    const totalVal = Number(paidProject.totalAmount || budgetVal + commVal);

    // Deduct from local wallet ledger
    if (typeof window !== "undefined") {
      try {
        const rawLedger = localStorage.getItem("platform_wallet_ledger");
        const ledger = rawLedger ? JSON.parse(rawLedger) : [];
        const paymentTx = {
          id: `TX-ESCROW-${Date.now().toString().slice(-6)}`,
          kind: "payment",
          userId: paidProject.userId || paidProject.clientId || "user",
          userName: paidProject.clientName || "Client",
          amount: `-$${totalVal.toFixed(2)} USD`,
          method: `Escrow Fund: ${paidProject.title}`,
          status: "Complete",
          date: new Date().toLocaleDateString(),
        };
        localStorage.setItem("platform_wallet_ledger", JSON.stringify([paymentTx, ...ledger]));
        window.dispatchEvent(new Event("wallet_updated"));
      } catch {}
    }

    recordActivityLog({
      title: `Project Escrow Paid: "${paidProject.title}" (${paidProject.projectId})`,
      description: `Paid $${totalVal.toFixed(2)} USD for "${paidProject.title}" (${paidProject.projectId})`,
      category: "Technical Services",
      type: "PROJECT_PAID",
    });
  }

  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/pay`);
    return res?.data;
  } catch (e: any) {
    console.warn("payProject fallback:", e?.message || e);
  }

  return { success: true, status: "active", paymentStatus: "paid" };
};

export const acceptProject = async (projectId: string, _token?: string) => {
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "in_progress" }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/accept`);
    return res?.data;
  } catch (e: any) {
    console.warn("acceptProject fallback:", e?.message || e);
  }

  return { success: true, status: "in_progress" };
};

export const markProjectComplete = async (
  projectId: string,
  payload?: {
    deliverableUrls?: string[];
    deliverableFiles?: any[];
    completionNotes?: string;
  } | string[],
  notes: string = '',
  _token?: string
) => {
  let deliverableUrls: string[] = [];
  let deliverableFiles: any[] = [];
  let completionNotes = notes;

  if (Array.isArray(payload)) {
    deliverableUrls = payload;
  } else if (payload && typeof payload === 'object') {
    deliverableUrls = payload.deliverableUrls || [];
    deliverableFiles = payload.deliverableFiles || [];
    completionNotes = payload.completionNotes || notes;
  }

  const local = readLocalProjects();
  const updated = local.map((p) => {
    if (p.projectId === projectId || String(p.id) === String(projectId)) {
      const updatedMilestones = Array.isArray(p.milestones)
        ? p.milestones.map((ms: any) => ({
            ...ms,
            status: ms.status === "revision" ? "submitted" : ms.status || "submitted",
          }))
        : [];
      return {
        ...p,
        submissionStatus: "completed",
        status: "completed",
        deliverableUrls,
        deliverableFiles,
        completionNotes,
        milestones: updatedMilestones,
      };
    }
    return p;
  });
  writeLocalProjects(updated);

  if (typeof window !== "undefined") {
    try {
      // Also update business_services_rows cache if present
      const bsnServicesKey = "business_services_rows";
      const existingBsn = JSON.parse(localStorage.getItem(bsnServicesKey) || "[]");
      if (Array.isArray(existingBsn) && existingBsn.length > 0) {
        const updatedBsn = existingBsn.map((row: any) => {
          if (row.id === projectId || row.serviceId === projectId) {
            return {
              ...row,
              status: "pending",
              submissionStatus: "completed",
              rawProject: {
                ...(row.rawProject || {}),
                submissionStatus: "completed",
                status: "completed",
                deliverableUrls,
                deliverableFiles,
                completionNotes,
              },
            };
          }
          return row;
        });
        localStorage.setItem(bsnServicesKey, JSON.stringify(updatedBsn));
      }
      window.dispatchEvent(new Event("project_milestones_updated"));
      window.dispatchEvent(new Event("business_services_updated"));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }

  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/complete`, {
      deliverableUrls,
      deliverableFiles,
      notes: completionNotes,
      completionNotes,
    });
    return res?.data;
  } catch (e: any) {
    console.warn("markProjectComplete fallback:", e?.message || e);
  }

  return { success: true, status: "completed" };
};

export const completeProject = markProjectComplete;

export const reviewAcceptProject = async (projectId: string, _token?: string) => {
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "accepted", paymentStatus: "released" }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/review-accept`);
    return res?.data;
  } catch (e: any) {
    console.warn("reviewAcceptProject fallback:", e?.message || e);
  }

  return { success: true, status: "accepted" };
};

export const deleteProject = async (projectId: string, _token?: string) => {
  try {
    await axiosInstance.delete(`/technology/projects/${projectId}`);
  } catch (e: any) {
    console.warn("deleteProject API note:", e?.message || e);
  }

  const local = readLocalProjects();
  const target = local.find((p) => p.projectId === projectId || String(p.id) === String(projectId));
  const updated = local.filter((p) => p.projectId !== projectId && String(p.id) !== String(projectId));
  writeLocalProjects(updated);

  if (typeof window !== "undefined") {
    try {
      const rawAdmin = localStorage.getItem("platform_user_technical_projects");
      if (rawAdmin) {
        const list = JSON.parse(rawAdmin);
        if (Array.isArray(list)) {
          const filteredAdmin = list.filter((p) => p.projectId !== projectId && String(p.id) !== String(projectId));
          localStorage.setItem("platform_user_technical_projects", JSON.stringify(filteredAdmin));
        }
      }
    } catch {}
  }

  if (target) {
    const budget = target.adminBudget || target.price || 0;
    recordActivityLog({
      title: `Project Deleted: "${target.title}"`,
      description: `Project ${target.projectId} was permanently deleted - Budget: $${budget}`,
      category: "Technical Services",
      type: "project_deleted",
    });
  }

  return { success: true };
};

export const requestRevision = async (projectId: string, reason: string, _token?: string) => {
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "revision", adminNotes: reason }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/request-revision`, { reason });
    return res?.data;
  } catch (e: any) {
    console.warn("requestRevision fallback:", e?.message || e);
  }

  return { success: true, status: "revision" };
};

export const reviewMilestone = async (
  projectId: string,
  data: {
    milestoneIndex: number;
    action: 'accept' | 'revision';
    clientNote: string;
    totalMilestones: number;
  }
) => {
  const local = readLocalProjects();
  const target = local.find((p) => p.projectId === projectId || String(p.id) === String(projectId));
  const isLastMilestone = data.action === 'accept' && (data.milestoneIndex >= data.totalMilestones - 1 || data.totalMilestones <= 1);

  // Optimistically update local cache with milestone status and completion
  const updatedLocal = local.map((p) => {
    if (p.projectId === projectId || String(p.id) === String(projectId)) {
      const nextMilestones = Array.isArray(p.milestones) ? [...p.milestones] : [];
      while (nextMilestones.length <= data.milestoneIndex) {
        nextMilestones.push({});
      }
      nextMilestones[data.milestoneIndex] = {
        ...(nextMilestones[data.milestoneIndex] || {}),
        status: data.action === 'accept' ? 'accepted' : 'revision',
        clientNote: data.clientNote,
      };

      const allAccepted = data.totalMilestones > 0 && nextMilestones.slice(0, data.totalMilestones).every((m: any) => m?.status === 'accepted');
      const isFinished = isLastMilestone || allAccepted;

      return {
        ...p,
        submissionStatus: isFinished ? 'accepted' : data.action === 'revision' ? 'revision' : p.submissionStatus,
        status: isFinished ? 'accepted' : data.action === 'revision' ? 'revision' : p.status,
        paymentStatus: isFinished ? 'released' : p.paymentStatus,
        milestones: nextMilestones,
      };
    }
    return p;
  });
  writeLocalProjects(updatedLocal);

  if (target && data.action === 'accept') {
    const total = Number(target.adminBudget || target.price || 0);
    const commPct = Number(target.commissionPercent ?? 10);
    const msTotal = data.totalMilestones > 0 ? total / data.totalMilestones : total;
    const comm = parseFloat(((msTotal * commPct) / 100).toFixed(2));
    const businessPayout = parseFloat((msTotal - comm).toFixed(2));

    if (typeof window !== "undefined" && businessPayout > 0) {
      try {
        const rawLedger = localStorage.getItem("platform_wallet_ledger");
        const ledger = rawLedger ? JSON.parse(rawLedger) : [];
        const earningTx = {
          id: `TX-PAYOUT-${Date.now().toString().slice(-6)}`,
          kind: "earning",
          userId: target.assignedBusinessUserId || target.assignedBusinessId || "business",
          userName: target.assignedBusinessFullName || target.assignedBusinessName || "Business Partner",
          amount: `+$${businessPayout.toFixed(2)} USD`,
          method: `Milestone ${data.milestoneIndex + 1} Payout: ${target.title}`,
          status: "Complete",
          date: new Date().toLocaleDateString(),
        };
        localStorage.setItem("platform_wallet_ledger", JSON.stringify([earningTx, ...ledger]));
        window.dispatchEvent(new Event("wallet_updated"));
        window.dispatchEvent(new Event("platform_projects_updated"));
        window.dispatchEvent(new Event("applied_projects_updated"));
        window.dispatchEvent(new Event("notifications_updated"));

        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("vero_channel");
          bc.postMessage({ type: "MILESTONE_ACCEPTED", projectId, milestoneIndex: data.milestoneIndex });
          bc.close();
        }
      } catch {}
    }

    recordActivityLog({
      title: `Milestone ${data.milestoneIndex + 1} Accepted: "${target.title}"`,
      description: `Client accepted Milestone ${data.milestoneIndex + 1}. Released $${businessPayout.toFixed(2)} USD payout.`,
      category: "Technical Services",
      type: "milestone_accepted",
    });
  }

  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/review-milestone`, data);
    return res?.data;
  } catch (e: any) {
    console.warn('reviewMilestone fallback:', e?.message || e);
  }
  return { success: true };
};

export function formatProjectDate(d?: string | Date | null): string {
  if (!d) return "";
  const str = String(d).trim();
  if (str.includes("→")) {
    const parts = str.split("→").map((s) => s.trim());
    return parts.map((part) => formatProjectDate(part)).join(" → ");
  }
  if (str.includes(" - ") && !str.startsWith("-")) {
    const parts = str.split(" - ").map((s) => s.trim());
    return parts.map((part) => formatProjectDate(part)).join(" → ");
  }
  try {
    const dt = new Date(str);
    if (isNaN(dt.getTime())) return str;
    return dt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return str;
  }
}

export const extendProjectDeadline = async (projectId: string, newEndDate: string, _token?: string) => {
  const endDateIso = new Date(newEndDate).toISOString();

  // Optimistic update
  const local = readLocalProjects();
  const target = local.find((p) => p.projectId === projectId || String(p.id) === String(projectId));
  const updated = local.map((p) =>
    p.projectId === projectId || String(p.id) === String(projectId)
      ? { ...p, endDate: endDateIso }
      : p
  );
  writeLocalProjects(updated);

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("project_deadline_updated", { detail: { projectId, endDate: endDateIso } }));
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("vero_channel");
        bc.postMessage({ type: "PROJECT_DEADLINE_EXTENDED", projectId, endDate: endDateIso });
        bc.close();
      }
    } catch {}
  }

  if (target) {
    recordActivityLog({
      title: `Deadline Extended: "${target.title}"`,
      description: `Project ${target.projectId} deadline extended to ${formatProjectDate(endDateIso)}`,
      category: "Technical Services",
      type: "project_deadline_extended",
    });
  }

  try {
    const res = await axiosInstance.patch(`/technology/projects/${projectId}`, {
      endDate: endDateIso,
    });
    const dbProject = res?.data?.data || res?.data;
    if (dbProject?.projectId) {
      const fresh = readLocalProjects();
      const synced = fresh.map((p) =>
        p.projectId === dbProject.projectId ? { ...p, ...dbProject } : p
      );
      writeLocalProjects(synced);
    }
    return res?.data;
  } catch (e: any) {
    console.warn("extendProjectDeadline API fallback:", e?.message || e);
  }

  return { success: true, endDate: endDateIso };
};

const LOCAL_STORAGE_TAXONOMY_KEY = "platform_service_taxonomies";

export async function fetchServiceTaxonomy(serviceType: string = "technology"): Promise<{
  categories: string[];
  subcategories: string[];
  skills: string[];
}> {
  const sKey = (serviceType || "technology").toLowerCase().trim().replace(/\s+/g, "-");
  let localCache = {
    categories: [] as string[],
    subcategories: [] as string[],
    skills: [] as string[],
  };

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TAXONOMY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed[sKey]) {
          localCache = {
            categories: Array.isArray(parsed[sKey].categories) ? parsed[sKey].categories : [],
            subcategories: Array.isArray(parsed[sKey].subcategories) ? parsed[sKey].subcategories : [],
            skills: Array.isArray(parsed[sKey].skills) ? parsed[sKey].skills : [],
          };
        }
      }
    } catch {}
  }

  try {
    let res: any = null;
    try {
      res = await axiosInstance.get(`/technology/projects/taxonomy?serviceType=${sKey}`);
    } catch {
      try {
        res = await axiosInstance.get(`/technology/services/taxonomy?serviceType=${sKey}`);
      } catch {
        res = await axiosInstance.get(`/technology/taxonomy?serviceType=${sKey}`);
      }
    }

    const data = res?.data?.data || res?.data;
    if (data && (Array.isArray(data.categories) || Array.isArray(data.subcategories) || Array.isArray(data.skills))) {
      const categories: string[] = Array.isArray(data.categories) ? data.categories : [];
      const subcategories: string[] = Array.isArray(data.subcategories) ? data.subcategories : [];
      const skills: string[] = Array.isArray(data.skills) ? data.skills : [];

      if (typeof window !== "undefined") {
        try {
          let store: any = {};
          const raw = localStorage.getItem(LOCAL_STORAGE_TAXONOMY_KEY);
          if (raw) store = JSON.parse(raw) || {};
          store[sKey] = { categories, subcategories, skills };
          localStorage.setItem(LOCAL_STORAGE_TAXONOMY_KEY, JSON.stringify(store));
        } catch {}
      }

      return { categories, subcategories, skills };
    }
  } catch (e: any) {
    // fallback to local cache
  }

  return localCache;
}
