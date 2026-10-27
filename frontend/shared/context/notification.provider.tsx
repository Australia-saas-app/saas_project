"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

export {
  type NotificationItem,
  formatNotificationTime,
};
import { useUser } from "@/src/context/user.provider";
import { io, Socket } from "socket.io-client";
import axiosInstance from "@/src/lib/axiosInstance";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";
import { getChatSocketUrl } from "@/src/shared/lib/chat-client";

function getDefaultNotifications(): NotificationItem[] {
  return [];
}

const DUMMY_IDS = new Set(["u1", "u2", "u3", "n1", "n2", "n3", "a1", "a2", "a3", "b1", "b2", "b3"]);

function getDeletedIds(userEmail?: string): Set<string> {
  const set = new Set<string>(DUMMY_IDS);
  if (typeof window === "undefined") return set;

  try {
    const rawGlobal = localStorage.getItem("deleted_notification_ids_global");
    if (rawGlobal) {
      const arr = JSON.parse(rawGlobal);
      if (Array.isArray(arr)) arr.forEach((id) => set.add(String(id)));
    }
  } catch {}

  if (userEmail) {
    try {
      const rawUser = localStorage.getItem(`deleted_notification_ids_${userEmail.trim().toLowerCase()}`);
      if (rawUser) {
        const arr = JSON.parse(rawUser);
        if (Array.isArray(arr)) arr.forEach((id) => set.add(String(id)));
      }
    } catch {}
  }

  return set;
}

function addDeletedId(id: string, userEmail?: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const existingGlobalRaw = localStorage.getItem("deleted_notification_ids_global");
    const existingGlobal = existingGlobalRaw ? JSON.parse(existingGlobalRaw) : [];
    if (!existingGlobal.includes(id)) {
      localStorage.setItem("deleted_notification_ids_global", JSON.stringify([...existingGlobal, id].slice(-500)));
    }
  } catch {}

  if (userEmail) {
    try {
      const key = `deleted_notification_ids_${userEmail.trim().toLowerCase()}`;
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      if (!existing.includes(id)) {
        localStorage.setItem(key, JSON.stringify([...existing, id].slice(-500)));
      }
    } catch {}
  }
}

function getClearedTimestamp(userEmail?: string): number {
  if (typeof window === "undefined") return 0;
  let ts = 0;
  try {
    const globalTs = localStorage.getItem("notifications_cleared_timestamp_global");
    if (globalTs) ts = Math.max(ts, parseInt(globalTs, 10) || 0);
  } catch {}
  if (userEmail) {
    try {
      const userTs = localStorage.getItem(`notifications_cleared_timestamp_${userEmail.trim().toLowerCase()}`);
      if (userTs) ts = Math.max(ts, parseInt(userTs, 10) || 0);
    } catch {}
  }
  return ts;
}

function removeNotificationFromAllCaches(id: string, userEmail?: string, userId?: string) {
  if (typeof window === "undefined") return;
  const keys = [
    "platform_live_chat_notifications",
    "app_notifs_all",
    "app_notifs_user",
    "app_notifs_business",
    "app_notifs_affiliate",
    "app_notifs_admin",
  ];
  if (userId) keys.push(`app_notifs_${userId}`);
  if (userEmail) {
    keys.push(`app_notifs_${userEmail}`);
    keys.push(`app_notifs_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
  }

  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(
            (n: any) => n && n.id !== id && !DUMMY_IDS.has(String(n.id))
          );
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    } catch {}
  });
}

function clearAllNotificationCaches(userEmail?: string, userId?: string) {
  if (typeof window === "undefined") return;
  const keys = [
    "platform_live_chat_notifications",
    "app_notifs_all",
    "app_notifs_user",
    "app_notifs_business",
    "app_notifs_affiliate",
    "app_notifs_admin",
  ];
  if (userId) keys.push(`app_notifs_${userId}`);
  if (userEmail) {
    keys.push(`app_notifs_${userEmail}`);
    keys.push(`app_notifs_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
  }

  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });
}

