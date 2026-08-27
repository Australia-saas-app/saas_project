import { getAllRegisteredContacts, resolveContactFullName, type RegisteredContact } from "@/src/shared/lib/contacts-store";

export interface LiveChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  content: string;
  sentAt: string;
  timestamp: number;
  status: "sent" | "delivered" | "seen";
}

export interface LiveChatContact {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  status: "online" | "away" | "offline";
  lastSeen?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export interface UserPresence {
  isOnline: boolean;
  lastSeen: number;
  lastSeenFormatted: string;
}

export interface LiveChatRequest {
  id: string;
  senderEmail: string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string;
  receiverEmail: string;
  receiverName: string;
  receiverRole?: string;
  receiverAvatar?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
  formattedDate: string;
}

const LIVE_CHAT_MESSAGES_KEY = "platform_live_chat_messages";
const LIVE_CHAT_REQUESTS_KEY = "platform_live_chat_requests";
const LIVE_CHAT_DELETED_KEY_PREFIX = "platform_live_chat_deleted_";
const LIVE_CHAT_PRESENCE_KEY = "platform_live_chat_presence";

const INITIAL_SUPPORT_MESSAGES: LiveChatMessage[] = [
  {
    id: "support-msg-1",
    senderId: "support-team",
    senderName: "Customer Support & Escrow",
    senderEmail: "support@saas.com",
    content: "Welcome to Live Support! Feel free to ask any question regarding project escrows, dispute resolution, or milestones.",
    sentAt: "10:00 AM",
    timestamp: Date.now() - 3600000,
    status: "seen",
  },
];

export function readLiveChatPresence(): Record<string, UserPresence> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LIVE_CHAT_PRESENCE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function writeLiveChatPresence(presence: Record<string, UserPresence>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIVE_CHAT_PRESENCE_KEY, JSON.stringify(presence));
  } catch {
    // ignore
  }
}

export function setUserOnlineStatus(email: string, isOnline: boolean) {
  if (!email || typeof window === "undefined") return;
  const cleanEmail = email.trim().toLowerCase();
  const presenceMap = readLiveChatPresence();

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const dateStr = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const lastSeenFormatted = isOnline ? "Active now" : `${dateStr} at ${timeStr}`;

  presenceMap[cleanEmail] = {
    isOnline,
    lastSeen: Date.now(),
    lastSeenFormatted,
  };

  writeLiveChatPresence(presenceMap);

  // Persist to Database API
  fetch("/api/live-chat/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail, isOnline }),
  }).catch(() => null);
}

export async function syncLiveChatFromDb(currentUserEmail?: string) {
  if (typeof window === "undefined") return;
  try {
    const emailParam = currentUserEmail ? `?email=${encodeURIComponent(currentUserEmail)}` : "";
    
    // 1. Sync Requests from DB
    const reqRes = await fetch(`/api/live-chat/requests${emailParam}`).catch(() => null);
    if (reqRes?.ok) {
      const data = await reqRes.json();
      if (Array.isArray(data?.data)) {
        writeLiveChatRequests(data.data);
      }
    }

    // 2. Sync Messages from DB
    const msgRes = await fetch(`/api/live-chat/messages`).catch(() => null);
    if (msgRes?.ok) {
      const data = await msgRes.json();
      if (data?.data && typeof data.data === "object") {
        writeLiveChatMessages(data.data);
      }
    }

    // 3. Sync Deleted from DB
    if (currentUserEmail) {
      const delRes = await fetch(`/api/live-chat/conversations?email=${encodeURIComponent(currentUserEmail)}`).catch(() => null);
      if (delRes?.ok) {
        const data = await delRes.json();
        if (Array.isArray(data?.data)) {
          writeDeletedLiveChatContacts(currentUserEmail, data.data);
        }
      }
    }

    // 4. Sync Presence from DB
    const presenceRes = await fetch(`/api/live-chat/presence`).catch(() => null);
    if (presenceRes?.ok) {
      const data = await presenceRes.json();
      if (data?.data && typeof data.data === "object") {
        writeLiveChatPresence(data.data);
      }
    }
  } catch {
    // ignore
  }
}

export function readLiveChatMessages(): Record<string, LiveChatMessage[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LIVE_CHAT_MESSAGES_KEY);
    if (!raw) {
      return { "support-team": INITIAL_SUPPORT_MESSAGES };
    }
    const parsed = JSON.parse(raw);
    if (!parsed["support-team"]) {
      parsed["support-team"] = INITIAL_SUPPORT_MESSAGES;
    }
    return parsed;
  } catch {
    return { "support-team": INITIAL_SUPPORT_MESSAGES };
  }
}

export function writeLiveChatMessages(messages: Record<string, LiveChatMessage[]>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIVE_CHAT_MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

export function readLiveChatRequests(): LiveChatRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIVE_CHAT_REQUESTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeLiveChatRequests(requests: LiveChatRequest[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIVE_CHAT_REQUESTS_KEY, JSON.stringify(requests));
  } catch {
    // ignore
  }
}

