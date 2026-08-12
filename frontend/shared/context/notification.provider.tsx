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

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const wsUrl = apiUrl.replace("http", "ws").replace("/api/v1", "");

/**
 * Global notification store. Seeds role-appropriate demo notifications until
 * the backend pushes real events; read state persists across reloads. Code
 * anywhere in the app can call `notify(...)` to raise a notification + toast.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const role = user && "role" in user ? String(user.role ?? "") : undefined;
  const userId = user && ("userId" in user || "id" in user) ? ((user as any).userId || (user as any).id) : undefined;

  const [items, setItems] = useState<NotificationItem[]>([]);

  // Fetch initial notifications from DB
  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    
    let mounted = true;
    fetch(`${apiUrl}/notifications`, { credentials: "omit" }) // Add Authorization if needed, but assuming cookies/proxy handles it
      .then(res => res.json())
      .then(res => {
        if (mounted && res.success && Array.isArray(res.data?.notifications)) {
          const mapped = res.data.notifications.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            time: new Date(n.createdAt).toLocaleDateString(), // Format appropriately
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
    
    // Connect to notification gateway
    const socket: Socket = io(`${wsUrl}/notifications`, {
      transports: ["websocket"],
      query: { userId, role: role || "user" },
    });

    socket.on("connect", () => {
      console.log("Connected to real-time notifications server");
    });

    socket.on("new_notification", (payload: any) => {
      notify({
        id: payload.id, // Pass the real DB ID!
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
