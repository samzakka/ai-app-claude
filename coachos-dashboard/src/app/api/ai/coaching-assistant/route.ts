import { NextResponse } from 'next/server'
import {
  AI_COACHING_ASSISTANT_SCHEMA,
  buildAICoachingAssistantPrompt,
  type AICoachingAssistantInput,
  type AICoachingAssistantSuggestion,
} from '@/lib/ai-coaching-assistant'

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

function isValidInput(input: unknown): input is AICoachingAssistantInput {
  if (!input || typeof input !== 'object') return false

  const candidate = input as Partial<AICoachingAssistantInput>

  return (
    !!candidate.client &&
    typeof candidate.client.id === 'string' &&
    typeof candidate.client.fullName === 'string' &&
    typeof candidate.client.status === 'string' &&
    typeof candidate.client.joinedAt === 'string' &&
    !!candidate.performanceSummary &&
    !!candidate.checkInAnalysis
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

function isValidSuggestion(payload: unknown): payload is AICoachingAssistantSuggestion {
  if (!payload || typeof payload !== 'object') return false

  const candidate = payload as Partial<AICoachingAssistantSuggestion>

  return (
    typeof candidate.summary === 'string' &&
    Array.isArray(candidate.keyIssues) &&
    candidate.keyIssues.every((item) => typeof item === 'string') &&
    Array.isArray(candidate.recommendations) &&
    candidate.recommendations.every((item) => typeof item === 'string') &&
    typeof candidate.suggestedCoachMessage === 'string'
  )
}

export async function POST(request: Request) {
  const openAIApiKey = process.env.OPENAI_API_KEY

  if (!openAIApiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured for AI coaching suggestions.' },
      { status: 500 },
    )
  }

  const body = await request.json().catch(() => null)
  const input = body?.input

  if (!isValidInput(input)) {
    return NextResponse.json({ error: 'Invalid AI coaching assistant input.' }, { status: 400 })
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
      input: buildAICoachingAssistantPrompt(input),
      text: {
        format: {
          type: 'json_schema',
          name: 'coachos_ai_coaching_assistant',
          strict: true,
          schema: AI_COACHING_ASSISTANT_SCHEMA,
        },
      },
    }),
  })

  const payload = (await openAIResponse.json().catch(() => null)) as ResponsesApiSuccess | null

  if (!openAIResponse.ok) {
    return NextResponse.json(
      { error: payload?.error?.message ?? 'Failed to generate AI coaching suggestions.' },
      { status: openAIResponse.status || 502 },
    )
  }

  const outputText = payload ? extractOutputText(payload) : null

  if (!outputText) {
    return NextResponse.json(
      { error: 'AI coaching suggestions returned an empty response.' },
      { status: 502 },
    )
  }

  let parsedSuggestion: unknown

  try {
    parsedSuggestion = JSON.parse(outputText) as unknown
  } catch {
    return NextResponse.json(
      { error: 'AI coaching suggestions returned invalid JSON.' },
      { status: 502 },
    )
  }

  if (!isValidSuggestion(parsedSuggestion)) {
    return NextResponse.json(
      { error: 'AI coaching suggestions returned an invalid response shape.' },
      { status: 502 },
    )
  }

  return NextResponse.json({
    suggestion: parsedSuggestion,
    generatedAt: new Date().toISOString(),
    model,
  })
}
