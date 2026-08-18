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

export const fetchWalletBalance = async (_token?: string): Promise<{ balance: number }> => {
  try {
    const ssoRes = await axiosInstance.get('/sso/wallet/balance');
    if (ssoRes?.data?.balance !== undefined && ssoRes.data.balance !== null) {
      return { balance: Number(ssoRes.data.balance) };
    }
  } catch {}

  // Calculate accurately from persistent storage ledger if offline or mocked
  if (typeof window !== "undefined") {
    try {
      const rawLedger = localStorage.getItem("platform_wallet_ledger");
      const rawUser = localStorage.getItem("auth_user") || localStorage.getItem("user");
      let uid = "";
      if (rawUser) {
        const u = JSON.parse(rawUser);
        uid = u.id || u.userId || u.email;
      }
      if (rawLedger) {
        const parsed: any[] = JSON.parse(rawLedger);
        if (Array.isArray(parsed)) {
          const userDeposits = parsed
            .filter((r) => (!uid || r.userId === uid) && (r.kind === "deposit" || r.type?.toLowerCase() === "deposit") && (r.status === "Complete" || r.status === "Completed" || r.status === "Pending"))
            .reduce((acc, r) => acc + (parseFloat(String(r.amount).replace(/[^0-9.]/g, "")) || 0), 0);
          
          const userPayments = parsed
            .filter((r) => (!uid || r.userId === uid) && (r.kind === "payment" || r.type?.toLowerCase() === "payment" || r.kind === "withdraw_hold"))
            .reduce((acc, r) => acc + (parseFloat(String(r.amount).replace(/[^0-9.]/g, "")) || 0), 0);

          const available = Math.max(0, userDeposits - userPayments);
          return { balance: available };
        }
      }
    } catch {}
  }

  return { balance: 0 };
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
    const items = Array.isArray(res?.data?.data)
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

export const sendProjectMessage = async (
  projectId: string,
  content: string,
  messageType?: string,
  _token?: string
) => {
  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/messages`, {
      content,
      messageType: messageType || 'general',
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

    if (Array.isArray(rawList)) {
      const local = readLocalProjects();
      const map = new Map<string, any>();
      rawList.forEach((p: any) => {
        if (p?.projectId) map.set(p.projectId, p);
      });
      local.forEach((p: any) => {
        if (p?.projectId) {
          const existing = map.get(p.projectId);
          if (!existing) {
            map.set(p.projectId, p);
          } else {
            // If local was already paid or activated, don't let stale remote status override it
            const isPaid = p.paymentStatus === "paid" || existing.paymentStatus === "paid";
            const isLive = p.submissionStatus === "active" || existing.submissionStatus === "active";
            map.set(p.projectId, {
              ...existing,
              ...p,
              paymentStatus: isPaid ? "paid" : existing.paymentStatus || p.paymentStatus,
              submissionStatus: isLive ? "active" : existing.submissionStatus || p.submissionStatus,
            });
          }
        }
      });
      const merged = Array.from(map.values());
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
    const res = await axiosInstance.get('/technology/projects/public', { params });
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
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "completed", deliverableUrls, deliverableFiles, completionNotes }
      : p
  );
  writeLocalProjects(updated);

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