export function sendLiveChatRequest(
  sender: { email: string; name: string; role?: string; avatar?: string },
  receiver: { email: string; name: string; role?: string; avatar?: string }
): LiveChatRequest {
  const requests = readLiveChatRequests();
  const sEmail = sender.email.trim().toLowerCase();
  const rEmail = receiver.email.trim().toLowerCase();

  // Remove any previous rejected request between them
  const filtered = requests.filter(
    (req) =>
      !(
        req.senderEmail.toLowerCase() === sEmail &&
        req.receiverEmail.toLowerCase() === rEmail
      )
  );

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const newRequest: LiveChatRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    senderEmail: sEmail,
    senderName: sender.name,
    senderRole: sender.role || "User",
    senderAvatar: sender.avatar,
    receiverEmail: rEmail,
    receiverName: receiver.name,
    receiverRole: receiver.role || "User",
    receiverAvatar: receiver.avatar,
    status: "pending",
    createdAt: Date.now(),
    formattedDate,
  };

  writeLiveChatRequests([newRequest, ...filtered]);

  // Persist to Database API
  if (typeof window !== "undefined") {
    fetch("/api/live-chat/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender, receiver }),
    }).catch(() => null);
  }

  return newRequest;
}

export function cancelLiveChatRequest(senderEmail: string, receiverEmail: string) {
  const requests = readLiveChatRequests();
  const sEmail = senderEmail.trim().toLowerCase();
  const rEmail = receiverEmail.trim().toLowerCase();

  const filtered = requests.filter(
    (req) =>
      !(
        req.senderEmail.toLowerCase() === sEmail &&
        req.receiverEmail.toLowerCase() === rEmail &&
        req.status === "pending"
      )
  );
  writeLiveChatRequests(filtered);

  // Persist to Database API
  if (typeof window !== "undefined") {
    fetch(`/api/live-chat/requests?senderEmail=${encodeURIComponent(sEmail)}&receiverEmail=${encodeURIComponent(rEmail)}`, {
      method: "DELETE",
    }).catch(() => null);
  }
}

export function acceptLiveChatRequest(requestId: string, currentUserEmail: string): LiveChatRequest | null {
  const requests = readLiveChatRequests();
  let acceptedReq: LiveChatRequest | null = null;

  const updated = requests.map((req) => {
    if (req.id === requestId) {
      acceptedReq = { ...req, status: "accepted" as const };
      return acceptedReq;
    }
    return req;
  });

  writeLiveChatRequests(updated);

  if (acceptedReq) {
    // Un-delete contact on both sides if previously deleted
    const r = acceptedReq as LiveChatRequest;
    const contactIdSender = `contact-${r.senderEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const contactIdReceiver = `contact-${r.receiverEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
    unDeleteLiveChatContact(contactIdSender, r.receiverEmail);
    unDeleteLiveChatContact(contactIdReceiver, r.senderEmail);

    // Persist to Database API
    if (typeof window !== "undefined") {
      fetch("/api/live-chat/requests/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, userEmail: currentUserEmail }),
      }).catch(() => null);
    }
  }

  return acceptedReq;
}

export function rejectLiveChatRequest(requestId: string, currentUserEmail: string) {
  const requests = readLiveChatRequests();
  const updated = requests.map((req) => {
    if (req.id === requestId) {
      return { ...req, status: "rejected" as const };
    }
    return req;
  });
  writeLiveChatRequests(updated);

  // Persist to Database API
  if (typeof window !== "undefined") {
    fetch("/api/live-chat/requests/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, userEmail: currentUserEmail }),
    }).catch(() => null);
  }
}