function deduplicateNotifications(notifications: NotificationItem[]): NotificationItem[] {
  const map = new Map<string, NotificationItem>();

  notifications.forEach((item) => {
    if (!item || !item.id || DUMMY_IDS.has(String(item.id))) return;
    const id = String(item.id);
    if (!map.has(id)) {
      map.set(id, item);
    }
  });

  return Array.from(map.values());
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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const role = user && "role" in user ? String(user.role ?? "") : undefined;
  const userId = user && ("userId" in user || "id" in user) ? ((user as any).userId || (user as any).id) : undefined;
  const userEmail = user?.email ? String(user.email).trim().toLowerCase() : "";

  const [items, setItems] = useState<NotificationItem[]>([]);
  const knownIdsRef = useMemo(() => new Set<string>(), []);
  const deletingIdsRef = useRef<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load from cache on first render (filtering out deleted items and dummy fallbacks)
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

      const deletedIds = getDeletedIds(userEmail);
      const clearedTs = getClearedTimestamp(userEmail);
      const combinedMap = new Map<string, NotificationItem>();

      storageKeys.forEach((key) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((n: any) => {
                if (n && n.id && !deletedIds.has(String(n.id))) {
                  const itemTime = new Date(n.createdAt || n.time || 0).getTime();
                  if (clearedTs && itemTime && itemTime <= clearedTs) return;

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

      if (combinedMap.size > 0) {
        const unique = deduplicateNotifications(Array.from(combinedMap.values()));
        const sorted = unique.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setItems(sorted.slice(0, 100));
      } else {
        setItems([]);
      }
    } catch {}
  }, [userId, userEmail, role, knownIdsRef]);

  const notify = useCallback(
    (item: Omit<NotificationItem, "id" | "time" | "read"> & { id?: string }, suppressToast = false) => {
      const now = new Date().toISOString();
      const entryId = item.id || `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const deletedIds = getDeletedIds(userEmail);
      if (deletedIds.has(String(entryId))) return;

      knownIdsRef.add(String(entryId));

      const entry: NotificationItem = {
        ...item,
        id: entryId,
        createdAt: item.createdAt || now,
        time: formatNotificationTime(item.createdAt || now),
        read: false,
      };

      setItems((prev) => {
        const filtered = prev.filter((i) => i.id !== entry.id && !deletedIds.has(String(i.id)));
        const next = deduplicateNotifications([entry, ...filtered]).slice(0, 100);
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

  // Fetch notifications from DB & persistent store safely with fallback and resilient polling
  const fetchNotifications = useCallback(
    async (triggerToast = false) => {
      try {
        const deletedIds = getDeletedIds(userEmail);
        const clearedTs = getClearedTimestamp(userEmail);
        const fetchedItems: NotificationItem[] = [];

        // 1. Fetch from persistent local API
        try {
          const localUrl = userEmail
            ? `/api/live-chat/notifications?email=${encodeURIComponent(userEmail)}`
            : `/api/live-chat/notifications`;
          const localRes = await fetch(localUrl, { cache: "no-store" }).catch(() => null);
          if (localRes?.ok) {
            const localData = await localRes.json().catch(() => null);
            if (localData?.success && Array.isArray(localData.data)) {
              localData.data.forEach((n: any) => {
                if (n && n.id && !deletedIds.has(String(n.id))) {
                  const itemTime = new Date(n.createdAt || n.time || 0).getTime();
                  if (clearedTs && itemTime && itemTime <= clearedTs) return;

                  fetchedItems.push({
                    id: String(n.id),
                    title: n.title,
                    message: n.message,
                    createdAt: n.createdAt,
                    time: formatNotificationTime(n.createdAt || n.time),
                    read: Boolean(n.read || n.isRead),
                    href: n.data?.href || n.href,
                    type: n.data?.type || n.type,
                  });
                }
              });
            }
          }
        } catch {}

        // 2. Fetch from backend DB API if authenticated
        if (userId || userEmail) {
          try {
            const res = await axiosInstance
              .get("/notifications", { timeout: 4000, silent: true } as any)
              .catch(() => null);
            if (res?.data?.success && Array.isArray(res.data?.data?.notifications)) {
              res.data.data.notifications.forEach((n: any) => {
                const nid = String(n.id || n.notificationId);
                if (nid && !deletedIds.has(nid)) {
                  const itemTime = new Date(n.createdAt || 0).getTime();
                  if (clearedTs && itemTime && itemTime <= clearedTs) return;

                  fetchedItems.push({
                    id: nid,
                    title: n.title,
                    message: n.message,
                    createdAt: n.createdAt,
                    time: formatNotificationTime(n.createdAt),
                    read: Boolean(n.isRead || n.read),
                    href: n.data?.href || n.href,
                    type: n.data?.type || n.type,
                  });
                }
              });
            }
          } catch {}
        }

        let hasNewUnread = false;

        // Gather any locally cached notifications for the user
        const localCached: NotificationItem[] = [];
        if (typeof window !== "undefined") {
          try {
            const keys = ["app_notifs_all"];
            if (userId) keys.push(`app_notifs_${userId}`);
            if (userEmail) {
              keys.push(`app_notifs_${userEmail}`);
              keys.push(`app_notifs_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}`);
            }
            keys.forEach((k) => {
              const raw = localStorage.getItem(k);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                  parsed.forEach((item: any) => {
                    if (item && item.id) localCached.push(item);
                  });
                }
              }
            });
          } catch {}
        }

        setItems((prev) => {
          const map = new Map<string, NotificationItem>();
          [...fetchedItems, ...localCached, ...prev].forEach((item) => {
            if (item && item.id && !deletedIds.has(String(item.id))) {
              const itemTime = new Date(item.createdAt || item.time || 0).getTime();
              if (clearedTs && itemTime && itemTime <= clearedTs) return;

              if (triggerToast && !knownIdsRef.has(String(item.id)) && !item.read) {
                hasNewUnread = true;
              }
              knownIdsRef.add(String(item.id));
              map.set(String(item.id), {
                ...item,
                time: formatNotificationTime(item.createdAt || item.time),
              });
            }
          });
          const unique = deduplicateNotifications(Array.from(map.values()));
          const merged = unique.sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          ).slice(0, 100);

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
      } catch {
        // Keep existing notifications safely on error
      }
    },
    [userId, userEmail, knownIdsRef, hasInitialized]
  );

  useEffect(() => {
    fetchNotifications(false);

    // Resilient background poll
    const pollInterval = setInterval(() => {
      fetchNotifications(true);
    }, 4000);

    const handleFocus = () => fetchNotifications(true);
    window.addEventListener("focus", handleFocus);
    const handleUpdate = () => fetchNotifications(true);
    window.addEventListener("notifications_updated", handleUpdate);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("notifications_updated", handleUpdate);
    };
  }, [fetchNotifications]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications(false);
  }, [fetchNotifications]);

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
            const targetRole = String(p.targetRole || p.role || event.data.targetRole || "").toLowerCase();
            if (targetRole === "admin" && (!role || role.toLowerCase() !== "admin")) return;

            const targetE = (event.data.targetEmail || p.recipientEmail || p.targetEmail || "").trim().toLowerCase();
            const targetU = String(event.data.targetUserId || p.targetUserId || p.userId || "").trim();
            const myU = String(userId || "").trim();
            const myE = String(userEmail || "").trim().toLowerCase();

            if (targetE && myE && targetE !== myE) {
              if (!targetU || !myU || targetU !== myU) return;
            }
            if (targetU && myU && targetU !== myU) {
              if (!targetE || !myE || targetE !== myE) return;
            }

            const deletedIds = getDeletedIds(userEmail);
            if (!deletedIds.has(String(p.id)) && !knownIdsRef.has(String(p.id))) {
              notify(p, false);
            }
          } else if (event.data?.type === "vero:notification_deleted" && event.data.id) {
            const delId = String(event.data.id);
            addDeletedId(delId, userEmail);
            removeNotificationFromAllCaches(delId, userEmail, userId);
            setItems((prev) => prev.filter((item) => String(item.id) !== delId));
          } else if (event.data?.type === "vero:notifications_cleared") {
            setItems([]);
          }
        };
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vero_notif_sync" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.item) {
            const p = parsed.item;
            const targetRole = String(p.targetRole || p.role || parsed.targetRole || "").toLowerCase();
            if (targetRole === "admin" && (!role || role.toLowerCase() !== "admin")) return;

            const targetE = (parsed.targetEmail || p.recipientEmail || p.targetEmail || "").trim().toLowerCase();
            const targetU = String(parsed.targetUserId || p.targetUserId || p.userId || "").trim();
            const myU = String(userId || "").trim();
            const myE = String(userEmail || "").trim().toLowerCase();

            if (targetE && myE && targetE !== myE) {
              if (!targetU || !myU || targetU !== myU) return;
            }
            if (targetU && myU && targetU !== myU) {
              if (!targetE || !myE || targetE !== myE) return;
            }

            const deletedIds = getDeletedIds(userEmail);
            if (!deletedIds.has(String(p.id)) && !knownIdsRef.has(String(p.id))) {
              notify(p, false);
            }
          }
        } catch {}
      }
    };

    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const targetRole = String(detail.targetRole || detail.role || "").toLowerCase();
        if (targetRole === "admin" && (!role || role.toLowerCase() !== "admin")) return;

        const targetE = (detail.targetEmail || detail.recipientEmail || detail.targetEmail || "").trim().toLowerCase();
        const targetU = String(detail.targetUserId || detail.userId || "").trim();
        const myU = String(userId || "").trim();
        const myE = String(userEmail || "").trim().toLowerCase();

        if (targetE && myE && targetE !== myE) {
          if (!targetU || !myU || targetU !== myU) return;
        }
        if (targetU && myU && targetU !== myU) {
          if (!targetE || !myE || targetE !== myE) return;
        }

        const deletedIds = getDeletedIds(userEmail);
        if (!deletedIds.has(String(detail.id)) && !knownIdsRef.has(String(detail.id))) {
          notify(detail, false);
        }
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
  }, [notify, knownIdsRef, userEmail, userId, role]);

  // Connect to Notification WebSocket for live instant notifications
  useEffect(() => {
    if (typeof window === "undefined" || (!userId && !userEmail)) return;

    let socket: Socket | null = null;
    try {
      const wsUrl = getChatSocketUrl() || "http://localhost:8000";
      socket = io(`${wsUrl}/notifications`, {
        transports: ["websocket", "polling"],
        query: {
          userId: userId || userEmail,
          role: role || "USER",
        },
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 10000,
      });

      socket.on("connect_error", () => {
        // Silently handle if websocket gateway port is unreachable
      });

      socket.on("connect", () => {
        if (userId) {
          socket?.emit("join_user", { userId });
        }
        if (role) {
          socket?.emit("join_role", { role });
        }
      });

      socket.on("new_notification", (payload: any) => {
        if (payload) {
          const entryId = payload.id || `live-${Date.now()}`;
          const deletedIds = getDeletedIds(userEmail);
          if (!deletedIds.has(String(entryId)) && !knownIdsRef.has(String(entryId))) {
            notify(
              {
                id: entryId,
                title: payload.title || "New Notification",
                message: payload.message || payload.content || "",
                createdAt: payload.createdAt || new Date().toISOString(),
                href: payload.href || payload.data?.href,
                type: payload.type || payload.data?.type,
              },
              false
            );
          }
        }
      });
    } catch {}

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId, userEmail, role, notify, knownIdsRef]);

  const markRead = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item));
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

      if (typeof window !== "undefined") {
        fetch("/api/live-chat/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }).catch(() => {});
      }

      axiosInstance.put(`/notifications/${id}/read`).catch(() => {});
    },
    [userId, userEmail]
  );

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((item) => ({ ...item, read: true }));
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

    if (typeof window !== "undefined") {
      fetch("/api/live-chat/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true, email: userEmail }),
      }).catch(() => {});
    }

    axiosInstance.put("/notifications/read-all").catch(() => {});
  }, [userId, userEmail]);

  const deleteNotification = useCallback(
    (id: string) => {
      if (!id) return;
      const strId = String(id);
      if (deletingIdsRef.current.has(strId)) return;
      deletingIdsRef.current.add(strId);
      setTimeout(() => {
        deletingIdsRef.current.delete(strId);
      }, 2500);

      addDeletedId(strId, userEmail);
      removeNotificationFromAllCaches(strId, userEmail, userId);

      setItems((prev) => {
        const next = prev.filter((item) => String(item.id) !== strId);
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

      if (typeof window !== "undefined") {
        fetch(`/api/live-chat/notifications?id=${encodeURIComponent(strId)}&email=${encodeURIComponent(userEmail)}`, {
          method: "DELETE",
        }).catch(() => {});

        try {
          if ("BroadcastChannel" in window) {
            const bc = new BroadcastChannel("vero_channel");
            bc.postMessage({ type: "vero:notification_deleted", id: strId });
            bc.close();
          }
        } catch {}
      }

      axiosInstance.delete(`/notifications/${strId}`).catch(() => {});
      toast.success("Notification deleted successfully", { id: `delete-notif-${strId}` });
    },
    [userId, userEmail]
  );

  const deleteAllNotifications = useCallback(() => {
    const now = Date.now();
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("notifications_cleared_timestamp_global", String(now));
        if (userEmail) {
          localStorage.setItem(`notifications_cleared_timestamp_${userEmail.trim().toLowerCase()}`, String(now));
        }
      } catch {}
    }

    // Add all current IDs to deleted list
    items.forEach((item) => {
      if (item && item.id) {
        addDeletedId(item.id, userEmail);
      }
    });

    clearAllNotificationCaches(userEmail, userId);
    setItems([]);

    if (typeof window !== "undefined") {
      fetch(`/api/live-chat/notifications?all=true&email=${encodeURIComponent(userEmail)}`, {
        method: "DELETE",
      }).catch(() => {});

      try {
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("vero_channel");
          bc.postMessage({ type: "vero:notifications_cleared" });
          bc.close();
        }
      } catch {}
    }

    axiosInstance.delete("/notifications/all").catch(() => {});
    toast.success("All notifications deleted successfully", { id: "delete-all-notifications" });

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
  }, [items, userId, user, role, userEmail]);

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
