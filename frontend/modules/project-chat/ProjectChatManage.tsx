import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { MessageInput } from "./components/MessageInput";
import Modal from "@/src/components/ui/modal";
import { TOrder } from "./types";
import { TMessage } from "../chat-bot/types";
import {
  createOrderWelcomeMessage,
  fetchOrderChatMessages,
  fetchOrderConversation,
  getChatSocketUrl,
  isChatApiAvailable,
  loadLocalOrderChatMessages,
  saveLocalOrderChatMessages,
} from "@/src/shared/lib/chat-client";

const demoOrder: TOrder = ({
  orderId: "DEMO-1001",
  serviceType: "Technical Service",
  orderStatus: "pending",
  createdAt: new Date().toISOString(),
} as unknown) as TOrder;

type Props = {
  order: TOrder;
};

export const ProjectChatManage = (props: Props) => {
  const { order } = props;
  const currentOrder = order ?? demoOrder;
  const authStore = { id: "33333", name: "Abhijit" };
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<TOrder | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageLoad, setMessageLoad] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const socket = useRef<Socket | null>(null);
  const [chats, setChats] = useState<TMessage[]>([]);
  const [boxOpenLoad, setBoxOpenLoading] = useState(false);

  const hydrateOrderChat = async (activeOrder: TOrder) => {
    if (!authStore?.id || !activeOrder.orderId) return;

    setMessageLoad(true);
    const localConversationId = `local-order-${authStore.id}-${activeOrder.orderId}`;
    let nextConversationId = localConversationId;
    let nextMessages: TMessage[] = [];

    if (isChatApiAvailable()) {
      const remoteConversation = await fetchOrderConversation({
        senderId: authStore.id,
        senderName: authStore.name,
        serviceType: activeOrder.serviceType,
        orderId: activeOrder.orderId,
      });
      if (remoteConversation?.conversationId) {
        nextConversationId = remoteConversation.conversationId;
      }

      const remoteMessages = await fetchOrderChatMessages({
        senderId: authStore.id,
        serviceType: activeOrder.serviceType,
        orderId: activeOrder.orderId,
      });
      if (remoteMessages && remoteMessages.length > 0) {
        nextMessages = remoteMessages;
      }
    }

    if (nextMessages.length === 0) {
      const stored = loadLocalOrderChatMessages(authStore.id, activeOrder.orderId);
      nextMessages =
        stored.length > 0
          ? stored
          : [
              createOrderWelcomeMessage(
                activeOrder.orderId,
                activeOrder.serviceType,
                nextConversationId
              ),
            ];
    }

    setConversationId(nextConversationId);
    setChats(nextMessages);
    setMessageLoad(false);
  };

  useEffect(() => {
    if (!selectedOrder?.orderId || !authStore?.id) return;
    saveLocalOrderChatMessages(authStore.id, selectedOrder.orderId, chats);
  }, [chats, selectedOrder?.orderId, authStore.id]);

  useEffect(() => {
    if (!isChatApiAvailable() || !authStore?.id || !isChatModalOpen || !selectedOrder) {
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
      setChats((prev) => [...prev, { ...msg, createdAt: new Date(), updatedAt: new Date() }]);
    });

    return () => {
      socket.current?.disconnect();
      socket.current = null;
    };
  }, [authStore?.id, isChatModalOpen, selectedOrder]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      const el = messagesContainerRef.current;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [chats]);

  const sendMyMessage = async () => {
    if (!message?.trim() || !authStore?.id || !selectedOrder) return;

    const activeConversationId =
      conversationId || `local-order-${authStore.id}-${selectedOrder.orderId}`;

    const msg: TMessage = {
      senderId: authStore.id,
      senderName: authStore.name,
      receiverId: selectedOrder.orderId,
      content: message,
      createdAt: new Date(),
      conversationId: activeConversationId,
      serviceType: selectedOrder.serviceType,
      type: "order",
      orderId: selectedOrder.orderId,
      authority: "user",
      receiverUserId: authStore.id,
    };

    if (isChatApiAvailable()) {
      socket.current?.emit("private_message", msg);
    }

    setChats((prev) => [...prev, msg]);
    setMessage("");
  };

  const handleOpenMessageBox = async (activeOrder: TOrder) => {
    try {
      setBoxOpenLoading(true);
      setSelectedOrder(activeOrder);
      setIsChatModalOpen(true);
      await hydrateOrderChat(activeOrder);
    } finally {
      setBoxOpenLoading(false);
    }
  };

  function renderMessageButton(activeOrder: TOrder) {
    const storeCountNumber = 0;

    if (activeOrder.orderStatus === "pending" || activeOrder.orderStatus === "working") {
      return (
        <button
          onClick={() => handleOpenMessageBox(activeOrder)}
          className={`m-2 flex items-center gap-2 rounded bg-primary px-2 py-2 text-sm font-semibold text-white relative ${
            boxOpenLoad ? "opacity-50" : ""
          }`}
        >
          Message
          {storeCountNumber > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1">
              {storeCountNumber}
            </span>
          )}
        </button>
      );
    }
    return null;
  }

  return (
    <>
      {renderMessageButton(currentOrder)}

      <Modal
        isOpen={isChatModalOpen}
        onClose={() => {
          setIsChatModalOpen(false);
          setSelectedOrder(null);
          setMessage("");
        }}
        size="xl"
        title="Messages"
      >
        <div className="max-w-xl mx-auto">
          <div className="p-4 border-b border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-50 text-blue-700 uppercase">
                    {selectedOrder?.serviceType}
                  </span>
                  <span className="text-sm text-gray-500">{selectedOrder?.orderId}</span>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    <span
                      className={`px-2 py-1 text-sm rounded ${
                        selectedOrder?.orderStatus === "pending"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {selectedOrder?.orderStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Created:</span>
                    <span className="text-sm text-gray-500">
                      {selectedOrder?.createdAt
                        ? new Date(selectedOrder.createdAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex min-h-[500px] flex-col justify-between rounded-b-lg p-1">
            {messageLoad ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <div>Loading...</div>
              </div>
            ) : (
              <div ref={messagesContainerRef} className="max-h-[600px] grow overflow-y-auto p-4 text-sm scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 flex flex-col gap-3 overscroll-contain">
                {chats.map((chatMessage, index) => {
                  const isOwn = chatMessage.senderId === authStore?.id;
                  return (
                    <div
                      key={`${chatMessage.createdAt}-${index}`}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex max-w-[80%] ${isOwn ? "flex-row-reverse" : ""}`}>
                        {!isOwn && (
                          <div className="shrink-0 mr-2 mt-1">
                            <img src="/avatar.png" alt="Support" className="w-8 h-8 rounded-full" />
                          </div>
                        )}
                        <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                          {!isOwn && (
                            <span className="text-xs font-medium text-gray-600 mb-1">Support</span>
                          )}
                          <div
                            className={`px-4 py-2 rounded-2xl ${
                              isOwn
                                ? "bg-blue-600 text-white rounded-br-none"
                                : "bg-gray-100 text-gray-800 rounded-bl-none"
                            }`}
                          >
                            <p className="text-[15px] leading-snug">{chatMessage.content}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <MessageInput message={message} setMessage={setMessage} onSend={sendMyMessage} />
          </div>
        </div>
      </Modal>
    </>
  );
};
