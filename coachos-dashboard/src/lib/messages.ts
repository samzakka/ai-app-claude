export type MessageSender = 'coach' | 'client'

export type ClientMessage = {
  id?: string
  coach_id: string | null
  client_id: string
  sender: MessageSender
  message_type: string | null
  content: string
  media_url: string | null
  media_duration_seconds: number | null
  read: boolean
  read_at: string | null
  was_ai_drafted: boolean
  created_at: string
}

export function normalizeClientMessage(input: unknown): ClientMessage | null {
  if (!input || typeof input !== 'object') return null

  const raw = input as Partial<ClientMessage>

  if (
    (raw.coach_id !== null && typeof raw.coach_id !== 'string' && typeof raw.coach_id !== 'undefined') ||
    typeof raw.client_id !== 'string' ||
    typeof raw.sender !== 'string' ||
    (raw.sender !== 'coach' && raw.sender !== 'client') ||
    typeof raw.content !== 'string' ||
    typeof raw.created_at !== 'string'
  ) {
    return null
  }

  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    coach_id: typeof raw.coach_id === 'string' ? raw.coach_id : null,
    client_id: raw.client_id,
    sender: raw.sender,
    message_type: typeof raw.message_type === 'string' ? raw.message_type : null,
    content: raw.content,
    media_url: typeof raw.media_url === 'string' ? raw.media_url : null,
    media_duration_seconds:
      typeof raw.media_duration_seconds === 'number' && Number.isFinite(raw.media_duration_seconds)
        ? raw.media_duration_seconds
        : null,
    read: raw.read === true,
    read_at: typeof raw.read_at === 'string' ? raw.read_at : null,
    was_ai_drafted: raw.was_ai_drafted === true,
    created_at: raw.created_at,
  }
}

export function normalizeClientMessages(input: unknown) {
  if (!Array.isArray(input)) return []

  return input
    .map((entry) => normalizeClientMessage(entry))
    .filter((entry): entry is ClientMessage => entry !== null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export function mergeClientMessage(
  messages: ClientMessage[],
  nextMessage: ClientMessage,
) {
  const withoutCurrent = messages.filter((entry) => {
    if (entry.id && nextMessage.id) return entry.id !== nextMessage.id

    return !(
      entry.client_id === nextMessage.client_id &&
      entry.sender === nextMessage.sender &&
      entry.created_at === nextMessage.created_at &&
      entry.content === nextMessage.content
    )
  })

  return [...withoutCurrent, nextMessage].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

export function getUnreadIncomingMessageIds(
  messages: ClientMessage[],
  viewer: MessageSender,
) {
  const incomingSender = viewer === 'coach' ? 'client' : 'coach'

  return messages
    .filter((message) => message.sender === incomingSender && !message.read && typeof message.id === 'string')
    .map((message) => message.id as string)
}

export function getUnreadIncomingMessageCount(
  messages: ClientMessage[],
  viewer: MessageSender,
) {
  return getUnreadIncomingMessageIds(messages, viewer).length
}

export function getLatestMessage(messages: ClientMessage[]) {
  return messages[messages.length - 1] ?? null
}

export function getMessagePreviewText(
  message: ClientMessage | null,
  maxLength = 72,
) {
  if (!message) return 'No messages yet.'

  const compact = message.content.replace(/\s+/g, ' ').trim()
  if (compact.length <= maxLength) return compact

  return `${compact.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}…`
}

export function getOutgoingMessageStatusLabel(
  message: ClientMessage,
  viewer: MessageSender,
) {
  if (message.sender !== viewer) return null

  return message.read ? 'Read' : 'Sent'
}
