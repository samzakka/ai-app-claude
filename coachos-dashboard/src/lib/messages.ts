export type MessageSenderType = 'coach' | 'client'

export type ClientMessage = {
  id?: string
  client_id: string
  sender_type: MessageSenderType
  content: string
  created_at: string
}

export function normalizeClientMessage(input: unknown): ClientMessage | null {
  if (!input || typeof input !== 'object') return null

  const raw = input as Partial<ClientMessage>

  if (
    typeof raw.client_id !== 'string' ||
    typeof raw.sender_type !== 'string' ||
    (raw.sender_type !== 'coach' && raw.sender_type !== 'client') ||
    typeof raw.content !== 'string' ||
    typeof raw.created_at !== 'string'
  ) {
    return null
  }

  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    client_id: raw.client_id,
    sender_type: raw.sender_type,
    content: raw.content,
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
  const withoutCurrent = messages.filter((entry) => entry.id !== nextMessage.id)

  return [...withoutCurrent, nextMessage].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}
