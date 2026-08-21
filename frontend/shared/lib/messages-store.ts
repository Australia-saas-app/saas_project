import { isDemoAccountUserId } from "@/src/shared/lib/demo-user";
import { getStorageUserScope, scopedStorageKey } from "@/src/shared/lib/storage-scope";
import { resolveContactFullName } from "@/src/shared/lib/contacts-store";

export type DashboardRole = "user" | "affiliate" | "business";

export interface ThreadMessage {
  id: string;
  from: "me" | "them";
  fromName: string;
  fromEmail?: string;
  toEmail?: string;
  body: string;
  sentAt: string;
}

export type MessageFolder = "inbox" | "sent" | "drafts" | "deleted" | "live";

export interface MessageThread {
  id: string;
  role: DashboardRole;
  participant: string;
  senderName?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientBusiness?: string;
  recipientUserId?: string;
  senderBusiness?: string;
  senderUserId?: string;
  subject: string;
  project: string;
  projectId?: string;
  unread: boolean;
  updatedAt: string;
  messages: ThreadMessage[];
  folder?: MessageFolder;
  draftBody?: string;
  lastReadAt?: string;
}

const STORAGE_KEY = "platform_message_threads";
const GLOBAL_EMAIL_STORAGE_KEY = "platform_global_email_messages";

function readAll(): MessageThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MessageThread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(threads: MessageThread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

function readGlobalEmails(): MessageThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GLOBAL_EMAIL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MessageThread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGlobalEmails(emails: MessageThread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GLOBAL_EMAIL_STORAGE_KEY, JSON.stringify(emails));
}

export function seedThreadsIfEmpty(seed: MessageThread[]) {
  if (readAll().length > 0 || readGlobalEmails().length > 0) return;
  writeAll(seed);
  writeGlobalEmails(seed);
}

export function syncMongoDBThreads(dbThreads: MessageThread[], currentUserEmail?: string) {
  if (!Array.isArray(dbThreads) || dbThreads.length === 0) return;
  const local = readAll();
  const global = readGlobalEmails();
  const email = (currentUserEmail || '').trim().toLowerCase();

  const map = new Map<string, MessageThread>();
  [...local, ...global].forEach((t) => {
    if (t && t.id) map.set(t.id, t);
  });

  dbThreads.forEach((dt) => {
    if (!dt || !dt.id) return;
    const existing = map.get(dt.id);

    // Map each message from/them relative to current user
    const mappedMessages: ThreadMessage[] = (dt.messages || []).map((m) => {
      const mEmail = (m.fromEmail || '').trim().toLowerCase();
      const isMe = (email && mEmail === email) || m.from === 'me';
      return {
        ...m,
        from: isMe ? ('me' as const) : ('them' as const),
      };
    });

    let isUnread = dt.unread;
    if (mappedMessages.length > 0 && email) {
      const lastMsg = mappedMessages[mappedMessages.length - 1];
      const lastMsgFromEmail = (lastMsg.fromEmail || '').trim().toLowerCase();
      const lastMsgIsMe = lastMsgFromEmail === email || lastMsg.from === 'me';
      isUnread = !lastMsgIsMe;
    }

    if (existing) {
      map.set(dt.id, {
        ...existing,
        ...dt,
        unread: isUnread,
        messages: mappedMessages.length > 0 ? mappedMessages : existing.messages,
        updatedAt: dt.updatedAt || existing.updatedAt,
      });
    } else {
      map.set(dt.id, {
        ...dt,
        unread: isUnread,
        messages: mappedMessages,
      });
    }
  });

  const merged = Array.from(map.values());
  writeAll(merged);
  writeGlobalEmails(merged);
}

