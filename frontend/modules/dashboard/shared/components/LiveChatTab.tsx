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
} from "lucide-react";
import { useUser } from "@/src/context/user.provider";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import {
  addContactToLiveChat,
  getAllLiveChatContacts,
  readLiveChatMessages,
  writeLiveChatMessages,
  type LiveChatContact,
  type LiveChatMessage,
} from "@/src/shared/lib/live-chat-store";
import {
  getAllRegisteredContacts,
  resolveContactFullName,
  searchRegisteredContacts,
  type RegisteredContact,
} from "@/src/shared/lib/contacts-store";
import { getChatSocketUrl } from "@/src/shared/lib/chat-client";

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function LiveChatTab() {
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
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  // Manual Add / Search User Dropdown State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addUserQuery, setAddUserQuery] = useState("");
  const addUserDropdownRef = useRef<HTMLDivElement>(null);

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
            if (payload.contactId === selectedContactId) {
              setIsOtherTyping(payload.isTyping);
            }
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
          if (data.conversationId === selectedContactId) {
            setIsOtherTyping(Boolean(data.isTyping));
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

  // 3. Load Contacts and Messages from Store
  const reloadContacts = () => {
    const loadedContacts = getAllLiveChatContacts(currentUserEmail);
    const loadedMessages = readLiveChatMessages();

    setContacts(loadedContacts);
    setMessagesStore(loadedMessages);

    if (loadedContacts.length > 0 && !selectedContactId) {
      setSelectedContactId(loadedContacts[0].id);
    }
  };

  useEffect(() => {
    reloadContacts();
  }, [currentUserEmail]);

  // Click outside listener for Add User dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        addUserDropdownRef.current &&
        !addUserDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAddUserOpen(false);
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

  // Selected contact object
  const selectedContact = useMemo(() => {
    return (
      contacts.find((c) => c.id === selectedContactId) ||
      contacts[0] || {
        id: "support-team",
        name: "Customer Support & Escrow",
        email: "support@saas.com",
        status: "online" as const,
        unreadCount: 0,
        lastMessage: "Chat not started yet",
      }
    );
  }, [contacts, selectedContactId]);

  // Active messages for the selected contact
  const activeMessages = useMemo(() => {
    return messagesStore[selectedContact.id] || [];
  }, [messagesStore, selectedContact.id]);

  // Auto-scroll on new messages or typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, isOtherTyping, selectedContactId]);

  // Selecting a contact marks messages as read & clears unread count (WhatsApp style)
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

    if (socketRef.current?.connected) {
      socketRef.current.emit("message:read", {
        conversationId: contactId,
        userId: currentUserId,
      });
    }
  };

  // Manually select and start a chat with a user
  const handleAddAndOpenUser = (userContact: RegisteredContact) => {
    const newChatContact = addContactToLiveChat({
      email: userContact.email,
      name: userContact.name,
      role: userContact.role,
      avatar: userContact.avatar,
    });

    setIsAddUserOpen(false);
    setAddUserQuery("");
    reloadContacts();
    handleSelectContact(newChatContact.id);
    toast.success(`Chat started with ${newChatContact.name}`);
  };

  // Sending a Message
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

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
    const updatedContactMsgs = [...(messagesStore[selectedContact.id] || []), newMsg];
    const newStore = {
      ...messagesStore,
      [selectedContact.id]: updatedContactMsgs,
    };
    setMessagesStore(newStore);
    writeLiveChatMessages(newStore);

    // Emit to WebSocket room if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit("message:send", {
        conversationId: selectedContact.id,
        content: sentContent,
      });
    }

    // Broadcast across browser tabs
    broadcastChannelRef.current?.postMessage({
      type: "NEW_MESSAGE",
      payload: {
        contactId: selectedContact.id,
        message: newMsg,
      },
    });

    // Update contact's last message in the left sidebar
    setContacts((prev) =>
      prev.map((c) =>
        c.id === selectedContact.id
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
        const msgs = (prev[selectedContact.id] || []).map((m) =>
          m.id === newMsg.id ? { ...m, status: "delivered" as const } : m
        );
        const next = { ...prev, [selectedContact.id]: msgs };
        writeLiveChatMessages(next);
        return next;
      });
    }, 450);

    // Simulate WhatsApp Double Blue Tick (Seen) after 1000ms
    setTimeout(() => {
      setMessagesStore((prev) => {
        const msgs = (prev[selectedContact.id] || []).map((m) =>
          m.id === newMsg.id ? { ...m, status: "seen" as const } : m
        );
        const next = { ...prev, [selectedContact.id]: msgs };
        writeLiveChatMessages(next);
        return next;
      });
    }, 1000);

    // Simulate Receiver typing and replying (e.g. "Hello")
    if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsOtherTyping(true);
      broadcastChannelRef.current?.postMessage({
        type: "TYPING_STATUS",
        payload: { contactId: selectedContact.id, isTyping: true },
      });
    }, 1500);

    replyTimeoutRef.current = setTimeout(() => {
      setIsOtherTyping(false);
      broadcastChannelRef.current?.postMessage({
        type: "TYPING_STATUS",
        payload: { contactId: selectedContact.id, isTyping: false },
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
        senderId: selectedContact.id,
        senderName: selectedContact.name,
        senderEmail: selectedContact.email,
        content: replyContent,
        sentAt: replyTime,
        timestamp: Date.now(),
        status: "seen",
      };

      setMessagesStore((prev) => {
        const msgs = [...(prev[selectedContact.id] || []), replyMsg];
        const next = { ...prev, [selectedContact.id]: msgs };
        writeLiveChatMessages(next);
        return next;
      });

      // Update sidebar contact subtext to the receiver's latest message ("Hello")
      setContacts((prev) =>
        prev.map((c) =>
          c.id === selectedContact.id
            ? {
                ...c,
                lastMessage: replyContent,
                lastMessageTime: replyTime,
              }
            : c
        )
      );
    }, 3400);
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
      <div className="flex w-80 shrink-0 flex-col border-r border-border bg-muted/15">
        {/* Sidebar Header with Live Chats & New Chat Button */}
        <div className="border-b border-border p-4 bg-card/80 backdrop-blur-xs relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Live Chats</h3>
              <span className="rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-extrabold">
                {contacts.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Manual Add / Start New Chat Button */}
              <button
                type="button"
                onClick={() => setIsAddUserOpen(!isAddUserOpen)}
                className="flex items-center gap-1 text-[11px] font-bold bg-primary text-white hover:bg-primary/90 px-2.5 py-1 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                title="Start a new chat"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>

              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-xs">
                <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" /> Live
              </span>
            </div>
          </div>

          {/* Search Contacts in sidebar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-all"
            />
          </div>

          {/* Manual Add User Search Modal/Dropdown */}
          {isAddUserOpen && (
            <div
              ref={addUserDropdownRef}
              className="absolute left-3 right-3 top-full mt-2 z-50 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-primary" /> Start Chat with User
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-2 border-b border-border">
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={addUserQuery}
                  onChange={(e) => setAddUserQuery(e.target.value)}
                  autoFocus
                  className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-border/50">
                {searchableUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No matching users found
                  </div>
                ) : (
                  searchableUsers.map((u) => (
                    <button
                      key={u.id + u.email}
                      type="button"
                      onClick={() => handleAddAndOpenUser(u)}
                      className="w-full text-left p-2.5 flex items-center justify-between hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                          {getInitials(u.name || u.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {u.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {u.email}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                        {u.role || "User"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/40">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <User className="mx-auto h-8 w-8 opacity-30 mb-2" />
              <p className="text-xs font-semibold">No contacts found</p>
              <p className="text-[11px] mt-0.5">Compose an email or click "+ New" to add a user.</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContact.id === contact.id;
              const hasUnread = (contact.unreadCount || 0) > 0;
              const isSupport = contact.id === "support-team";

              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleSelectContact(contact.id)}
                  className={`flex w-full items-center gap-3 p-3.5 text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-primary/10 border-l-4 border-primary shadow-xs"
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

                  {/* Name and Subtext (Latest Message / "Chat not started yet") */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-bold text-foreground">
                        {contact.name}
                      </p>
                      {contact.lastMessageTime && (
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                          {contact.lastMessageTime}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-0.5">
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

                      {/* Red Unread Count Badge (WhatsApp Style) */}
                      {hasUnread && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-extrabold text-white shadow-xs animate-scale-in">
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

              <p className="text-[11px] font-medium transition-all">
                {isOtherTyping ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    typing
                    <span className="inline-flex gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.15s]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.3s]" />
                    </span>
                  </span>
                ) : selectedContact.status === "online" ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Online • Active now</span>
                ) : (
                  <span className="text-muted-foreground">Offline</span>
                )}
              </p>
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
          </div>
        </div>

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
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

                      {/* WhatsApp Ticks Status (Single -> Double Grey -> Double Blue) */}
                      {isMe && (
                        <span
                          className="inline-flex items-center"
                          title={
                            msg.status === "sent"
                              ? "Sent"
                              : msg.status === "delivered"
                              ? "Delivered"
                              : "Seen"
                          }
                        >
                          {msg.status === "sent" ? (
                            <Check className="h-3 w-3 text-white/70" />
                          ) : msg.status === "delivered" ? (
                            <CheckCheck className="h-3.5 w-3.5 text-white/70" />
                          ) : (
                            <CheckCheck className="h-3.5 w-3.5 text-sky-300 font-extrabold" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator Bubble */}
          {isOtherTyping && (
            <div className="flex items-start animate-fade-in">
              <div className="rounded-2xl rounded-bl-xs bg-card border border-border px-3.5 py-2 text-xs text-muted-foreground shadow-xs flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {selectedContact.name.split(" ")[0]} is typing
                </span>
                <span className="inline-flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.3s]" />
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
              onChange={(e) => setInputText(e.target.value)}
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
      </div>
    </div>
  );
}
