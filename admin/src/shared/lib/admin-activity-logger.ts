/**
 * Admin activity logger — mirrors the frontend real-activity-logger.
 * Fetches the real client IP and sends structured log entries to
 * the user-profile service via the admin API proxy.
 */

/** Cached real IP so we don't hammer ipify on every action */
let cachedIp: string | null = null;

async function getRealIp(): Promise<string> {
  if (cachedIp) return cachedIp;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.ip) cachedIp = data.ip;
    return cachedIp || "unknown";
  } catch {
    return "unknown";
  }
}

export interface AdminLogPayload {
  action: string;
  resource: string;
  /** The target user being acted upon */
  targetUserId: string;
  targetUserEmail?: string;
  targetUserName?: string;
  /** The admin performing the action */
  adminEmail?: string;
  adminName?: string;
  extra?: Record<string, unknown>;
}

/**
 * Log an admin action to MongoDB via the user-profile service.
 * Includes the real client IP and structured admin + target user details.
 */
export async function logAdminActivity(
  token: string,
  payload: AdminLogPayload
): Promise<void> {
  try {
    const ipAddress = await getRealIp();

    await fetch("/admin/api/user-profile/activity/internal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: payload.action,
        resource: payload.resource,
        ipAddress,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "Admin Dashboard",
        details: {
          // Target user fields
          userId: payload.targetUserId,
          email: payload.targetUserEmail,
          name: payload.targetUserName,
          // Admin performing the action
          performedBy: payload.adminEmail || "Administrator",
          adminName: payload.adminName,
          adminEmail: payload.adminEmail,
          // Any extra fields (status, kycStatus, etc.)
          ...payload.extra,
        },
      }),
    }).catch(() => undefined);
  } catch {
    // Never throw — logging must not block the UI
  }
}
