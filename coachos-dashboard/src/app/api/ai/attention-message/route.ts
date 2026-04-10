import { NextResponse } from 'next/server'
import {
  AI_ATTENTION_MESSAGE_SCHEMA,
  buildAIAttentionMessagePrompt,
  type AIAttentionMessageInput,
  type AIAttentionMessageSuggestion,
} from '@/lib/ai-attention-message'

type ResponsesApiSuccess = {
  output_text?: string
  output?: Array<{
    content?: Array<{
      text?: string
    }>
  }>
  error?: {
    message?: string
  }
}

function isValidInput(input: unknown): input is AIAttentionMessageInput {
  if (!input || typeof input !== 'object') return false

  const candidate = input as Partial<AIAttentionMessageInput>

  return (
    !!candidate.client &&
    typeof candidate.client.id === 'string' &&
    typeof candidate.client.fullName === 'string' &&
    !!candidate.attention &&
    Array.isArray(candidate.attention.reasons) &&
    candidate.attention.reasons.every((item) => typeof item === 'string') &&
    typeof candidate.attention.suggestedNextAction === 'string' &&
    Array.isArray(candidate.recentContext) &&
    candidate.recentContext.every((item) => typeof item === 'string') &&
    (candidate.latestCheckIn === null ||
      typeof candidate.latestCheckIn === 'undefined' ||
      typeof candidate.latestCheckIn === 'object')
  )
}

function extractOutputText(payload: ResponsesApiSuccess) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }

  if (!Array.isArray(payload.output)) return null

  for (const item of payload.output) {
    if (!Array.isArray(item.content)) continue

    for (const content of item.content) {
      if (typeof content.text === 'string' && content.text.trim()) {
        return content.text
      }
    }
  }

  return null
}

function isValidSuggestion(payload: unknown): payload is AIAttentionMessageSuggestion {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as Partial<AIAttentionMessageSuggestion>
  return typeof candidate.draftMessage === 'string'
}

export async function POST(request: Request) {
  const openAIApiKey = process.env.OPENAI_API_KEY

  if (!openAIApiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured for AI attention message drafts.' },
      { status: 500 },
    )
  }

  const body = await request.json().catch(() => null)
  const input = body?.input

  if (!isValidInput(input)) {
    return NextResponse.json({ error: 'Invalid AI attention message input.' }, { status: 400 })
  }

  const model = process.env.OPENAI_COACHING_MODEL ?? 'gpt-5.4-mini'

  const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAIApiKey}`,
    },
    body: JSON.stringify({
      model,
      input: buildAIAttentionMessagePrompt(input),
      text: {
        format: {
          type: 'json_schema',
          name: 'coachos_attention_message_draft',
          strict: true,
          schema: AI_ATTENTION_MESSAGE_SCHEMA,
        },
      },
    }),
  })

  const payload = (await openAIResponse.json().catch(() => null)) as ResponsesApiSuccess | null

  if (!openAIResponse.ok) {
    return NextResponse.json(
      { error: payload?.error?.message ?? 'Failed to generate an AI attention message draft.' },
      { status: openAIResponse.status || 502 },
    )
  }

  const outputText = payload ? extractOutputText(payload) : null

  if (!outputText) {
    return NextResponse.json(
      { error: 'AI attention message draft returned an empty response.' },
      { status: 502 },
    )
  }

  let parsedSuggestion: unknown

  try {
    parsedSuggestion = JSON.parse(outputText) as unknown
  } catch {
    return NextResponse.json(
      { error: 'AI attention message draft returned invalid JSON.' },
      { status: 502 },
    )
  }

  if (!isValidSuggestion(parsedSuggestion)) {
    return NextResponse.json(
      { error: 'AI attention message draft returned an invalid response shape.' },
      { status: 502 },
    )
  }

  return NextResponse.json({
    suggestion: parsedSuggestion,
    generatedAt: new Date().toISOString(),
    model,
  })
}
