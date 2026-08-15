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
import { useAppSelector } from "@/src/core/store/hooks";
import { io, Socket } from "socket.io-client";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  href?: string;
};

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

// Use a relative path so browser fetches route through Next.js proxy → Kong.
// With basePath '/admin', the rewrite /api/:path* becomes /admin/api/:path*
const notifApiBase = "/admin/api/notifications";

const getWsUrl = (): string => {
  if (typeof window === "undefined") return "http://localhost:8000";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const kongHost = host.replace(/:8001$/, ":8000").replace(/:3001$/, ":8000");
  return `${proto}://${kongHost}`;
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const user = useAppSelector((state: any) => state.auth.user);
  const token = useAppSelector((state: any) => state.auth.token);
  const role = user?.role || "admin";
  const userId = user?.id || user?.userId || user?.adminId;

  const [items, setItems] = useState<NotificationItem[]>([]);

  // Load and merge notifications from local store & DB
  const loadNotifications = useCallback(async () => {
    let localNotifs: NotificationItem[] = [];
    if (typeof window !== "undefined") {
      try {
        const keys = [
          userId ? `admin_notifs_${userId}` : null,
          "app_notifs_admin",
          "admin_notifications",
        ].filter(Boolean) as string[];

        const map = new Map<string, NotificationItem>();
        for (const k of keys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list: any[] = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach((n) => {
                if (n && (n.id || n.title)) {
                  const id = String(n.id || n.title);
                  map.set(id, {
                    id,
                    title: n.title,
                    message: n.message || n.description,
                    time: n.time || "Just now",
                    read: Boolean(n.read),
                    href: n.href || "/admin/technical",
                  });
                }
              });
            }
          }
        }
        localNotifs = Array.from(map.values());
      } catch {}
    }

    let remoteNotifs: NotificationItem[] = [];
    try {
      const res = await fetch(notifApiBase, {
        credentials: "omit",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.data?.notifications)
          ? data.data.notifications
          : Array.isArray(data?.notifications)
          ? data.notifications
          : Array.isArray(data)
          ? data
          : [];

        remoteNotifs = list.map((n: any) => ({
          id: String(n.id || n.notificationId),
          title: n.title || n.subject,
          message: n.message || n.content || "",
          time: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "Just now",
          read: Boolean(n.isRead || n.read),
          href: n.data?.href || n.href,
        }));
      }
    } catch {}

    const combinedMap = new Map<string, NotificationItem>();
    [...remoteNotifs, ...localNotifs].forEach((n) => {
      if (n && n.id) combinedMap.set(n.id, n);
    });

    setItems(Array.from(combinedMap.values()));
  }, [userId, token]);

  useEffect(() => {
    loadNotifications();
    window.addEventListener("notifications_updated", loadNotifications);
    window.addEventListener("storage", loadNotifications);
    window.addEventListener("focus", loadNotifications);
    return () => {
      window.removeEventListener("notifications_updated", loadNotifications);
      window.removeEventListener("storage", loadNotifications);
      window.removeEventListener("focus", loadNotifications);
    };
  }, [loadNotifications]);

  const notify = useCallback((item: Omit<NotificationItem, "id" | "time" | "read"> & { id?: string }) => {
    const entry: NotificationItem = {
      ...item,
      id: item.id || `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: "Just now",
      read: false,
    };
    setItems((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      if (userId) {
        try { localStorage.setItem(`admin_notifs_${userId}`, JSON.stringify(next)); } catch {}
      }
      return next;
    });
    toast(item.title || "New Notification", {
      description: item.message,
      duration: 5000,
      icon: <Bell className="h-5 w-5 text-primary" />,
    });
  }, [userId]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    
    const wsUrl = getWsUrl();
    const socket: Socket = io(`${wsUrl}/notifications`, {
      transports: ["websocket", "polling"],
      query: { userId, role },
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("[Admin Notifications] Connected:", wsUrl);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Admin Notifications] Connect error:", err.message);
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
  }, [userId, role, token, notify]);

  const markRead = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item));
      if (userId) {
        try { localStorage.setItem(`admin_notifs_${userId}`, JSON.stringify(next)); } catch {}
      }
      return next;
    });
    fetch(`${notifApiBase}/${id}/read`, {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  }, [userId, token]);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((item) => ({ ...item, read: true }));
      if (userId) {
        try { localStorage.setItem(`admin_notifs_${userId}`, JSON.stringify(next)); } catch {}
      }
      return next;
    });
    fetch(`${notifApiBase}/read-all`, {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  }, [userId, token]);

  const deleteNotification = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (userId) {
        try { localStorage.setItem(`admin_notifs_${userId}`, JSON.stringify(next)); } catch {}
      }
      return next;
    });
    fetch(`${notifApiBase}/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  }, [userId, token]);

  const deleteAllNotifications = useCallback(() => {
    setItems([]);
    if (userId) {
      try { localStorage.removeItem(`admin_notifs_${userId}`); } catch {}
    }
    fetch(`${notifApiBase}/all`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  }, [userId, token]);

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
