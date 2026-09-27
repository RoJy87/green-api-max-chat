import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Chat } from '../types/chat'
import { MessageBubble } from './MessageBubble'

type ChatWindowProps = {
  chat: Chat
  onSend: (chatId: string, text: string) => Promise<{ ok: boolean }>
  onBack: () => void
}

const MAX_MESSAGE_LENGTH = 4000

export function ChatWindow({ chat, onSend, onBack }: ChatWindowProps) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = historyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.messages.length])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const result = await onSend(chat.id, text)
      if (result.ok) setDraft('')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <section className='chat-window'>
      <header className='chat-header'>
        <button type='button' className='icon-button back-button' onClick={onBack} aria-label='Назад к списку чатов'>
          ←
        </button>
        <div className='chat-header-info'>
          <h3>{chat.title}</h3>
          {chat.phone && <span className='chat-header-phone'>+{chat.phone}</span>}
        </div>
      </header>

      <div className='chat-history' role='log' aria-label='История сообщений' ref={historyRef}>
        {chat.messages.length === 0 && <div className='chat-history-empty'>Напишите первое сообщение</div>}
        {chat.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <footer className='chat-input'>
        <textarea
          ref={inputRef}
          rows={1}
          placeholder='Введите сообщение…'
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type='button'
          className='send-button'
          onClick={() => void send()}
          disabled={sending || !draft.trim()}
          aria-label='Отправить'>
          ➤
        </button>
      </footer>
    </section>
  )
}
