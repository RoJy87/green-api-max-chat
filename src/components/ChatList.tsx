import { useState, type SubmitEvent } from 'react'
import type { Chat } from '../types/chat'

type ChatListProps = {
  chats: Chat[]
  activeChatId: string | null
  onSelect: (chatId: string) => void
  onCreate: (phone: string) => Promise<{ ok: boolean; error?: string }>
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function ChatList({ chats, activeChatId, onSelect, onCreate }: ChatListProps) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleCreate = async (event: SubmitEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await onCreate(phone)
      if (!result.ok) {
        setError(result.error ?? 'Не удалось создать чат')
        return
      }
      setPhone('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className='chat-list'>
      <header className='chat-list-header'>
        <h2>Чаты</h2>
      </header>

      <form className='new-chat-form' onSubmit={handleCreate}>
        <input
          type='tel'
          inputMode='tel'
          placeholder='79991234567'
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-label='Номер телефона получателя'
          disabled={busy}
        />
        <button type='submit' disabled={busy || !phone.trim()}>
          {busy ? '…' : 'Создать'}
        </button>
      </form>
      {error && (
        <div className='form-error' role='alert'>
          {error}
        </div>
      )}

      <nav className='chat-list-items' aria-label='Список чатов'>
        {chats.length === 0 && <div className='chat-list-empty'>Введите номер телефона, чтобы начать переписку</div>}
        {[...chats]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((chat) => {
            const last = chat.messages.at(-1)
            return (
              <button
                key={chat.id}
                type='button'
                className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
                onClick={() => onSelect(chat.id)}>
                <span className='chat-item-avatar' aria-hidden='true'>
                  {chat.title.replace(/\+/, '').slice(0, 1) || '#'}
                </span>
                <span className='chat-item-body'>
                  <span className='chat-item-title'>{chat.title}</span>
                  <span className='chat-item-preview'>{last ? last.text : 'Нет сообщений'}</span>
                </span>
                {last && <span className='chat-item-time'>{formatTime(last.timestamp)}</span>}
              </button>
            )
          })}
      </nav>
    </aside>
  )
}
