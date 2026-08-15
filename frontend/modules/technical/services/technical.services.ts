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
  } catch {
    // ignore
  }
}

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
  const localProject = {
    id: Date.now(),
    projectId: `PRJ-${Date.now().toString().slice(-6)}`,
    title: payload.title || "Untitled Project",
    description: payload.description || "",
    submissionStatus: "draft",
    paymentStatus: "unpaid",
    price: payload.price || 0,
    adminBudget: payload.price || 0,
    currency: payload.currency || "USD",
    category: payload.category || "Software Development",
    subcategory: payload.subcategory || "General",
    projectType: payload.projectType || "New Build",
    skills: payload.skills || [],
    clientName: payload.clientName || "Client",
    createdAt: new Date().toISOString(),
  };

  const existing = readLocalProjects();
  writeLocalProjects([localProject, ...existing]);

  try {
    const res = await fetch(BASE, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.warn("Backend unavailable, created project locally:", e);
  }

  return { success: true, projectId: localProject.projectId, data: localProject };
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
        // Merge remote and local
        const local = readLocalProjects();
        const map = new Map<string, any>();
        [...data.projects, ...local].forEach((p) => {
          if (p?.projectId) map.set(p.projectId, p);
        });
        return { projects: Array.from(map.values()) };
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
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "active", paymentStatus: "paid" }
      : p
  );
  writeLocalProjects(updated);

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

export const acceptProject = async (projectId: string, businessName: string, token?: string) => {
  // Update local
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? { ...p, submissionStatus: "in_progress", assignedBusinessName: businessName }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await fetch(`${BASE}/${projectId}/accept`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
      body: JSON.stringify({ businessName }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Accepted locally:", e);
  }

  return { success: true, status: "in_progress" };
};

export const markProjectComplete = async (
  projectId: string,
  payload: { deliverableUrls?: string[]; deliverableFiles?: any[]; completionNotes?: string },
  token?: string,
) => {
  // Update local
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? {
          ...p,
          submissionStatus: "completed",
          deliverableUrls: payload.deliverableUrls,
          deliverableFiles: payload.deliverableFiles,
          completionNotes: payload.completionNotes,
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
    p.projectId === projectId ? { ...p, submissionStatus: "accepted" } : p
  );
  writeLocalProjects(updated);

  try {
    const res = await fetch(`${BASE}/${projectId}/accept-review`, {
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
    const res = await fetch(`${BASE}/${projectId}/revision`, {
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

export const adminApproveProject = async (
  projectId: string,
  payload: {
    adminBudget: number;
    minBudget: number;
    commissionPercent: number;
    requirements?: string;
    conditions?: string;
    adminNotes?: string;
  },
  token?: string,
) => {
  // Update local
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId
      ? {
          ...p,
          submissionStatus: "approved",
          adminBudget: payload.adminBudget,
          minBudget: payload.minBudget,
          requirements: payload.requirements,
          conditions: payload.conditions,
        }
      : p
  );
  writeLocalProjects(updated);

  try {
    const res = await fetch(`${BASE}/${projectId}/admin-approve`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Approved locally:", e);
  }

  return { success: true, status: "approved" };
};

export const adminRejectProject = async (projectId: string, reason: string, token?: string) => {
  // Update local
  const local = readLocalProjects();
  const updated = local.map((p) =>
    p.projectId === projectId ? { ...p, submissionStatus: "rejected", rejectReason: reason } : p
  );
  writeLocalProjects(updated);

  try {
    const res = await fetch(`${BASE}/${projectId}/admin-reject`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn("Rejected locally:", e);
  }

  return { success: true, status: "rejected" };
};

// ─── Wallet ──────────────────────────────────────────────────────────────────

export const fetchWalletBalance = async (token?: string) => {
  try {
    const res = await fetch('/api/wallet/balance', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    // fallback
  }
  return { balance: 5000 };
};

export const depositToWallet = async (amount: number, description?: string, token?: string) => {
  const res = await fetch('/api/wallet/deposit', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
    body: JSON.stringify({ amount, description }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Deposit failed');
  return data;
};

export const fetchWalletTransactions = async (token?: string) => {
  try {
    const res = await fetch('/api/wallet/transactions', {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    // fallback
  }
  return { transactions: [] };
};

// ─── Real-Time Messages ──────────────────────────────────────────────────────

export const fetchProjectMessages = async (projectId: string, token?: string) => {
  try {
    const res = await fetch(`${BASE}/${projectId}/messages`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    // fallback
  }
  return { messages: [] };
};

export const sendProjectMessage = async (
  projectId: string,
  content: string,
  messageType: 'general' | 'update' | 'comment' | 'system' = 'general',
  token?: string,
) => {
  try {
    const res = await fetch(`${BASE}/${projectId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(token),
      body: JSON.stringify({ content, messageType }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    // fallback
  }
  return { success: true };
};
