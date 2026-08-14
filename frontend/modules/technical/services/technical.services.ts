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

// ─── Category / Skill helpers (kept as mock — replace with real API later) ──

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

export const createProject = async (payload: unknown, token?: string) => {
  const res = await fetch(BASE, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to create project');
  return data;
};

export const fetchMyProjects = async (token?: string) => {
  const res = await fetch(`${BASE}/mine`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to fetch projects');
  return data;
};

export const fetchPublicProjects = async (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`${BASE}/public${qs}`, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to fetch public projects');
  return data;
};

export const fetchAssignedProjects = async (token?: string) => {
  const res = await fetch(`${BASE}/assigned`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to fetch assigned projects');
  return data;
};

export const fetchAllProjects = async (token?: string) => {
  const res = await fetch(`${BASE}/all`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to fetch all projects');
  return data;
};

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export const submitProject = async (projectId: string, token?: string) => {
  const res = await fetch(`${BASE}/${projectId}/submit`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to submit project');
  return data;
};

export const payProject = async (projectId: string, token?: string) => {
  const res = await fetch(`${BASE}/${projectId}/pay`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Payment failed');
  return data;
};

export const acceptProject = async (projectId: string, businessName: string, token?: string) => {
  const res = await fetch(`${BASE}/${projectId}/accept`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
    body: JSON.stringify({ businessName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to accept project');
  return data;
};

export const markProjectComplete = async (
  projectId: string,
  payload: { deliverableUrls?: string[]; deliverableFiles?: any[]; completionNotes?: string },
  token?: string,
) => {
  const res = await fetch(`${BASE}/${projectId}/complete`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to mark complete');
  return data;
};

export const reviewAcceptProject = async (projectId: string, token?: string) => {
  const res = await fetch(`${BASE}/${projectId}/review-accept`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to accept project');
  return data;
};

export const requestRevision = async (projectId: string, reason: string, token?: string) => {
  const res = await fetch(`${BASE}/${projectId}/request-revision`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to request revision');
  return data;
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminApproveProject = async (
  projectId: string,
  payload: {
    adminBudget: number;
    minBudget?: number;
    requirements?: string;
    conditions?: string;
    adminNotes?: string;
    commissionPercent?: number;
  },
  token?: string,
) => {
  const res = await fetch(`${BASE}/${projectId}/admin-approve`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to approve');
  return data;
};

export const adminRejectProject = async (projectId: string, reason: string, token?: string) => {
  const res = await fetch(`${BASE}/${projectId}/admin-reject`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to reject');
  return data;
};

// ─── Wallet ──────────────────────────────────────────────────────────────────

export const fetchWalletBalance = async (token?: string) => {
  const res = await fetch('/api/wallet/balance', {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  return data;
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
  const res = await fetch('/api/wallet/transactions', {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  return data;
};

// ─── Real-Time Messages ──────────────────────────────────────────────────────

export const fetchProjectMessages = async (projectId: string, token?: string) => {
  const res = await fetch(`${BASE}/${projectId}/messages`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to fetch messages');
  return data;
};

export const sendProjectMessage = async (
  projectId: string,
  content: string,
  messageType: 'general' | 'update' | 'comment' | 'system' = 'general',
  token?: string,
) => {
  const res = await fetch(`${BASE}/${projectId}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(token),
    body: JSON.stringify({ content, messageType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Failed to send message');
  return data;
};
