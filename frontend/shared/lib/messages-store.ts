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
  subject: string;
  project: string;
  projectId?: string;
  unread: boolean;
  updatedAt: string;
  messages: ThreadMessage[];
  folder?: MessageFolder;
  draftBody?: string;
}

const STORAGE_KEY = "platform_message_threads";
const GLOBAL_EMAIL_STORAGE_KEY = "platform_global_email_messages";

function storageKey() {
  return scopedStorageKey(STORAGE_KEY);
}

function readAll(): MessageThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MessageThread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(threads: MessageThread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(), JSON.stringify(threads));
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
  if (!isDemoAccountUserId(getStorageUserScope())) return;
  if (readAll().length > 0) return;
  writeAll(seed);
}

export function getThreadsForRole(role: DashboardRole, currentUserEmail?: string): MessageThread[] {
  const local = readAll();
  const global = readGlobalEmails();
  const email = currentUserEmail?.trim().toLowerCase();

  // Combine local and global messages relevant to this user email
  const combinedMap = new Map<string, MessageThread>();

  local
    .filter((t) => t.role === role)
    .forEach((t) => combinedMap.set(t.id, t));

  if (email) {
    global.forEach((t) => {
      const rec = (t.recipientEmail || t.participant || "").toLowerCase();
      const send = (t.senderEmail || "").toLowerCase();

      if (rec === email) {
        if (t.folder === "inbox" || t.folder === "deleted") {
          combinedMap.set(t.id, { ...t, role });
        }
      } else if (send === email) {
        if (t.folder === "sent" || t.folder === "deleted") {
          combinedMap.set(t.id, { ...t, role });
        }
      }
    });
  }

  return Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getThreadById(id: string): MessageThread | undefined {
  return readAll().find((t) => t.id === id) || readGlobalEmails().find((t) => t.id === id);
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

export function markThreadRead(threadId: string) {
  writeAll(
    readAll().map((t) => (t.id === threadId ? { ...t, unread: false } : t))
  );
  writeGlobalEmails(
    readGlobalEmails().map((t) => (t.id === threadId ? { ...t, unread: false } : t))
  );
}

export function archiveThread(threadId: string) {
  writeAll(
    readAll().map((t) => (t.id === threadId ? { ...t, folder: "deleted" as const, unread: false } : t))
  );
  writeGlobalEmails(
    readGlobalEmails().map((t) =>
      t.id === threadId ? { ...t, folder: "deleted" as const, unread: false } : t
    )
  );
}

export function softDeleteThread(threadId: string) {
  archiveThread(threadId);
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
  const threads = readAll();
  const index = threads.findIndex((t) => t.id === threadId);
  const sentAt = new Date().toISOString();
  const newMsg: ThreadMessage = {
    id: `MSG-${Date.now().toString(36)}`,
    from: "me",
    fromName: senderName,
    fromEmail: senderEmail,
    body,
    sentAt,
  };

  if (index >= 0) {
    const thread = threads[index];
    const updated: MessageThread = {
      ...thread,
      updatedAt: sentAt,
      messages: [...thread.messages, newMsg],
    };
    const next = [...threads];
    next[index] = updated;
    writeAll(next);

    // Cross-deliver reply to recipient
    if (thread.recipientEmail || thread.participant) {
      const recipientEmail = (thread.recipientEmail || thread.participant).trim().toLowerCase();
      const globalEmails = readGlobalEmails();
      const replyInboxThread: MessageThread = {
        id: `IN-${Date.now().toString().slice(-6)}`,
        role: "user",
        participant: senderName || senderEmail || "Sender",
        senderEmail,
        recipientEmail,
        subject: thread.subject.startsWith("Re: ") ? thread.subject : `Re: ${thread.subject}`,
        project: thread.project,
        unread: true,
        updatedAt: sentAt,
        folder: "inbox",
        messages: [
          {
            id: `MSG-${Date.now().toString(36)}-R`,
            from: "them",
            fromName: senderName,
            fromEmail: senderEmail,
            body,
            sentAt,
          },
        ],
      };
      writeGlobalEmails([replyInboxThread, ...globalEmails]);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("platform_new_email", {
            detail: {
              threadId: replyInboxThread.id,
              recipientEmail,
              senderName,
              senderEmail,
              subject: replyInboxThread.subject,
              sentAt,
            },
          })
        );
      }
    }

    return updated;
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
