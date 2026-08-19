"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { type NotificationItem, formatNotificationTime } from "@/src/constants/notifications";
import { useUser } from "@/src/context/user.provider";
import { io, Socket } from "socket.io-client";
import axiosInstance from "@/src/lib/axiosInstance";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";

interface INotificationContext {
  notifications: NotificationItem[];
  unreadCount: number;
  notify: (item: Omit<NotificationItem, "id" | "time" | "read"> & { id?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  deleteAllNotifications: () => void;
}

const NotificationContext = createContext<INotificationContext | undefined>(undefined);

const getWsUrl = (): string => {
  if (typeof window === "undefined") return "http://localhost:8000";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const hostname = window.location.hostname;
  return `${proto}://${hostname}:8000`;
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const role = user && "role" in user ? String(user.role ?? "") : undefined;
  const userId = user && ("userId" in user || "id" in user) ? ((user as any).userId || (user as any).id) : undefined;
  const userEmail = user?.email ? String(user.email).trim().toLowerCase() : "";

  const [items, setItems] = useState<NotificationItem[]>([]);

  const knownIdsRef = useMemo(() => new Set<string>(), []);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load from cache on first render (by userId and by userEmail)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const userCached = userId ? localStorage.getItem(`app_notifs_${userId}`) : null;
      const emailCached = userEmail ? localStorage.getItem(`app_notifs_${userEmail}`) : null;
      
      const userNotifs: NotificationItem[] = userCached ? JSON.parse(userCached) : [];
      const emailNotifs: NotificationItem[] = emailCached ? JSON.parse(emailCached) : [];

      const combinedMap = new Map<string, NotificationItem>();
      [...emailNotifs, ...userNotifs].forEach((n) => {
        if (n && n.id) {
          knownIdsRef.add(String(n.id));
          combinedMap.set(n.id, {
            ...n,
            time: formatNotificationTime(n.createdAt || n.time),
          });
        }
      });

      if (combinedMap.size > 0) {
        setItems(Array.from(combinedMap.values()).slice(0, 50));
      }
    } catch {}
  }, [userId, userEmail, knownIdsRef]);

  const notify = useCallback(
    (item: Omit<NotificationItem, "id" | "time" | "read"> & { id?: string }, suppressToast = false) => {
      const now = new Date().toISOString();
      const entryId = item.id || `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      knownIdsRef.add(String(entryId));

      const entry: NotificationItem = {
        ...item,
        id: entryId,
        createdAt: item.createdAt || now,
        time: formatNotificationTime(item.createdAt || now),
        read: false,
      };

      setItems((prev) => {
        const next = [entry, ...prev.filter((i) => i.id !== entry.id)].slice(0, 50);
        if (userId) {
          try {
            localStorage.setItem(`app_notifs_${userId}`, JSON.stringify(next));
          } catch {}
        }
        if (userEmail) {
          try {
            localStorage.setItem(`app_notifs_${userEmail}`, JSON.stringify(next));
          } catch {}
        }
        return next;
      });

      if (!suppressToast) {
        toast.info("You have received a new notification", {
          duration: 5000,
        });
      }

      // Broadcast across tabs
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("vero_notif_sync", JSON.stringify({ item: entry, timestamp: Date.now() }));
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("vero_channel");
            bc.postMessage({ type: "vero:new_notification", payload: entry });
            bc.close();
          }
        }
      } catch {}
    },
    [userId, userEmail, knownIdsRef]
  );

  // Fetch notifications from DB and periodically poll every 4s for instant arrival
  useEffect(() => {
    if (!userId && !userEmail) {
      setItems([]);
      return;
    }

    let isMounted = true;

    const fetchNotifications = async (triggerToast = false) => {
      try {
        const res = await axiosInstance.get("/notifications", { timeout: 8000 }).catch(() => null);
        if (!isMounted || !res?.data) return;
        const resData = res.data;
        if (resData.success && Array.isArray(resData.data?.notifications)) {
          const mapped: NotificationItem[] = resData.data.notifications.map((n: any) => ({
            id: String(n.id || n.notificationId),
            title: n.title,
            message: n.message,
            createdAt: n.createdAt,
            time: formatNotificationTime(n.createdAt),
            read: Boolean(n.isRead || n.read),
            href: n.data?.href || n.href,
          }));

          let hasNewUnread = false;

          setItems((prev) => {
            const map = new Map<string, NotificationItem>();
            [...mapped, ...prev].forEach((item) => {
              if (item && item.id) {
                if (triggerToast && !knownIdsRef.has(String(item.id)) && !item.read) {
                  hasNewUnread = true;
                }
                knownIdsRef.add(String(item.id));
                map.set(item.id, {
                  ...item,
                  time: formatNotificationTime(item.createdAt || item.time),
                });
              }
            });
            const merged = Array.from(map.values()).slice(0, 50);
            try {
              if (userId) localStorage.setItem(`app_notifs_${userId}`, JSON.stringify(merged));
              if (userEmail) localStorage.setItem(`app_notifs_${userEmail}`, JSON.stringify(merged));
            } catch {}
            return merged;
          });

          if (hasNewUnread) {
            toast.info("You have received a new notification", { duration: 5000 });
          }

          if (!hasInitialized) setHasInitialized(true);
        }
      } catch {}
    };

    fetchNotifications(false);

    // 4-second background poll
    const pollInterval = setInterval(() => {
      fetchNotifications(true);
    }, 4000);

    const handleFocus = () => fetchNotifications(true);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("notifications_updated", () => fetchNotifications(true));

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [userId, userEmail, knownIdsRef, hasInitialized]);

  // Cross-tab BroadcastChannel & Local Storage sync
  useEffect(() => {
    if (typeof window === "undefined") return;

    let bc: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel("vero_channel");
        bc.onmessage = (event) => {
          if (event.data?.type === "vero:new_notification" && event.data.payload) {
            const p = event.data.payload;
            const targetE = (event.data.targetEmail || p.recipientEmail || "").trim().toLowerCase();
            if (targetE && userEmail && targetE !== userEmail) return;
            if (!knownIdsRef.has(String(p.id))) {
              notify(p, false);
            }
          }
        };
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vero_notif_sync" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const targetE = (parsed.targetEmail || parsed.item?.recipientEmail || "").trim().toLowerCase();
          if (targetE && userEmail && targetE !== userEmail) return;
          if (parsed.item && !knownIdsRef.has(String(parsed.item.id))) {
            notify(parsed.item, false);
          }
        } catch {}
      }
    };

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const targetE = (detail.targetEmail || detail.recipientEmail || "").trim().toLowerCase();
        if (targetE && userEmail && targetE !== userEmail) return;
        notify(detail, false);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("new_notification", handleCustomEvent);
    window.addEventListener("vero:new_notification", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("new_notification", handleCustomEvent);
      window.removeEventListener("vero:new_notification", handleCustomEvent);
      if (bc) bc.close();
    };
  }, [notify, knownIdsRef, userEmail]);

  // Realtime Platform Email Notifications
  useEffect(() => {
    if (!userEmail || typeof window === "undefined") return;

    function handleNewEmail(event: Event) {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      if (!detail) return;

      const rec = (detail.recipientEmail || "").trim().toLowerCase();
      if (rec === userEmail) {
        const messagePath =
          role === "AFFILIATE"
            ? "/dashboard/affiliate/messages"
            : role === "SELLER" || role === "BUSINESS"
            ? "/dashboard/business/messages"
            : "/dashboard/user/messages";

        notify({
          id: `email-${detail.threadId}-${Date.now()}`,
          title: `New Email from ${detail.senderName || detail.senderEmail}`,
          message: detail.subject ? `"${detail.subject}"` : "You received a new email message.",
          href: `${messagePath}?thread=${detail.threadId}`,
        });
      }
    }

    window.addEventListener("platform_new_email", handleNewEmail);
    return () => window.removeEventListener("platform_new_email", handleNewEmail);
  }, [userEmail, role, notify]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    const wsUrl = getWsUrl();
    let hasLoggedError = false;

    const socket: Socket = io(`${wsUrl}/notifications`, {
      transports: ["websocket", "polling"],
      query: { userId, role: role || "user" },
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 15000,
      timeout: 6000,
    });

    socket.on("connect", () => {
      hasLoggedError = false;
    });

    socket.on("connect_error", (_err) => {
      if (!hasLoggedError) {
        hasLoggedError = true;
      }
    });

    socket.on("new_notification", (payload: any) => {
      notify({
        id: payload.id,
        title: payload.title,
        message: payload.message,
        href: payload.href,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, role, notify]);

  const markRead = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item));
        if (userId) {
          try {
            localStorage.setItem(`app_notifs_${userId}`, JSON.stringify(next));
          } catch {}
        }
        return next;
      });
      axiosInstance.put(`/notifications/${id}/read`).catch(() => {});
    },
    [userId]
  );

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((item) => ({ ...item, read: true }));
      if (userId) {
        try {
          localStorage.setItem(`app_notifs_${userId}`, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
    axiosInstance.put("/notifications/read-all").catch(() => {});
  }, [userId]);

  const deleteNotification = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        if (userId) {
          try {
            localStorage.setItem(`app_notifs_${userId}`, JSON.stringify(next));
          } catch {}
        }
        return next;
      });
      axiosInstance.delete(`/notifications/${id}`).catch(() => {});
      toast.success("Notification deleted successfully");
    },
    [userId]
  );

  const deleteAllNotifications = useCallback(() => {
    setItems([]);
    if (userId) {
      try {
        localStorage.removeItem(`app_notifs_${userId}`);
      } catch {}
    }
    axiosInstance.delete("/notifications/all").catch(() => {});
    toast.success("All notifications deleted successfully");

    try {
      const userRole = role || (user as any)?.role || "User";
      const clientFullName =
        (user as any)?.fullName ||
        (user as any)?.name ||
        ("firstName" in (user || {}) ? `${(user as any).firstName} ${(user as any).lastName || ""}`.trim() : "") ||
        userEmail ||
        "User";

      recordRealActivity(
        "NOTIFICATIONS_CLEARED",
        `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} cleared all notifications`,
        {
          userId: userId || userEmail,
          name: clientFullName,
          fullName: clientFullName,
          email: userEmail,
        }
      );
    } catch {}
  }, [userId, user, role, userEmail]);

  const value = useMemo<INotificationContext>(
    () => ({
      notifications: items,
      unreadCount: items.filter((item) => !item.read).length,
      notify,
      markRead,
      markAllRead,
      deleteNotification,
      deleteAllNotifications,
    }),
    [items, notify, markRead, markAllRead, deleteNotification, deleteAllNotifications]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): INotificationContext {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within the NotificationProvider");
  }
  return context;
}
