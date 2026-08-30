"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IoClose } from "react-icons/io5";
import { io, Socket } from "socket.io-client";
import { TMessage } from "./types";
import { WelcomeHeader } from "./components/Wellcome";
import { CategoryGrid } from "./components/CategoryGrid";
import { MessageInput, type PendingImage } from "./components/MessageInput";
import { ChatHeader } from "./components/ChatHeader";
import { FeedbackModal } from "./components/FeedbackModal";
import { ChatMessage } from "./components/ChatMessage";
import {
  createLocalConversationId,
  createWelcomeMessage,
  fetchLiveChatMessages,
  fetchLiveConversationId,
  getChatSocketUrl,
  isChatApiAvailable,
  loadLocalChatMessages,
  saveLocalChatMessages,
} from "@/src/shared/lib/chat-client";

type UpdateConversationProps = {
  isOpen: boolean;
  setMinimise: (value: boolean) => void;
  setIsChatModalOpen: (value: boolean) => void;
};

const panelMotion = {
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.97 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
};

export const ChatBoxManage = ({
  isOpen,
  setMinimise,
  setIsChatModalOpen,
}: UpdateConversationProps) => {
  const authStore = { id: "33333", name: "Abhijit" };
  const [chatbox, setChatbox] = useState(false);
  const [messageCategory, setMessageCategory] = useState("");
  const [isSmallModalOpen, setSmallModalOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [isModalClose, setIsModalClose] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [messageLoad, setMessageLoad] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const socket = useRef<Socket | null>(null);
  const [chats, setChats] = useState<TMessage[]>([]);

  const hydrateChat = useCallback(
    async (category: string) => {
      if (!authStore?.id || !category) return;

      const localConversationId = createLocalConversationId(authStore.id, category);
      setMessageLoad(true);

      let nextConversationId = localConversationId;
      let nextMessages: TMessage[] = [];

      if (isChatApiAvailable()) {
        const remoteConversationId = await fetchLiveConversationId({
          senderId: authStore.id,
          senderName: authStore.name,
          serviceType: category,
        });
        if (remoteConversationId) {
          nextConversationId = remoteConversationId;
        }

        const remoteMessages = await fetchLiveChatMessages({
          senderId: authStore.id,
          serviceType: category,
        });
        if (remoteMessages && remoteMessages.length > 0) {
          nextMessages = remoteMessages;
        }
      }

      if (nextMessages.length === 0) {
        const stored = loadLocalChatMessages(authStore.id, category);
        nextMessages =
          stored.length > 0 ? stored : [createWelcomeMessage(category, nextConversationId)];
      }

      setConversationId(nextConversationId);
      setChats(nextMessages);
      setMessageLoad(false);
      stickToBottom.current = true;
    },
    [authStore.id, authStore.name]
  );

  const openChatModal = async (category: string) => {
    setMessageCategory(category);
    setSmallModalOpen(false);
    setChatbox(true);
    setIsModalClose(false);
    await hydrateChat(category);
  };

  const handleMinimize = () => {
    setMinimise(true);
  };

  const handleClose = () => {
    setIsModalClose(true);
  };

  const handleFeedback = () => {
    setMessageCategory("");
    setChatbox(false);
    setSmallModalOpen(true);
    setIsModalClose(false);
    setChats([]);
    setMessage("");
    setPendingImage(null);
    setMinimise(false);
    setIsChatModalOpen(false);
  };

  const handleListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < 80;
  };

  useEffect(() => {
    if (!stickToBottom.current || !listRef.current) return;
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chats, isTyping, messageLoad]);

  useEffect(() => {
    if (!messageCategory || !authStore?.id) return;
    saveLocalChatMessages(authStore.id, messageCategory, chats);
  }, [chats, messageCategory, authStore.id]);

  useEffect(() => {
    if (!isChatApiAvailable() || !authStore?.id || !messageCategory || !chatbox) {
      return;
    }

    const socketUrl = getChatSocketUrl();
    socket.current = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 3,
    });

    socket.current.emit("register", authStore.id);

    socket.current.on("private_message", (msg: TMessage) => {
      stickToBottom.current = true;
      setChats((prev) => [...prev, { ...msg, createdAt: new Date(), updatedAt: new Date() }]);
    });

    return () => {
      socket.current?.disconnect();
      socket.current = null;
    };
  }, [authStore?.id, messageCategory, chatbox]);

  const sendMyMessage = async () => {
    const trimmed = message.trim();
    if ((!trimmed && !pendingImage) || !authStore?.id || !messageCategory) return;

    try {
      const activeConversationId =
        conversationId || createLocalConversationId(authStore.id, messageCategory);

      const msg: TMessage = {
        _id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        senderId: authStore.id,
        senderName: authStore.name,
        receiverId: activeConversationId,
        content: trimmed,
        createdAt: new Date(),
        conversationId: activeConversationId,
        serviceType: messageCategory.toLowerCase(),
        type: "live",
        authority: "user",
        ...(pendingImage ? { file: { image: pendingImage.dataUrl } } : {}),
      };

      const isFirstUserMessage = !chats.some((c) => c.senderId === authStore.id);

      if (isChatApiAvailable()) {
        socket.current?.emit("private_message", msg);
      }

      stickToBottom.current = true;
      setChats((prev) => [...prev, msg]);
      setMessage("");
      setPendingImage(null);

      if (isFirstUserMessage) {
        setIsTyping(true);
        const botReply: TMessage = {
          _id: `bot-${Date.now()}`,
          senderId: "bot",
          senderName: "Support",
          receiverId: authStore.id,
          content: `Thanks ${authStore.name}! We've received your message about ${messageCategory}. An agent will respond shortly. Meanwhile, feel free to share more details or a photo.`,
          createdAt: new Date(),
          conversationId: activeConversationId,
          serviceType: messageCategory.toLowerCase(),
          type: "live",
          authority: "admin",
        };

        window.setTimeout(() => {
          setIsTyping(false);
          stickToBottom.current = true;
          setChats((prev) => [...prev, botReply]);
        }, 900);
      }
    } catch {
      // Keep chat usable even if send fails
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <AnimatePresence mode="wait">
        {isSmallModalOpen && !chatbox && !isModalClose && (
          <motion.div
            key="topics"
            {...panelMotion}
            className="pointer-events-auto absolute right-3 bottom-[4.5rem] flex w-[min(100vw-1.5rem,380px)] flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-black/5 sm:right-5 sm:bottom-24 dark:bg-slate-900 dark:ring-white/10"
          >
            <button
              type="button"
              onClick={() => setIsChatModalOpen(false)}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/10 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/20"
              aria-label="Close"
            >
              <IoClose size={18} />
            </button>
            <WelcomeHeader />
            <CategoryGrid onSelectCategory={openChatModal} />
          </motion.div>
        )}

        {chatbox && !isModalClose && (
          <motion.div
            key="chat"
            {...panelMotion}
            className="pointer-events-auto absolute right-3 bottom-[4.5rem] flex h-[min(640px,calc(100vh-6.5rem))] w-[min(100vw-1.5rem,400px)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:right-5 sm:bottom-24 dark:bg-slate-900 dark:ring-white/10"
          >
            <ChatHeader
              category={messageCategory}
              onMinimize={handleMinimize}
              onClose={handleClose}
            />
            <div className="flex min-h-0 flex-1 flex-col">
              {messageLoad ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#0F6B5C]" />
                  Loading conversation…
                </div>
              ) : (
                <div
                  ref={listRef}
                  onScroll={handleListScroll}
                  className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-4"
                >
                  {chats.map((chatMessage, index) => (
                    <ChatMessage
                      key={
                        chatMessage._id ||
                        `${chatMessage.senderId}-${chatMessage.createdAt}-${index}`
                      }
                      message={chatMessage}
                      isOwn={chatMessage.senderId === authStore.id}
                    />
                  ))}
                  {isTyping && (
                    <div className="flex items-center gap-2 px-1 text-xs text-slate-400">
                      <span className="flex gap-1 rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
                      </span>
                      Support is typing…
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
              <MessageInput
                message={message}
                setMessage={setMessage}
                onSend={sendMyMessage}
                pendingImage={pendingImage}
                onPendingImage={setPendingImage}
                disabled={messageLoad || isTyping}
              />
            </div>
          </motion.div>
        )}

        {isModalClose && (
          <motion.div
            key="feedback"
            {...panelMotion}
            className="pointer-events-auto absolute right-3 bottom-[4.5rem] h-[min(420px,calc(100vh-6.5rem))] w-[min(100vw-1.5rem,400px)] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:right-5 sm:bottom-24 dark:bg-slate-900 dark:ring-white/10"
          >
            <FeedbackModal onClose={() => setIsModalClose(false)} onFeedback={handleFeedback} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
