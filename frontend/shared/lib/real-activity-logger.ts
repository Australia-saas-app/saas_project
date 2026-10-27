import {
  logActivityToServer,
  getLogsFromServer,
  deleteActivityFromServer,
  deleteAllActivitiesFromServer,
} from "@/src/shared/server/AuthService";
import axiosInstance from "@/src/shared/lib/axiosInstance";

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

export const LOG_ADDED_EVENT = "vero:log_added";

export function formatLogCount(count: number): string {
  if (!count || count < 1000) return (count || 0).toString();
  const k = count / 1000;
  const formatted = parseFloat(k.toFixed(2)).toString();
  return `${formatted}k`;
}

function formatBackendLog(log: any): RealLogEntry {
  return {
    id: log._id || log.id,
    userId: log.userId,
    username: log.details?.fullName || log.details?.name || "User",
    email: log.details?.email || "",
    action: log.action,
    details: log.resource || log.details?.message || "",
    ipAddress: log.ipAddress || "",
    createdAt: log.timestamp || log.createdAt,
  };
}

export async function getLogsForUser(_userId?: string): Promise<RealLogEntry[]> {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("platform_user_activity_logs");
      localStorage.removeItem("platform_activity_logs");
    } catch {}
  }
  try {
    const activities = await getLogsFromServer();
    if (Array.isArray(activities) && activities.length > 0) {
      return activities.map(formatBackendLog);
    }
    // Fallback directly from client-side if server action had no cookies
    if (typeof window !== "undefined") {
      try {
        const { data } = await axiosInstance.get("/user-profile-service/activity");
        const list = data?.activities || data?.data?.activities || [];
        if (Array.isArray(list) && list.length > 0) {
          return list.map(formatBackendLog);
        }
      } catch {}
    }
    return (activities || []).map(formatBackendLog);
  } catch (error) {
    if (typeof window !== "undefined") {
      try {
        const { data } = await axiosInstance.get("/user-profile-service/activity");
        const list = data?.activities || data?.data?.activities || [];
        return (list || []).map(formatBackendLog);
      } catch {}
    }
    console.error("Failed to fetch activity logs", error);
    return [];
  }
}

let cachedClientIp: string | null = null;

export async function getRealClientIp(): Promise<string> {
  if (cachedClientIp) return cachedClientIp;
  if (typeof window === "undefined") return "127.0.0.1";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const ipRes = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
    clearTimeout(timeout);
    const ipData = await ipRes.json();
    if (ipData?.ip && typeof ipData.ip === "string") {
      cachedClientIp = ipData.ip;
      return ipData.ip;
    }
  } catch {}
  return "127.0.0.1";
}

export async function recordRealActivity(
  action: string,
  details: string,
  userOrEmail?: string | { email?: string; userId?: string; id?: string; name?: string; fullName?: string; firstName?: string },
  ipAddress?: string
): Promise<RealLogEntry | null> {
  let userId = "user";
  let username = "User";
  let email = "";

  if (typeof userOrEmail === "string") {
    email = userOrEmail;
    userId = userOrEmail;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("auth_user") || localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          username = u.fullName || u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || userOrEmail;
          userId = u.id || u.userId || userOrEmail;
        }
      } catch {}
    }
    if (!username || username === "User") username = userOrEmail;
  } else if (userOrEmail && typeof userOrEmail === "object") {
    email = userOrEmail.email || "";
    username = userOrEmail.fullName || userOrEmail.name || userOrEmail.firstName || "";
    if ((!username || username.includes("@")) && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("auth_user") || localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          const fullName = u.fullName || u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim();
          if (fullName) username = fullName;
        }
      } catch {}
    }
    if (!username) username = email || "User";
    userId = userOrEmail.userId || userOrEmail.id || username;
  }

  try {
    let resolvedIp = ipAddress;
    if (!resolvedIp || resolvedIp === "127.0.0.1") {
      resolvedIp = await getRealClientIp();
    }

    const payload: Record<string, unknown> = {
      action,
      resource: details,
      details: { name: username, email, userId },
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
    };

    if (typeof window !== "undefined") {
      const storedDeviceId = localStorage.getItem("vero_device_id");
      if (storedDeviceId) (payload.details as Record<string, unknown>).deviceId = storedDeviceId;
    }

    if (resolvedIp && resolvedIp !== "127.0.0.1") {
      payload.ipAddress = resolvedIp;
    }

    await logActivityToServer(payload);

    const localLog: RealLogEntry = {
      id: "pending",
      userId,
      username,
      email,
      action,
      details,
      ipAddress: resolvedIp,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(LOG_ADDED_EVENT, { detail: localLog }));
      window.dispatchEvent(new Event("activity_logs_updated"));

      try {
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("vero_channel");
          bc.postMessage({ type: "vero:log_added", userId });
          bc.close();
        }
      } catch {}
    }
    return localLog;
  } catch (e) {
    console.error("Failed to record activity log", e);
    return null;
  }
}

export async function deleteSingleLog(userId: string, logId: string): Promise<void> {
  let deleted = false;
  try {
    const res = await deleteActivityFromServer(logId);
    if (res) deleted = true;
  } catch {}

  if (!deleted && typeof window !== "undefined") {
    try {
      await axiosInstance.delete(`/user-profile-service/activity/${encodeURIComponent(logId)}`);
      deleted = true;
    } catch {
      try {
        await axiosInstance.delete(`/user-profile-service/activity/internal/single/${encodeURIComponent(logId)}`);
        deleted = true;
      } catch {}
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LOG_ADDED_EVENT));
    window.dispatchEvent(new Event("activity_logs_updated"));

    try {
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("vero_channel");
        bc.postMessage({ type: "vero:log_added", action: "delete", logId, userId });
        bc.close();
      }
    } catch {}
  }
}

export async function deleteAllLogs(userId: string): Promise<void> {
  let deleted = false;
  try {
    const res = await deleteAllActivitiesFromServer();
    if (res) deleted = true;
  } catch {}

  if (!deleted && typeof window !== "undefined") {
    try {
      await axiosInstance.delete("/user-profile-service/activity");
      deleted = true;
    } catch {
      try {
        await axiosInstance.delete(`/user-profile-service/activity/internal/${encodeURIComponent(userId)}`);
        deleted = true;
      } catch {}
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LOG_ADDED_EVENT));
    window.dispatchEvent(new Event("activity_logs_updated"));

    try {
      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel("vero_channel");
        bc.postMessage({ type: "vero:log_added", action: "delete_all", userId });
        bc.close();
      }
    } catch {}
  }
}
