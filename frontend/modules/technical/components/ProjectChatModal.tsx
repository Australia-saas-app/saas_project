"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  X,
  Send,
  Loader2,
  Check,
  CheckCheck,
  Briefcase,
  User,
  Building2,
  ShieldCheck,
  Circle,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { useUser } from "@/src/context/user.provider";
import { io, Socket } from "socket.io-client";
import {
  fetchProjectMessages,
  sendProjectMessage,
} from "../services/technical.services";
import {
  readLiveChatMessages,
  writeLiveChatMessages,
  addContactToLiveChat,
  type LiveChatMessage,
} from "@/src/shared/lib/live-chat-store";
import {
  getOrCreateApplicationThread,
  sendThreadMessage,
} from "@/src/shared/lib/messages-store";

interface MessageItem {
  id: number | string;
  projectId: number | string;
  senderId: string;
  senderName: string;
  messageType?: "general" | "update" | "comment" | "system";
  content: string;
  createdAt: string;
  status?: "sent" | "delivered" | "seen";
}

interface ProjectChatProps {
  project: {
    projectId: string;
    title: string;
    clientName?: string;
    clientId?: string;
    clientEmail?: string;
    assignedBusinessName?: string;
    assignedBusinessFullName?: string;
    assignedBusinessId?: string;
    assignedBusinessUserId?: string;
    assignedBusinessEmail?: string;
    submissionStatus?: string;
    adminBudget?: number;
    price?: number;
    currency?: string;
  };
  onClose: () => void;
}

const getWsUrl = (): string => {
  if (typeof window === "undefined") return "http://localhost:8000";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const kongHost = host.replace(/:8080$/, ":8000").replace(/:3000$/, ":8000").replace(/:8001$/, ":8000");
  return `${proto}://${kongHost}`;
};

