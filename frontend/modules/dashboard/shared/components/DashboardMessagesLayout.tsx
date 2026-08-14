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
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/src/context/user.provider";
import { useNotifications } from "@/src/shared/context/notification.provider";
import {
  archiveThread,
  getOrCreateProjectThread,
  getThreadsForRole,
  markThreadRead,
  saveDraftThread,
  sendComposedMessage,
  sendThreadMessage,
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
 * Same day: "11:06 AM" / "11:06 PM"
 * Older / Another day: "Aug 14, 2026"
 */
function formatMessageTimestamp(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const now = new Date();
  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (isSameDay) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

  const currentUserEmail = user?.email || "";

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

  const refresh = () => setThreads(getThreadsForRole(role, currentUserEmail));

  useEffect(() => {
    refresh();
  }, [role, currentUserEmail]);

  // Restore persisted message on login / mount for this user
  useEffect(() => {
    if (typeof window === "undefined" || !currentUserEmail) {
      setSelectedId(null);
      return;
    }
    const savedId = sessionStorage.getItem(`active_msg_${currentUserEmail.toLowerCase()}`);
    if (savedId) {
      setSelectedId(savedId);
    }
  }, [currentUserEmail]);

  // Handle URL param thread selection
  useEffect(() => {
    if (!threadParam) return;
    let thread = getThreadsForRole(role, currentUserEmail).find((t) => t.id === threadParam);
    if (!thread && threadParam.startsWith("TH-")) {
      const projectId = threadParam.replace(/^TH-/, "");
      thread = getOrCreateProjectThread({
        role,
        projectId,
        projectName: projectId,
        participant: "Project team",
      });
    }
    if (thread) {
      setFolder((thread.folder as MessageFolder) ?? "inbox");
      setSelectedId(thread.id);
      if (typeof window !== "undefined" && currentUserEmail) {
        sessionStorage.setItem(`active_msg_${currentUserEmail.toLowerCase()}`, thread.id);
      }
      markThreadRead(thread.id);
      refresh();
    }
  }, [threadParam, role, currentUserEmail]);

  // Listen for real-time incoming emails on the platform
  useEffect(() => {
    function handleIncomingEmail(event: Event) {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      if (!detail) return;

      const normalizedRec = (detail.recipientEmail || "").trim().toLowerCase();
      const normalizedCurrent = (currentUserEmail || "").trim().toLowerCase();

      if (normalizedCurrent && normalizedRec === normalizedCurrent) {
        refresh();
        toast("You received a new message", {
          description: `From: ${detail.senderName || detail.senderEmail} — "${detail.subject}"`,
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
  }, [currentUserEmail]);

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
  const selected = selectedId ? filtered.find((t) => t.id === selectedId) ?? null : null;

  const openThread = (id: string) => {
    const thread = threads.find((t) => t.id === id);
    setSelectedId(id);
    if (typeof window !== "undefined" && currentUserEmail) {
      sessionStorage.setItem(`active_msg_${currentUserEmail.toLowerCase()}`, id);
    }

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
    refresh();
  };

  const handleCloseSelectedMessage = () => {
    setSelectedId(null);
    if (typeof window !== "undefined" && currentUserEmail) {
      sessionStorage.removeItem(`active_msg_${currentUserEmail.toLowerCase()}`);
    }
  };

  const handleSendReply = async () => {
    if (!selected || !draft.trim()) {
      toast.error("Enter a reply before sending.");
      return;
    }
    sendThreadMessage(
      selected.id,
      draft.trim(),
      getDisplayName(user),
      currentUserEmail
    );
    setDraft("");
    refresh();
    toast.success("Reply sent successfully.");
  };

  const handleArchive = () => {
    if (!selected) return;
    archiveThread(selected.id);
    handleCloseSelectedMessage();
    refresh();
    toast.success("Moved to Deleted.");
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
      const recKey = `app_notifs_${recipientEmail.toLowerCase()}`;
      const existingRaw = typeof window !== "undefined" ? localStorage.getItem(recKey) : null;
      const existingNotifs = existingRaw ? JSON.parse(existingRaw) : [];
      const newReceiverNotif = {
        id: `email-notif-${Date.now()}`,
        title: `New Email from ${getDisplayName(user)}`,
        message: composeSubject.trim() || "You received a new message.",
        time: "Just now",
        read: false,
        href: `/dashboard/user/messages`,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(recKey, JSON.stringify([newReceiverNotif, ...existingNotifs].slice(0, 50)));
      }
    } catch {
      // ignore
    }

    // Trigger local notification for sender
    if (notify) {
      notify({
        title: "Email Sent Successfully",
        message: `Delivered to ${recipientName} (${recipientEmail}): "${composeSubject.trim()}"`,
        href: `/dashboard/user/messages`,
      });
    }

    setIsSending(false);
    setComposeOpen(false);
    setSelectedRecipient(null);
    setRecipientQuery("");
    setComposeSubject("");
    setComposeBody("");
    setEditingDraftId(undefined);
    setFolder("sent");
    refresh();
    toast.success(`Email message sent to ${recipientName} (${recipientEmail})!`, {
      description: `Subject: "${composeSubject.trim()}"`,
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 min-h-[560px]">
          {/* Left Column: Email Thread List */}
          <div className="lg:col-span-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col overflow-hidden">
            {/* Search & Filter Bar */}
            <div className="p-3 border-b border-border space-y-2 bg-muted/20">
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

                  // Resolve Primary Full Name & Secondary Email according to Folder
                  let primaryFullName = "";
                  let secondaryEmail = "";

                  if (isSentFolder) {
                    // Sent folder: Receiver's Full Name and Receiver's Email
                    primaryFullName =
                      t.recipientName ||
                      resolveContactFullName(t.recipientEmail, t.participant) ||
                      t.participant ||
                      "Recipient";
                    secondaryEmail = t.recipientEmail || "";
                  } else if (isDraftFolder) {
                    // Drafts folder: Receiver's Full Name and Email
                    primaryFullName =
                      t.recipientName ||
                      resolveContactFullName(t.recipientEmail, t.participant) ||
                      t.participant ||
                      "Draft";
                    secondaryEmail = t.recipientEmail || "";
                  } else {
                    // Inbox / Deleted / Other: Sender's Full Name and Sender's Email
                    primaryFullName =
                      t.senderName ||
                      t.messages[0]?.fromName ||
                      resolveContactFullName(t.senderEmail, t.participant) ||
                      t.participant ||
                      "Sender";
                    secondaryEmail = t.senderEmail || t.messages[0]?.fromEmail || "";
                  }

                  const formattedTime = formatMessageTimestamp(t.updatedAt);

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openThread(t.id)}
                      className={`w-full text-left p-3.5 transition-all flex flex-col gap-1 cursor-pointer relative ${
                        isSelected
                          ? "bg-primary/10 border-l-4 border-primary"
                          : t.unread
                          ? "bg-primary/5 dark:bg-primary/10 border-l-4 border-blue-500 font-bold hover:bg-primary/10"
                          : "hover:bg-muted/30 opacity-90 hover:opacity-100"
                      }`}
                    >
                      {/* Row Header: Full Name and Right-Side Time/Date */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {t.unread && (
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 ring-2 ring-blue-500/30 animate-pulse"
                              title="Unread"
                            />
                          )}
                          <span
                            className={`text-xs truncate ${
                              t.unread ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                            }`}
                          >
                            {primaryFullName}
                          </span>
                        </div>

                        {/* Right side timestamp: Same day -> 11:06 AM / Next day -> Aug 14, 2026 */}
                        <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap shrink-0">
                          {formattedTime}
                        </span>
                      </div>

                      {/* Row Line 2: Email of sender (Inbox) or receiver (Sent) */}
                      {secondaryEmail && (
                        <p className="text-[11px] text-muted-foreground truncate font-normal leading-tight">
                          {secondaryEmail}
                        </p>
                      )}

                      {/* Row Line 3: Subject of message */}
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          t.unread ? "font-semibold text-foreground" : "font-normal text-foreground/80"
                        }`}
                      >
                        {t.subject || "(No subject)"}
                      </p>

                      {/* Badges */}
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t.project}
                        </span>
                        {isDraftFolder && (
                          <span className="rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[9px] font-bold">
                            Draft
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected Email Conversation View */}
          <div className="lg:col-span-7 rounded-2xl border border-border bg-card shadow-xs flex flex-col overflow-hidden min-h-[500px]">
            {selected ? (
              <div className="flex flex-col h-full">
                {/* Conversation Header */}
                <div className="p-5 border-b border-border bg-muted/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <h2 className="text-base font-bold text-foreground truncate">{selected.subject}</h2>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {selected.folder === "sent"
                            ? (selected.recipientName || selected.participant)
                            : (selected.senderName || selected.participant)}
                        </span>
                        {(selected.senderEmail || selected.recipientEmail) && (
                          <span className="text-primary font-medium">
                            &lt;{selected.folder === "sent" ? selected.recipientEmail : (selected.senderEmail || selected.participant)}&gt;
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(selected.updatedAt).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        <span>•</span>
                        <Link
                          href={`${technicalHref}?id=${selected.projectId || selected.project}`}
                          className="text-primary hover:underline font-semibold"
                        >
                          {selected.project}
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleArchive}
                        className="text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                      
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
                    const isMe = m.from === "me";
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
                          <span className="text-[10px] text-muted-foreground">
                            {formatMessageTimestamp(m.sentAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-foreground font-normal">{m.body}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Form */}
                <div className="border-t border-border p-4 bg-muted/10">
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      placeholder={labels.writeMessage}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none font-normal"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleSendReply}
                        disabled={!draft.trim()}
                        className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl cursor-pointer"
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Send Reply
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
