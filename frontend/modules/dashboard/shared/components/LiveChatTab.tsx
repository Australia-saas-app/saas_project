"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Check,
  CheckCheck,
  Phone,
  Video,
  User,
  ShieldCheck,
  Circle,
  Plus,
  Loader2,
  Wifi,
  Sparkles,
  UserPlus,
  X,
  MessageCircle,
  Trash2,
  UserCheck,
  Inbox,
} from "lucide-react";
import { useUser } from "@/src/context/user.provider";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import {
  getAllLiveChatContacts,
  readLiveChatMessages,
  writeLiveChatMessages,
  deleteLiveChatContact,
  sendLiveChatRequest,
  cancelLiveChatRequest,
  acceptLiveChatRequest,
  rejectLiveChatRequest,
  getPendingIncomingRequests,
  getOutgoingRequestStatus,
  syncLiveChatFromDb,
  setUserOnlineStatus,
  type LiveChatContact,
  type LiveChatMessage,
  type LiveChatRequest,
} from "@/src/shared/lib/live-chat-store";
import {
  getAllRegisteredContacts,
  resolveContactFullName,
  searchRegisteredContacts,
  type RegisteredContact,
} from "@/src/shared/lib/contacts-store";
import { type DashboardRole } from "@/src/shared/lib/messages-store";
import { getChatSocketUrl } from "@/src/shared/lib/chat-client";

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function LiveChatTab({ role }: { role?: DashboardRole } = {}) {
  const { user } = useUser();
  const currentUserEmail = user?.email || "";
  const currentUserId = user?.id || "my-user";
  const currentUserName =
    ("fullName" in (user || {}) && (user as any).fullName) ||
    ("firstName" in (user || {}) && (user as any).firstName) ||
    resolveContactFullName(currentUserEmail) ||
    "You";

  // Connection State & Animation
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Contacts & Chat state
  const [contacts, setContacts] = useState<LiveChatContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [typingContacts, setTypingContacts] = useState<Record<string, boolean>>({});

  // Manual Add / Search User Dropdown State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addUserQuery, setAddUserQuery] = useState("");
  const addUserDropdownRef = useRef<HTMLDivElement>(null);

  // Incoming Requests Dropdown State
  const [incomingRequests, setIncomingRequests] = useState<LiveChatRequest[]>([]);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [requestsSearchQuery, setRequestsSearchQuery] = useState("");
  const requestsDropdownRef = useRef<HTMLDivElement>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const [messagesStore, setMessagesStore] = useState<Record<string, LiveChatMessage[]>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // 1. Initial Connection Animation & WebSocket Room Setup
  useEffect(() => {
    setIsConnecting(true);
    setIsConnected(false);

    const timer = setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
    }, 750);

    // Initialize cross-tab BroadcastChannel for instant local room sync
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("platform_live_chat_rooms");
        broadcastChannelRef.current = bc;

        bc.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === "NEW_MESSAGE") {
            handleReceiveLiveMessage(payload);
          } else if (type === "TYPING_STATUS") {
            if (payload?.contactId) {
              setTypingContacts((prev) => ({
                ...prev,
                [payload.contactId]: Boolean(payload.isTyping),
              }));
            }
          } else if (type === "USER_PRESENCE") {
            syncLiveChatFromDb(currentUserEmail).then(reloadContacts);
          } else if (
            type === "NEW_REQUEST" ||
            type === "REQUEST_ACCEPTED" ||
            type === "REQUEST_REJECTED" ||
            type === "REQUEST_CANCELLED"
          ) {
            reloadRequests();
            reloadContacts();
            setRequestVersion((v) => v + 1);
          } else if (type === "CHAT_DELETED") {
            reloadContacts();
          }
        };
      } catch {
        // ignore
      }
    }

    // Connect to NestJS WebSocket /chat gateway if backend is active
    const socketUrl = getChatSocketUrl();
    if (socketUrl) {
      try {
        const socket = io(`${socketUrl}/chat`, {
          transports: ["websocket", "polling"],
          reconnectionAttempts: 5,
          timeout: 4000,
        });

        socket.on("connect", () => {
          setSocketConnected(true);
        });

        socket.on("disconnect", () => {
          setSocketConnected(false);
        });

        socket.on("message:new", (data: any) => {
          handleReceiveLiveMessage({
            contactId: data.conversationId || selectedContactId,
            message: {
              id: data.id || `msg-${Date.now()}`,
              senderId: data.senderId,
              senderName: data.senderName || "Contact",
              senderEmail: data.senderEmail,
              content: data.content || data.body,
              sentAt: data.sentAt || new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
              timestamp: Date.now(),
              status: "seen",
            },
          });
        });

        socket.on("typing:status", (data: any) => {
          if (data?.conversationId) {
            setTypingContacts((prev) => ({
              ...prev,
              [data.conversationId]: Boolean(data.isTyping),
            }));
          }
        });

        socketRef.current = socket;
      } catch {
        // fallback to broadcast channel
      }
    }

    return () => {
      clearTimeout(timer);
      broadcastChannelRef.current?.close();
      socketRef.current?.disconnect();
    };
  }, []);

  // 2. Room Join when selected contact changes
  useEffect(() => {
    if (!selectedContactId) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit("join:conversation", {
        conversationId: selectedContactId,
      });
    }

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("leave:conversation", {
          conversationId: selectedContactId,
        });
      }
    };
  }, [selectedContactId]);

  // Handle incoming message from websocket / broadcast channel
  const handleReceiveLiveMessage = (payload: {
    contactId: string;
    message: LiveChatMessage;
  }) => {
    const { contactId, message } = payload;
    if (!contactId || !message) return;

    // Save into messages store
    setMessagesStore((prev) => {
      const existing = prev[contactId] || [];
      if (existing.some((m) => m.id === message.id)) return prev;
      const next = { ...prev, [contactId]: [...existing, message] };
      writeLiveChatMessages(next);
      return next;
    });

    // Persist to Database API
    if (typeof window !== "undefined") {
      fetch("/api/live-chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, message }),
      }).catch(() => null);
    }

    // Update contacts list in sidebar
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === contactId) {
          const isCurrentlyOpen = contactId === selectedContactId;
          return {
            ...c,
            lastMessage: message.content,
            lastMessageTime: message.sentAt,
            unreadCount: isCurrentlyOpen ? 0 : (c.unreadCount || 0) + 1,
          };
        }
        return c;
      })
    );
  };

  // 3. Load Contacts, Requests, and Messages from Store & DB
  const reloadContacts = () => {
    const loadedContacts = getAllLiveChatContacts(currentUserEmail);
    const loadedMessages = readLiveChatMessages();

    setContacts(loadedContacts);
    setMessagesStore(loadedMessages);

    // Keep selectedContactId if it still exists in loadedContacts, but DO NOT auto-select anything by default!
    if (selectedContactId && !loadedContacts.some((c) => c.id === selectedContactId)) {
      setSelectedContactId("");
    }
  };

  const reloadRequests = () => {
    if (currentUserEmail) {
      setIncomingRequests(getPendingIncomingRequests(currentUserEmail));
    }
  };

  useEffect(() => {
    if (currentUserEmail) {
      setUserOnlineStatus(currentUserEmail, true);
      try {
        broadcastChannelRef.current?.postMessage({
          type: "USER_PRESENCE",
          payload: { email: currentUserEmail, isOnline: true },
        });
      } catch {}
    }

    syncLiveChatFromDb(currentUserEmail).then(() => {
      reloadContacts();
      reloadRequests();
    });
  }, [currentUserEmail, requestVersion]);

  // Delete a conversation for this user only (one-sided delete)
  const handleDeleteChat = (contactId: string, contactName: string) => {
    deleteLiveChatContact(contactId, currentUserEmail);
    if (selectedContactId === contactId) {
      setSelectedContactId("");
    }
    reloadContacts();
    toast.success(`Conversation with ${contactName} deleted`);
    try {
      broadcastChannelRef.current?.postMessage({
        type: "CHAT_DELETED",
        payload: { contactId, userEmail: currentUserEmail },
      });
    } catch {
      // ignore
    }
  };

  // Click outside listener for Dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        addUserDropdownRef.current &&
        !addUserDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAddUserOpen(false);
      }
      if (
        requestsDropdownRef.current &&
        !requestsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRequestsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered contacts in sidebar
  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Available users to add manually
  const searchableUsers = useMemo(() => {
    if (!addUserQuery.trim()) {
      return getAllRegisteredContacts().filter(
        (c) => c.email.toLowerCase() !== currentUserEmail.toLowerCase()
      );
    }
    return searchRegisteredContacts(addUserQuery.trim()).filter(
      (c) => c.email.toLowerCase() !== currentUserEmail.toLowerCase()
    );
  }, [addUserQuery, currentUserEmail]);

  // Filtered incoming requests for dropdown
  const filteredIncomingRequests = useMemo(() => {
    if (!requestsSearchQuery.trim()) return incomingRequests;
    const q = requestsSearchQuery.toLowerCase();
    return incomingRequests.filter(
      (r) =>
        r.senderName.toLowerCase().includes(q) ||
        r.senderEmail.toLowerCase().includes(q)
    );
  }, [incomingRequests, requestsSearchQuery]);

  // Selected contact object (null when nothing is selected)
  const selectedContact = useMemo(() => {
    if (!selectedContactId) return null;
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  // Active messages for the selected contact
  const activeMessages = useMemo(() => {
    if (!selectedContact) return [];
    return messagesStore[selectedContact.id] || [];
  }, [messagesStore, selectedContact]);

  const isOtherTyping = Boolean(selectedContactId && typingContacts[selectedContactId]);

  // Auto-scroll on new messages or typing
  useEffect(() => {
    if (selectedContact) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeMessages, isOtherTyping, selectedContactId, selectedContact]);

  // Selecting a contact marks messages as read & clears unread count
  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);

    // Clear unread count for this contact
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, unreadCount: 0 } : c))
    );

    // Mark messages as seen in store
    setMessagesStore((prev) => {
      const contactMsgs = prev[contactId] || [];
      const updatedMsgs = contactMsgs.map((m) =>
        m.status !== "seen" ? { ...m, status: "seen" as const } : m
      );
      const next = { ...prev, [contactId]: updatedMsgs };
      writeLiveChatMessages(next);
      return next;
    });

    // Mark as read in Database API
    if (typeof window !== "undefined") {
      fetch("/api/live-chat/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      }).catch(() => null);

      window.dispatchEvent(new CustomEvent("platform_live_chat_unread_changed"));
      try {
        broadcastChannelRef.current?.postMessage({
          type: "CHAT_READ",
          payload: { contactId, userEmail: currentUserEmail },
        });
      } catch {}
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit("message:read", {
        conversationId: contactId,
        userId: currentUserId,
      });
    }
  };

  // Send a Live Chat Request to another user
  const handleSendRequest = (targetUser: RegisteredContact) => {
    const req = sendLiveChatRequest(
      {
        email: currentUserEmail,
        name: currentUserName,
        role: role || (user as any)?.role || "User",
        avatar: (user as any)?.avatar,
      },
      {
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        avatar: targetUser.avatar,
      }
    );

    reloadRequests();
    setRequestVersion((v) => v + 1);
    toast.success(`Live Chat Request has been sent successfully to ${targetUser.name}`);

    try {
      broadcastChannelRef.current?.postMessage({
        type: "NEW_REQUEST",
        payload: req,
      });
    } catch {
      // ignore
    }
  };

  // Cancel a pending outgoing request
  const handleCancelRequest = (targetUser: RegisteredContact) => {
    cancelLiveChatRequest(currentUserEmail, targetUser.email);
    reloadRequests();
    setRequestVersion((v) => v + 1);
    toast.info(`Request to ${targetUser.name} cancelled`);

    try {
      broadcastChannelRef.current?.postMessage({
        type: "REQUEST_CANCELLED",
        payload: { senderEmail: currentUserEmail, receiverEmail: targetUser.email },
      });
    } catch {
      // ignore
    }
  };

  // Accept incoming live chat request
  const handleAcceptRequest = (req: LiveChatRequest) => {
    const accepted = acceptLiveChatRequest(req.id, currentUserEmail);
    reloadRequests();
    reloadContacts();
    setRequestVersion((v) => v + 1);
    setIsRequestsOpen(false);
    toast.success(`You Accepted Request. Now you can chat with ${req.senderName}`);

    if (accepted) {
      const newContactId = `contact-${req.senderEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      setSelectedContactId(newContactId);
    }

    try {
      broadcastChannelRef.current?.postMessage({
        type: "REQUEST_ACCEPTED",
        payload: req,
      });
    } catch {
      // ignore
    }
  };

  // Reject incoming live chat request
  const handleRejectRequest = (req: LiveChatRequest) => {
    rejectLiveChatRequest(req.id, currentUserEmail);
    reloadRequests();
    setRequestVersion((v) => v + 1);
    toast.info(`Request from ${req.senderName} rejected`);

    try {
      broadcastChannelRef.current?.postMessage({
        type: "REQUEST_REJECTED",
        payload: req,
      });
    } catch {
      // ignore
    }
  };

  // Sending a Message
  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedContact) return;
    const currentContact = selectedContact;

    const sentContent = inputText.trim();
    const sentTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const newMsg: LiveChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUserId,
      senderName: currentUserName,
      senderEmail: currentUserEmail,
      content: sentContent,
      sentAt: sentTime,
      timestamp: Date.now(),
      status: "sent", // Single tick
    };

    // Update messages store
    const updatedContactMsgs = [...(messagesStore[currentContact.id] || []), newMsg];
    const newStore = {
      ...messagesStore,
      [currentContact.id]: updatedContactMsgs,
    };
    setMessagesStore(newStore);
    writeLiveChatMessages(newStore);

    // Persist sent message to Database API
    if (typeof window !== "undefined") {
      fetch("/api/live-chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: currentContact.id, message: newMsg }),
      }).catch(() => null);
    }

    // Emit to WebSocket room if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit("message:send", {
        conversationId: currentContact.id,
        content: sentContent,
      });
    }

    // Broadcast across browser tabs
    broadcastChannelRef.current?.postMessage({
      type: "NEW_MESSAGE",
      payload: {
        contactId: currentContact.id,
        message: newMsg,
      },
    });

    // Update contact's last message in the left sidebar
    setContacts((prev) =>
      prev.map((c) =>
        c.id === currentContact.id
          ? {
              ...c,
              lastMessage: `You: ${sentContent}`,
              lastMessageTime: sentTime,
            }
          : c
      )
    );

    setInputText("");

    // Simulate WhatsApp Double Gray Tick (Delivered) after 450ms
    setTimeout(() => {
      setMessagesStore((prev) => {
        const msgs = (prev[currentContact.id] || []).map((m) =>
          m.id === newMsg.id ? { ...m, status: "delivered" as const } : m
        );
        const next = { ...prev, [currentContact.id]: msgs };
        writeLiveChatMessages(next);
        return next;
      });
    }, 450);

    // Simulate WhatsApp Double Blue Tick (Seen) after 1000ms
    setTimeout(() => {
      setMessagesStore((prev) => {
        const msgs = (prev[currentContact.id] || []).map((m) =>
          m.id === newMsg.id ? { ...m, status: "seen" as const } : m
        );
        const next = { ...prev, [currentContact.id]: msgs };
        writeLiveChatMessages(next);
        return next;
      });
    }, 1000);

    // Simulate Receiver typing and replying (e.g. "Hello")
    if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setTypingContacts((prev) => ({ ...prev, [currentContact.id]: true }));
      broadcastChannelRef.current?.postMessage({
        type: "TYPING_STATUS",
        payload: { contactId: currentContact.id, isTyping: true },
      });
    }, 1000);

    // 2. Reply delivered after 3.2s
    replyTimeoutRef.current = setTimeout(() => {
      setTypingContacts((prev) => ({ ...prev, [currentContact.id]: false }));
      broadcastChannelRef.current?.postMessage({
        type: "TYPING_STATUS",
        payload: { contactId: currentContact.id, isTyping: false },
      });

      const replyContent =
        sentContent.toLowerCase() === "hi" || sentContent.toLowerCase() === "hey"
          ? "Hello! How can I help you today?"
          : sentContent.toLowerCase().includes("hello")
          ? "Hello! Nice to connect with you. How are you doing?"
          : `Thanks for your message: "${sentContent}". I received it and will follow up shortly!`;

      const replyTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const replyMsg: LiveChatMessage = {
        id: `reply-${Date.now()}`,
        senderId: currentContact.id,
        senderName: currentContact.name,
        senderEmail: currentContact.email,
        content: replyContent,
        sentAt: replyTime,
        timestamp: Date.now(),
        status: "seen",
      };

      setMessagesStore((prev) => {
        const msgs = [...(prev[currentContact.id] || []), replyMsg];
        const next = { ...prev, [currentContact.id]: msgs };
        writeLiveChatMessages(next);
        return next;
      });

      // Persist reply message to Database API
      if (typeof window !== "undefined") {
        fetch("/api/live-chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: currentContact.id, message: replyMsg }),
        }).catch(() => null);
      }

      // Update sidebar contact subtext to the receiver's latest message
      setContacts((prev) =>
        prev.map((c) =>
          c.id === currentContact.id
            ? {
                ...c,
                lastMessage: replyContent,
                lastMessageTime: replyTime,
              }
            : c
        )
      );
    }, 3200);
  };

  return (
    <div className="relative flex h-[640px] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      {/* Connecting Animation Overlay */}
      {isConnecting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-all duration-300">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-500/10 border border-blue-500/20 shadow-2xl">
            <Wifi className="h-10 w-10 text-blue-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500" />
            </span>
          </div>

          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            Connecting to Live Chat
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.3s]" />
            </span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Establishing secure encrypted WebSocket connection &amp; joining room...
          </p>

          {/* Animated Connecting Signal Boxes */}
          <div className="mt-6 flex items-center gap-2">
            <div className="h-2 w-8 rounded-full bg-blue-500 animate-pulse" />
            <div className="h-2 w-8 rounded-full bg-blue-400 animate-pulse [animation-delay:0.2s]" />
            <div className="h-2 w-8 rounded-full bg-blue-300 animate-pulse [animation-delay:0.4s]" />
            <div className="h-2 w-8 rounded-full bg-blue-200 animate-pulse [animation-delay:0.6s]" />
          </div>
        </div>
      )}

      {/* Left Sidebar - Contacts & Conversations List */}
      <div className="flex w-80 shrink-0 flex-col border-r border-border bg-muted/15 relative">
        {/* Sidebar Header with Live Chats, Add User, and Requests Buttons */}
        <div className="border-b border-border p-3.5 bg-card relative z-30">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">Live Chats</h3>
              <span className="rounded-md bg-primary/10 text-primary px-1.5 py-0.2 text-[10px] font-extrabold">
                {contacts.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Add User Button */}
              <button
                type="button"
                onClick={() => {
                  setIsAddUserOpen(!isAddUserOpen);
                  setIsRequestsOpen(false);
                }}
                className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 ${
                  isAddUserOpen
                    ? "bg-primary text-white"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
                title="Search and add users"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>

              {/* Requests Button with Badge */}
              <button
                type="button"
                onClick={() => {
                  setIsRequestsOpen(!isRequestsOpen);
                  setIsAddUserOpen(false);
                }}
                className={`relative flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 ${
                  isRequestsOpen
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20"
                }`}
                title="View live chat requests"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Requests</span>
                {incomingRequests.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-white animate-pulse">
                    {incomingRequests.length}
                  </span>
                )}
              </button>

              {/* Live Badge */}
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full shadow-xs">
                <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500 animate-pulse" /> Live
              </span>
            </div>
          </div>

          {/* Search Contacts in sidebar */}
          <div className="relative mt-2.5">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-all"
            />
          </div>

          {/* 1. Add User Search Modal/Dropdown (Solid high z-index, zero overlap) */}
          {isAddUserOpen && (
            <div
              ref={addUserDropdownRef}
              className="absolute left-2 right-2 top-full mt-2 z-[100] rounded-2xl border border-border bg-card dark:bg-slate-900 shadow-2xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10 animate-in fade-in slide-in-from-top-2 duration-150"
              style={{ backgroundColor: "var(--card)" }}
            >
              <div className="p-3 bg-muted/60 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-primary" /> Search &amp; Add Users
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-2.5 border-b border-border bg-background">
                <input
                  type="text"
                  placeholder="Type name or email to search users..."
                  value={addUserQuery}
                  onChange={(e) => setAddUserQuery(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="max-h-60 overflow-y-auto min-h-0 divide-y divide-border/50 bg-card [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                {searchableUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    {addUserQuery.trim() ? "No matching users found" : "Type a name or email above to search"}
                  </div>
                ) : (
                  searchableUsers.map((u) => {
                    const status = getOutgoingRequestStatus(currentUserEmail, u.email);

                    return (
                      <div
                        key={u.id + u.email}
                        className="p-2.5 flex items-center justify-between hover:bg-muted/40 transition-colors gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-border">
                            {getInitials(u.name || u.email)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {u.name}
                              </p>
                              <span className="shrink-0 rounded bg-muted px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground">
                                {u.role || "User"}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {u.email}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {status === "accepted" ? (
                            <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              Chat Active
                            </span>
                          ) : status === "pending" ? (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(u)}
                              className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all cursor-pointer active:scale-95"
                              title="Click to cancel request"
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSendRequest(u)}
                              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-primary/90 transition-all cursor-pointer active:scale-95"
                              title="Send live chat request"
                            >
                              <Plus className="h-3 w-3" /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 2. Requests Modal/Dropdown (Solid high z-index, zero overlap) */}
          {isRequestsOpen && (
            <div
              ref={requestsDropdownRef}
              className="absolute left-2 right-2 top-full mt-2 z-[100] rounded-2xl border border-border bg-card dark:bg-slate-900 shadow-2xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10 animate-in fade-in slide-in-from-top-2 duration-150"
              style={{ backgroundColor: "var(--card)" }}
            >
              <div className="p-3 bg-muted/60 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-indigo-500" /> Incoming Chat Requests
                  {incomingRequests.length > 0 && (
                    <span className="rounded-full bg-red-500 text-white px-1.5 py-0.2 text-[9px] font-extrabold">
                      {incomingRequests.length}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setIsRequestsOpen(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-2.5 border-b border-border bg-background">
                <input
                  type="text"
                  placeholder="Filter requests..."
                  value={requestsSearchQuery}
                  onChange={(e) => setRequestsSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="max-h-60 overflow-y-auto min-h-0 divide-y divide-border/50 bg-card [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredIncomingRequests.length === 0 ? (
                  <div className="p-5 text-center text-xs text-muted-foreground">
                    <UserCheck className="mx-auto h-7 w-7 opacity-30 mb-1.5" />
                    <p className="font-semibold">No pending requests</p>
                    <p className="text-[10px] mt-0.5">When other users send you chat requests, they appear here.</p>
                  </div>
                ) : (
                  filteredIncomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 flex flex-col gap-2 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-border">
                            {getInitials(req.senderName || req.senderEmail)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-foreground truncate">
                                {req.senderName}
                              </p>
                              <span className="shrink-0 rounded bg-muted px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground">
                                {req.senderRole || "User"}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {req.senderEmail}
                            </p>
                          </div>
                        </div>

                        <span className="text-[9px] text-muted-foreground font-medium shrink-0">
                          {req.formattedDate}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(req)}
                          className="rounded-lg bg-muted hover:bg-red-500/15 hover:text-red-600 px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-all cursor-pointer active:scale-95"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(req)}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white shadow-xs transition-all cursor-pointer active:scale-95"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Contacts List with visible scrollbar when overflowing */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/40 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 dark:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 transition-all">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <User className="mx-auto h-8 w-8 opacity-30 mb-2" />
              <p className="text-xs font-semibold">No active conversations</p>
              <p className="text-[11px] mt-0.5">Start a message or click &quot;+ New&quot; to begin a chat.</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact ? selectedContact.id === contact.id : false;
              const hasUnread = (contact.unreadCount || 0) > 0;
              const isSupport = contact.id === "support-team";
              const isThisContactTyping = Boolean(typingContacts[contact.id]);

              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleSelectContact(contact.id)}
                  className={`group flex w-full items-center gap-3 p-3.5 text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-primary/10 border-l-4 border-primary shadow-xs"
                      : hasUnread
                      ? "bg-primary/5 hover:bg-primary/10 border-l-3 border-primary"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {/* Clean Circle Avatar with Initials */}
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-border bg-primary/10 shadow-xs flex items-center justify-center">
                      {isSupport ? (
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      ) : contact.avatar ? (
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-primary">
                          {getInitials(contact.name || contact.email)}
                        </span>
                      )}
                    </div>

                    {contact.status === "online" && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                    )}
                  </div>

                  {/* Name and Subtext (Latest Message / "Chat not started yet" / "typing ...") */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`truncate text-xs ${hasUnread ? "font-extrabold text-foreground" : "font-bold text-foreground"}`}>
                        {contact.name}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {contact.lastMessageTime && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {contact.lastMessageTime}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(contact.id, contact.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-1 rounded-lg hover:bg-red-500/10 transition-all text-muted-foreground cursor-pointer shrink-0"
                          title="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0">
                      {isThisContactTyping ? (
                        <div className="flex items-center gap-1 text-emerald-500 font-semibold text-[11px] leading-tight">
                          <span>typing</span>
                          <span className="inline-flex gap-0.5 items-center">
                            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce" />
                            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.15s]" />
                            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.3s]" />
                          </span>
                        </div>
                      ) : (
                        <p
                          className={`truncate text-[11px] leading-tight ${
                            hasUnread
                              ? "font-bold text-foreground"
                              : contact.lastMessage === "Chat not started yet"
                              ? "text-muted-foreground/70 italic"
                              : "text-muted-foreground"
                          }`}
                        >
                          {contact.lastMessage || "Chat not started yet"}
                        </p>
                      )}

                      {/* Unread Count Badge */}
                      {hasUnread && !isThisContactTyping && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-white shadow-xs animate-scale-in">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Main Chat Window */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {!selectedContact ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-8 bg-muted/5 select-none">
            <div className="h-20 w-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary shadow-xs">
              <MessageCircle className="h-10 w-10 opacity-70" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Select a conversation</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">
              Choose a contact from the left list to view or start real-time messaging.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header with Avatar Photo, Full Name, and Online/Typing Status */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5 bg-card/80 backdrop-blur-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-border bg-primary/10 shadow-xs flex items-center justify-center">
                    {selectedContact.id === "support-team" ? (
                      <ShieldCheck className="h-5 w-5 text-primary" />
                    ) : selectedContact.avatar ? (
                      <img
                        src={selectedContact.avatar}
                        alt={selectedContact.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-primary">
                        {getInitials(selectedContact.name || selectedContact.email)}
                      </span>
                    )}
                  </div>

                  {selectedContact.status === "online" && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {selectedContact.name}
                  </p>

                  <div className="text-[11px] font-medium transition-all">
                    {isOtherTyping ? (
                      <div className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
                        <span>typing</span>
                        <span className="inline-flex gap-0.5 items-center">
                          <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce" />
                          <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.15s]" />
                          <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.3s]" />
                        </span>
                      </div>
                    ) : selectedContact.status === "online" ? (
                      <span className="text-emerald-500 font-medium flex items-center gap-1.5">
                        <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" /> Online • Active now
                      </span>
                    ) : (
                      <span className="text-muted-foreground/80 font-normal flex items-center gap-1.5">
                        <Circle className="h-2 w-2 fill-slate-400 text-slate-400" /> Offline • {selectedContact.lastSeen || "Last seen recently"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <button
                  type="button"
                  onClick={() => toast.info(`Starting voice call with ${selectedContact.name}...`)}
                  className="rounded-lg p-2 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  title="Voice Call"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toast.info(`Starting video call with ${selectedContact.name}...`)}
                  className="rounded-lg p-2 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  title="Video Call"
                >
                  <Video className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteChat(selectedContact.id, selectedContact.name)}
                  className="rounded-lg p-2 hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer text-muted-foreground"
                  title="Delete Conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Stream with visible scrollbar when overflowing */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 bg-muted/10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 dark:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 transition-all">
              {activeMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center p-8 text-muted-foreground">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Sparkles className="h-8 w-8 text-primary opacity-60" />
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    Start conversation with {selectedContact.name}
                  </p>
                  <p className="text-xs mt-1 max-w-sm">
                    Send a message below to start chatting in real-time.
                  </p>
                </div>
              ) : (
                activeMessages.map((msg) => {
                  const isMe = msg.senderId === currentUserId || msg.senderEmail === currentUserEmail;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-xs transition-all ${
                          isMe
                            ? "bg-primary text-white rounded-br-xs"
                            : "bg-card border border-border text-foreground rounded-bl-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            isMe ? "text-white/80" : "text-muted-foreground"
                          }`}
                        >
                          <span>{msg.sentAt}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing Indicator Bubble */}
              {isOtherTyping && (
                <div className="flex items-start animate-fade-in">
                  <div className="rounded-2xl rounded-bl-xs bg-card border border-border px-3 py-1.5 text-xs text-muted-foreground shadow-xs flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-500 text-[11px]">
                      typing
                    </span>
                    <span className="inline-flex gap-0.5 items-center">
                      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce" />
                      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.15s]" />
                      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.3s]" />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Bar */}
            <div className="border-t border-border p-3 bg-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => toast.info("Attachments enabled")}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  title="Attach File"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInputText(val);
                    if (selectedContact) {
                      try {
                        broadcastChannelRef.current?.postMessage({
                          type: "TYPING_STATUS",
                          payload: {
                            contactId: selectedContact.id,
                            isTyping: Boolean(val.trim()),
                            senderEmail: currentUserEmail,
                          },
                        });
                        if (socketRef.current?.connected) {
                          socketRef.current.emit("typing:status", {
                            conversationId: selectedContact.id,
                            isTyping: Boolean(val.trim()),
                          });
                        }
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  placeholder={`Message ${selectedContact.name}...`}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />

                <Button
                  type="submit"
                  disabled={!inputText.trim()}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-4 cursor-pointer gap-1.5 shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
