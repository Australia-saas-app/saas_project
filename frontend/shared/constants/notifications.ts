export type NotificationItem = {
  id: string
  title: string
  message: string
  time?: string
  createdAt?: string | Date
  read: boolean
  href?: string
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

export const ADMIN_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    title: "New user registration",
    message: "Sarah Chen completed affiliate onboarding.",
    time: "5 min ago",
    read: false,
    href: "/admin/users",
  },
  {
    id: "n2",
    title: "Transaction pending",
    message: "12 withdrawal requests need review.",
    time: "1 hr ago",
    read: false,
    href: "/admin/transactions",
  },
  {
    id: "n3",
    title: "Content published",
    message: "New blog post is live on the public site.",
    time: "3 hrs ago",
    read: true,
    href: "/admin/content/blogs",
  },
]

export const USER_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "u1",
    title: "Order update",
    message: "Your technical project bid was accepted.",
    time: "10 min ago",
    read: false,
    href: "/user/orders",
  },
  {
    id: "u2",
    title: "Wallet credited",
    message: "$120.00 was added to your wallet.",
    time: "2 hrs ago",
    read: false,
    href: "/user/wallet",
  },
  {
    id: "u3",
    title: "New notice",
    message: "Platform maintenance scheduled for Sunday.",
    time: "Yesterday",
    read: true,
    href: "/user/notices",
  },
]

export const AFFILIATE_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "a1",
    title: "New referral",
    message: "A user signed up through your promotion link.",
    time: "20 min ago",
    read: false,
    href: "/affiliate/referrals",
  },
  {
    id: "a2",
    title: "Commission earned",
    message: "You earned $45.00 from a marketplace referral.",
    time: "4 hrs ago",
    read: false,
    href: "/affiliate/earnings",
  },
  {
    id: "a3",
    title: "Promotion milestone",
    message: "Your link reached 100 clicks this week.",
    time: "1 day ago",
    read: true,
    href: "/affiliate/promotions",
  },
]

export const BUSINESS_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "b1",
    title: "New client inquiry",
    message: "Global Tech Ltd requested your services.",
    time: "15 min ago",
    read: false,
    href: "/business/clients",
  },
  {
    id: "b2",
    title: "Service approved",
    message: "Your marketplace listing is now live.",
    time: "3 hrs ago",
    read: false,
    href: "/business/services",
  },
  {
    id: "b3",
    title: "Transaction settled",
    message: "Payment for order #TX-8842 was processed.",
    time: "Yesterday",
    read: true,
    href: "/business/transaction",
  },
]
