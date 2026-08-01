/**
 * Centralized Real Activity Logger
 * Logs real user & admin actions to localStorage, custom window events, and backend database.
 */

export interface RealLogEntry {
  id: string;
  userId: string;
  username: string;
  email?: string;
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
  userOrEmail?: string | { email?: string; userId?: string; id?: string; name?: string; firstName?: string },
  ipAddress = "127.0.0.1"
): RealLogEntry {
  let userId = "user";
  let username = "User";
  let email = "";

  if (typeof userOrEmail === "string") {
    username = userOrEmail;
    userId = userOrEmail;
  } else if (userOrEmail && typeof userOrEmail === "object") {
    email = userOrEmail.email || "";
    username = userOrEmail.name || userOrEmail.firstName || email || "User";
    userId = userOrEmail.userId || userOrEmail.id || username;
  }

  const newLog: RealLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    username,
    email,
    action,
    details,
    ipAddress,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      // Optimistically save the log first
      const saveLog = (logToSave: RealLogEntry) => {
        const existing = getLogsForUser(userId);
        // if this log already exists (via ID), replace it, otherwise unshift
        const idx = existing.findIndex(l => l.id === logToSave.id);
        if (idx !== -1) {
          existing[idx] = logToSave;
        } else {
          existing.unshift(logToSave);
        }
        const updated = existing.slice(0, 500);
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent(LOG_ADDED_EVENT, { detail: logToSave }));
      };
      
      saveLog(newLog);

      // Async fetch real IP if we're on client side and it's the default
      if (ipAddress === "127.0.0.1") {
        fetch("https://api.ipify.org?format=json")
          .then(res => res.json())
          .then(data => {
            if (data.ip) {
              newLog.ipAddress = data.ip;
              saveLog(newLog);
            }
          })
          .catch(() => {});
      }
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
