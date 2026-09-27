import type { InstanceCredentials } from './credentials'

export class GreenApiError extends Error {
  readonly httpStatus: number
  readonly errorId: string

  constructor(httpStatus: number, errorId: string, message: string) {
    super(message)
    this.name = 'GreenApiError'
    this.httpStatus = httpStatus
    this.errorId = errorId
  }
}

const DEFAULT_TIMEOUT_MS = 20000

/**
 * Minimal GREEN-API client (MAX instances).
 * Every instance lives on its own API host (apiUrl) published in the
 * personal account, e.g. https://3100.api.green-api.com
 */
export class GreenApiClient {
  private readonly baseUrl: string
  private readonly credentials: InstanceCredentials

  constructor(credentials: InstanceCredentials) {
    this.credentials = credentials
    this.baseUrl = `${credentials.apiUrl.replace(/\/+$/, '')}/waInstance${credentials.idInstance}`
  }

  /** GET getStateInstance — validate credentials on login. */
  async getStateInstance(): Promise<{ stateInstance: string }> {
    return this.request(`/getStateInstance/${this.credentials.apiTokenInstance}`)
  }

  /** POST checkAccount — resolve a phone number to a MAX chatId. */
  async checkAccount(phoneNumber: string): Promise<CheckAccountResponse> {
    return this.request(`/checkAccount/${this.credentials.apiTokenInstance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: Number(phoneNumber) }),
    })
  }

  /** POST sendMessage — send a text message to a chatId. */
  async sendMessage(chatId: string, message: string): Promise<{ idMessage: string }> {
    return this.request(`/sendMessage/${this.credentials.apiTokenInstance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    })
  }

  /**
   * GET receiveNotification — pops the oldest notification from the FIFO queue.
   * Returns null when the queue is empty (204 by contract).
   */
  async receiveNotification(): Promise<WebhookNotification | null> {
    return this.request(`/receiveNotification/${this.credentials.apiTokenInstance}`)
  }

  /** DELETE deleteNotification — acknowledge a processed notification. */
  async deleteNotification(receiptId: number): Promise<{ result: boolean }> {
    return this.request(`/deleteNotification/${this.credentials.apiTokenInstance}/${receiptId}`, {
      method: 'DELETE',
    })
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    try {
      const response = await fetch(this.baseUrl + path, {
        ...init,
        signal: controller.signal,
      })

      // Empty queue: 204 with no body.
      if (response.status === 204) return null as T

      let payload: unknown = null
      const text = await response.text()
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          payload = text
        }
      }

      if (!response.ok) {
        const body = (payload ?? {}) as Record<string, unknown>
        throw new GreenApiError(
          response.status,
          String(body.error ?? 'unknown'),
          typeof payload === 'string' ? payload : JSON.stringify(body),
        )
      }

      return payload as T
    } finally {
      clearTimeout(timer)
    }
  }
}

export type CheckAccountResponse = {
  exist: boolean
  chatId: string
  fromCache?: boolean
  status?: boolean
  reason?: string
}

export type WebhookNotification = {
  receiptId: number
  body: {
    typeWebhook: string
    idMessage: string
    timestamp: number
    instanceData: {
      idInstance: number
      wid: string
      typeInstance: string
    }
    /** Present on incomingMessageReceived / outgoingAPIMessageReceived. */
    senderData?: {
      chatId: string
      chatName: string
      chatType?: string
      sender?: string
      senderName?: string
      senderContactName?: string
      senderPhoneNumber?: number
    }
    /** Present on outgoingMessageStatus. */
    chatId?: string
    status?: string
    messageData?: {
      typeMessage: string
      textMessageData?: { textMessage: string }
    }
  }
}
