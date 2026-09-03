"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { useUser } from "@/src/context/user.provider";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import {
  getAllLiveChatContacts,
  readLiveChatMessages,
  writeLiveChatMessages,
  deleteLiveChatContact,
  unDeleteLiveChatContact,
  getLiveChatClearedTimestamp,
  sendLiveChatRequest,
  cancelLiveChatRequest,
  acceptLiveChatRequest,
  rejectLiveChatRequest,
  dispatchLiveChatNotification,
  getPendingIncomingRequests,
  getOutgoingRequestStatus,
  syncLiveChatFromDb,
  setUserOnlineStatus,
  formatLastSeen,
  readLiveChatPresence,
  type LiveChatContact,
  type LiveChatMessage,
  type LiveChatRequest,
} from "@/src/shared/lib/live-chat-store";
import {
  getAllRegisteredContacts,
  resolveContactFullName,
  searchRegisteredContacts,
  fetchRegisteredContactsFromDB,
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

interface LiveChatTabProps {
  role?: DashboardRole;
  onExitLiveChat?: () => void;
}

export function LiveChatTab({ role, onExitLiveChat }: LiveChatTabProps = {}) {
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
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const handleExitClick = () => {
    setIsDisconnecting(true);
    setTimeout(() => {
      setIsDisconnecting(false);
      onExitLiveChat?.();
    }, 600);
  };

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

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef<number>(0);
  const prevContactIdRef = useRef<string>("");
  const isUserScrolledUpRef = useRef<boolean>(false);
  const replyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const selectedContactIdRef = useRef<string>("");
  const selectedContactRef = useRef<LiveChatContact | null>(null);
  const initialConnectedRef = useRef(false);

  // 3. Load Contacts, Requests, and Messages from Store & DB
  const reloadContacts = useCallback(() => {
    const loadedContacts = getAllLiveChatContacts(currentUserEmail);
    const loadedMessages = readLiveChatMessages();

    setContacts(loadedContacts);
    setMessagesStore(loadedMessages);

    // Keep selectedContactId if it still exists in loadedContacts, without changing reloadContacts identity
    setSelectedContactId((currentId) => {
      if (currentId && !loadedContacts.some((c) => c.id === currentId)) {
        return "";
      }
      return currentId;
    });
  }, [currentUserEmail]);

  const reloadRequests = useCallback(() => {
    const reqs = getPendingIncomingRequests(currentUserEmail);
    setIncomingRequests(reqs);
  }, [currentUserEmail]);

  const searchParams = useSearchParams();
  const contactParam = searchParams?.get("contact") || searchParams?.get("contactId");

  // Keep refs in sync for event listeners and timeouts
  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
    selectedContactRef.current = contacts.find((c) => c.id === selectedContactId) || null;
  }, [selectedContactId, contacts]);

  // Auto-select contact when directed from Messages Bell or URL query
  useEffect(() => {
    if (contactParam && contacts.length > 0) {
      const match = contacts.find(
        (c) =>
          c.id === contactParam ||
          (c.email && c.email.toLowerCase() === contactParam.toLowerCase()) ||
          c.id.includes(contactParam)
      );
      if (match) {
        setSelectedContactId(match.id);
      }
    }
  }, [contactParam, contacts]);

  // 1. Initial Connection Animation & Full DB Sync Preload (runs once on mount)
  useEffect(() => {
    let isMounted = true;
    
    // Only show connecting once on initial mount
    if (!initialConnectedRef.current) {
      setIsConnecting(true);
      setIsConnected(false);
    }

    // Pre-populate with local cache immediately
    reloadContacts();
    reloadRequests();

    const connectAndFetch = async () => {
      try {
        // Wait until all conversations, messages, requests, and contacts are fully fetched from DB
        await Promise.all([
          syncLiveChatFromDb(currentUserEmail).catch(() => null),
          fetchRegisteredContactsFromDB().catch(() => null),
          !initialConnectedRef.current ? new Promise((r) => setTimeout(r, 600)) : Promise.resolve(),
        ]);
      } catch {
        // fallback safely
      } finally {
        if (isMounted) {
          reloadContacts();
          reloadRequests();
          initialConnectedRef.current = true;
          setIsConnecting(false);
          setIsConnected(true);
        }
      }
    };

    connectAndFetch();

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
            const senderClean = (payload?.senderEmail || "").toLowerCase().trim();
            const myClean = (currentUserEmail || "").toLowerCase().trim();
            const receiverClean = (payload?.receiverEmail || "").toLowerCase().trim();

            if (senderClean && myClean && senderClean === myClean) {
              return;
            }

            if (receiverClean && myClean && receiverClean !== myClean) {
              return;
            }

            const isTyping = Boolean(payload?.isTyping);
            const targetContactId = senderClean
              ? `contact-${senderClean.replace(/[^a-zA-Z0-9]/g, "_")}`
              : payload?.contactId;

            setTypingContacts((prev) => ({
              ...prev,
              ...(targetContactId ? { [targetContactId]: isTyping } : {}),
              ...(payload?.contactId ? { [payload.contactId]: isTyping } : {}),
              ...(senderClean ? { [senderClean]: isTyping } : {}),
            }));
          } else if (type === "MESSAGES_DELIVERED") {
            const senderClean = (payload?.senderEmail || "").toLowerCase().trim();
            const receiverClean = (payload?.receiverEmail || "").toLowerCase().trim();
            const myClean = (currentUserEmail || "").toLowerCase().trim();

            if ((senderClean && senderClean === myClean) || (receiverClean && receiverClean !== myClean)) {
              const contactId = payload?.contactId;
              const msgId = payload?.messageId;
              setMessagesStore((prev) => {
                const next = { ...prev };
                let modified = false;
                Object.keys(next).forEach((key) => {
                  if (contactId && key !== contactId && !key.includes(receiverClean)) return;
                  next[key] = next[key].map((m) => {
                    if ((!msgId || m.id === msgId) && m.status === "sent") {
                      modified = true;
                      return { ...m, status: "delivered" as const };
                    }
                    return m;
                  });
                });
                if (modified) {
                  writeLiveChatMessages(next);
                  return next;
                }
                return prev;
              });
            }
          } else if (type === "MESSAGES_SEEN" || type === "CHAT_READ") {
            const senderClean = (payload?.senderEmail || "").toLowerCase().trim();
            const readerClean = (payload?.readerEmail || payload?.userEmail || "").toLowerCase().trim();
            const contactId = payload?.contactId;
            const msgId = payload?.messageId;

            setMessagesStore((prev) => {
              const next = { ...prev };
              let modified = false;
              Object.keys(next).forEach((key) => {
                const keyLower = key.toLowerCase();
                const isRelevantKey =
                  (contactId && (key === contactId || keyLower.includes(contactId.toLowerCase()))) ||
                  (readerClean && (keyLower.includes(readerClean) || keyLower.includes(readerClean.replace(/[^a-zA-Z0-9]/g, "_")))) ||
                  (senderClean && (keyLower.includes(senderClean) || keyLower.includes(senderClean.replace(/[^a-zA-Z0-9]/g, "_"))));

                if (isRelevantKey) {
                  next[key] = next[key].map((m) => {
                    if ((!msgId || m.id === msgId) && m.status !== "seen") {
                      modified = true;
                      return { ...m, status: "seen" as const };
                    }
                    return m;
                  });
                }
              });
              if (modified) {
                writeLiveChatMessages(next);
                return next;
              }
              return prev;
            });
            syncLiveChatFromDb(currentUserEmail).then(reloadContacts);
          } else if (type === "CHAT_DELETED") {
            reloadContacts();
          } else if (type === "TYPING_STATUS") {
            const senderEmail = (payload?.senderEmail || "").toLowerCase().trim();
            const receiverEmail = (payload?.receiverEmail || "").toLowerCase().trim();
            const myClean = (currentUserEmail || "").toLowerCase().trim();
            const isTyping = Boolean(payload?.isTyping);
            const contactId = payload?.contactId;

            if (!receiverEmail || receiverEmail === myClean || (senderEmail && senderEmail !== myClean)) {
              setTypingContacts((prev) => {
                const updated = { ...prev };
                if (senderEmail) {
                  updated[senderEmail] = isTyping;
                  updated[`contact-${senderEmail.replace(/[^a-zA-Z0-9]/g, "_")}`] = isTyping;
                }
                if (contactId) {
                  updated[contactId] = isTyping;
                }
                return updated;
              });
            }
          } else if (type === "NEW_REQUEST") {
            const req = payload;
            const rEmail = (req?.receiverEmail || "").toLowerCase().trim();
            const myClean = (currentUserEmail || "").toLowerCase().trim();
            if (rEmail && myClean && rEmail === myClean) {
              toast.info(`New Live Chat Request from ${req?.senderName || "a user"}!`);
            }
            syncLiveChatFromDb(currentUserEmail).then(() => {
              reloadRequests();
              reloadContacts();
              setRequestVersion((v) => v + 1);
            });
          } else if (type === "REQUEST_ACCEPTED") {
            const req = payload;
            const sEmail = (req?.senderEmail || "").toLowerCase().trim();
            const myClean = (currentUserEmail || "").toLowerCase().trim();
            if (sEmail && myClean && sEmail === myClean) {
              toast.success(`${req?.receiverName || "Contact"} accepted your Live Chat Request!`);
            }
            syncLiveChatFromDb(currentUserEmail).then(() => {
              reloadRequests();
              reloadContacts();
              setRequestVersion((v) => v + 1);
            });
          } else if (type === "REQUEST_REJECTED" || type === "REQUEST_CANCELLED") {
            syncLiveChatFromDb(currentUserEmail).then(() => {
              reloadRequests();
              reloadContacts();
              setRequestVersion((v) => v + 1);
            });
          } else if (type === "USER_PRESENCE") {
            const presenceEmail = (payload?.email || "").toLowerCase().trim();
            const isOnline = Boolean(payload?.isOnline);

            if (isOnline && presenceEmail && presenceEmail !== (currentUserEmail || "").toLowerCase()) {
              // Recipient came online! Upgrade all "sent" messages to "delivered"
              setMessagesStore((prev) => {
                const next = { ...prev };
                let modified = false;
                Object.keys(next).forEach((key) => {
                  if (key.includes(presenceEmail) || key === `contact-${presenceEmail.replace(/[^a-zA-Z0-9]/g, "_")}`) {
                    next[key] = next[key].map((m) => {
                      if (m.status === "sent" && m.senderEmail?.toLowerCase() === (currentUserEmail || "").toLowerCase()) {
                        modified = true;
                        return { ...m, status: "delivered" as const };
                      }
                      return m;
                    });
                  }
                });
                if (modified) {
                  writeLiveChatMessages(next);
                  return next;
                }
                return prev;
              });
            }

            syncLiveChatFromDb(currentUserEmail).then(reloadContacts);
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

        const handleSocketSeen = (data: any) => {
          const readerClean = (data?.readerEmail || data?.userEmail || "").toLowerCase().trim();
          const senderClean = (data?.senderEmail || "").toLowerCase().trim();
          const convId = data?.conversationId || data?.contactId;

          setMessagesStore((prev) => {
            const next = { ...prev };
            let modified = false;
            Object.keys(next).forEach((key) => {
              const keyLower = key.toLowerCase();
              const isRelevantKey =
                (convId && (key === convId || keyLower.includes(convId.toLowerCase()))) ||
                (readerClean && (keyLower.includes(readerClean) || keyLower.includes(readerClean.replace(/[^a-zA-Z0-9]/g, "_")))) ||
                (senderClean && (keyLower.includes(senderClean) || keyLower.includes(senderClean.replace(/[^a-zA-Z0-9]/g, "_"))));

              if (isRelevantKey) {
                next[key] = next[key].map((m) => {
                  if (m.status !== "seen") {
                    modified = true;
                    return { ...m, status: "seen" as const };
                  }
                  return m;
                });
              }
            });
            if (modified) {
              writeLiveChatMessages(next);
              return next;
            }
            return prev;
          });
        };

        socket.on("messages:seen", handleSocketSeen);
        socket.on("message:read", handleSocketSeen);
        socket.on("messages:read", handleSocketSeen);

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
      broadcastChannelRef.current?.close();
      socketRef.current?.disconnect();
    };
  }, [currentUserEmail, reloadContacts, reloadRequests]);

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
    senderEmail?: string;
    receiverEmail?: string;
    contactId: string;
    message: LiveChatMessage;
  }) => {
    const { contactId, message, senderEmail, receiverEmail } = payload;
    if (!message) return;

    const senderClean = (senderEmail || message.senderEmail || "").toLowerCase().trim();
    const myClean = (currentUserEmail || "").toLowerCase().trim();

    // If I sent it myself from another handler, ignore duplicate
    if (senderClean && myClean && senderClean === myClean && message.senderName === currentUserName) {
      return;
    }

    // Determine target contact ID for this receiving user
    let targetContactId = contactId;
    if (senderClean && myClean && senderClean !== myClean) {
      targetContactId = `contact-${senderClean.replace(/[^a-zA-Z0-9]/g, "_")}`;
    }

    if (myClean) {
      unDeleteLiveChatContact(targetContactId, myClean);
      unDeleteLiveChatContact(contactId, myClean);
    }

    // Determine if User B currently has User A's chat open using refs
    const currentOpenId = selectedContactIdRef.current;
    const currentOpenContact = selectedContactRef.current;
    const isCurrentlyOpen = Boolean(
      currentOpenId &&
        (currentOpenId === contactId ||
          currentOpenId === targetContactId ||
          (currentOpenContact && currentOpenContact.email.toLowerCase() === senderClean) ||
          (senderClean && currentOpenId.toLowerCase().includes(senderClean)))
    );

    const finalStatus: "seen" | "delivered" = isCurrentlyOpen ? "seen" : "delivered";
    const msgToSave: LiveChatMessage = {
      ...message,
      status: finalStatus,
    };

    // Save into messages store under targetContactId and contactId
    setMessagesStore((prev) => {
      const existing = prev[targetContactId] || prev[contactId] || [];
      if (existing.some((m) => m.id === message.id)) return prev;
      const next = {
        ...prev,
        [targetContactId]: [...existing, msgToSave],
        [contactId]: [...existing, msgToSave],
        ...(senderClean ? { [senderClean]: [...existing, msgToSave] } : {}),
      };
      writeLiveChatMessages(next);
      return next;
    });

    // In-app toast notification if chat is not currently open
    if (!isCurrentlyOpen && senderClean && myClean && senderClean !== myClean) {
      toast.info(
        `New message from ${message.senderName || "Contact"}: "${message.content.length > 30 ? message.content.slice(0, 30) + '...' : message.content}"`
      );
    }

    // Notify sender back immediately with delivery / seen receipt
    try {
      if (isCurrentlyOpen) {
        broadcastChannelRef.current?.postMessage({
          type: "MESSAGES_SEEN",
          payload: {
            readerEmail: currentUserEmail,
            senderEmail: senderClean,
            contactId: targetContactId,
            messageId: message.id,
          },
        });

        // Persist seen status to DB
        fetch("/api/live-chat/messages", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: targetContactId,
            senderEmail: senderClean,
            readerEmail: currentUserEmail,
          }),
        }).catch(() => null);
      } else {
        broadcastChannelRef.current?.postMessage({
          type: "MESSAGES_DELIVERED",
          payload: {
            receiverEmail: currentUserEmail,
            senderEmail: senderClean,
            contactId: targetContactId,
            messageId: message.id,
          },
        });
      }
    } catch {}

    // Update contacts list in sidebar
    setContacts((prev) => {
      const exists = prev.some(
        (c) =>
          c.id === targetContactId ||
          c.id === contactId ||
          (senderClean && c.email.toLowerCase() === senderClean)
      );
      if (!exists) {
        return getAllLiveChatContacts(currentUserEmail);
      }
      return prev.map((c) => {
        if (
          c.id === targetContactId ||
          c.id === contactId ||
          (senderClean && c.email.toLowerCase() === senderClean)
        ) {
          return {
            ...c,
            lastMessage: message.content,
            lastMessageTime: message.sentAt,
            unreadCount: isCurrentlyOpen ? 0 : (c.unreadCount || 0) + 1,
          };
        }
        return c;
      });
    });
  };

  // Live presence listener & periodic real-time sync timer
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

    const handlePresenceEvent = () => {
      reloadContacts();
      reloadRequests();
    };

    window.addEventListener("user_presence_updated", handlePresenceEvent);
    window.addEventListener("platform_contacts_updated", handlePresenceEvent);
    window.addEventListener("storage", handlePresenceEvent);

    // Periodic fast sync timer (3 seconds) to ensure real-time cross-browser and cross-device sync
    const livePollTimer = setInterval(() => {
      syncLiveChatFromDb(currentUserEmail).then(() => {
        reloadContacts();
        reloadRequests();
      });
    }, 3000);

    return () => {
      window.removeEventListener("user_presence_updated", handlePresenceEvent);
      window.removeEventListener("platform_contacts_updated", handlePresenceEvent);
      window.removeEventListener("storage", handlePresenceEvent);
      clearInterval(livePollTimer);
    };
  }, [currentUserEmail, requestVersion, reloadContacts, reloadRequests]);

  // Delete a conversation for this user only (one-sided delete)
  const handleDeleteChat = (contactId: string, contactName: string) => {
    const targetContact = contacts.find((c) => c.id === contactId);
    deleteLiveChatContact(contactId, currentUserEmail, targetContact?.email);
    if (selectedContactId === contactId) {
      setSelectedContactId("");
    }
    reloadContacts();
    toast.success(`Conversation with ${contactName} deleted`);
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

  // Available users to add manually - only shows contacts when user types a search query
  const searchableUsers = useMemo(() => {
    const q = addUserQuery.trim();
    if (!q) {
      return [];
    }
    return searchRegisteredContacts(q).filter(
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

  // Active messages for the selected contact (filters out messages sent before this user cleared/deleted the chat)
  const activeMessages = useMemo(() => {
    if (!selectedContact) return [];
    const allMsgs = messagesStore[selectedContact.id] || (selectedContact.email && messagesStore[selectedContact.email.toLowerCase()]) || [];
    const clearedAt = getLiveChatClearedTimestamp(selectedContact.id, currentUserEmail, selectedContact.email);
    if (!clearedAt) return allMsgs;
    return allMsgs.filter((m) => (m.timestamp || 0) > clearedAt);
  }, [messagesStore, selectedContact, currentUserEmail]);

  const isOtherTyping = Boolean(
    (selectedContactId && typingContacts[selectedContactId]) ||
      (selectedContact?.email && typingContacts[selectedContact.email.toLowerCase()]) ||
      (selectedContact?.email &&
        typingContacts[`contact-${selectedContact.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_")}`])
  );

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesContainerRef.current) {
      const el = messagesContainerRef.current;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Auto-scroll strictly inside the message container only when contact changes or new messages arrive
  useEffect(() => {
    if (!selectedContact) return;

    const contactChanged = prevContactIdRef.current !== selectedContactId;
    const msgCountChanged = activeMessages.length !== prevMsgCountRef.current;
    prevContactIdRef.current = selectedContactId;
    prevMsgCountRef.current = activeMessages.length;

    if (contactChanged) {
      isUserScrolledUpRef.current = false;
      setTimeout(() => scrollToBottom(false), 50);
    } else if (msgCountChanged) {
      if (!isUserScrolledUpRef.current) {
        scrollToBottom(true);
      }
    }
  }, [activeMessages.length, selectedContactId, selectedContact, scrollToBottom]);

  // Selecting a contact marks messages as read & clears unread count
  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);

    // Clear unread count for this contact
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, unreadCount: 0 } : c))
    );

    const targetContact = contacts.find((c) => c.id === contactId);

    // Mark messages as seen in store
    setMessagesStore((prev) => {
      const contactMsgs = prev[contactId] || (targetContact?.email && prev[targetContact.email.toLowerCase()]) || [];
      const updatedMsgs = contactMsgs.map((m) =>
        m.senderEmail?.toLowerCase() !== currentUserEmail.toLowerCase()
          ? { ...m, status: "seen" as const }
          : m
      );
      const next = {
        ...prev,
        [contactId]: updatedMsgs,
        ...(targetContact?.email ? { [targetContact.email.toLowerCase()]: updatedMsgs } : {}),
      };
      writeLiveChatMessages(next);
      return next;
    });

    // Mark as read in Database API
    if (typeof window !== "undefined") {
      fetch("/api/live-chat/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          readerEmail: currentUserEmail,
          senderEmail: targetContact?.email || "",
        }),
      }).catch(() => null);

      window.dispatchEvent(new CustomEvent("platform_live_chat_unread_changed"));
      try {
        broadcastChannelRef.current?.postMessage({
          type: "CHAT_READ",
          payload: { contactId, userEmail: currentUserEmail, readerEmail: currentUserEmail, senderEmail: targetContact?.email || "" },
        });
        if (targetContact?.email) {
          broadcastChannelRef.current?.postMessage({
            type: "MESSAGES_SEEN",
            payload: {
              readerEmail: currentUserEmail,
              senderEmail: targetContact.email,
              contactId: contactId,
            },
          });
        }
      } catch {}
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit("message:read", {
        conversationId: contactId,
        userId: currentUserId,
        readerEmail: currentUserEmail,
      });
      socketRef.current.emit("messages:seen", {
        conversationId: contactId,
        readerEmail: currentUserEmail,
        senderEmail: targetContact?.email || "",
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

      // Notify the requester that their request was accepted
      dispatchLiveChatNotification({
        recipientEmail: req.senderEmail,
        recipientName: req.senderName,
        recipientRole: req.senderRole,
        title: "Live Chat Request Accepted",
        message: `${currentUserName} accepted your live chat request. You can now chat in real-time.`,
        type: "chat_accepted",
      });
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

    const targetEmail = (currentContact.email || "").toLowerCase().trim();
    const presenceMap = readLiveChatPresence();
    const isRecipientOnline = Boolean(presenceMap[targetEmail]?.isOnline || currentContact.status === "online");

    const initialStatus: "sent" | "delivered" = isRecipientOnline ? "delivered" : "sent";

    const newMsg: LiveChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUserId,
      senderName: currentUserName,
      senderEmail: currentUserEmail,
      content: sentContent,
      sentAt: sentTime,
      timestamp: Date.now(),
      status: initialStatus,
    };

    if (currentUserEmail) {
      unDeleteLiveChatContact(currentContact.id, currentUserEmail);
    }

    const myContactKey = `contact-${currentUserEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;

    // Update messages store under currentContact.id, targetEmail, and myContactKey
    const updatedContactMsgs = [...(messagesStore[currentContact.id] || []), newMsg];
    const newStore = {
      ...messagesStore,
      [currentContact.id]: updatedContactMsgs,
      ...(targetEmail ? { [targetEmail]: updatedContactMsgs } : {}),
      [myContactKey]: updatedContactMsgs,
    };
    setMessagesStore(newStore);
    writeLiveChatMessages(newStore);

    // Persist sent message to Database API with both sender and receiver emails
    if (typeof window !== "undefined") {
      fetch("/api/live-chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: currentContact.id,
          message: newMsg,
          senderEmail: currentUserEmail,
          receiverEmail: currentContact.email,
        }),
      }).catch(() => null);
    }

    // Emit to WebSocket room if connected
    if (socketRef.current?.connected) {
      socketRef.current.emit("message:send", {
        conversationId: currentContact.id,
        content: sentContent,
      });
    }

    // Broadcast across browser tabs and live components
    broadcastChannelRef.current?.postMessage({
      type: "NEW_MESSAGE",
      payload: {
        senderEmail: currentUserEmail,
        receiverEmail: currentContact.email,
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
    isUserScrolledUpRef.current = false;
    setTimeout(() => scrollToBottom(true), 50);

    // Only Customer Support & Escrow provides automated instant system acknowledgment
    if (currentContact.id === "support-team") {
      if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
      replyTimeoutRef.current = setTimeout(() => {
        const supportReply: LiveChatMessage = {
          id: `reply-support-${Date.now()}`,
          senderId: "support-team",
          senderName: "Customer Support & Escrow",
          senderEmail: "support@saas.com",
          content: "Thank you for reaching out to Live Support. A support representative will review your inquiry shortly.",
          sentAt: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          timestamp: Date.now(),
          status: "seen",
        };

        setMessagesStore((prev) => {
          const msgs = [...(prev["support-team"] || []), supportReply];
          const next = { ...prev, ["support-team"]: msgs };
          writeLiveChatMessages(next);
          return next;
        });

        setContacts((prev) =>
          prev.map((c) =>
            c.id === "support-team"
              ? {
                  ...c,
                  lastMessage: supportReply.content,
                  lastMessageTime: supportReply.sentAt,
                }
              : c
          )
        );
      }, 1500);
    }
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
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

      {/* Disconnecting Animation Overlay */}
      {isDisconnecting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-all duration-300">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-2xl">
            <Wifi className="h-10 w-10 text-amber-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
            </span>
          </div>

          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            Disconnecting Live Chat
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0.3s]" />
            </span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Closing live chat session and returning to Inbox...
          </p>

          {/* Animated Disconnecting Signal Boxes */}
          <div className="mt-6 flex items-center gap-2">
            <div className="h-2 w-8 rounded-full bg-amber-500 animate-pulse" />
            <div className="h-2 w-8 rounded-full bg-amber-400 animate-pulse [animation-delay:0.2s]" />
            <div className="h-2 w-8 rounded-full bg-amber-300 animate-pulse [animation-delay:0.4s]" />
            <div className="h-2 w-8 rounded-full bg-amber-200 animate-pulse [animation-delay:0.6s]" />
          </div>
        </div>
      )}

      {/* Left Sidebar - Contacts & Conversations List */}
      <div className={`w-full md:w-80 shrink-0 flex-col border-r border-border bg-muted/15 relative h-full overflow-hidden ${selectedContactId ? "hidden md:flex" : "flex"}`}>
        {/* Sidebar Header with Exit Button, Live Chats, Add User, and Requests Buttons */}
        <div className="border-b border-border p-3.5 bg-card relative z-30 space-y-2.5">
          {/* Top Bar: Exit Live Chat & Active Live Indicator */}
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={handleExitClick}
              disabled={isDisconnecting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              title="Exit Live Chat and return to Inbox"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Exit Live Chat</span>
            </button>

            <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-xs">
              <Circle className="h-1.5 w-1.5 fill-emerald-500 text-emerald-500 animate-pulse" /> Live Active
            </span>
          </div>

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
                  const next = !isAddUserOpen;
                  setIsAddUserOpen(next);
                  setIsRequestsOpen(false);
                  if (next) {
                    setAddUserQuery("");
                  }
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
                {!addUserQuery.trim() ? (
                  <div className="p-5 text-center text-xs text-muted-foreground">
                    <Search className="mx-auto h-6 w-6 opacity-30 mb-2 text-primary" />
                    <p className="font-semibold text-foreground">Search to Add Users</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Type any name or email above to search contacts</p>
                  </div>
                ) : searchableUsers.length === 0 ? (
                  <div className="p-5 text-center text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">No matching users found</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Try searching with a different keyword</p>
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
              const isThisContactTyping = Boolean(
                typingContacts[contact.id] ||
                  (contact.email && typingContacts[contact.email.toLowerCase()]) ||
                  (contact.email &&
                    typingContacts[`contact-${contact.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, "_")}`])
              );

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
      <div className={`flex-1 flex-col h-full min-h-0 overflow-hidden bg-background ${selectedContactId ? "flex" : "hidden md:flex"}`}>
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
            {/* Chat Header with Avatar Photo, Full Name, Back Arrow (on mobile) and Online/Typing Status */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-3 sm:px-5 bg-card/80 backdrop-blur-xs">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setSelectedContactId("")}
                  className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer mr-0.5"
                  title="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
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
                    ) : selectedContact.id === "support-team" ? (
                      <span className="text-emerald-500 font-medium flex items-center gap-1.5">
                        <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" /> 24/7 Live Support
                      </span>
                    ) : selectedContact.status === "online" ? (
                      <span className="text-emerald-500 font-medium flex items-center gap-1.5">
                        <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" /> Online
                      </span>
                    ) : (
                      <span className="text-muted-foreground/80 font-normal flex items-center gap-1.5">
                        <Circle className="h-2 w-2 fill-slate-400 text-slate-400" /> {selectedContact.lastSeen && selectedContact.lastSeen.toLowerCase() !== "offline" ? selectedContact.lastSeen : "Offline"}
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
            <div
              ref={messagesContainerRef}
              onScroll={() => {
                if (!messagesContainerRef.current) return;
                const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
                isUserScrolledUpRef.current = scrollHeight - (scrollTop + clientHeight) > 120;
              }}
              className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 bg-muted/10 overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 dark:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 transition-all"
            >
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
                          className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                            isMe ? "text-white/80" : "text-muted-foreground"
                          }`}
                        >
                          <span>{msg.sentAt}</span>
                          {isMe && (
                            <span
                              className="inline-flex items-center ml-0.5"
                              title={
                                msg.status === "seen"
                                  ? "Read"
                                  : msg.status === "delivered"
                                  ? "Delivered"
                                  : "Sent"
                              }
                            >
                              {msg.status === "seen" ? (
                                <CheckCheck className="h-3.5 w-3.5 text-[#38bdf8] dark:text-[#38bdf8] stroke-[2.8] drop-shadow-xs" />
                              ) : msg.status === "delivered" ? (
                                <CheckCheck className="h-3.5 w-3.5 text-white/70 dark:text-white/70 stroke-[2]" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-white/70 dark:text-white/70 stroke-[2]" />
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
                            receiverEmail: selectedContact.email,
                          },
                        });
                        if (socketRef.current?.connected) {
                          socketRef.current.emit("typing:status", {
                            conversationId: selectedContact.id,
                            isTyping: Boolean(val.trim()),
                            senderEmail: currentUserEmail,
                            receiverEmail: selectedContact.email,
                          });
                        }
                      } catch {
                        // ignore
                      }

                      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                      typingTimeoutRef.current = setTimeout(() => {
                        try {
                          broadcastChannelRef.current?.postMessage({
                            type: "TYPING_STATUS",
                            payload: {
                              contactId: selectedContact.id,
                              isTyping: false,
                              senderEmail: currentUserEmail,
                              receiverEmail: selectedContact.email,
                            },
                          });
                          if (socketRef.current?.connected) {
                            socketRef.current.emit("typing:status", {
                              conversationId: selectedContact.id,
                              isTyping: false,
                              senderEmail: currentUserEmail,
                              receiverEmail: selectedContact.email,
                            });
                          }
                        } catch {}
                      }, 1800);
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