export function getPendingIncomingRequests(currentUserEmail: string): LiveChatRequest[] {
  const requests = readLiveChatRequests();
  const myEmail = currentUserEmail.trim().toLowerCase();
  return requests
    .filter((r) => r.receiverEmail.toLowerCase() === myEmail && r.status === "pending")
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getOutgoingRequestStatus(
  currentUserEmail: string,
  targetEmail: string
): "pending" | "accepted" | "none" {
  const requests = readLiveChatRequests();
  const myEmail = currentUserEmail.trim().toLowerCase();
  const tEmail = targetEmail.trim().toLowerCase();

  const req = requests.find(
    (r) =>
      (r.senderEmail.toLowerCase() === myEmail && r.receiverEmail.toLowerCase() === tEmail) ||
      (r.receiverEmail.toLowerCase() === myEmail && r.senderEmail.toLowerCase() === tEmail)
  );

  if (!req) return "none";
  if (req.status === "accepted") return "accepted";
  if (req.status === "pending" && req.senderEmail.toLowerCase() === myEmail) return "pending";
  return "none";
}

export function readDeletedLiveChatContacts(currentUserEmail: string): string[] {
  if (typeof window === "undefined" || !currentUserEmail) return [];
  try {
    const key = `${LIVE_CHAT_DELETED_KEY_PREFIX}${currentUserEmail.trim().toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeDeletedLiveChatContacts(currentUserEmail: string, deletedIds: string[]) {
  if (typeof window === "undefined" || !currentUserEmail) return;
  try {
    const key = `${LIVE_CHAT_DELETED_KEY_PREFIX}${currentUserEmail.trim().toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(deletedIds));
  } catch {
    // ignore
  }
}

export function deleteLiveChatContact(contactId: string, currentUserEmail: string) {
  if (!contactId || !currentUserEmail) return;
  const deleted = readDeletedLiveChatContacts(currentUserEmail);
  if (!deleted.includes(contactId)) {
    writeDeletedLiveChatContacts(currentUserEmail, [...deleted, contactId]);
  }

  // Clear messages for this conversation locally for this user
  const messagesStore = readLiveChatMessages();
  if (messagesStore[contactId]) {
    delete messagesStore[contactId];
    writeLiveChatMessages(messagesStore);
  }

  // Persist deletion to Database API
  if (typeof window !== "undefined") {
    fetch(`/api/live-chat/conversations?contactId=${encodeURIComponent(contactId)}&email=${encodeURIComponent(currentUserEmail)}`, {
      method: "DELETE",
    }).catch(() => null);
  }
}

export function unDeleteLiveChatContact(contactId: string, currentUserEmail: string) {
  if (!contactId || !currentUserEmail) return;
  const deleted = readDeletedLiveChatContacts(currentUserEmail);
  if (deleted.includes(contactId)) {
    writeDeletedLiveChatContacts(
      currentUserEmail,
      deleted.filter((id) => id !== contactId)
    );
  }
}

export function getAllLiveChatContacts(currentUserEmail?: string): LiveChatContact[] {
  const registered = getAllRegisteredContacts();
  const requests = readLiveChatRequests();
  const messagesStore = readLiveChatMessages();
  const presenceMap = readLiveChatPresence();

  const myEmail = currentUserEmail?.trim().toLowerCase() || "";
  const deletedIds = new Set(readDeletedLiveChatContacts(myEmail));
  const contactsMap = new Map<string, LiveChatContact>();

  // 1. Customer Support & Escrow (Always present unless deleted by user, 24/7 online)
  if (!deletedIds.has("support-team")) {
    contactsMap.set("support-team", {
      id: "support-team",
      name: "Customer Support & Escrow",
      email: "support@saas.com",
      role: "Support",
      status: "online",
      lastSeen: "24/7 Live Support",
      unreadCount: 0,
    });
  }

  // 2. ONLY add contacts where a request has been ACCEPTED between current user and target user
  requests.forEach((req) => {
    if (req.status !== "accepted") return;

    const sEmail = req.senderEmail.toLowerCase();
    const rEmail = req.receiverEmail.toLowerCase();

    if (sEmail !== myEmail && rEmail !== myEmail) return;

    const otherEmail = sEmail === myEmail ? rEmail : sEmail;
    const otherName = sEmail === myEmail ? req.receiverName : req.senderName;
    const otherRole = sEmail === myEmail ? req.receiverRole : req.senderRole;
    const otherAvatar = sEmail === myEmail ? req.receiverAvatar : req.senderAvatar;

    const contactId = `contact-${otherEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
    if (deletedIds.has(contactId)) return;

    if (!contactsMap.has(contactId)) {
      const reg = registered.find((r) => r.email.toLowerCase() === otherEmail);
      const userPresence = presenceMap[otherEmail] || {
        isOnline: false,
        lastSeen: 0,
        lastSeenFormatted: "Offline",
      };

      contactsMap.set(contactId, {
        id: contactId,
        name: otherName || reg?.name || resolveContactFullName(otherEmail),
        email: otherEmail,
        role: otherRole || reg?.role || "User",
        avatar: otherAvatar || reg?.avatar,
        status: userPresence.isOnline ? "online" : "offline",
        lastSeen: userPresence.isOnline ? "Active now" : `Last seen ${userPresence.lastSeenFormatted}`,
        unreadCount: 0,
      });
    }
  });

  // 3. Attach latest live chat messages & unread counts
  const result: LiveChatContact[] = [];

  contactsMap.forEach((contact, contactId) => {
    const history = messagesStore[contactId] || messagesStore[contact.email.toLowerCase()] || [];
    if (history.length > 0) {
      const lastMsg = history[history.length - 1];
      const isMe = lastMsg.senderEmail ? lastMsg.senderEmail.toLowerCase() === myEmail : lastMsg.senderName === "You";
      contact.lastMessage = isMe ? `You: ${lastMsg.content}` : lastMsg.content;
      contact.lastMessageTime = lastMsg.sentAt;
      contact.unreadCount = history.filter(
        (m) => m.status !== "seen" && (m.senderEmail ? m.senderEmail.toLowerCase() !== myEmail : m.senderName !== "You")
      ).length;
    } else {
      contact.lastMessage = "Chat not started yet";
      contact.lastMessageTime = "";
      contact.unreadCount = 0;
    }
    result.push(contact);
  });

  return result;
}

export function getLiveChatUnreadConversationsCount(currentUserEmail?: string): number {
  const contacts = getAllLiveChatContacts(currentUserEmail);
  return contacts.filter((c) => (c.unreadCount || 0) > 0).length;
}
