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
import type { NotificationItem } from "@/src/constants/notifications";
import { useUser } from "@/src/context/user.provider";
import { io, Socket } from "socket.io-client";
import axiosInstance from "@/src/lib/axiosInstance";

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
  const host = window.location.host;
  const kongHost = host.replace(/:8080$/, ":8000").replace(/:3000$/, ":8000");
  return `${proto}://${kongHost}`;
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const role = user && "role" in user ? String(user.role ?? "") : undefined;
  const userId = user && ("userId" in user || "id" in user) ? ((user as any).userId || (user as any).id) : undefined;
  const userEmail = user?.email ? String(user.email).trim().toLowerCase() : "";

  const [items, setItems] = useState<NotificationItem[]>([]);

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
        if (n && n.id) combinedMap.set(n.id, n);
      });

      if (combinedMap.size > 0) {
        setItems(Array.from(combinedMap.values()).slice(0, 50));
      }
    } catch {}
  }, [userId, userEmail]);

  // Fetch initial notifications from DB on mount / user change
  useEffect(() => {
    if (!userId) {
      if (!userEmail) setItems([]);
      return;
    }

    let mounted = true;
    axiosInstance.get("/notifications", { timeout: 8000 })
      .then((res) => {
        if (!mounted || !res.data) return;
        const resData = res.data;
        if (resData.success && Array.isArray(resData.data?.notifications)) {
          const mapped = resData.data.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            time: new Date(n.createdAt).toLocaleDateString(),
            read: n.isRead,
            href: n.data?.href,
          }));
          setItems((prev) => {
            const map = new Map<string, NotificationItem>();
            [...mapped, ...prev].forEach((item) => {
              if (item && item.id) map.set(item.id, item);
            });
            const merged = Array.from(map.values()).slice(0, 50);
            try {
              localStorage.setItem(`app_notifs_${userId}`, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [userId, userEmail]);

  const notify = useCallback(
    (item: Omit<NotificationItem, "id" | "time" | "read"> & { id?: string }) => {
      const entry: NotificationItem = {
        ...item,
        id: item.id || `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: "Just now",
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

      toast(item.title || "You have a new notification", {
        description: item.message,
        duration: 6000,
        icon: <Bell className="h-5 w-5 text-primary" />,
        action: item.href
          ? {
              label: "View message",
              onClick: () => {
                if (typeof window !== "undefined") {
                  window.location.href = item.href!;
                }
              },
            }
          : undefined,
      });
    },
    [userId, userEmail]
  );

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
  }, [userId]);

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
