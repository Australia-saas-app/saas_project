"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/src/shared/server/AuthService";
import { useUser } from "@/src/context/user.provider";

export function SessionSync() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) return;

    const isDashboard = pathname.includes("/dashboard/");
    if (!user && !isDashboard) return;

    const bc = new BroadcastChannel("session-sync");

    const handleLock = async (reason: "session_superseded" | "inactivity" = "session_superseded") => {
      try {
        const { recordRealActivity } = await import("@/src/shared/lib/real-activity-logger");
        await recordRealActivity(
          "AUTO_LOGOUT",
          reason === "session_superseded"
            ? "Session terminated due to concurrent login from another device"
            : "Session expired due to inactivity",
          { userId: (user as any)?.userId || (user as any)?.id || "user", email: (user as any)?.email, name: (user as any)?.fullName }
        ).catch(() => undefined);
      } catch {}

      const isAdminApp =
        typeof window !== "undefined" &&
        (window.location.port === "3001" ||
          window.location.hostname.startsWith("admin.") ||
          window.location.pathname.startsWith("/admin") ||
          window.location.pathname.startsWith("/account/admin"));
      const targetPath = isAdminApp ? `/account/admin/login?reason=${reason}` : `/?reason=${reason}`;
      window.location.href = targetPath;
    };

    bc.onmessage = (event) => {
      if (event.data?.type === "LOGIN") {
        handleLock("session_superseded");
      }
    };

    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser && (user || isDashboard)) {
          handleLock("session_superseded");
        }
      } catch {
        // Ignore transient network errors during polling
      }
    };

    // Only poll after initial auth load — avoids false logout on hard refresh
    const pollInterval = setInterval(checkSession, 15000);

    return () => {
      bc.close();
      clearInterval(pollInterval);
    };
  }, [pathname, user, isLoading]);

  return null;
}
