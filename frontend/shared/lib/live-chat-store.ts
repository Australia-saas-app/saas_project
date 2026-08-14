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
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

const LIVE_CHAT_MESSAGES_KEY = "platform_live_chat_messages";
const LIVE_CHAT_ACTIVE_CONTACTS_KEY = "platform_live_chat_active_contacts";

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

export function readLiveChatMessages(): Record<string, LiveChatMessage[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LIVE_CHAT_MESSAGES_KEY);
    if (!raw) {
      // Default initial message for support team only
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

export function readManualLiveChatContacts(): RegisteredContact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIVE_CHAT_ACTIVE_CONTACTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeManualLiveChatContacts(contacts: RegisteredContact[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LIVE_CHAT_ACTIVE_CONTACTS_KEY, JSON.stringify(contacts));
  } catch {
    // ignore
  }
}

export function getAllLiveChatContacts(currentUserEmail?: string): LiveChatContact[] {
  const registered = getAllRegisteredContacts();
  const manualContacts = readManualLiveChatContacts();
  const messagesStore = readLiveChatMessages();

  const myEmail = currentUserEmail?.trim().toLowerCase() || "";

  const contactsMap = new Map<string, LiveChatContact>();

  // 1. One single test contact (Customer Support) for testing UI
  contactsMap.set("support-team", {
    id: "support-team",
    name: "Customer Support & Escrow",
    email: "support@saas.com",
    role: "Support",
    status: "online",
    unreadCount: 0,
  });

  // 2. All real registered & composed contacts
  [...manualContacts, ...registered].forEach((c) => {
    const email = c.email.toLowerCase();
    if (email === myEmail) return; // Don't show current logged in user

    const contactId = `contact-${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
    if (!contactsMap.has(contactId)) {
      contactsMap.set(contactId, {
        id: contactId,
        name: c.name || resolveContactFullName(email),
        email: c.email,
        role: c.role || "User",
        avatar: c.avatar,
        status: "online",
        unreadCount: 0,
      });
    }
  });

  // 3. Attach latest message & unread counts
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

export function addContactToLiveChat(contactInput: {
  email: string;
  name?: string;
  role?: string;
  avatar?: string;
}): LiveChatContact {
  const email = contactInput.email.trim().toLowerCase();
  const name = contactInput.name || resolveContactFullName(email);
  const contactId = `contact-${email.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const currentManual = readManualLiveChatContacts();
  if (!currentManual.some((c) => c.email.toLowerCase() === email)) {
    writeManualLiveChatContacts([
      { id: contactId, name, email, role: contactInput.role || "User", avatar: contactInput.avatar },
      ...currentManual,
    ]);
  }

  return {
    id: contactId,
    name,
    email,
    role: contactInput.role || "User",
    avatar: contactInput.avatar,
    status: "online",
    lastMessage: "Chat not started yet",
    lastMessageTime: "",
    unreadCount: 0,
  };
}
