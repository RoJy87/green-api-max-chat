import { useEffect, useState } from 'react'
import { GreenApiClient } from './api/greenApi'
import type { InstanceCredentials } from './api/credentials'
import { clearCredentials, loadCredentials } from './api/credentials'
import { useChatStore } from './hooks/useChatStore'
import { LoginPage } from './pages/LoginPage'
import { ChatList } from './components/ChatList'
import { ChatWindow } from './components/ChatWindow'
import { NavRail } from './components/NavRail'
import { Toast } from './components/Toast'

export default function App() {
  // Autologin: credentials persist in localStorage, the instance is
  // re-verified in the background.
  const [credentials, setCredentials] = useState<InstanceCredentials | null>(() => loadCredentials())
  const [client, setClient] = useState<GreenApiClient | null>(() => {
    const stored = loadCredentials()
    return stored ? new GreenApiClient(stored) : null
  })
  const [activeChatId, setActiveChatId] = useState<string | null>(null)

  const dropSession = () => {
    clearCredentials()
    setClient(null)
    setCredentials(null)
    setActiveChatId(null)
  }

  useEffect(() => {
    if (!client) return
    let cancelled = false
    void (async () => {
      try {
        const { stateInstance } = await client.getStateInstance()
        if (!cancelled && stateInstance !== 'authorized') {
          dropSession()
        }
      } catch {
        // Network hiccup right after load: keep the restored session.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client])

  const handleLogin = (newClient: GreenApiClient, newCredentials: InstanceCredentials) => {
    setClient(newClient)
    setCredentials(newCredentials)
  }

  const handleLogout = () => {
    dropSession()
  }

  if (!client || !credentials) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <Messenger
      key={credentials.idInstance}
      client={client}
      credentials={credentials}
      activeChatId={activeChatId}
      onSelectChat={setActiveChatId}
      onLogout={handleLogout}
    />
  )
}

type MessengerProps = {
  client: GreenApiClient
  credentials: InstanceCredentials
  activeChatId: string | null
  onSelectChat: (chatId: string) => void
  onLogout: () => void
}

function Messenger({ client, credentials, activeChatId, onSelectChat, onLogout }: MessengerProps) {
  const { chats, pollError, createChat, sendMessage } = useChatStore(client, onLogout)
  const activeChat = chats.find((c) => c.id === activeChatId) ?? null

  const handleCreate = async (phone: string) => {
    const result = await createChat(phone)
    if (result.ok && result.chatId) onSelectChat(result.chatId)
    return result
  }

  return (
    <div className={`messenger ${activeChatId ? 'chat-open' : ''}`}>
      {pollError && <Toast key={pollError.seq} error={pollError} />}
      <NavRail />
      <ChatList chats={chats} activeChatId={activeChatId} onSelect={onSelectChat} onCreate={handleCreate} />
      <main className='chat-main'>
        {activeChat ? (
          <ChatWindow key={activeChat.id} chat={activeChat} onSend={sendMessage} onBack={() => onSelectChat('')} />
        ) : (
          <div className='chat-main-empty'>
            <div>
              <h2>Выберите чат</h2>
              <p>Слева создайте чат по номеру телефона и напишите сообщение.</p>
            </div>
            <span className='connection-ok'>Подключено: инстанс {credentials.idInstance}</span>
            <button type='button' className='logout-button' onClick={onLogout}>
              Выйти
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
