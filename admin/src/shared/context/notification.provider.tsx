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
  time?: string;
  createdAt?: string | Date;
  read: boolean;
  href?: string;
  role?: string;
  targetRole?: string;
  type?: string;
  data?: any;
};

export function formatNotificationTime(input?: string | number | Date | null): string {
  if (!input) return "Just now";

  // If already relative formatted
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.toLowerCase() === "just now") return "Just now";
    if (trimmed.toLowerCase().endsWith("ago")) return trimmed;
  }

  const date = new Date(input);
  if (isNaN(date.getTime())) {
    return typeof input === "string" ? input : "Just now";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  // Less than 1 minute
  if (diffSeconds < 60) {
    return "Just now";
  }

  // 1 to 59 minutes ago
  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  // Check if same calendar day
  const isSameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Different calendar day: Aug 08, 2026
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

interface INotificationContext {
  notifications: NotificationItem[];
  unreadCount: number;
  notify: (item: Omit<NotificationItem, "id" | "time" | "read"> & { id?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
  deleteAllNotifications: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<INotificationContext | undefined>(undefined);

// Use a relative path so browser fetches route through Next.js proxy → Kong.
// With basePath '/admin', the rewrite /api/:path* becomes /admin/api/:path*
const notifApiBase = "/admin/api/notifications";

const getWsUrl = (): string => {
  if (typeof window === "undefined") return "http://localhost:8000";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const kongHost = host.replace(/:8080$/, ":8000").replace(/:3000$/, ":8000");
  return `${proto}://${kongHost}`;
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const user = useAppSelector((state: any) => state.auth.user);
  const token = useAppSelector((state: any) => state.auth.token);
  const role = user?.role || "admin";
  const userId = user?.id || user?.userId || user?.adminId;

  const [items, setItems] = useState<NotificationItem[]>([]);

  const knownAdminIdsRef = useMemo(() => new Set<string>(), []);
  const [hasAdminInit, setHasAdminInit] = useState(false);

  // Load and merge notifications from local store & DB
  const loadNotifications = useCallback(async (triggerToast = false) => {
    let remoteNotifs: NotificationItem[] = [];
    let fetchSuccess = false;

    try {
      const res = await fetch(notifApiBase, {
        credentials: "omit",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => null);

      if (res && res.ok) {
        fetchSuccess = true;
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
          createdAt: n.createdAt,
          time: formatNotificationTime(n.createdAt),
          read: Boolean(n.isRead || n.read),
          href: n.data?.href || n.href,
          role: n.role || n.targetRole || n.data?.role || n.data?.targetRole || n.userRole,
          targetRole: n.targetRole || n.role,
          type: n.type || n.data?.type,
          data: n.data,
        }));
      }
    } catch {}

    if (fetchSuccess) {
      let hasNewUnread = false;
      remoteNotifs.forEach((item) => {
        if (triggerToast && !knownAdminIdsRef.has(String(item.id)) && !item.read) {
          hasNewUnread = true;
        }
        knownAdminIdsRef.add(String(item.id));
      });

      setItems(remoteNotifs);

      if (hasNewUnread) {
        toast.info("You have received a new notification", { duration: 5000 });
      }

      if (!hasAdminInit) setHasAdminInit(true);

      if (typeof window !== "undefined") {
        try {
          if (userId) {
            localStorage.setItem(`admin_notifs_${userId}`, JSON.stringify(remoteNotifs));
          }
          localStorage.removeItem("admin_notifications");
          localStorage.removeItem("app_notifs_admin");
        } catch {}
      }
      return;
    }

    // Fallback only if offline/network failure
    if (typeof window !== "undefined") {
      try {
        const raw = userId ? localStorage.getItem(`admin_notifs_${userId}`) : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((n: any) => { if (n?.id) knownAdminIdsRef.add(String(n.id)); });
            setItems(parsed);
          }
        }
      } catch {}
    }
  }, [userId, token, knownAdminIdsRef, hasAdminInit]);

  useEffect(() => {
    loadNotifications(false);

    const pollInterval = setInterval(() => {
      loadNotifications(true);
    }, 4000);

    const handleFocus = () => loadNotifications(true);
    window.addEventListener("notifications_updated", () => loadNotifications(true));
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("notifications_updated", () => loadNotifications(true));
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadNotifications]);

  const notify = useCallback((item: Omit<NotificationItem, "id" | "time" | "read"> & { id?: string }, suppressToast = false) => {
    const now = new Date().toISOString();
    const entryId = item.id || `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    knownAdminIdsRef.add(String(entryId));

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
        try { localStorage.setItem(`admin_notifs_${userId}`, JSON.stringify(next)); } catch {}
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
  }, [userId, knownAdminIdsRef]);

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
            if (!knownAdminIdsRef.has(String(p.id))) {
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
          if (parsed.item && !knownAdminIdsRef.has(String(parsed.item.id))) {
            notify(parsed.item, false);
          }
        } catch {}
      }
    };

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
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
  }, [notify, knownAdminIdsRef]);

  // Connect to Notification WebSocket for live instant notifications
  useEffect(() => {
    if (!token) return;

    const wsUrl = getWsUrl();
    const socket = io(`${wsUrl}/notifications`, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      if (userId) {
        socket.emit("join_user", { userId });
      }
      socket.emit("join_role", { role: "ADMIN" });
      socket.emit("join_role", { role: "admin" });
    });

    socket.on("new_notification", (payload: any) => {
      notify({
        id: payload.id,
        title: payload.title,
        message: payload.message,
        href: payload.href,
        role: payload.role || payload.targetRole || payload.data?.role,
        targetRole: payload.targetRole || payload.role,
        type: payload.type || payload.data?.type,
        data: payload.data,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, role, token, notify]);

  const markRead = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item));
      if (userId && typeof window !== "undefined") {
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
      if (userId && typeof window !== "undefined") {
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
      if (typeof window !== "undefined") {
        try {
          const keys = [
            "admin_notifications",
            "app_notifs_admin",
            userId ? `admin_notifs_${userId}` : null,
          ].filter(Boolean) as string[];

          keys.forEach((k) => {
            const raw = localStorage.getItem(k);
            if (raw) {
              const list: any[] = JSON.parse(raw);
              if (Array.isArray(list)) {
                const filtered = list.filter((n) => String(n.id || n.title) !== id);
                localStorage.setItem(k, JSON.stringify(filtered));
              }
            }
          });
        } catch {}
      }
      return next;
    });
    fetch(`${notifApiBase}/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
    toast.success("Notification deleted successfully");
  }, [userId, token]);

  const deleteAllNotifications = useCallback(() => {
    setItems([]);
    if (typeof window !== "undefined") {
      try {
        const keys = [
          "admin_notifications",
          "app_notifs_admin",
          userId ? `admin_notifs_${userId}` : null,
        ].filter(Boolean) as string[];

        keys.forEach((k) => {
          localStorage.removeItem(k);
        });
      } catch {}
    }
    fetch(`${notifApiBase}/all`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
    toast.success("All notifications deleted successfully");
  }, [userId, token]);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications(false);
  }, [loadNotifications]);

  const value = useMemo<INotificationContext>(
    () => ({
      notifications: items,
      unreadCount: items.filter((item) => !item.read).length,
      notify,
      markRead,
      markAllRead,
      deleteNotification,
      deleteAllNotifications,
      refreshNotifications,
    }),
    [items, notify, markRead, markAllRead, deleteNotification, deleteAllNotifications, refreshNotifications]
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
