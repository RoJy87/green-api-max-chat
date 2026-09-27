import { useCallback, useEffect, useRef, useState } from 'react'
import { GreenApiError, type GreenApiClient, type WebhookNotification } from '../api/greenApi'
import { isTextIncoming, isTextOutgoingApi, isOutgoingStatus, type Chat, type ChatMessage } from '../types/chat'
import { chatsStorage } from './chatsStorage'

const POLL_INTERVAL_MS = 3000
const RETRY_DELAY_MS = 10000

/** Polling failure surfaced to the UI; seq lets the toast re-trigger on repeats. */
export type PollError = { message: string; seq: number }

type UseChatStoreResult = {
  chats: Chat[]
  pollError: PollError | null
  createChat: (phone: string) => Promise<{ ok: boolean; chatId?: string; error?: string }>
  sendMessage: (chatId: string, text: string) => Promise<{ ok: boolean }>
}

/** Status ranking: a status notification must never downgrade a message. */
const STATUS_RANK: Record<ChatMessage['status'], number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 0,
}

const STATUS_PRECEDENCE: Partial<Record<string, ChatMessage['status']>> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
}

/**
 * Chats state, persistence and the notification polling loop:
 * receiveNotification → apply → deleteNotification (FIFO contract —
 * acknowledge only after the notification has been applied).
 * `onUnauthorized` fires on 401/403 (instance logged out in runtime).
 */
export function useChatStore(client: GreenApiClient, onUnauthorized?: () => void): UseChatStoreResult {
  const [chats, setChats] = useState<Chat[]>(() => chatsStorage.load())
  const [pollError, setPollError] = useState<PollError | null>(null)
  const chatsRef = useRef<Chat[]>(chats)

  useEffect(() => {
    chatsRef.current = chats
  }, [chats])

  const onUnauthorizedRef = useRef(onUnauthorized)

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized
  }, [onUnauthorized])

  const createChat = useCallback(
    async (phone: string) => {
      const digits = phone.replace(/\D/g, '')
      if (!/^(\d{11,12})$/.test(digits)) {
        return { ok: false, error: 'Введите номер в международном формате, например 79991234567' };
      }
      const normalized = digits.replace(/^8(?=\d{10}$)/, '7')
      const existing = chatsRef.current.find((c) => c.phone === normalized)
      if (existing) return { ok: true, chatId: existing.id }

      try {
        const check = await client.checkAccount(normalized)
        if (!check.exist || !check.chatId) {
          return { ok: false, error: 'На этом номере нет аккаунта MAX' }
        }
        const chat: Chat = {
          id: check.chatId,
          phone: normalized,
          title: `+${normalized}`,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        // Re-check inside the updater: the same chat may have been created
        // concurrently (double submit, second tab).
        setChats((prev) => (prev.some((c) => c.id === chat.id) ? prev : [chat, ...prev]))
        return { ok: true, chatId: chat.id }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    },
    [client],
  )

  const sendMessage = useCallback(
    async (chatId: string, text: string): Promise<{ ok: boolean }> => {
      const trimmed = text.trim()
      if (!trimmed) return { ok: false }
      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const optimistic: ChatMessage = {
        id: localId,
        direction: 'outgoing',
        text: trimmed,
        timestamp: Date.now(),
        status: 'pending',
      }
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, optimistic], updatedAt: Date.now() } : c)),
      )

      try {
        const { idMessage } = await client.sendMessage(chatId, trimmed)
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === localId ? { ...m, id: idMessage, status: 'sent' as const } : m,
                  ),
                  updatedAt: Date.now(),
                }
              : c,
          ),
        )
        return { ok: true }
      } catch {
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  messages: c.messages.map((m) => (m.id === localId ? { ...m, status: 'failed' as const } : m)),
                  updatedAt: Date.now(),
                }
              : c,
          ),
        )
        return { ok: false }
      }
    },
    [client],
  )

  const applyNotification = useCallback((n: WebhookNotification): boolean => {
    // A malformed body must never throw inside the polling loop, otherwise the
    // same broken notification would block the FIFO queue forever.
    if (!n || typeof n.body !== 'object' || n.body === null) return true
    const body = n.body

    if (isTextIncoming(body) || isTextOutgoingApi(body)) {
      const incoming = body.typeWebhook === 'incomingMessageReceived'
      const chatId = body.senderData?.chatId
      const text = body.messageData?.textMessageData?.textMessage ?? ''
      if (!chatId) return true // acknowledge malformed data to unblock the queue

      const message: ChatMessage = {
        id: body.idMessage,
        direction: incoming ? 'incoming' : 'outgoing',
        text,
        timestamp: body.timestamp * 1000,
        status: incoming ? 'read' : 'sent',
      }

      setChats((prev) => {
        const known = prev.some((c) => c.id === chatId)
        const base = known
          ? prev
          : [
              {
                id: chatId,
                phone: '',
                title: body.senderData?.senderContactName || body.senderData?.chatName || chatId,
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
              } satisfies Chat,
              ...prev,
            ]

        return base.map((c) => {
          if (c.id !== chatId) return c
          // Echoes of our own API sends carry the same idMessage as the
          // optimistic entry — skip duplicates by id.
          const duplicate = c.messages.some((m) => m.id === message.id)
          if (duplicate) return c
          return { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
        })
      })
      return true
    }

    if (isOutgoingStatus(body)) {
      const status = STATUS_PRECEDENCE[body.status ?? ''] ?? null
      const targetId = body.chatId ?? ''
      if (status && targetId) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === targetId
              ? {
                  ...c,
                  messages: c.messages.map((m) => {
                    if (m.id !== body.idMessage || m.direction !== 'outgoing') return m
                    // Out-of-order notifications must not downgrade a status.
                    if (STATUS_RANK[m.status] >= STATUS_RANK[status]) return m
                    return { ...m, status }
                  }),
                }
              : c,
          ),
        )
      }
      return true
    }

    // Media, reactions, service and unknown notification kinds: ignore, but
    // acknowledge so they never block the FIFO queue.
    return true
  }, [])

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const loop = async () => {
      try {
        // Drain the queue first: new notifications keep arriving while we poll.
        for (;;) {
          if (cancelled) return
          const notification = await client.receiveNotification()
          if (!notification) break
          applyNotification(notification)
          await client.deleteNotification(notification.receiptId)
        }
        setPollError(null)
        retryTimer = setTimeout(loop, POLL_INTERVAL_MS)
      } catch (e) {
        if (cancelled) return
        // 401/403: the instance was logged out at runtime, the stored session is dead.
        if (e instanceof GreenApiError && (e.httpStatus === 401 || e.httpStatus === 403)) {
          setPollError(null)
          onUnauthorizedRef.current?.()
          return
        }
        const message = e instanceof Error ? e.message : 'Ошибка получения уведомлений'
        setPollError((prev) => ({ message, seq: (prev?.seq ?? 0) + 1 }))
        retryTimer = setTimeout(loop, RETRY_DELAY_MS)
      }
    }

    void loop()
    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [client, applyNotification])

  useEffect(() => {
    chatsStorage.save(chats)
  }, [chats])

  return {
    chats,
    pollError,
    createChat,
    sendMessage,
  }
}
