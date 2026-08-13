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

// Use the Next.js API proxy rewrite: /api/:path* → http://kong:8000/api/v1/:path*
// This makes it work both locally and on GCP, because the Next.js server proxies
// internally to Kong (docker network), and the browser only talks to Next.js.
const notifApiBase = "/api/notifications";

// Derive WebSocket URL from the browser's actual origin at runtime.
// This is critical for GCP — the internal Docker URL (kong:8000) is not
// reachable from the user's browser. We connect to the public-facing host.
const getWsUrl = (): string => {
  if (typeof window === "undefined") return "http://localhost:8000";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  // Frontend app is on port 8080; Kong gateway is on 8000
  const kongHost = host.replace(/:8080$/, ":8000").replace(/:3000$/, ":8000");
  return `${proto}://${kongHost}`;
};

/**
 * Global notification store. Fetches real notifications from DB on mount,
 * then listens for real-time events via WebSocket.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const role = user && "role" in user ? String(user.role ?? "") : undefined;
  const userId = user && ("userId" in user || "id" in user) ? ((user as any).userId || (user as any).id) : undefined;

  const [items, setItems] = useState<NotificationItem[]>([]);

  // Fetch initial notifications from DB on mount / user change
  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }

    let mounted = true;
    // credentials:"include" sends the auth cookie automatically (cookie-based auth)
    fetch(notifApiBase, { credentials: "include" })
      .then(res => res.json())
      .then(res => {
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
        }
      })
      .catch(err => console.error("Failed to load notifications:", err));

    return () => { mounted = false; };
  }, [userId]);

  const notify = useCallback((item: Omit<NotificationItem, "id" | "time" | "read"> & { id?: string }) => {
    const entry: NotificationItem = {
      ...item,
      id: item.id || `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: "Just now",
      read: false,
    };
    setItems((prev) => [entry, ...prev].slice(0, 50));
    toast(item.title || "You have a new notification", {
      description: item.message,
      duration: 5000,
      icon: <Bell className="h-5 w-5 text-blue-500" />,
    });
  }, []);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;

    const wsUrl = getWsUrl();
    // Connect to notification gateway
    const socket: Socket = io(`${wsUrl}/notifications`, {
      transports: ["websocket", "polling"], // polling fallback for GCP/firewalls
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

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    fetch(`${notifApiBase}/${id}/read`, { method: "PUT", credentials: "include" }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    fetch(`${notifApiBase}/read-all`, { method: "PUT", credentials: "include" }).catch(() => {});
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    fetch(`${notifApiBase}/${id}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  }, []);

  const deleteAllNotifications = useCallback(() => {
    setItems([]);
    fetch(`${notifApiBase}/all`, { method: "DELETE", credentials: "include" }).catch(() => {});
  }, []);

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
