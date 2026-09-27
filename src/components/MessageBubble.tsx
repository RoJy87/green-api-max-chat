import type { ChatMessage } from '../types/chat'

const STATUS_LABEL: Record<ChatMessage['status'], string> = {
  pending: 'Часы',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Ошибка',
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const outgoing = message.direction === 'outgoing'
  return (
    <div className={`message-row ${outgoing ? 'outgoing' : 'incoming'}`}>
      <div className='message-bubble'>
        <p className='message-text'>{message.text}</p>
        <span className='message-meta'>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
          {outgoing && <span className={`message-status ${message.status}`}>{STATUS_LABEL[message.status]}</span>}
        </span>
      </div>
    </div>
  )
}