export function getReadMessageIds(userEmail?: string): Set<string> {
  if (typeof window === "undefined" || !userEmail) return new Set();
  try {
    const key = `user_read_msg_ids_${userEmail.trim().toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markMessagesAsRead(messageIds: string[], userEmail?: string) {
  if (typeof window === "undefined" || !userEmail || messageIds.length === 0) return;
  try {
    const key = `user_read_msg_ids_${userEmail.trim().toLowerCase()}`;
    const existing = getReadMessageIds(userEmail);
    messageIds.forEach((id) => existing.add(id));
    localStorage.setItem(key, JSON.stringify(Array.from(existing)));
  } catch {}
}

export function getThreadsForRole(role: DashboardRole, currentUserEmail?: string): MessageThread[] {
  const local = readAll();
  const global = readGlobalEmails();
  const email = currentUserEmail?.trim().toLowerCase();
  const readMsgIds = getReadMessageIds(email);

  const archKey = email ? `user_archived_threads_${email}` : "";
  const permKey = email ? `user_perm_deleted_threads_${email}` : "";
  const userArchived = archKey && typeof window !== "undefined" ? (JSON.parse(localStorage.getItem(archKey) || "[]") as string[]) : [];
  const userPermDeleted = permKey && typeof window !== "undefined" ? (JSON.parse(localStorage.getItem(permKey) || "[]") as string[]) : [];

  const combinedMap = new Map<string, MessageThread>();

  // Consolidate all threads from global and local stores
  [...local, ...global].forEach((t) => {
    if (!t || !t.id) return;
    if (userPermDeleted.includes(t.id)) return;

    const rec = (t.recipientEmail || t.participant || "").trim().toLowerCase();
    const send = (t.senderEmail || "").trim().toLowerCase();

    const isArchivedByMe = userArchived.includes(t.id);
    const folderForMe = isArchivedByMe ? ("deleted" as const) : ((t.folder ?? "inbox") as MessageFolder);

    // 1. Thread explicitly matches current user email
    if (email) {
      if (rec === email || send === email) {
        let unreadForMe = false;
        if (t.messages && t.messages.length > 0) {
          const lastMsg = t.messages[t.messages.length - 1];
          const lastMsgEmail = (lastMsg.fromEmail || "").trim().toLowerCase();
          const isLastMsgMine = (lastMsgEmail && lastMsgEmail === email) || lastMsg.from === "me";
          if (isLastMsgMine) {
            unreadForMe = false;
          } else {
            unreadForMe = t.messages.some(
              (m) =>
                ((m.fromEmail && m.fromEmail.toLowerCase() !== email) || m.from === "them") &&
                !readMsgIds.has(m.id)
            );
          }
        }

        combinedMap.set(t.id, {
          ...t,
          role,
          folder: folderForMe,
          unread: unreadForMe,
        });
        return;
      }
    }

    // 2. Project application threads (TH-*) or role matching
    if (t.id.startsWith("TH-") || t.role === role) {
      let unreadForMe = false;
      if (t.messages && t.messages.length > 0 && email) {
        const lastMsg = t.messages[t.messages.length - 1];
        const lastMsgEmail = (lastMsg.fromEmail || "").trim().toLowerCase();
        const isLastMsgMine = (lastMsgEmail && lastMsgEmail === email) || lastMsg.from === "me";
        if (isLastMsgMine) {
          unreadForMe = false;
        } else {
          unreadForMe = t.messages.some(
            (m) =>
              ((m.fromEmail && m.fromEmail.toLowerCase() !== email) || m.from === "them") &&
              !readMsgIds.has(m.id)
          );
        }
      }

      combinedMap.set(t.id, {
        ...t,
        role,
        folder: folderForMe,
        unread: unreadForMe,
      });
    }
  });

  return Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getThreadById(id: string): MessageThread | undefined {
  return readAll().find((t) => t.id === id) || readGlobalEmails().find((t) => t.id === id);
}

export function getOrCreateApplicationThread(input: {
  threadId: string;
  role: DashboardRole;
  projectId: string;
  projectName: string;
  applicantName: string;
  applicantBusiness?: string;
  applicantEmail?: string;
  applicantUserId?: string;
  clientName?: string;
  clientEmail?: string;
  initialDraft?: string;
}): MessageThread {
  const local = readAll();
  const global = readGlobalEmails();
  const existing = local.find((t) => t.id === input.threadId) || global.find((t) => t.id === input.threadId);

  if (existing) {
    let changed = false;
    if (input.applicantName && existing.recipientName !== input.applicantName) {
      existing.recipientName = input.applicantName;
      existing.participant = input.applicantName;
      changed = true;
    }
    if (input.applicantBusiness && existing.recipientBusiness !== input.applicantBusiness) {
      existing.recipientBusiness = input.applicantBusiness;
      changed = true;
    }
    if (input.applicantEmail && existing.recipientEmail !== input.applicantEmail) {
      existing.recipientEmail = input.applicantEmail;
      changed = true;
    }
    if (input.clientName && existing.senderName !== input.clientName) {
      existing.senderName = input.clientName;
      changed = true;
    }
    if (input.clientEmail && existing.senderEmail !== input.clientEmail) {
      existing.senderEmail = input.clientEmail;
      changed = true;
    }
    if (input.projectName && !existing.subject.includes(input.projectName)) {
      existing.subject = `Subject: Application for ${input.projectName}`;
      existing.project = input.projectName;
      changed = true;
    }
    if (input.initialDraft && (!existing.messages || existing.messages.length === 0) && !existing.draftBody) {
      existing.draftBody = input.initialDraft;
      changed = true;
    }
    if (changed) {
      writeAll(local.map((t) => (t.id === existing.id ? existing : t)));
      writeGlobalEmails(global.map((t) => (t.id === existing.id ? existing : t)));
    }
    return existing;
  }

  const thread: MessageThread = {
    id: input.threadId,
    role: input.role,
    participant: input.applicantName || "Business Partner",
    recipientName: input.applicantName || "Business Partner",
    recipientBusiness: input.applicantBusiness || "Business",
    recipientEmail: input.applicantEmail || "",
    recipientUserId: input.applicantUserId || "",
    senderName: input.clientName || "Client",
    senderEmail: input.clientEmail || "",
    senderBusiness: "Client",
    subject: `Subject: Application for ${input.projectName}`,
    project: input.projectName,
    projectId: input.projectId,
    unread: false,
    updatedAt: new Date().toISOString(),
    folder: "inbox",
    draftBody: input.initialDraft || "",
    messages: [],
  };

  writeAll([thread, ...local]);
  writeGlobalEmails([thread, ...global]);
  return thread;
}

export function getOrCreateProjectThread(input: {
  role: DashboardRole;
  projectId: string;
  projectName: string;
  participant?: string;
}): MessageThread {
  const existing = readAll().find(
    (t) => t.role === input.role && t.projectId === input.projectId
  );
  if (existing) return existing;

  const thread: MessageThread = {
    id: `TH-${input.projectId}`,
    role: input.role,
    participant: input.participant ?? "Project team",
    subject: `Project: ${input.projectName}`,
    project: input.projectName,
    projectId: input.projectId,
    unread: false,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `MSG-${Date.now()}`,
        from: "them",
        fromName: input.participant ?? "Project team",
        body: `Thread opened for ${input.projectName}. Send a message to coordinate milestones, deliverables, or payment.`,
        sentAt: new Date().toISOString(),
      },
    ],
  };
  writeAll([thread, ...readAll()]);
  return thread;
}

export function markThreadRead(threadId: string, currentUserEmail?: string) {
  const now = new Date().toISOString();
  const allThreads = [...readAll(), ...readGlobalEmails()];
  const target = allThreads.find((t) => t.id === threadId);
  if (target && currentUserEmail) {
    const msgIds = (target.messages || []).map((m) => m.id);
    markMessagesAsRead(msgIds, currentUserEmail);
  }
  writeAll(
    readAll().map((t) => (t.id === threadId ? { ...t, unread: false, lastReadAt: now } : t))
  );
  writeGlobalEmails(
    readGlobalEmails().map((t) => (t.id === threadId ? { ...t, unread: false, lastReadAt: now } : t))
  );
}

export function archiveThread(threadId: string, currentUserEmail?: string) {
  if (typeof window !== "undefined" && currentUserEmail) {
    const email = currentUserEmail.trim().toLowerCase();
    const key = `user_archived_threads_${email}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    if (!existing.includes(threadId)) {
      localStorage.setItem(key, JSON.stringify([...existing, threadId]));
    }
  } else {
    writeAll(
      readAll().map((t) => (t.id === threadId ? { ...t, folder: "deleted" as const, unread: false } : t))
    );
  }
}

