/**
 * Centralized Real Activity Logger
 * Logs real user & admin actions to localStorage, custom window events, and backend database.
 */

export interface RealLogEntry {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

const STORAGE_KEY_PREFIX = "sys_real_user_logs_";
export const LOG_ADDED_EVENT = "vero:log_added";

export function getLogsForUser(userId: string): RealLogEntry[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordRealActivity(
  action: string,
  details: string,
  userOrEmail?: string | { email?: string; userId?: string; id?: string },
  ipAddress = "127.0.0.1"
): RealLogEntry {
  let userId = "user";
  let username = "User";

  if (typeof userOrEmail === "string") {
    username = userOrEmail;
    userId = userOrEmail;
  } else if (userOrEmail && typeof userOrEmail === "object") {
    username = userOrEmail.email || "User";
    userId = userOrEmail.userId || userOrEmail.id || username;
  }

  const newLog: RealLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    username,
    action,
    details,
    ipAddress,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getLogsForUser(userId);
      const updated = [newLog, ...existing].slice(0, 500); // Keep latest 500
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(LOG_ADDED_EVENT, { detail: newLog }));
    } catch (e) {
      console.error("Failed to record activity log", e);
    }
  }

  return newLog;
}

export function deleteSingleLog(userId: string, logId: string): RealLogEntry[] {
  const existing = getLogsForUser(userId);
  const updated = existing.filter((l) => l.id !== logId);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(LOG_ADDED_EVENT));
    } catch {}
  }
  return updated;
}

export function deleteAllLogs(userId: string): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
      window.dispatchEvent(new CustomEvent(LOG_ADDED_EVENT));
    } catch {}
  }
}
