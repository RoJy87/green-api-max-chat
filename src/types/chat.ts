import type { WebhookNotification } from '../api/greenApi'

export type NotificationBody = WebhookNotification['body']

export type ChatDirection = 'incoming' | 'outgoing'

export type ChatMessage = {
  id: string
  direction: ChatDirection
  text: string
  timestamp: number
  /** Delivery state for our own messages: pending → sent/delivered/read. */
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
}

export type Chat = {
  id: string
  phone: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export const isTextIncoming = (n: NotificationBody): boolean =>
  n.typeWebhook === 'incomingMessageReceived' &&
  n.messageData?.typeMessage === 'textMessage' &&
  typeof n.messageData?.textMessageData?.textMessage === 'string'

export const isTextOutgoingApi = (n: NotificationBody): boolean =>
  n.typeWebhook === 'outgoingAPIMessageReceived' &&
  n.messageData?.typeMessage === 'textMessage' &&
  typeof n.messageData?.textMessageData?.textMessage === 'string'

export const isOutgoingStatus = (n: NotificationBody): boolean => n.typeWebhook === 'outgoingMessageStatus'
