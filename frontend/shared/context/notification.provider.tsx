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

const notifApiBase = "/api/notifications";

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

  const [items, setItems] = useState<NotificationItem[]>([]);

  // Load from cache on first render
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    try {
      const cached = localStorage.getItem(`app_notifs_${userId}`);
      if (cached) {
        setItems(JSON.parse(cached));
      }
    } catch {}
  }, [userId]);

  // Fetch initial notifications from DB on mount / user change
  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }

    let mounted = true;
    fetch(notifApiBase, { credentials: "include" })
      .then((res) => res.json())
      .then((res) => {
        if (mounted && res.success && Array.isArray(res.data?.notifications)) {
          const mapped = res.data.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            time: new Date(n.createdAt).toLocaleDateString(),
            read: n.isRead,
            href: n.data?.href,
          }));
          setItems(mapped);
          try {
            localStorage.setItem(`app_notifs_${userId}`, JSON.stringify(mapped));
          } catch {}
        }
      })
      .catch((err) => console.error("Failed to load notifications:", err));

    return () => {
      mounted = false;
    };
  }, [userId]);

  const notify = useCallback(
    (item: Omit<NotificationItem, "id" | "time" | "read"> & { id?: string }) => {
      const entry: NotificationItem = {
        ...item,
        id: item.id || `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        time: "Just now",
        read: false,
      };
      setItems((prev) => {
        const next = [entry, ...prev].slice(0, 50);
        if (userId) {
          try {
            localStorage.setItem(`app_notifs_${userId}`, JSON.stringify(next));
          } catch {}
        }
        return next;
      });
      toast(item.title || "You have a new notification", {
        description: item.message,
        duration: 5000,
        icon: <Bell className="h-5 w-5 text-primary" />,
      });
    },
    [userId]
  );

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    const wsUrl = getWsUrl();
    const socket: Socket = io(`${wsUrl}/notifications`, {
      transports: ["websocket", "polling"],
      query: { userId, role: role || "user" },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("[Notifications] Connected:", wsUrl);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Notifications] Connect error:", err.message);
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
      fetch(`${notifApiBase}/${id}/read`, { method: "PUT", credentials: "include" }).catch(() => {});
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
    fetch(`${notifApiBase}/read-all`, { method: "PUT", credentials: "include" }).catch(() => {});
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
      fetch(`${notifApiBase}/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
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
    fetch(`${notifApiBase}/all`, { method: "DELETE", credentials: "include" }).catch(() => {});
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
