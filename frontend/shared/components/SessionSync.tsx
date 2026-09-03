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
    // Only run when the user is authenticated — no user, no session to sync.
    if (!user) return;

    const isDashboard = pathname.includes("/dashboard/");
    const bc = new BroadcastChannel("session-sync");

    const userEmail = user?.email;
    let heartbeatTimer: NodeJS.Timeout | null = null;
    if (userEmail) {
      import("@/src/shared/lib/live-chat-store").then(({ setUserOnlineStatus }) => {
        setUserOnlineStatus(userEmail, true);
        heartbeatTimer = setInterval(() => {
          setUserOnlineStatus(userEmail, true);
        }, 20000);
      }).catch(() => null);
    }

    const handleBeforeUnload = () => {
      if (userEmail) {
        import("@/src/shared/lib/live-chat-store").then(({ setUserOnlineStatus }) => {
          setUserOnlineStatus(userEmail, false);
        }).catch(() => null);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleLock = async (reason: "session_superseded" | "inactivity" = "session_superseded") => {
      if (userEmail) {
        import("@/src/shared/lib/live-chat-store").then(({ setUserOnlineStatus }) => {
          setUserOnlineStatus(userEmail, false);
        }).catch(() => null);
      }
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
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      const roleStr = String((user as any)?.role || (user as any)?.accountType || "").toLowerCase();
      let rolePath = "user";
      if (currentPath.includes("/dashboard/business") || currentPath.startsWith("/business") || roleStr === "business" || roleStr === "seller") {
        rolePath = "business";
      } else if (currentPath.includes("/dashboard/affiliate") || currentPath.startsWith("/affiliate") || roleStr === "affiliate") {
        rolePath = "affiliate";
      }

      const targetPath = isAdminApp ? `/account/admin/login?reason=${reason}` : `/account/${rolePath}/login?reason=${reason}`;
      window.location.replace(targetPath);
    };

    // Listen for LOGIN events from other tabs — means our session was superseded
    bc.onmessage = (event) => {
      if (event.data?.type === "LOGIN") {
        handleLock("session_superseded");
      }
    };

    // Poll session validity every 8s on ALL pages.
    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          handleLock("inactivity");
        }
      } catch {
        // Ignore transient network errors
      }
    };
    const pollInterval = setInterval(checkSession, 8000);

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      bc.close();
      clearInterval(pollInterval);
    };
  }, [pathname, user, isLoading]);

  return null;
}
