"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Mail,
  MailOpen,
  Send,
  PenSquare,
  Inbox,
  FileText,
  Trash2,
  MessageCircle,
  X,
  Loader2,
  Maximize2,
  Minimize2,
  Paperclip,
  Reply,
  Clock,
  User,
  ArrowLeft,
  CheckCircle2,
  CheckCheck,
  Check,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/src/context/user.provider";
import { useNotifications } from "@/src/shared/context/notification.provider";
import {
  archiveThread,
  permanentlyDeleteThread,
  getOrCreateApplicationThread,
  getOrCreateProjectThread,
  getThreadsForRole,
  markThreadRead,
  saveDraftThread,
  sendComposedMessage,
  sendThreadMessage,
  syncMongoDBThreads,
  type DashboardRole,
  type MessageFolder,
  type MessageThread,
} from "@/src/shared/lib/messages-store";
import {
  getAllRegisteredContacts,
  resolveContactFullName,
  saveCustomContact,
  searchRegisteredContacts,
  type RegisteredContact,
} from "@/src/shared/lib/contacts-store";
import { io, Socket } from "socket.io-client";
import { fetchProjectMessages, fetchUserThreads, sendProjectMessage } from "@/src/modules/technical/services/technical.services";
import { Button } from "@/src/components/ui/button";
import { LiveChatTab } from "./LiveChatTab";

interface DashboardMessagesLayoutProps {
  role: DashboardRole;
  title: string;
  subtitle: string;
  labels: {
    total: string;
    unread: string;
    search: string;
    unreadOnly: string;
    from: string;
    project: string;
    reply: string;
    archive: string;
    selectMessage: string;
    send: string;
    writeMessage: string;
  };
  technicalHref: string;
}

const FOLDERS: { id: MessageFolder; label: string; icon: typeof Inbox }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "sent", label: "Sent", icon: Send },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "deleted", label: "Deleted", icon: Trash2 },
  { id: "live", label: "Live chat", icon: MessageCircle },
];

function getDisplayName(user: ReturnType<typeof useUser>["user"]) {
  if (!user) return "You";
  if ("fullName" in user && (user as any).fullName) return (user as any).fullName;
  if ("firstName" in user && user.firstName) {
    return `${user.firstName} ${"lastName" in user && user.lastName ? user.lastName : ""}`.trim();
  }
  if ("name" in user && user.name) return user.name;
  if ("email" in user && user.email) return user.email;
  return "You";
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Format message timestamps:
 * Under 1 min: "Just now"
 * Under 1 hour: "1m ago", "59m ago"
 * Same day: "1:09 PM" / "1:09 AM"
 * Yesterday: "Yesterday, 1:09 PM"
 * Older / 2+ days: "Aug 20, 2026, 1:09 PM"
 */
function formatMessageTimestamp(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  // Less than 60 seconds
  if (diffSec >= 0 && diffSec < 60) {
    return "Just now";
  }

  // Less than 60 minutes
  if (diffSec >= 60 && diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins}m ago`;
  }

  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isSameDay) {
    return timeStr;
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  // 2+ days ago
  const dateFormatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${dateFormatted}, ${timeStr}`;
}

/** Component to highlight matching text anywhere (start, middle, or end) */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <span>{text}</span>;
  const q = query.trim().toLowerCase();
  const lower = text.toLowerCase();
  const index = lower.indexOf(q);
  if (index === -1) return <span>{text}</span>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);

  return (
    <span>
      {before}
      <span className="bg-primary/20 text-primary font-bold px-0.5 rounded underline decoration-primary decoration-2">
        {match}
      </span>
      {after}
    </span>
  );
}

function getChatWsUrl() {
  if (typeof window === "undefined") return "http://localhost:8000";
  const proto = window.location.protocol === "https:" ? "https:" : "http:";
  const hostname = window.location.hostname;
  return `${proto}//${hostname}:8000`;
}

