import type { Chat } from '../types/chat'

const STORAGE_KEY = 'green-api-chats'

const isChat = (value: unknown): value is Chat => {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.phone === 'string' &&
    typeof c.title === 'string' &&
    Array.isArray(c.messages) &&
    typeof c.createdAt === 'number' &&
    typeof c.updatedAt === 'number'
  )
}

export const chatsStorage = {
  load(): Chat[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.filter(isChat)
    } catch {
      return []
    }
  },
  save(chats: Chat[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
    } catch {
      // Quota exceeded or unavailable storage: state stays in memory.
    }
  },
}