export function softDeleteThread(threadId: string, currentUserEmail?: string) {
  archiveThread(threadId, currentUserEmail);
}

export function permanentlyDeleteThread(threadId: string, currentUserEmail?: string) {
  if (typeof window !== "undefined" && currentUserEmail) {
    const email = currentUserEmail.trim().toLowerCase();
    const key = `user_perm_deleted_threads_${email}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    if (!existing.includes(threadId)) {
      localStorage.setItem(key, JSON.stringify([...existing, threadId]));
    }
  } else {
    writeAll(readAll().filter((t) => t.id !== threadId));
    writeGlobalEmails(readGlobalEmails().filter((t) => t.id !== threadId));
  }
}

export function saveDraftThread(input: {
  role: DashboardRole;
  to: string;
  subject: string;
  body: string;
  senderEmail?: string;
  threadId?: string;
}): MessageThread {
  const threads = readAll();
  if (input.threadId) {
    const index = threads.findIndex((t) => t.id === input.threadId);
    if (index >= 0) {
      const updated: MessageThread = {
        ...threads[index],
        participant: input.to || threads[index].participant,
        recipientEmail: input.to || threads[index].recipientEmail,
        senderEmail: input.senderEmail || threads[index].senderEmail,
        subject: input.subject || threads[index].subject,
        draftBody: input.body,
        folder: "drafts",
        updatedAt: new Date().toISOString(),
      };
      const next = [...threads];
      next[index] = updated;
      writeAll(next);
      return updated;
    }
  }

  const draft: MessageThread = {
    id: `DR-${Date.now().toString().slice(-6)}`,
    role: input.role,
    participant: input.to || "Recipient",
    recipientEmail: input.to,
    senderEmail: input.senderEmail,
    subject: input.subject || "(No subject)",
    project: "Compose",
    unread: false,
    updatedAt: new Date().toISOString(),
    messages: [],
    folder: "drafts",
    draftBody: input.body,
  };
  writeAll([draft, ...threads]);
  return draft;
}

export function sendComposedMessage(input: {
  role: DashboardRole;
  to: string;
  recipientName?: string;
  subject: string;
  body: string;
  senderName: string;
  senderEmail?: string;
  draftId?: string;
}): MessageThread {
  const threads = input.draftId ? readAll().filter((t) => t.id !== input.draftId) : readAll();
  const sentAt = new Date().toISOString();
  const threadId = `EM-${Date.now().toString().slice(-6)}`;

  const recipientEmail = input.to.trim().toLowerCase();
  const resolvedRecipientName = resolveContactFullName(recipientEmail, input.recipientName);
  const resolvedSenderName = resolveContactFullName(input.senderEmail, input.senderName);

  // 1. Thread for Sender's "Sent" folder
  const senderThread: MessageThread = {
    id: `SN-${threadId}`,
    role: input.role,
    participant: resolvedRecipientName, // Receiver's Full Name
    recipientName: resolvedRecipientName,
    recipientEmail: recipientEmail,
    senderName: resolvedSenderName,
    senderEmail: input.senderEmail,
    subject: input.subject,
    project: "Direct Email",
    unread: false,
    updatedAt: sentAt,
    folder: "sent",
    messages: [
      {
        id: `MSG-${Date.now().toString(36)}`,
        from: "me",
        fromName: resolvedSenderName,
        fromEmail: input.senderEmail,
        toEmail: recipientEmail,
        body: input.body,
        sentAt,
      },
    ],
  };

  // 2. Thread for Recipient's "Inbox" folder (cross-account delivery)
  const recipientThread: MessageThread = {
    id: `IN-${threadId}`,
    role: "user",
    participant: resolvedSenderName, // Sender's Full Name
    senderName: resolvedSenderName,
    senderEmail: input.senderEmail,
    recipientName: resolvedRecipientName,
    recipientEmail: recipientEmail,
    subject: input.subject,
    project: "Direct Email",
    unread: true,
    updatedAt: sentAt,
    folder: "inbox",
    messages: [
      {
        id: `MSG-${Date.now().toString(36)}-R`,
        from: "them",
        fromName: resolvedSenderName,
        fromEmail: input.senderEmail,
        toEmail: recipientEmail,
        body: input.body,
        sentAt,
      },
    ],
  };

  writeAll([senderThread, ...threads]);

  // Persist into global email store for recipient matching
  const globalEmails = readGlobalEmails();
  writeGlobalEmails([senderThread, recipientThread, ...globalEmails]);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("platform_new_email", {
        detail: {
          threadId: recipientThread.id,
          recipientEmail: recipientEmail,
          recipientName: resolvedRecipientName,
          senderName: resolvedSenderName,
          senderEmail: input.senderEmail,
          subject: input.subject,
          sentAt,
        },
      })
    );
  }

  return senderThread;
}

export function sendThreadMessage(
  threadId: string,
  body: string,
  senderName: string,
  senderEmail?: string
): MessageThread | undefined {
  const local = readAll();
  const global = readGlobalEmails();
  const sentAt = new Date().toISOString();
  const newMsg: ThreadMessage = {
    id: `MSG-${Date.now().toString(36)}`,
    from: "me",
    fromName: senderName,
    fromEmail: senderEmail,
    body,
    sentAt,
  };

  const syncThreadInList = (list: MessageThread[]): MessageThread[] => {
    return list.map((t) => {
      if (t.id === threadId) {
        return {
          ...t,
          unread: false,
          updatedAt: sentAt,
          draftBody: "",
          messages: [...t.messages, newMsg],
        };
      }
      return t;
    });
  };

  let targetThread = local.find((t) => t.id === threadId) || global.find((t) => t.id === threadId);

  if (targetThread) {
    targetThread = {
      ...targetThread,
      unread: false,
      updatedAt: sentAt,
      draftBody: "",
      messages: [...targetThread.messages, newMsg],
    };

    const updatedLocal = local.some((t) => t.id === threadId)
      ? syncThreadInList(local)
      : [targetThread, ...local];
    writeAll(updatedLocal);

    // Sync global thread for recipient
    const recipientMsg: ThreadMessage = {
      id: `MSG-${Date.now().toString(36)}-R`,
      from: "them",
      fromName: senderName,
      fromEmail: senderEmail,
      body,
      sentAt,
    };

    const globalRecipientThread: MessageThread = {
      ...targetThread,
      unread: true,
      updatedAt: sentAt,
      draftBody: "",
      messages: targetThread.messages.map((m) =>
        m.id === newMsg.id ? recipientMsg : m
      ),
    };

    const updatedGlobal = global.some((t) => t.id === threadId)
      ? global.map((t) => (t.id === threadId ? globalRecipientThread : t))
      : [globalRecipientThread, ...global];
    writeGlobalEmails(updatedGlobal);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("platform_new_email", {
          detail: {
            threadId: targetThread.id,
            recipientEmail: targetThread.recipientEmail,
            recipientName: targetThread.recipientName || targetThread.participant,
            senderName,
            senderEmail,
            subject: targetThread.subject,
            project: targetThread.project,
            body,
            sentAt,
          },
        })
      );
    }

    return targetThread;
  }

  return undefined;
}

export function getThreadsByFolder(
  role: DashboardRole,
  folder: MessageFolder,
  currentUserEmail?: string
): MessageThread[] {
  return getThreadsForRole(role, currentUserEmail).filter((t) => {
    const f = t.folder ?? "inbox";
    if (folder === "inbox") return f === "inbox";
    return f === folder;
  });
}

export function demoToThread(
  role: DashboardRole,
  m: {
    id: string;
    from: string;
    subject: string;
    body: string;
    project?: string;
    unread?: boolean;
    date?: string;
  }
): MessageThread {
  const sentAt = m.date
    ? new Date(m.date.replace(/\//g, "-")).toISOString()
    : new Date().toISOString();

  return {
    id: `TH-${m.id}`,
    role,
    participant: m.from,
    senderName: m.from,
    senderEmail: `${m.from.toLowerCase().replace(/[^a-z0-9]/g, "_")}@example.com`,
    subject: m.subject,
    project: m.project || "General",
    unread: m.unread ?? false,
    updatedAt: sentAt,
    folder: "inbox",
    messages: [
      {
        id: `M-${m.id}-0`,
        from: "them",
        fromName: m.from,
        fromEmail: `${m.from.toLowerCase().replace(/[^a-z0-9]/g, "_")}@example.com`,
        body: m.body,
        sentAt,
      },
    ],
  };
}

