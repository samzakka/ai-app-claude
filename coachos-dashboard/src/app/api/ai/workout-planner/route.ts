import { NextResponse } from 'next/server'
import {
  AI_WORKOUT_ADJUSTMENT_SCHEMA,
  AI_WORKOUT_PLANNER_SCHEMA,
  buildAIWorkoutAdjustmentPrompt,
  buildAIWorkoutPlannerPrompt,
  normalizeWorkoutAdjustmentDraft,
  normalizeWorkoutPlannerDraft,
  type AIWorkoutPlannerInput,
} from '@/lib/ai-workout-planner'

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

type WorkoutPlannerMode = 'generate' | 'adjust'

type WorkoutPlannerRequestInput = AIWorkoutPlannerInput & {
  mode?: WorkoutPlannerMode
}

function isValidInput(input: unknown): input is WorkoutPlannerRequestInput {
  if (!input || typeof input !== 'object') return false

  const candidate = input as Partial<WorkoutPlannerRequestInput>
  const mode = candidate.mode ?? 'generate'

  return (
    !!candidate.client &&
    typeof candidate.client.id === 'string' &&
    typeof candidate.client.fullName === 'string' &&
    typeof candidate.client.status === 'string' &&
    typeof candidate.client.joinedAt === 'string' &&
    Array.isArray(candidate.client.goals) &&
    Array.isArray(candidate.client.notes) &&
    typeof candidate.assistanceLevel === 'string' &&
    (mode === 'generate' || mode === 'adjust') &&
    (candidate.assistanceLevel === 'low' ||
      candidate.assistanceLevel === 'medium' ||
      candidate.assistanceLevel === 'high') &&
    !!candidate.currentWorkoutPlan &&
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

export async function POST(request: Request) {
  const openAIApiKey = process.env.OPENAI_API_KEY

  if (!openAIApiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured for AI workout planning.' },
      { status: 500 },
    )
  }

  const body = await request.json().catch(() => null)
  const input = body?.input

  if (!isValidInput(input)) {
    return NextResponse.json({ error: 'Invalid AI workout planner input.' }, { status: 400 })
  }

  const model = process.env.OPENAI_WORKOUT_PLANNER_MODEL ?? 'gpt-5.4-mini'
  const mode = input.mode ?? 'generate'
  const prompt =
    mode === 'adjust'
      ? buildAIWorkoutAdjustmentPrompt(input)
      : buildAIWorkoutPlannerPrompt(input)
  const schema =
    mode === 'adjust'
      ? AI_WORKOUT_ADJUSTMENT_SCHEMA
      : AI_WORKOUT_PLANNER_SCHEMA
  const schemaName =
    mode === 'adjust'
      ? 'coachos_weekly_adjustment_engine'
      : 'coachos_ai_workout_planner'

  const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAIApiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          strict: true,
          schema,
        },
      },
    }),
  })

  const payload = (await openAIResponse.json().catch(() => null)) as ResponsesApiSuccess | null

  if (!openAIResponse.ok) {
    return NextResponse.json(
      { error: payload?.error?.message ?? 'Failed to generate AI workout plan.' },
      { status: openAIResponse.status || 502 },
    )
  }

  const outputText = payload ? extractOutputText(payload) : null

  if (!outputText) {
    return NextResponse.json(
      { error: 'AI workout planner returned an empty response.' },
      { status: 502 },
    )
  }

  let parsedDraft: unknown

  try {
    parsedDraft = JSON.parse(outputText) as unknown
  } catch {
    return NextResponse.json(
      { error: 'AI workout planner returned invalid JSON.' },
      { status: 502 },
    )
  }

  const draft =
    mode === 'adjust'
      ? normalizeWorkoutAdjustmentDraft(parsedDraft)
      : normalizeWorkoutPlannerDraft(parsedDraft)

  if (!draft) {
    return NextResponse.json(
      { error: 'AI workout planner returned an invalid response shape.' },
      { status: 502 },
    )
  }

  return NextResponse.json({
    draft,
    generatedAt: new Date().toISOString(),
    model,
  })
}
