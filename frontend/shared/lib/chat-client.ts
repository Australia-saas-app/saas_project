import type { TMessage } from "@/src/modules/chat-bot/types"

export function getChatSocketUrl(): string {
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "https" : "http";
    const hostname = window.location.hostname;
    const port = process.env.NEXT_PUBLIC_GATEWAY_PORT || "8000";
    const raw = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "";

    // If client is accessing from a remote IP/host (not local), never attempt localhost
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      if (!raw || raw.includes("localhost") || raw.includes("127.0.0.1") || raw.includes("kong")) {
        return `${proto}://${hostname}:${port}`;
      }
    }

    if (raw && !raw.includes("kong:") && !raw.startsWith("http://kong") && !raw.startsWith("ws://kong") && !raw.includes("//kong")) {
      return raw;
    }
    return `${proto}://${hostname}:${port}`;
  }
  return (
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    ""
  );
}

export function isChatApiAvailable(): boolean {
  return Boolean(getChatSocketUrl())
}

export function createLocalConversationId(userId: string, category: string): string {
  return `local-${userId}-${category.toLowerCase()}`
}

export function createWelcomeMessage(category: string, conversationId = ""): TMessage {
  return {
    content: `Hello! I'm here to assist you with ${category}. How can I help you today?`,
    conversationId,
    serviceType: category.toLowerCase(),
    senderId: "support",
    senderName: "Support",
    type: "live",
    authority: "admin",
    createdAt: new Date(),
  }
}

function storageKey(userId: string, category: string): string {
  return `live-chat:${userId}:${category.toLowerCase()}`
}

export function loadLocalChatMessages(userId: string, category: string): TMessage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(storageKey(userId, category))
    if (!raw) return []
    const parsed = JSON.parse(raw) as TMessage[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLocalChatMessages(
  userId: string,
  category: string,
  messages: TMessage[]
): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey(userId, category), JSON.stringify(messages))
  } catch {
    // Ignore quota / privacy errors
  }
}

type FetchLiveMessagesParams = {
  senderId: string
  serviceType: string
}

export async function fetchLiveChatMessages(
  params: FetchLiveMessagesParams
): Promise<TMessage[] | null> {
  const baseUrl = getChatSocketUrl()
  if (!baseUrl || !params.serviceType) return null

  const url = `${baseUrl}/api/messages?type=live&senderId=${encodeURIComponent(
    params.senderId
  )}&serviceType=${encodeURIComponent(params.serviceType.toLowerCase())}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) return null
    const data = await response.json()
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

type FetchConversationParams = {
  senderId: string
  senderName: string
  serviceType: string
}

export async function fetchLiveConversationId(
  params: FetchConversationParams
): Promise<string | null> {
  const baseUrl = getChatSocketUrl()
  if (!baseUrl || !params.serviceType) return null

  const url = `${baseUrl}/api/messages/conversation?type=live&senderId=${encodeURIComponent(
    params.senderId
  )}&serviceType=${encodeURIComponent(params.serviceType.toLowerCase())}&senderName=${encodeURIComponent(
    params.senderName
  )}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) return null
    const data = await response.json()
    return typeof data?.conversationId === "string" ? data.conversationId : null
  } catch {
    return null
  }
}

function orderStorageKey(userId: string, orderId: string): string {
  return `order-chat:${userId}:${orderId}`
}

export function createOrderWelcomeMessage(
  orderId: string,
  serviceType: string,
  conversationId = ""
): TMessage {
  return {
    content: `Hello! I'm here to assist you with order ${orderId}. How can I help you today?`,
    conversationId,
    serviceType,
    senderId: "support",
    senderName: "Support",
    type: "order",
    orderId,
    authority: "admin",
    createdAt: new Date(),
  }
}

export function loadLocalOrderChatMessages(userId: string, orderId: string): TMessage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(orderStorageKey(userId, orderId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as TMessage[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLocalOrderChatMessages(
  userId: string,
  orderId: string,
  messages: TMessage[]
): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(orderStorageKey(userId, orderId), JSON.stringify(messages))
  } catch {
    // Ignore quota / privacy errors
  }
}

type FetchOrderMessagesParams = {
  senderId: string
  serviceType: string
  orderId: string
}

export async function fetchOrderChatMessages(
  params: FetchOrderMessagesParams
): Promise<TMessage[] | null> {
  const baseUrl = getChatSocketUrl()
  if (!baseUrl || !params.orderId) return null

  const url = `${baseUrl}/api/messages?type=order&senderId=${encodeURIComponent(
    params.senderId
  )}&serviceType=${encodeURIComponent(params.serviceType)}&orderId=${encodeURIComponent(
    params.orderId
  )}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) return null
    const data = await response.json()
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

export async function fetchOrderConversation(
  params: FetchConversationParams & { orderId: string }
): Promise<{ conversationId: string } | null> {
  const baseUrl = getChatSocketUrl()
  if (!baseUrl || !params.orderId) return null

  const url = `${baseUrl}/api/messages/conversation?type=order&orderId=${encodeURIComponent(
    params.orderId
  )}&senderId=${encodeURIComponent(params.senderId)}&serviceType=${encodeURIComponent(
    params.serviceType
  )}&senderName=${encodeURIComponent(params.senderName)}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) return null
    const data = await response.json()
    return typeof data?.conversationId === "string" ? { conversationId: data.conversationId } : null
  } catch {
    return null
  }
}
