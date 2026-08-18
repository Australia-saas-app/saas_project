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
  senderBusiness?: string;
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

  // Also include project application threads (TH-*) for both user and business roles
  global.forEach((t) => {
    if (t.id.startsWith("TH-")) {
      combinedMap.set(t.id, { ...t, role });
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
    if (input.initialDraft && (!existing.messages || existing.messages.length === 0) && !existing.draftBody) {
      existing.draftBody = input.initialDraft;
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
    recipientBusiness: input.applicantBusiness || "",
    recipientEmail: input.applicantEmail || "",
    senderName: input.clientName || "Client",
    senderEmail: input.clientEmail || "",
    subject: `Project Application: ${input.projectName}`,
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

