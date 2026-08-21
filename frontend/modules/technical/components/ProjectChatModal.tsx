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
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { useUser } from "@/src/context/user.provider";
import { io, Socket } from "socket.io-client";
import {
  fetchProjectMessages,
  sendProjectMessage,
} from "../services/technical.services";

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
    assignedBusinessName?: string;
    assignedBusinessId?: string;
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
  const currentUserName =
    user && ("name" in user || "firstName" in user || "businessName" in user)
      ? (user as any).businessName ||
        (user as any).name ||
        `${(user as any).firstName || ""} ${(user as any).lastName || ""}`.trim() ||
        "Me"
      : "Me";

  const isClient = project.clientId === currentUserId;
  const otherPartyName = isClient
    ? project.assignedBusinessName || "Assigned Business Developer"
    : project.clientName || "Project Client";

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isOtherOnline, setIsOtherOnline] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRoom = `project_${project.projectId}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load existing persistent messages from PostgreSQL DB
  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchProjectMessages(project.projectId);
      if (Array.isArray(data)) {
        const formatted = data.map((m: any) => ({
          ...m,
          status: "seen" as const, // Historical messages loaded from DB are already seen
        }));
        setMessages(formatted);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [project.projectId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOtherTyping]);

  // Real-time WebSocket connection
  useEffect(() => {
    const wsUrl = getWsUrl();
    const socket = io(`${wsUrl}/chat`, {
      transports: ["websocket", "polling"],
      query: {
        userId: currentUserId,
        role: isClient ? "user" : "business",
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:conversation", { conversationId: conversationRoom });
    });

    // Receive real-time new message instantly without delay
    socket.on("message:new", (newMsg: any) => {
      if (newMsg.senderId !== currentUserId) {
        setMessages((prev) => [
          ...prev,
          {
            id: newMsg.id || Date.now(),
            projectId: project.projectId,
            senderId: newMsg.senderId,
            senderName: newMsg.senderName || otherPartyName,
            content: newMsg.content || newMsg.message,
            createdAt: newMsg.createdAt || new Date().toISOString(),
            status: "seen",
          },
        ]);
        // Emit seen event to sender
        socket.emit("message:seen", {
          conversationId: conversationRoom,
          seenBy: currentUserId,
        });
      }
    });

    // Real-time Typing Indicator
    socket.on("typing:status", (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== currentUserId) {
        setIsOtherTyping(data.isTyping);
      }
    });

    // Real-time Seen status (turns ticks BLUE)
    socket.on("message:seen", (data: { seenBy: string }) => {
      if (data.seenBy !== currentUserId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === currentUserId ? { ...msg, status: "seen" } : msg
          )
        );
      }
    });

    // Real-time Delivery status (turns single tick to DOUBLE GREY)
    socket.on("message:delivered", (data: { deliveredTo: string }) => {
      if (data.deliveredTo !== currentUserId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.senderId === currentUserId && msg.status === "sent"
              ? { ...msg, status: "delivered" }
              : msg
          )
        );
      }
    });

    return () => {
      socket.emit("leave:conversation", { conversationId: conversationRoom });
      socket.disconnect();
    };
  }, [conversationRoom, currentUserId, isClient, otherPartyName, project.projectId]);

  // Handle typing notification
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

    // Immediately stop typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit("typing:stop", {
      conversationId: conversationRoom,
      userId: currentUserId,
    });

    // 1. Instant local optimistic render (Single Tick 'sent')
    const tempId = `msg_${Date.now()}`;
    const tempMsg: MessageItem = {
      id: tempId,
      projectId: project.projectId,
      senderId: currentUserId,
      senderName: currentUserName,
      messageType: "general",
      content: text,
      createdAt: new Date().toISOString(),
      status: "sent",
    };

    setMessages((prev) => [...prev, tempMsg]);
    setInputText("");
    setSending(true);

    // 2. Emit instantly via WebSocket with zero delay
    socketRef.current?.emit("message:send", {
      conversationId: conversationRoom,
      content: text,
      senderId: currentUserId,
      senderName: currentUserName,
    });

    // Simulate instant delivery acknowledgement (Double grey tick)
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId && m.status === "sent" ? { ...m, status: "delivered" } : m
        )
      );
    }, 400);

    // 3. Persist to PostgreSQL database in parallel
    try {
      await sendProjectMessage(project.projectId, text, "general");
    } catch {
      // if DB write fails, keep optimistic message
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

  // Render WhatsApp tick icon
  const renderMessageTicks = (_status?: "sent" | "delivered" | "seen") => {
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* WhatsApp Top Bar */}
        <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-bold shadow-inner">
              {isClient ? (
                <Building2 className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground truncate max-w-[180px] sm:max-w-xs text-sm sm:text-base">
                  {otherPartyName}
                </h3>
              </div>

              {/* Real-time Subtitle / Typing indicator */}
              {isOtherTyping ? (
                <p className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5 animate-pulse">
                  <span>typing</span>
                  <span className="flex gap-0.5">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce" />
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground truncate max-w-[220px] sm:max-w-md flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{project.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    ({project.currency || "USD"}{" "}
                    {Number(project.adminBudget || project.price || 0).toLocaleString()})
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground bg-card border border-border px-2.5 py-1 rounded-lg">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Escrow Protected
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* WhatsApp Chat Conversation Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-gradient-to-b from-muted/20 via-background to-muted/10">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Briefcase className="h-8 w-8" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Start real-time discussion for &quot;{project.title}&quot;
              </p>
              <p className="text-xs max-w-sm">
                Chat directly with {otherPartyName}. Instant delivery with read receipts and typing status.
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-center my-2">
                <span className="rounded-full bg-muted/80 border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-xs">
                  🔒 Live encrypted project channel • Direct Client &amp; Business chat
                </span>
              </div>

              {messages.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                const time = msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                if (msg.messageType === "system") {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-3 py-1 text-xs text-amber-800 dark:text-amber-300">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isMine && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                        {(msg.senderName || "U").charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div
                      className={`relative max-w-[85%] sm:max-w-md rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-card border border-border text-foreground rounded-bl-none"
                      }`}
                    >
                      {!isMine && (
                        <p className="mb-1 text-[11px] font-bold text-primary">
                          {msg.senderName}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>
                      <div
                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                          isMine ? "text-primary-foreground/75" : "text-muted-foreground"
                        }`}
                      >
                        <span>{time}</span>
                        {isMine && renderMessageTicks(msg.status)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing Bubble */}
              {isOtherTyping && (
                <div className="flex items-end gap-2 justify-start animate-fade-in">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                    {otherPartyName.charAt(0).toUpperCase()}
                  </div>
                  <div className="rounded-2xl rounded-bl-none border border-border bg-card px-4 py-3 shadow-xs">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.2s]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* WhatsApp Bottom Input Box */}
        <form
          onSubmit={handleSend}
          className="border-t border-border bg-card p-3 sm:p-4 flex items-end gap-2"
        >
          <div className="flex-1 rounded-xl border border-border bg-muted/30 focus-within:border-primary focus-within:bg-card focus-within:ring-1 focus-within:ring-primary/20 transition-all flex items-center px-3 py-1.5">
            <textarea
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none max-h-28 py-1.5"
            />
          </div>

          <Button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="h-10 w-10 shrink-0 rounded-xl bg-primary p-0 hover:bg-primary/90 text-primary-foreground shadow-sm transition-transform active:scale-95"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
