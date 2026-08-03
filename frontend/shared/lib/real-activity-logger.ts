import axiosInstance from "./axiosInstance";

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

function formatBackendLog(log: any): RealLogEntry {
  return {
    id: log._id || log.id,
    userId: log.userId,
    username: log.details?.name || "User",
    email: log.details?.email || "",
    action: log.action,
    details: log.resource || log.details?.message || "",
    ipAddress: log.ipAddress || "",
    createdAt: log.timestamp || log.createdAt,
  };
}

export async function getLogsForUser(userId: string): Promise<RealLogEntry[]> {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const res = await axiosInstance.get(`/user-profile-service/activity`);
    // Assuming backend returns { activities: [...] } based on ActivityService
    const activities = res.data?.activities || [];
    return activities.map(formatBackendLog);
  } catch (error) {
    console.error("Failed to fetch activity logs", error);
    return [];
  }
}

export async function recordRealActivity(
  action: string,
  details: string,
  userOrEmail?: string | { email?: string; userId?: string; id?: string; name?: string; firstName?: string },
  ipAddress = "127.0.0.1"
): Promise<RealLogEntry | null> {
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

  try {
    let resolvedIp = ipAddress;
    // Async fetch real IP if we're on client side and it's the default
    if (ipAddress === "127.0.0.1" && typeof window !== "undefined") {
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        if (ipData.ip) {
          resolvedIp = ipData.ip;
        }
      } catch {}
    }

    const payload: any = {
      action,
      resource: details,
      details: { name: username, email },
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "Unknown",
    };
    
    if (typeof window !== "undefined") {
      const storedDeviceId = localStorage.getItem("vero_device_id");
      if (storedDeviceId) payload.details.deviceId = storedDeviceId;
    }
    
    if (resolvedIp && resolvedIp !== "127.0.0.1") {
      payload.ipAddress = resolvedIp;
    }

    let headers: any = {};
    if (typeof window === "undefined") {
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const token = cookieStore.get("accessToken")?.value;
        if (token) headers["Authorization"] = `Bearer ${token}`;
      } catch {}
    }

    await axiosInstance.post("/user-profile-service/activity", payload, { headers });

    const fakeLocalLog: RealLogEntry = {
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
      window.dispatchEvent(new CustomEvent(LOG_ADDED_EVENT, { detail: fakeLocalLog }));
    }
    return fakeLocalLog;
  } catch (e) {
    console.error("Failed to record activity log", e);
    return null;
  }
}

export async function deleteSingleLog(userId: string, logId: string): Promise<void> {
  try {
    await axiosInstance.delete(`/user-profile-service/activity/${logId}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(LOG_ADDED_EVENT));
    }
  } catch (error) {
    console.error("Failed to delete log", error);
  }
}

export async function deleteAllLogs(userId: string): Promise<void> {
  try {
    await axiosInstance.delete(`/user-profile-service/activity`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(LOG_ADDED_EVENT));
    }
  } catch (error) {
    console.error("Failed to delete all logs", error);
  }
}