export default function DashboardMessagesLayout({
  role,
  title,
  subtitle,
  labels,
  technicalHref,
}: DashboardMessagesLayoutProps) {
  const { user } = useUser();
  const { notify } = useNotifications();
  const searchParams = useSearchParams();
  const threadParam = searchParams.get("thread");
  const toNameParam = searchParams.get("toName");
  const toBsnParam = searchParams.get("toBsn");
  const toEmailParam = searchParams.get("toEmail");
  const toUserIdParam = searchParams.get("toUserId");
  const projectIdParam = searchParams.get("projectId");
  const projectTitleParam = searchParams.get("projectTitle");

  const currentUserEmail = user?.email || "";
  const socketRef = useRef<Socket | null>(null);

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [folder, setFolder] = useState<MessageFolder>("inbox");
  const [search, setSearch] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  
  // Gmail Compose States
  const [composeOpen, setComposeOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Recipient state (Single-email selection with pill)
  const [selectedRecipient, setSelectedRecipient] = useState<RegisteredContact | null>(null);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [editingDraftId, setEditingDraftId] = useState<string | undefined>();
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeletingPermanent, setIsDeletingPermanent] = useState(false);
  const [deletingThreadId, setDeletingThreadId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refresh = () => setThreads(getThreadsForRole(role, currentUserEmail));

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const dbThreads = await fetchUserThreads();
      if (Array.isArray(dbThreads) && dbThreads.length > 0) {
        syncMongoDBThreads(dbThreads, currentUserEmail);
      }
      const updated = getThreadsForRole(role, currentUserEmail);
      setThreads((prev) => (updated.length > 0 ? updated : prev));
      toast.success("Messages refreshed");
    } catch (e) {
      console.warn("Manual refresh fallback:", e);
      const updated = getThreadsForRole(role, currentUserEmail);
      setThreads((prev) => (updated.length > 0 ? updated : prev));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [role, currentUserEmail]);

  // Real-time synchronization across tabs and sessions
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("vero_channel");
        bc.onmessage = (event) => {
          if (
            event.data?.type === "vero:new_message" ||
            event.data?.type === "vero:new_notification" ||
            event.data?.type === "platform_new_email"
          ) {
            refresh();

            if (event.data?.type === "platform_new_email" && event.data.detail) {
              const detail = event.data.detail;
              const normalizedRec = (detail.recipientEmail || "").trim().toLowerCase();
              const normalizedSender = (detail.senderEmail || "").trim().toLowerCase();
              const normalizedCurrent = (currentUserEmail || "").trim().toLowerCase();

              const isSenderMe = normalizedCurrent && normalizedSender === normalizedCurrent;
              const isRecipient =
                (normalizedCurrent && normalizedRec === normalizedCurrent) ||
                (!isSenderMe && normalizedRec && normalizedRec === normalizedCurrent);

              if (isRecipient && !isSenderMe) {
                const sender = detail.senderName || detail.senderEmail || "A user";
                toast("You have received a new message", {
                  description: `From: ${sender} — "${(detail.body || detail.subject || "").slice(0, 70)}..."`,
                  action: {
                    label: "View message",
                    onClick: () => {
                      setFolder("inbox");
                      openThread(detail.threadId);
                    },
                  },
                  duration: 8000,
                });
              }
            }
          }
        };
      }
    } catch {}

    const handleSync = () => {
      refresh();
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("messages_updated", handleSync);

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("messages_updated", handleSync);
      if (bc) bc.close();
    };
  }, [role, currentUserEmail, selectedId]);

  const initializedParamRef = useRef<string | null>(null);
  const lastFetchedIdRef = useRef<string | null>(null);

  // Restore persisted message ONLY if opened during the current session (never auto-open on fresh login)
  useEffect(() => {
    if (typeof window === "undefined" || !currentUserEmail) {
      return;
    }
    if (threadParam) return;

    const savedId = sessionStorage.getItem(`active_msg_${currentUserEmail.toLowerCase()}`);
    if (savedId) {
      const thread = threads.find((t) => t.id === savedId);
      if (thread) {
        setSelectedId(savedId);
      } else {
        sessionStorage.removeItem(`active_msg_${currentUserEmail.toLowerCase()}`);
        setSelectedId(null);
      }
    } else {
      setSelectedId(null);
    }
  }, [currentUserEmail, threadParam, threads]);

  // Background fetch all conversation threads directly from MongoDB backend for this account
  useEffect(() => {
    let isMounted = true;
    const loadAllThreadsFromDB = async () => {
      try {
        const dbThreads = await fetchUserThreads();
        if (isMounted && Array.isArray(dbThreads) && dbThreads.length > 0) {
          syncMongoDBThreads(dbThreads, currentUserEmail);
          setThreads(getThreadsForRole(role, currentUserEmail));
        }
      } catch (e) {
        console.warn("Error loading user threads from DB:", e);
      }
    };

    loadAllThreadsFromDB();

    return () => {
      isMounted = false;
    };
  }, [role, currentUserEmail]);

  // Handle URL param thread selection and auto-formatted template (runs ONCE per threadParam)
  useEffect(() => {
    if (!threadParam) {
      initializedParamRef.current = null;
      return;
    }
    if (initializedParamRef.current === threadParam) return;
    initializedParamRef.current = threadParam;

    let thread = getThreadsForRole(role, currentUserEmail).find((t) => t.id === threadParam);

    const clientDisplayName = getDisplayName(user);
    const targetName = toNameParam || "Business Partner";
    const prjTitle = projectTitleParam || projectIdParam || "Project";
    const templateMessage = `Hello ${targetName},\n\nYou applied for the project "${prjTitle}". Please share your previous experience, portfolio, and estimated timeline to get started.\n\nBest regards,\n${clientDisplayName}`;

    if (!thread && threadParam.startsWith("TH-")) {
      thread = getOrCreateApplicationThread({
        threadId: threadParam,
        role,
        projectId: projectIdParam || threadParam.replace(/^TH-/, ""),
        projectName: prjTitle,
        applicantName: targetName,
        applicantBusiness: toBsnParam || undefined,
        applicantEmail: toEmailParam || undefined,
        applicantUserId: toUserIdParam || undefined,
        clientName: clientDisplayName,
        clientEmail: currentUserEmail,
        initialDraft: templateMessage,
      });
    }

    if (thread) {
      setFolder((thread.folder as MessageFolder) ?? "inbox");
      setSelectedId(thread.id);

      // Auto-prefill the message draft if no messages in thread yet
      if (!thread.messages || thread.messages.length === 0) {
        setDraft(thread.draftBody || templateMessage);
      }

      if (typeof window !== "undefined" && currentUserEmail) {
        sessionStorage.setItem(`active_msg_${currentUserEmail.toLowerCase()}`, thread.id);
      }
      markThreadRead(thread.id);
      refresh();
    }
  }, [threadParam, toNameParam, toBsnParam, toEmailParam, toUserIdParam, projectIdParam, projectTitleParam, role, currentUserEmail, user]);

  // Fetch messages directly from MongoDB backend for the active thread (runs once per selected thread)
  useEffect(() => {
    if (!selectedId) {
      lastFetchedIdRef.current = null;
      return;
    }
    if (lastFetchedIdRef.current === selectedId) return;
    lastFetchedIdRef.current = selectedId;

    const activeThread = threads.find((t) => t.id === selectedId);
    const pId = activeThread?.projectId || selectedId || activeThread?.project;
    if (!pId || pId === "Compose") return;

    let isMounted = true;
    (async () => {
      try {
        const dbMsgs = await fetchProjectMessages(pId);
        if (isMounted && Array.isArray(dbMsgs) && dbMsgs.length > 0) {
          const currentUserId = String((user as any)?.id || (user as any)?.userId || "").toLowerCase();
          const currentEmail = (currentUserEmail || "").toLowerCase();

          const formattedDbMsgs = dbMsgs.map((m: any) => {
            const senderId = String(m.senderId || m.userId || "").toLowerCase();
            const senderEmail = (m.senderEmail || m.email || "").toLowerCase();
            const isMe =
              (currentUserId && senderId === currentUserId) ||
              (currentEmail && senderEmail === currentEmail);

            return {
              id: String(m.id || m._id || Date.now()),
              from: isMe ? ("me" as const) : ("them" as const),
              fromName:
                m.senderName ||
                m.userName ||
                (isMe ? getDisplayName(user) : activeThread?.participant || "Business Partner"),
              fromEmail: m.senderEmail || m.email,
              body: m.content || m.message || m.body || "",
              sentAt: m.createdAt || m.sentAt || new Date().toISOString(),
            };
          });

          if (formattedDbMsgs.length > 0) {
            setThreads((prev) =>
              prev.map((t) => (t.id === selectedId ? { ...t, messages: formattedDbMsgs } : t))
            );
          }
        }
      } catch (err) {
        console.warn("MongoDB messages sync info:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedId, currentUserEmail, user]);

  // Listen for real-time incoming emails & messages on the platform
  useEffect(() => {
    function handleIncomingEmail(event: Event) {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      if (!detail) return;

      const normalizedRec = (detail.recipientEmail || "").trim().toLowerCase();
      const normalizedSender = (detail.senderEmail || "").trim().toLowerCase();
      const normalizedSenderName = (detail.senderName || "").trim().toLowerCase();
      const normalizedCurrent = (currentUserEmail || "").trim().toLowerCase();
      const currentDisplayName = getDisplayName(user).trim().toLowerCase();

      // STRICT CHECK: If I am the sender, NEVER show the incoming message toast to myself!
      const isSenderMe =
        (normalizedCurrent && normalizedSender === normalizedCurrent) ||
        (normalizedSenderName && normalizedSenderName === currentDisplayName);

      if (isSenderMe) {
        // Just refresh the store for the sender, do NOT trigger any incoming toast!
        refresh();
        return;
      }

      const isRecipient =
        (normalizedCurrent && normalizedRec === normalizedCurrent) ||
        (!isSenderMe && normalizedRec && normalizedRec === normalizedCurrent);

      if (isRecipient) {
        refresh();
        const sender = detail.senderName || detail.senderEmail || "A user";
        const proj = detail.project ? ` regarding "${detail.project}"` : "";
        toast("You received a new message", {
          description: `From: ${sender}${proj} — "${(detail.body || detail.subject || "").slice(0, 70)}..."`,
          action: {
            label: "View message",
            onClick: () => {
              setFolder("inbox");
              openThread(detail.threadId);
            },
          },
          duration: 8000,
        });
      }
    }

    window.addEventListener("platform_new_email", handleIncomingEmail);
    return () => window.removeEventListener("platform_new_email", handleIncomingEmail);
  }, [currentUserEmail, user]);

  // Click outside to close recipient dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        recipientInputRef.current &&
        !recipientInputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!recipientQuery.trim()) return [];
    return searchRegisteredContacts(recipientQuery.trim());
  }, [recipientQuery]);

  const folderThreads = useMemo(() => {
    return threads.filter((t) => {
      const f = (t.folder ?? "inbox") as MessageFolder;
      if (folder === "inbox") return f === "inbox";
      if (folder === "live") return f === "live";
      return f === folder;
    });
  }, [threads, folder]);

  const filtered = useMemo(() => {
    let rows = folderThreads;
    if (showUnreadOnly) rows = rows.filter((t) => t.unread);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.participant.toLowerCase().includes(q) ||
          (t.recipientName && t.recipientName.toLowerCase().includes(q)) ||
          (t.senderName && t.senderName.toLowerCase().includes(q)) ||
          (t.recipientEmail && t.recipientEmail.toLowerCase().includes(q)) ||
          (t.senderEmail && t.senderEmail.toLowerCase().includes(q)) ||
          t.project.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [folderThreads, search, showUnreadOnly]);

  // Real Counts for current active folder
  const totalCount = folderThreads.length;
  const unreadCount = folderThreads.filter((t) => t.unread).length;

  // Selected message (Strictly null if closed or unselected)
  const selected = selectedId ? threads.find((t) => t.id === selectedId) ?? null : null;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [selectedId, selected?.messages?.length]);

  const openThread = (id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined" && currentUserEmail) {
      sessionStorage.setItem(`active_msg_${currentUserEmail.toLowerCase()}`, id);
    }

    const thread = threads.find((t) => t.id === id);
    if (thread?.folder === "drafts") {
      setEditingDraftId(thread.id);
      const email = thread.recipientEmail || thread.participant || "";
      if (email) {
        const found = getAllRegisteredContacts().find(
          (c) => c.email.toLowerCase() === email.toLowerCase()
        );
        if (found) {
          setSelectedRecipient(found);
        } else {
          setSelectedRecipient({
            id: `custom-${Date.now()}`,
            name: thread.recipientName || thread.participant || resolveContactFullName(email),
            email: email,
            role: "Recipient",
          });
        }
      } else {
        setSelectedRecipient(null);
      }
      setRecipientQuery("");
      setComposeSubject(thread.subject || "");
      setComposeBody(thread.draftBody ?? "");
      setComposeOpen(true);
      return;
    }

    markThreadRead(id);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, unread: false } : t)));
  };

  const handleCloseSelectedMessage = () => {
    setSelectedId(null);
    if (typeof window !== "undefined" && currentUserEmail) {
      sessionStorage.removeItem(`active_msg_${currentUserEmail.toLowerCase()}`);
    }
  };

  const handleSendReply = async () => {
    if (!selected || !draft.trim()) {
      toast.error("Enter a message before sending.");
      return;
    }
    const messageBody = draft.trim();
    const senderDisplayName = getDisplayName(user);

    // 1. Persist directly to MongoDB backend collection ('project_messages')
    const isClientRole = role === "user";

    const recName = isClientRole
      ? selected.recipientName || selected.participant || "Business Partner"
      : selected.senderName || selected.participant || "Client";

    const recEmail = isClientRole
      ? (selected.recipientEmail || toEmailParam || (selected.recipientName ? `${selected.recipientName.toLowerCase().replace(/\s+/g, ".")}@business.com` : "")).trim().toLowerCase()
      : (selected.senderEmail || (selected.senderName ? `${selected.senderName.toLowerCase().replace(/\s+/g, ".")}@client.com` : "")).trim().toLowerCase();

    const recBusiness = isClientRole
      ? selected.recipientBusiness || "Tech"
      : "Client";

    // 1. Persist directly to MongoDB backend collection ('project_messages')
    const pId = selected.projectId || selected.id || selected.project;
    if (pId && pId !== "Compose") {
      try {
        await sendProjectMessage(pId, messageBody, "general", {
          senderName: senderDisplayName,
          senderEmail: currentUserEmail,
          recipientName: recName,
          recipientEmail: recEmail,
          recipientBusiness: recBusiness,
          recipientUserId: selected.recipientUserId || selected.participant || "",
          threadId: selected.id,
          projectTitle: selected.project || selected.projectId || "Project",
          subject: selected.subject || `Subject: Application for ${selected.project || "Project"}`,
        });
      } catch (e) {
        console.warn("MongoDB message save error:", e);
      }
    }

    // 2. Persist and cross-sync thread locally & globally
    sendThreadMessage(
      selected.id,
      messageBody,
      senderDisplayName,
      currentUserEmail
    );

    // 3. Broadcast real-time events across tabs/windows for the recipient
    try {
      if (typeof window !== "undefined") {
        const emailDetail = {
          threadId: selected.id,
          recipientEmail: recEmail,
          recipientName: recName,
          senderName: senderDisplayName,
          senderEmail: currentUserEmail,
          subject: selected.subject,
          project: selected.project,
          body: messageBody,
          sentAt: new Date().toISOString(),
        };

        window.dispatchEvent(new CustomEvent("platform_new_email", { detail: emailDetail }));

        const newReceiverNotif = {
          id: `msg-notif-${Date.now()}`,
          title: `New Message from ${senderDisplayName}`,
          message: messageBody.slice(0, 100),
          time: "Just now",
          createdAt: new Date().toISOString(),
          read: false,
          recipientEmail: recEmail,
          href: isClientRole ? `/dashboard/business/messages?thread=${selected.id}` : `/dashboard/user/messages?thread=${selected.id}`,
        };

        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("vero_channel");
          bc.postMessage({ type: "platform_new_email", detail: emailDetail });
          bc.postMessage({ type: "vero:new_notification", targetEmail: recEmail, payload: newReceiverNotif });
          bc.close();
        }

        if (recEmail) {
          const recNotifKey = `app_notifs_${recEmail}`;
          const existingRaw = localStorage.getItem(recNotifKey);
          const existingNotifs = existingRaw ? JSON.parse(existingRaw) : [];
          localStorage.setItem(recNotifKey, JSON.stringify([newReceiverNotif, ...existingNotifs].slice(0, 50)));
          localStorage.setItem("vero_notif_sync", JSON.stringify({ item: newReceiverNotif, targetEmail: recEmail, timestamp: Date.now() }));
        }
      }
    } catch {}

    setDraft("");
    refresh();
    const recipientDisplayName = selected.recipientName || selected.participant || "recipient";
    toast.success("Message Delivered Successfully", {
      description: `Delivered to ${recipientDisplayName}`,
      className: "!text-[#111] dark:!text-white font-bold",
      descriptionClassName: "!text-[#111] dark:!text-white !font-medium",
    });
  };

  const handleArchive = () => {
    if (!selected) return;
    archiveThread(selected.id, currentUserEmail);
    handleCloseSelectedMessage();
    refresh();
    toast.success("Moved to Deleted.");
  };

  const handlePermanentDelete = async (targetId?: string) => {
    const idToDelete = targetId || selected?.id;
    if (!idToDelete) return;

    setDeletingThreadId(idToDelete);
    setIsDeletingPermanent(true);
    await new Promise((r) => setTimeout(r, 500));
    permanentlyDeleteThread(idToDelete, currentUserEmail);
    if (selected?.id === idToDelete) {
      handleCloseSelectedMessage();
    }
    refresh();
    setIsDeletingPermanent(false);
    setDeletingThreadId(null);
    toast.success("Message deleted from database.");
  };

  const handleSelectContact = (contact: RegisteredContact) => {
    setSelectedRecipient(contact);
    setRecipientQuery("");
    setIsDropdownOpen(false);
  };

  const handleUseCustomQueryAsEmail = (customEmail: string) => {
    const email = customEmail.trim();
    if (!email) return;
    const name = resolveContactFullName(email);
    const contact = saveCustomContact({
      email,
      name,
      role: "User",
    });
    setSelectedRecipient(contact);
    setRecipientQuery("");
    setIsDropdownOpen(false);
  };

  const handleRemoveRecipient = () => {
    setSelectedRecipient(null);
    setRecipientQuery("");
    setTimeout(() => recipientInputRef.current?.focus(), 50);
  };

  // Gmail Style Send
  const handleComposeSend = async () => {
    const recipientEmail = (selectedRecipient?.email || recipientQuery).trim();
    if (!recipientEmail) {
      toast.error("Please add a recipient in the 'To:' field.");
      recipientInputRef.current?.focus();
      return;
    }
    if (!composeSubject.trim()) {
      toast.error("Please enter a subject.");
      return;
    }
    if (!composeBody.trim()) {
      toast.error("Please write your message body.");
      return;
    }

    const recipientName =
      selectedRecipient?.name || resolveContactFullName(recipientEmail);

    setIsSending(true);

    // If user typed query without clicking dropdown, save it
    if (!selectedRecipient && recipientEmail) {
      saveCustomContact({ email: recipientEmail, name: recipientName });
    }

    // Simulate realistic mail dispatch
    await new Promise((r) => setTimeout(r, 600));

    sendComposedMessage({
      role,
      to: recipientEmail,
      recipientName,
      subject: composeSubject.trim(),
      body: composeBody.trim(),
      senderName: getDisplayName(user),
      senderEmail: currentUserEmail,
      draftId: editingDraftId,
    });

    // Receiver local notification queuing
    try {
      const recEmail = recipientEmail.toLowerCase();
      const recKey = `app_notifs_${recEmail}`;
      const existingRaw = typeof window !== "undefined" ? localStorage.getItem(recKey) : null;
      const existingNotifs = existingRaw ? JSON.parse(existingRaw) : [];
      const newReceiverNotif = {
        id: `email-notif-${Date.now()}`,
        title: `New Email from ${getDisplayName(user)}`,
        message: composeSubject.trim() || "You received a new message.",
        time: "Just now",
        createdAt: new Date().toISOString(),
        read: false,
        recipientEmail: recEmail,
        href: `/dashboard/business/messages`,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(recKey, JSON.stringify([newReceiverNotif, ...existingNotifs].slice(0, 50)));
        localStorage.setItem("vero_notif_sync", JSON.stringify({ item: newReceiverNotif, targetEmail: recEmail, timestamp: Date.now() }));
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("vero_channel");
          bc.postMessage({ type: "vero:new_notification", targetEmail: recEmail, payload: newReceiverNotif });
          bc.close();
        }
      }
    } catch {}

    setIsSending(false);
    setComposeOpen(false);
    setSelectedRecipient(null);
    setRecipientQuery("");
    setComposeSubject("");
    setComposeBody("");
    setEditingDraftId(undefined);
    setFolder("sent");
    refresh();
    toast.success("Message Delivered Successfully", {
      description: `Delivered to ${recipientName} (${recipientEmail})`,
      className: "!text-[#111] dark:!text-white font-bold",
      descriptionClassName: "!text-[#111] dark:!text-white !font-medium",
    });
  };

  // Gmail Style Save Draft
  const handleSaveDraft = async () => {
    const recipientEmail = (selectedRecipient?.email || recipientQuery).trim();
    setIsSavingDraft(true);
    await new Promise((r) => setTimeout(r, 500));

    saveDraftThread({
      role,
      to: recipientEmail,
      subject: composeSubject.trim(),
      body: composeBody,
      senderEmail: currentUserEmail,
      threadId: editingDraftId,
    });

    setIsSavingDraft(false);
    setComposeOpen(false);
    setSelectedRecipient(null);
    setRecipientQuery("");
    setComposeSubject("");
    setComposeBody("");
    setEditingDraftId(undefined);
    setFolder("drafts");
    refresh();
    toast.success("Draft saved successfully.");
  };

  const handleOpenNewCompose = () => {
    setEditingDraftId(undefined);
    setSelectedRecipient(null);
    setRecipientQuery("");
    setComposeSubject("");
    setComposeBody("");
    setIsMinimized(false);
    setComposeOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Top Header with Title and Compose Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-card p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <Button
          type="button"
          onClick={handleOpenNewCompose}
          className="bg-primary hover:bg-primary/90 text-white font-bold shadow-sm transition-all active:scale-95 px-5 py-2.5 rounded-xl gap-2 cursor-pointer"
        >
          <PenSquare className="h-4 w-4" />
          Compose
        </Button>
      </div>

      {/* Counters Banner showing Real Total & Unread */}
      <div className="grid max-w-md grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-bold text-primary uppercase tracking-wider">{labels.total}</p>
          <p className="mt-1 text-2xl font-extrabold text-foreground">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 shadow-xs">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {labels.unread}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-blue-700 dark:text-blue-300">
            {unreadCount}
          </p>
        </div>
      </div>

      {/* Folders Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border">
        {FOLDERS.map((f) => {
          const Icon = f.icon;
          const isActive = folder === f.id;
          const count =
            f.id === "inbox"
              ? unreadCount
              : threads.filter((t) => (t.folder ?? "inbox") === f.id).length;

          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFolder(f.id);
                handleCloseSelectedMessage();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{f.label}</span>
              {count > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-muted-foreground/15 text-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Folder Content: Live Chat vs Email Client */}
      {folder === "live" ? (
        <LiveChatTab />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 h-[680px] max-h-[calc(100vh-210px)] min-h-[560px] overflow-hidden">
          {/* Left Column: Email Thread List */}
          <div className="lg:col-span-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col h-full overflow-hidden">
            {/* Search & Filter Bar with Total Chats Summary */}
            <div className="p-3 border-b border-border space-y-2.5 bg-muted/20">
              {/* Total Chats & Unread Summary Header with Refresh Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1 text-xs font-semibold border border-border shadow-xs">
                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                    <span className="font-bold text-foreground">
                      {threads.filter((t) => t.folder !== "deleted").length}
                    </span>{" "}
                    Total Chats
                  </span>
                  {threads.filter((t) => t.unread && t.folder !== "deleted").length > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 text-xs font-bold border border-blue-500/20 shadow-xs">
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      {threads.filter((t) => t.unread && t.folder !== "deleted").length} Unread
                    </span>
                  )}
                </div>

                {/* Refresh Icon Button - spins on click and updates messages from DB */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-transform"
                  title="Refresh messages from DB"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={labels.search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showUnreadOnly}
                    onChange={(e) => setShowUnreadOnly(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-0"
                  />
                  {labels.unreadOnly}
                </label>
                <span className="text-[10px] text-muted-foreground">
                  {filtered.length} conversation{filtered.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Thread Rows: Full Name, Email, Subject, Formatted Timestamp */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Inbox className="mx-auto h-8 w-8 opacity-40 mb-2" />
                  <p className="text-xs font-semibold">No messages found</p>
                  <p className="text-[11px] mt-0.5">This folder is currently empty.</p>
                </div>
              ) : (
                filtered.map((t) => {
                  const isSelected = t.id === selected?.id;
                  const isSentFolder = folder === "sent";
                  const isDraftFolder = folder === "drafts";
                  const isDeletedFolder = folder === "deleted";
                  const isUnread = t.unread && !isSelected;
                  const unreadCount = t.unread
                    ? Math.max(1, t.messages.filter((m) => m.from === "them").length)
                    : 0;

                  // Gmail Model: Always resolve the OTHER PARTY relative to the logged-in user!
                  const currentEmail = (currentUserEmail || "").trim().toLowerCase();
                  const currentName = getDisplayName(user).trim().toLowerCase();

                  const isSenderMe =
                    (t.senderEmail && t.senderEmail.toLowerCase() === currentEmail) ||
                    (t.senderName && t.senderName.toLowerCase() === currentName) ||
                    (role === "user" && t.id.startsWith("TH-"));

                  let primaryFullName = "";
                  let secondaryTag = "";

                  if (isDraftFolder) {
                    primaryFullName =
                      t.recipientName ||
                      resolveContactFullName(t.recipientEmail, t.participant) ||
                      t.participant ||
                      "Draft";
                    secondaryTag = t.recipientBusiness || "";
                  } else if (role === "user") {
                    // SENDER (Client / User) side: Shows the Receiver's Full Name from DB | Receiver Business from DB
                    primaryFullName =
                      t.recipientName ||
                      resolveContactFullName(t.recipientEmail, t.participant) ||
                      t.participant ||
                      "Business Partner";
                    secondaryTag = t.recipientBusiness || "";
                  } else {
                    // RECEIVER (Business) side: Shows the Sender's Full Name from DB | "Client"
                    primaryFullName =
                      t.senderName ||
                      t.messages[0]?.fromName ||
                      resolveContactFullName(t.senderEmail, t.participant) ||
                      t.participant ||
                      "Client";
                    secondaryTag = t.senderBusiness || "Client";
                  }

                  const formattedTime = formatMessageTimestamp(t.updatedAt);
                  const latestMsg =
                    t.messages && t.messages.length > 0
                      ? t.messages[t.messages.length - 1]?.body
                      : t.draftBody || t.subject || "No message content";
                  const previewSnippet = latestMsg.replace(/\s+/g, " ").trim();

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openThread(t.id)}
                      className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer relative ${
                        isSelected
                          ? "bg-primary/10 border-l-[3px] border-l-primary shadow-xs"
                          : isUnread
                          ? "bg-[#f0f9ff] dark:bg-white/[0.05] border-l-[3px] border-l-[#2563eb] dark:border-l-[#3b82f6] shadow-xs hover:bg-[#e0f2fe] dark:hover:bg-white/[0.08]"
                          : "border-l-[3px] border-l-transparent hover:bg-muted/30 opacity-90 hover:opacity-100"
                      }`}
                    >
                      {/* Contact Type Profile Icon / Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20 mt-0.5">
                        {getInitials(primaryFullName)}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Line 1: Full Name | Business Name (or Client Name | Client) + Timestamp & Unread Badges */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isUnread && (
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400 ring-4 ring-blue-500/20 animate-pulse"
                                title="Unread"
                              />
                            )}
                            <div className="text-xs truncate font-medium">
                              <span
                                className={
                                  isUnread
                                    ? "font-bold text-foreground"
                                    : "font-semibold text-foreground/90"
                                }
                              >
                                {primaryFullName}
                              </span>
                              {secondaryTag && secondaryTag !== primaryFullName && (
                                <span className="text-muted-foreground font-normal">
                                  {" "}| {secondaryTag}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isUnread && unreadCount > 0 && (
                              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500 px-1 text-[10px] font-bold text-white shadow-xs">
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </span>
                            )}
                            <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                              {formattedTime}
                            </span>
                            {isDeletedFolder && (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePermanentDelete(t.id);
                                }}
                                className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-500/10 cursor-pointer transition-colors inline-flex items-center"
                                title="Delete permanently from database"
                              >
                                {isDeletingPermanent && deletingThreadId === t.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Line 2: Message preview - Single row, fills space, overflows with ... */}
                        <p className={`text-xs truncate whitespace-nowrap overflow-hidden text-ellipsis mt-1 max-w-full ${isUnread ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}`}>
                          {previewSnippet}
                        </p>

                        {/* Draft indicator if applicable */}
                        {isDraftFolder && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[9px] font-bold">
                              Draft
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Email Conversation View */}
          <div className="lg:col-span-7 rounded-2xl border border-border bg-card shadow-xs flex flex-col h-full overflow-hidden">
            {selected ? (
              <div className="flex flex-col h-full">
                {/* Conversation Header */}
                <div className="p-5 border-b border-border bg-muted/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      {(() => {
                        const currentEmail = (currentUserEmail || "").trim().toLowerCase();
                        const currentName = getDisplayName(user).trim().toLowerCase();
                        const isClientRole = role === "user";

                        const displayHeaderName = isClientRole
                          ? selected.recipientName || selected.participant || "Business Partner"
                          : selected.senderName || selected.participant || "Client";

                        const displayHeaderEmail = isClientRole
                          ? selected.recipientEmail || (selected.recipientName ? `${selected.recipientName.toLowerCase().replace(/\s+/g, ".")}@business.com` : "")
                          : selected.senderEmail || (selected.senderName ? `${selected.senderName.toLowerCase().replace(/\s+/g, ".")}@client.com` : "");

                        const projectTitle = selected.project || selected.projectId || "Project";
                        const rawSubject = selected.subject || `Subject: Application for ${projectTitle}`;
                        const displaySubject = rawSubject.startsWith("Subject:")
                          ? rawSubject
                          : `Subject: ${rawSubject.replace(/^(Project Application:\s*|Application:\s*)/i, "Application for ")}`;

                        return (
                          <>
                            <h2 className="text-base font-bold text-foreground truncate">{displaySubject}</h2>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-bold text-foreground">
                                {displayHeaderName}
                              </span>
                              {displayHeaderEmail && (
                                <span className="text-primary font-medium">
                                  &lt;{displayHeaderEmail}&gt;
                                </span>
                              )}
                              <span>•</span>
                              <span>
                                {new Date(selected.updatedAt).toLocaleString([], {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </span>
                              {selected.project && (
                                <>
                                  <span>•</span>
                                  <Link
                                    href={`${technicalHref}?id=${selected.projectId || selected.project}`}
                                    className="text-primary hover:underline font-semibold"
                                  >
                                    {selected.project}
                                  </Link>
                                </>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {folder === "deleted" ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handlePermanentDelete()}
                          disabled={isDeletingPermanent}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                        >
                          {isDeletingPermanent ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                          )}
                          Delete Permanently
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleArchive}
                          className="text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      )}
                      
                      {/* Cross Button to close message display */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCloseSelectedMessage}
                        className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        title="Close message"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Messages Stream */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {selected.messages.map((m) => {
                    const currentEmail = (currentUserEmail || "").trim().toLowerCase();
                    const currentName = getDisplayName(user).trim().toLowerCase();
                    const isMe =
                      (m.fromEmail && m.fromEmail.toLowerCase() === currentEmail) ||
                      (m.fromName && m.fromName.toLowerCase() === currentName) ||
                      (m.from === "me" && (!selected.senderEmail || selected.senderEmail.toLowerCase() === currentEmail));
                    return (
                      <div
                        key={m.id}
                        className={`rounded-xl border p-4 text-xs ${
                          isMe
                            ? "border-primary/20 bg-primary/5 ml-6"
                            : "border-border bg-background mr-6"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-primary" /> {m.fromName}
                            {m.fromEmail && (
                              <span className="font-normal text-muted-foreground text-[10px]">
                                &lt;{m.fromEmail}&gt;
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span>{formatMessageTimestamp(m.sentAt)}</span>
                            {isMe && (
                              <span title="Sent & Delivered" className="inline-flex items-center">
                                <CheckCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-foreground font-normal">{m.body}</p>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Form */}
                <div className="border-t border-border p-4 bg-muted/10">
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      placeholder={labels.writeMessage}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                      className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none font-normal resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Press <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border text-[10px]">Enter</kbd> to send, <kbd className="font-mono bg-muted px-1.5 py-0.5 rounded border border-border text-[10px]">Shift+Enter</kbd> for new line
                      </span>
                      <Button
                        size="sm"
                        onClick={handleSendReply}
                        disabled={!draft.trim()}
                        className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Send Message
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <Inbox className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm font-semibold">{labels.selectMessage}</p>
                <p className="text-xs mt-1">Select an email conversation from the left to read.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gmail-Style Floating / Modal Compose Dialog */}
      {composeOpen && (
        <div className="fixed bottom-0 right-4 sm:right-10 z-50 w-full max-w-lg shadow-2xl animate-fade-in">
          <div className="overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl">
            {/* Compose Header */}
            <div className="flex items-center justify-between bg-muted px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <PenSquare className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  {editingDraftId ? "Edit Draft" : "New Message"}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="rounded p-1 text-muted-foreground hover:bg-card hover:text-foreground cursor-pointer"
                >
                  {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:bg-card hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Compose Body */}
            {!isMinimized && (
              <div className="p-4 space-y-3 bg-card">
                {/* Recipients (To:) with Search, Match Highlight, Pill Badge, and Single Email Rule */}
                <div className="relative border-b border-border pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap min-h-[34px]">
                    <span className="w-10 text-xs font-bold text-muted-foreground select-none">To:</span>

                    {selectedRecipient ? (
                      /* Pill Form with Cross Button */
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs text-foreground font-medium shadow-xs animate-in fade-in zoom-in-95 duration-150">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white uppercase">
                          {getInitials(selectedRecipient.name || selectedRecipient.email)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-primary">
                            {selectedRecipient.name || selectedRecipient.email}
                          </span>
                          {selectedRecipient.name && (
                            <span className="text-muted-foreground text-[11px]">
                              &lt;{selectedRecipient.email}&gt;
                            </span>
                          )}
                        </div>
                        {selectedRecipient.role && (
                          <span className="rounded bg-background/80 border border-border/50 px-1.5 py-0.2 text-[9px] uppercase font-bold text-muted-foreground">
                            {selectedRecipient.role}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleRemoveRecipient}
                          className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-600 transition-colors cursor-pointer"
                          title="Remove recipient"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      /* Input to search registered emails */
                      <div className="flex-1 relative">
                        <input
                          ref={recipientInputRef}
                          type="text"
                          placeholder="Type recipient name or email (e.g. ahmed...)"
                          value={recipientQuery}
                          onChange={(e) => {
                            setRecipientQuery(e.target.value);
                            setIsDropdownOpen(true);
                          }}
                          onFocus={() => {
                            if (recipientQuery.trim()) setIsDropdownOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && recipientQuery.trim()) {
                              e.preventDefault();
                              if (searchResults.length > 0) {
                                handleSelectContact(searchResults[0]);
                              } else {
                                handleUseCustomQueryAsEmail(recipientQuery);
                              }
                            }
                          }}
                          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Registered Emails Search Dropdown */}
                  {!selectedRecipient && isDropdownOpen && recipientQuery.trim() && (
                    <div
                      ref={dropdownRef}
                      className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl divide-y divide-border/60 animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                      <div className="px-3 py-1.5 bg-muted/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Registered Users &amp; Emails</span>
                        <span>
                          {searchResults.length} match{searchResults.length === 1 ? "" : "es"}
                        </span>
                      </div>

                      {searchResults.length > 0 ? (
                        searchResults.map((contact) => (
                          <button
                            key={contact.id + contact.email}
                            type="button"
                            onClick={() => handleSelectContact(contact)}
                            className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-primary/5 transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold uppercase group-hover:bg-primary group-hover:text-white transition-colors">
                                {getInitials(contact.name || contact.email)}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  <HighlightMatch text={contact.name} query={recipientQuery} />
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  <HighlightMatch text={contact.email} query={recipientQuery} />
                                </p>
                              </div>
                            </div>

                            {contact.role && (
                              <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                {contact.role}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-3.5 text-center space-y-2">
                          <p className="text-xs text-muted-foreground">
                            No registered account matching "{recipientQuery}"
                          </p>
                          <button
                            type="button"
                            onClick={() => handleUseCustomQueryAsEmail(recipientQuery)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" /> Use "{recipientQuery}" as recipient
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Subject Line - Automatic Bold Type */}
                <div className="flex items-center border-b border-border pb-2">
                  <span className="w-10 text-xs font-bold text-muted-foreground select-none">Subject:</span>
                  <input
                    type="text"
                    placeholder="Subject line"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    className="flex-1 bg-transparent text-sm font-bold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>

                {/* Email Body - Normal Weight */}
                <textarea
                  rows={8}
                  placeholder="Write your email message here..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full resize-none bg-transparent p-1 text-xs font-normal text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
                />

                {/* Footer Controls: Send, Save Draft, Trash */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleComposeSend}
                      disabled={isSending || isSavingDraft}
                      className="bg-primary hover:bg-primary/90 text-white font-bold px-5 rounded-xl text-xs shadow-xs cursor-pointer"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-1.5 h-3.5 w-3.5" /> Send
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDraft}
                      disabled={isSending || isSavingDraft}
                      className="text-xs rounded-xl cursor-pointer"
                    >
                      {isSavingDraft ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                        </>
                      ) : (
                        "Save as Draft"
                      )}
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setComposeOpen(false);
                      setSelectedRecipient(null);
                      setRecipientQuery("");
                      setComposeSubject("");
                      setComposeBody("");
                    }}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    title="Discard Draft"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