export function ProjectChatModal({ project, onClose }: ProjectChatProps) {
  const { user } = useUser();
  const currentUserId =
    user && ("userId" in user || "id" in user)
      ? (user as any).userId || (user as any).id
      : "user";
  const currentUserEmail = user?.email || "";
  const currentUserName =
    user && ("name" in user || "firstName" in user || "businessName" in user)
      ? (user as any).businessName ||
        (user as any).name ||
        `${(user as any).firstName || ""} ${(user as any).lastName || ""}`.trim() ||
        "Me"
      : "Me";

  const isClient = project.clientId === currentUserId || !project.assignedBusinessId;
  const providerFullName = project.assignedBusinessFullName || "";
  const providerBsnName = project.assignedBusinessName || "";
  const providerFormattedName =
    providerFullName && providerBsnName && providerFullName !== providerBsnName
      ? `${providerFullName} | ${providerBsnName}`
      : providerFullName || providerBsnName || "Business Partner";

  const otherPartyName = isClient
    ? providerFormattedName
    : project.clientName || "Project Client";

  const rawOtherEmail = isClient
    ? project.assignedBusinessEmail || "business@saas.com"
    : project.clientEmail || "client@saas.com";
  const normalizedEmail = (rawOtherEmail || "user@saas.com").toLowerCase().trim();
  const projectChatKey = `project_${project.projectId}`;
  const contactId = `contact-prj-${project.projectId}`;

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRoom = `project_${project.projectId}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Helper to sync a message into local live-chat-store for the Messages Page (strictly per-project)
  const syncToLiveChatStore = (content: string, isFromMe: boolean) => {
    try {
      const store = readLiveChatMessages();
      const existing = store[projectChatKey] || store[contactId] || [];

      const newMsg: LiveChatMessage = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        senderId: isFromMe ? currentUserId : contactId,
        senderName: isFromMe ? currentUserName : otherPartyName,
        senderEmail: isFromMe ? currentUserEmail : normalizedEmail,
        content,
        sentAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now(),
        status: "delivered",
      };

      const updated = [...existing, newMsg];
      store[projectChatKey] = updated;
      store[contactId] = updated;
      writeLiveChatMessages(store);

      // Make sure contact is in active list with full formatted name "Hello | Tech"
      addContactToLiveChat({
        name: otherPartyName,
        email: normalizedEmail,
        role: isClient ? "Business Partner" : "Client",
      });

      // Broadcast to Messages Page tabs
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: "NEW_MESSAGE",
          payload: {
            contactId,
            message: newMsg,
          },
        });
      }
    } catch {
      // ignore
    }
  };

  // Load existing persistent messages from PostgreSQL DB & sync with Live Chat Store
  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchProjectMessages(project.projectId);
      const dbMsgs: MessageItem[] = Array.isArray(data)
        ? data.map((m: any) => ({
            id: m.id || m.messageId || `msg_${Date.now()}_${Math.random()}`,
            projectId: m.projectId,
            senderId: m.senderId || (m.isClient ? project.clientId : (project.assignedBusinessUserId || project.assignedBusinessId)) || "user",
            senderName: m.senderName || (m.isClient ? project.clientName : otherPartyName) || "User",
            messageType: m.messageType || "general",
            content: m.content || m.message || "",
            createdAt: m.createdAt || new Date().toISOString(),
            status: m.status || "seen",
          }))
        : [];

      // Read local messages strictly scoped for this specific project
      const store = readLiveChatMessages();
      const localContactMsgs = store[projectChatKey] || store[contactId] || [];

      // Merge avoiding duplicates by content & approximate time
      const merged = [...dbMsgs];
      localContactMsgs.forEach((lm) => {
        const exists = merged.some(
          (m) =>
            m.content === lm.content &&
            Math.abs(new Date(m.createdAt).getTime() - lm.timestamp) < 5000
        );
        if (!exists) {
          merged.push({
            id: lm.id,
            projectId: project.projectId,
            senderId: lm.senderId,
            senderName: lm.senderName,
            messageType: "general",
            content: lm.content,
            createdAt: new Date(lm.timestamp).toISOString(),
            status: lm.status,
          });
        }
      });

      merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(merged);
    } catch {
      // fallback to store
      const store = readLiveChatMessages();
      const localContactMsgs = store[projectChatKey] || store[contactId] || [];
      const msgs = localContactMsgs.map((lm) => ({
        id: lm.id,
        projectId: project.projectId,
        senderId: lm.senderId,
        senderName: lm.senderName,
        messageType: "general" as const,
        content: lm.content,
        createdAt: new Date(lm.timestamp).toISOString(),
        status: lm.status,
      }));
      setMessages(msgs);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [project.projectId, project.clientId, project.clientName, project.assignedBusinessUserId, project.assignedBusinessId, otherPartyName, projectChatKey, contactId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up BroadcastChannel & WebSocket
  useEffect(() => {
    // 1. Cross-tab & Cross-component BroadcastChannel
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("platform_live_chat_rooms");
        broadcastChannelRef.current = bc;

        bc.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === "NEW_MESSAGE" && (payload?.contactId === contactId || payload?.contactId === normalizedEmail)) {
            const lm = payload.message;
            setMessages((prev) => {
              if (prev.some((m) => m.content === lm.content && Math.abs(new Date(m.createdAt).getTime() - lm.timestamp) < 3000)) {
                return prev;
              }
              return [
                ...prev,
                {
                  id: lm.id || `bc_${Date.now()}`,
                  projectId: project.projectId,
                  senderId: lm.senderId,
                  senderName: lm.senderName,
                  messageType: "general",
                  content: lm.content,
                  createdAt: new Date(lm.timestamp).toISOString(),
                  status: "delivered",
                },
              ];
            });
          } else if (type === "TYPING_STATUS" && (payload?.contactId === contactId || payload?.contactId === normalizedEmail)) {
            setIsOtherTyping(Boolean(payload.isTyping));
          }
        };
      } catch {
        // ignore
      }
    }

    // 2. Socket.io
    const wsUrl = getWsUrl();
    const socket: Socket = io(wsUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.emit("join:conversation", {
      conversationId: conversationRoom,
      userId: currentUserId,
      role: isClient ? "client" : "business",
    });

    socket.on("message:received", (data: any) => {
      if (data.senderId !== currentUserId) {
        const newMsg: MessageItem = {
          id: data.id || `msg_${Date.now()}`,
          projectId: project.projectId,
          senderId: data.senderId,
          senderName: data.senderName || otherPartyName,
          content: data.content,
          createdAt: data.createdAt || new Date().toISOString(),
          status: "delivered",
        };
        setMessages((prev) => [...prev, newMsg]);

        // Sync received message into Live Chat store
        syncToLiveChatStore(data.content, false);
      }
    });

    socket.on("typing:status", (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== currentUserId) {
        setIsOtherTyping(data.isTyping);
      }
    });

    return () => {
      socket.emit("leave:conversation", { conversationId: conversationRoom });
      socket.disconnect();
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [contactId, conversationRoom, currentUserId, isClient, normalizedEmail, otherPartyName, project.projectId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    if (socketRef.current) {
      socketRef.current.emit("typing:start", {
        conversationId: conversationRoom,
        userId: currentUserId,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("typing:stop", {
          conversationId: conversationRoom,
          userId: currentUserId,
        });
      }, 1500);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit("typing:stop", {
      conversationId: conversationRoom,
      userId: currentUserId,
    });

    // 1. Instant local render
    const tempId = `msg_${Date.now()}`;
    const tempMsg: MessageItem = {
      id: tempId,
      projectId: project.projectId,
      senderId: currentUserId,
      senderName: currentUserName,
      messageType: "general",
      content: text,
      createdAt: new Date().toISOString(),
      status: "delivered",
    };

    setMessages((prev) => [...prev, tempMsg]);
    setInputText("");
    setSending(true);

    // 2. Sync to Live Chat Store & Broadcast to Messages Page
    syncToLiveChatStore(text, true);

    // Sync to Dashboard Thread Inbox & Sent matching the exact project thread
    try {
      const threadId = `TH-${project.projectId}`;

      getOrCreateApplicationThread({
        threadId,
        role: isClient ? "user" : "business",
        applicantName: providerFullName || providerBsnName || otherPartyName,
        applicantBusiness: providerBsnName,
        applicantEmail: normalizedEmail,
        applicantUserId: project.assignedBusinessUserId || project.assignedBusinessId || "",
        clientName: project.clientName || currentUserName,
        clientEmail: project.clientEmail || currentUserEmail,
        projectId: project.projectId,
        projectName: project.title,
      });

      sendThreadMessage(
        threadId,
        text,
        currentUserName,
        currentUserEmail
      );

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const veroBc = new BroadcastChannel("vero_channel");
        veroBc.postMessage({ type: "vero:new_message", detail: { projectId: project.projectId, text } });
        veroBc.close();
      }
    } catch {
      // ignore
    }

    // 3. Emit via Socket
    socketRef.current?.emit("message:send", {
      conversationId: conversationRoom,
      content: text,
      senderId: currentUserId,
      senderName: currentUserName,
    });

    // 4. Persist to DB
    try {
      await sendProjectMessage(project.projectId, text, "general");
    } catch {
      // keep optimistic
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
      {/* Compact Small Modal with explicit inline css sizing */}
      <div
        style={{
          maxWidth: "460px",
          width: "100%",
          height: "520px",
          maxHeight: "85vh",
        }}
        className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold shrink-0 border border-primary/20">
              {isClient ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-foreground truncate text-xs sm:text-sm leading-tight">
                  {otherPartyName}
                </h3>
                <span className="font-mono text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.2 rounded-md whitespace-nowrap">
                  {project.projectId}
                </span>
              </div>

              {isOtherTyping ? (
                <p className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1 animate-pulse">
                  typing...
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground truncate max-w-[240px] flex items-center gap-1 mt-0.5" title={project.title}>
                  <Briefcase className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate font-medium">{project.title}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              <ShieldCheck className="h-3 w-3 text-emerald-500" /> Live Sync
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-gradient-to-b from-muted/20 via-background to-muted/10 text-xs">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-foreground">
                Discussion for &quot;{project.title}&quot;
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs">
                Send a message to {otherPartyName}. Messages sync in real-time with the Messages page.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                const time = msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-1.5 ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`relative max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-xs leading-relaxed ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-xs"
                          : "bg-muted/70 text-foreground border border-border/80 rounded-bl-xs"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                          isMine ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        <span>{time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="border-t border-border bg-card p-2.5 flex items-center gap-2 shrink-0"
        >
          <textarea
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherPartyName}...`}
            rows={1}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none max-h-24 min-h-[36px]"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!inputText.trim() || sending}
            className="h-9 w-9 p-0 rounded-xl bg-primary hover:bg-primary/90 text-white shrink-0 cursor-pointer shadow-xs"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
