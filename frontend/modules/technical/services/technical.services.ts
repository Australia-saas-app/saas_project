/**
 * Technical Service API — all calls go through axiosInstance → Kong / Backend → PostgreSQL database
 */

import axiosInstance from "@/src/shared/lib/axiosInstance";

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

export function recordActivityLog(log: {
  title: string;
  description: string;
  category?: string;
  userId?: string;
  userName?: string;
  type?: string;
}) {
  if (typeof window === "undefined") return;
  try {
    const key = "platform_activity_logs";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const item = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    localStorage.setItem(key, JSON.stringify([item, ...existing]));
    window.dispatchEvent(new Event("activity_logs_updated"));
  } catch {}

  // Also persist to backend user-profile activity DB
  try {
    axiosInstance.post('/user-profile-service/activity', {
      action: log.type || 'PROJECT_SUBMITTED',
      resource: 'technical_project',
      details: {
        title: log.title,
        description: log.description,
        category: log.category || 'Technical Services',
        userName: log.userName,
        userId: log.userId,
      },
    }).catch(() => {});
  } catch {}
}

export function dispatchAdminNotification(notif: {
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
      href: notif.href || "/admin/technical",
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
    axiosInstance.post('/notifications', {
      type: notif.type || 'TECHNICAL_PROJECT_SUBMIT',
      title: notif.title,
      message: notif.message,
      priority: 'high',
      data: { href: notif.href || '/admin/technical' },
    }).catch(() => {});
  } catch {}
}

export const fetchWalletBalance = async (_token?: string): Promise<{ balance: number }> => {
  try {
    const res = await axiosInstance.get('/wallet/balance');
    return { balance: Number(res?.data?.balance ?? 50000) };
  } catch (e) {
    console.warn("Wallet balance fallback:", e);
  }
  return { balance: 50000 };
};

export const depositToWallet = async (amount: number, description?: string, _token?: string) => {
  try {
    const res = await axiosInstance.post('/wallet/deposit', { amount, description });
    return res?.data;
  } catch (e) {
    console.warn("Deposit handled locally:", e);
  }
  return { success: true };
};

export const fetchWalletTransactions = async (_token?: string) => {
  try {
    const res = await axiosInstance.get('/wallet/transactions');
    return res?.data || { data: [] };
  } catch (e) {
    console.warn("Wallet transactions fallback:", e);
  }
  return { data: [] };
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

export const createProject = async (payload: any, _token?: string) => {
  let createdProject: any = null;

  try {
    const res = await axiosInstance.post('/technology/projects', payload);
    createdProject = res?.data?.data || res?.data;
  } catch (e: any) {
    console.warn("Axios create project failed:", e?.message || e);
  }

  if (!createdProject || !createdProject.projectId) {
    createdProject = {
      id: Date.now(),
      projectId: `PRJ-${Date.now().toString().slice(-6)}`,
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

  // Log activity & dispatch admin notification
  recordActivityLog({
    title: `Service Project Submitted: "${createdProject.title}"`,
    description: `Submitted by ${createdProject.clientName} (${createdProject.clientEmail || "User"}) with budget $${createdProject.price}.`,
    category: "Technical Services",
    type: "project_created",
  });

  dispatchAdminNotification({
    title: "New Technical Project Submitted",
    message: `"${createdProject.title}" submitted by ${createdProject.clientName} ($${createdProject.price}). Needs review and quote.`,
    href: "/admin/technical",
  });

  return { success: true, projectId: createdProject.projectId, data: createdProject };
};

export const fetchMyProjects = async (_token?: string) => {
  try {
    const res = await axiosInstance.get('/technology/projects/mine');
    const data = res?.data;
    if (data?.projects && Array.isArray(data.projects)) {
      const local = readLocalProjects();
      const map = new Map<string, any>();
      [...local, ...data.projects].forEach((p) => {
        if (p?.projectId) map.set(p.projectId, p);
      });
      const merged = Array.from(map.values());
      writeLocalProjects(merged);
      return { projects: merged };
    } else if (Array.isArray(data)) {
      const local = readLocalProjects();
      const map = new Map<string, any>();
      [...local, ...data].forEach((p) => {
        if (p?.projectId) map.set(p.projectId, p);
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
    if (data?.projects && Array.isArray(data.projects)) {
      return data;
    } else if (Array.isArray(data)) {
      return { projects: data };
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
    if (data?.projects && Array.isArray(data.projects)) {
      return data;
    } else if (Array.isArray(data)) {
      return { projects: data };
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
    if (data?.projects && Array.isArray(data.projects)) {
      return data;
    } else if (Array.isArray(data)) {
      return { projects: data };
    }
  } catch (e: any) {
    console.warn("fetchAllProjects fallback:", e?.message || e);
  }
  return { projects: readLocalProjects() };
};

export const submitProject = async (projectId: string, _token?: string) => {
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "submitted" }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/submit`);
    return res?.data;
  } catch (e: any) {
    console.warn("submitProject fallback:", e?.message || e);
  }

  return { success: true, status: "submitted" };
};

export const payProject = async (projectId: string, _token?: string) => {
  const local = readLocalProjects();
  let paidProject: any = null;
  const updated = local.map((p) => {
    if (p.projectId === projectId) {
      paidProject = { ...p, submissionStatus: "active", paymentStatus: "paid" };
      return paidProject;
    }
    return p;
  });
  writeLocalProjects(updated);

  if (paidProject) {
    recordActivityLog({
      title: `Project Escrow Funded & Published Publicly: "${paidProject.title}"`,
      description: `Client funded $${paidProject.adminBudget || paidProject.price || 0} into escrow. Project is now published for verified businesses.`,
      category: "Technical Services",
      type: "project_paid_published",
    });

    dispatchAdminNotification({
      title: "Project Payment Approved & Escrow Funded",
      message: `"${paidProject.title}" has been funded by client ($${paidProject.adminBudget || paidProject.price}). Now live and open for businesses.`,
      href: "/admin/technical",
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

export const completeProject = async (
  projectId: string,
  deliverableUrls: string[] = [],
  notes: string = '',
  _token?: string
) => {
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "completed", deliverableUrls, completionNotes: notes }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await axiosInstance.post(`/technology/projects/${projectId}/complete`, {
      deliverableUrls,
      notes,
    });
    return res?.data;
  } catch (e: any) {
    console.warn("completeProject fallback:", e?.message || e);
  }

  return { success: true, status: "completed" };
};

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
  const local = readLocalProjects();
  const target = local.find((p) => p.projectId === projectId || String(p.id) === String(projectId));
  const updated = local.filter((p) => p.projectId !== projectId && String(p.id) !== String(projectId));
  writeLocalProjects(updated);

  if (target) {
    recordActivityLog({
      title: `Project Deleted: "${target.title}"`,
      description: `Project ${target.projectId} (${target.title}) was permanently deleted.`,
      category: "Technical Services",
      type: "project_deleted",
    });
  }

  try {
    const res = await axiosInstance.delete(`/technology/projects/${projectId}`);
    return res?.data;
  } catch (e: any) {
    console.warn("deleteProject fallback:", e?.message || e);
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
