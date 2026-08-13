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

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Derive the WebSocket URL from the browser's own origin (window.location) at runtime.
// This is critical for GCP deployments where the internal Docker URL (kong:8000) is
// NOT accessible from the browser. We must connect to the public-facing host.
const getWsUrl = (): string => {
  if (typeof window === "undefined") return "http://localhost:8000";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host; // e.g. "34.x.x.x:8000" or "yourdomain.com"
  // The Kong gateway is on port 8000. In production, the public host maps to Kong.
  // We replace the Next.js app port with Kong's public port if needed.
  // Since the admin Next.js app is on port 8001 and Kong is on 8000, derive accordingly.
  const kongHost = host.replace(/:8001$/, ":8000").replace(/:3001$/, ":8000");
  return `${proto}://${kongHost}`;
};


export function NotificationProvider({ children }: { children: ReactNode }) {
  const user = useAppSelector((state: any) => state.auth.user);
  const token = useAppSelector((state: any) => state.auth.token);
  const role = user?.role || "admin";
  const userId = user?.id || user?.userId || user?.adminId;

  const [items, setItems] = useState<NotificationItem[]>([]);

  // Fetch initial notifications from DB
  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    
    let mounted = true;
    fetch(`${apiUrl}/notifications`, {
      credentials: "omit",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
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
    toast("You have received a new notification", {
      duration: 5000,
      icon: <Bell className="h-5 w-5 text-blue-500" />,
    });
  }, []);

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
    fetch(`${apiUrl}/notifications/${id}/read`, { method: "PUT", credentials: "omit" }).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    fetch(`${apiUrl}/notifications/read-all`, { method: "PUT", credentials: "omit" }).catch(() => {});
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    fetch(`${apiUrl}/notifications/${id}`, { method: "DELETE", credentials: "omit" }).catch(() => {});
  }, []);

  const deleteAllNotifications = useCallback(() => {
    setItems([]);
    fetch(`${apiUrl}/notifications/all`, { method: "DELETE", credentials: "omit" }).catch(() => {});
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
