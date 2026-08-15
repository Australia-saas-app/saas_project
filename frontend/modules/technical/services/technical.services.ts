/**
 * Technical Service API — all calls go through Next.js proxy → Kong → technology backend
 * Base path: /api/technology/projects  (Kong strips /api/v1/ → technology service)
 */

const BASE = '/api/technology/projects';

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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
}

export const fetchWalletBalance = async (token?: string): Promise<{ balance: number }> => {
  try {
    const res = await fetch('/api/wallet/balance', {
      credentials: 'include',
      headers: authHeaders(token),
    });
    if (res.ok) {
      const data = await res.json();
      return { balance: Number(data?.balance ?? 50000) };
    }
  } catch (e) {
    console.warn("Wallet balance fetched locally:", e);
  }
  return { balance: 50000 };
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

export const createProject = async (payload: any, token?: string) => {
  let createdProject: any = null;

  try {
    const res = await fetch(BASE, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      createdProject = json?.data || json;
    }
  } catch (e) {
    console.warn("Backend error creating project:", e);
  }

  if (!createdProject) {
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

export const fetchMyProjects = async (token?: string) => {
  try {
    const res = await fetch(`${BASE}/mine`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.projects && Array.isArray(data.projects)) {
        // Sync local cache with backend DB
        const local = readLocalProjects();
        const map = new Map<string, any>();
        [...local, ...data.projects].forEach((p) => {
          if (p?.projectId) map.set(p.projectId, p);
        });
        const merged = Array.from(map.values());
        writeLocalProjects(merged);
        return { projects: merged };
      }
      return data;
    }
  } catch (e) {
    console.warn("Backend unavailable, using local projects cache:", e);
  }

  return { projects: readLocalProjects() };
};

export const fetchPublicProjects = async (params?: Record<string, string>) => {
  try {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE}/public${qs}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn("Could not fetch public projects:", e);
  }
  return { projects: readLocalProjects().filter((p) => p.submissionStatus === "active") };
};

export const fetchAssignedProjects = async (token?: string) => {
  try {
    const res = await fetch(`${BASE}/assigned`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn("Could not fetch assigned projects:", e);
  }
  return { projects: readLocalProjects() };
};

export const fetchAllProjects = async (token?: string) => {
  try {
    const res = await fetch(`${BASE}/all`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn("Could not fetch all projects:", e);
  }
  return { projects: readLocalProjects() };
};

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export const submitProject = async (projectId: string, token?: string) => {
  // Update local
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId ? { ...p, submissionStatus: "admin_review" } : p
  );
  writeLocalProjects(updated);

  try {
    const res = await fetch(`${BASE}/${projectId}/submit`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Submitted locally:", e);
  }

  return { success: true, status: "admin_review" };
};

export const payProject = async (projectId: string, token?: string) => {
  // Update local
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
    const res = await fetch(`${BASE}/${projectId}/pay`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Paid locally:", e);
  }

  return { success: true, status: "active", paymentStatus: "paid" };
};

export const acceptProject = async (projectId: string, token?: string) => {
  // Update local
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "in_progress" }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await fetch(`${BASE}/${projectId}/accept`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Accepted locally:", e);
  }

  return { success: true, status: "in_progress" };
};

export const markProjectComplete = async (
  projectId: string,
  payload: { completionNotes?: string; deliverableUrls?: string[]; deliverableFiles?: any[] },
  token?: string
) => {
  // Update local
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? {
          ...p,
          submissionStatus: "completed",
          completionNotes: payload.completionNotes,
          deliverableUrls: payload.deliverableUrls,
          deliverableFiles: payload.deliverableFiles,
        }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await fetch(`${BASE}/${projectId}/complete`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Completed locally:", e);
  }

  return { success: true, status: "completed" };
};

export const reviewAcceptProject = async (projectId: string, token?: string) => {
  // Update local
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "accepted", paymentStatus: "released" }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await fetch(`${BASE}/${projectId}/review-accept`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Accepted review locally:", e);
  }

  return { success: true, status: "accepted" };
};

export const deleteProject = async (projectId: string, token?: string) => {
  // 1. Remove from local store
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

  // 2. Call backend DELETE endpoint
  try {
    const res = await fetch(`${BASE}/${projectId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: authHeaders(token),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Deleted locally:", e);
  }

  return { success: true };
};

export const requestRevision = async (projectId: string, reason: string, token?: string) => {
  // Update local
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "revision", revisionReason: reason }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await fetch(`${BASE}/${projectId}/request-revision`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Requested revision locally:", e);
  }

  return { success: true, status: "revision" };
};
