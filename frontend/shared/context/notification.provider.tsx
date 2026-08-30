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
import {
  type NotificationItem,
  formatNotificationTime,
  ADMIN_NOTIFICATIONS,
  USER_NOTIFICATIONS,
  AFFILIATE_NOTIFICATIONS,
  BUSINESS_NOTIFICATIONS,
} from "@/src/constants/notifications";
import { useUser } from "@/src/context/user.provider";
import { io, Socket } from "socket.io-client";
import axiosInstance from "@/src/lib/axiosInstance";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";

function getDefaultNotifications(role?: string): NotificationItem[] {
  const r = (role || "").toLowerCase();
  if (r === "business" || r === "seller" || r === "company") return BUSINESS_NOTIFICATIONS;
  if (r === "affiliate") return AFFILIATE_NOTIFICATIONS;
  if (r === "admin" || r === "superadmin") return ADMIN_NOTIFICATIONS;
  return USER_NOTIFICATIONS;
}

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

  const [items, setItems] = useState<NotificationItem[]>(() => getDefaultNotifications(role));

  const knownIdsRef = useMemo(() => new Set<string>(), []);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load from cache on first render (by userId, userEmail, role defaults, and live chat notifications)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storageKeys = [
        "platform_live_chat_notifications",
        "app_notifs_all",
      ];
      if (userId) storageKeys.push(`app_notifs_${userId}`);
      if (userEmail) {
        storageKeys.push(`app_notifs_${userEmail}`);
        storageKeys.push(`app_notifs_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
      }
      if (role) {
        storageKeys.push(`app_notifs_${role.toLowerCase()}`);
      }

      const combinedMap = new Map<string, NotificationItem>();

      // Load from all cached storage keys
      storageKeys.forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((n: any) => {
                if (n && n.id) {
                  const targetE = (n.recipientEmail || n.targetEmail || "").trim().toLowerCase();
                  if (!targetE || !userEmail || targetE === userEmail) {
                    knownIdsRef.add(String(n.id));
                    combinedMap.set(String(n.id), {
                      ...n,
                      id: String(n.id),
                      time: formatNotificationTime(n.createdAt || n.time),
                    });
                  }
                }
              });
            }
          }
        } catch {}
      });

      // Also merge role defaults (e.g. project acceptance / milestone defaults)
      const defaults = getDefaultNotifications(role);
      defaults.forEach((n) => {
        if (n && n.id && !combinedMap.has(String(n.id))) {
          knownIdsRef.add(String(n.id));
          combinedMap.set(String(n.id), {
            ...n,
            id: String(n.id),
            time: formatNotificationTime(n.createdAt || n.time),
          });
        }
      });

      if (combinedMap.size > 0) {
        const sorted = Array.from(combinedMap.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setItems(sorted.slice(0, 100));
      }
    } catch {}
  }, [userId, userEmail, role, knownIdsRef]);

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
        const next = [entry, ...prev.filter((i) => i.id !== entry.id)].slice(0, 100);
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

  // Fetch notifications from DB safely with fallback and resilient polling
  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async (triggerToast = false) => {
      try {
        const res = await axiosInstance.get("/notifications", { timeout: 5000, silent: true } as any).catch(() => null);
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
            type: n.data?.type || n.type,
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
            const merged = Array.from(map.values()).slice(0, 100);
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
      } catch {
        // Keep existing notifications safely on error
      }
    };

    fetchNotifications(false);

    // Resilient background poll
    const pollInterval = setInterval(() => {
      fetchNotifications(true);
    }, 12000);

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

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
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
