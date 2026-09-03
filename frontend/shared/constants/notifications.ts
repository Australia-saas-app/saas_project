export type NotificationItem = {
  id: string
  title: string
  message: string
  time?: string
  createdAt?: string | Date
  read: boolean
  href?: string
  type?: string
  data?: any
  recipientEmail?: string
}

export function formatNotificationTime(input?: string | number | Date | null): string {
  if (!input) return "Just now";

  // If already relative formatted like "Just now" or "5 mins ago"
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

export const ADMIN_NOTIFICATIONS: NotificationItem[] = []
export const USER_NOTIFICATIONS: NotificationItem[] = []
export const AFFILIATE_NOTIFICATIONS: NotificationItem[] = []
export const BUSINESS_NOTIFICATIONS: NotificationItem[] = []

