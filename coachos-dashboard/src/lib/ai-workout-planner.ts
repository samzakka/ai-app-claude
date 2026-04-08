import type { CheckInAnalysis } from '@/lib/check-in-analysis'
import type { CoachPerformanceSummary } from '@/lib/client-performance-summary'

export type WorkoutPlannerDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type WorkoutPlannerEntry = {
  exercise: string
  sets: string
  reps: string
  notes: string
}

export type WorkoutPlannerWeeklyPlan = Record<WorkoutPlannerDay, WorkoutPlannerEntry[]>

export type WorkoutPlannerAssistanceLevel = 'low' | 'medium' | 'high'

export type AIWorkoutPlannerInput = {
  client: {
    id: string
    fullName: string
    status: string
    joinedAt: string
    goals: string[]
    notes: string[]
  }
  assistanceLevel: WorkoutPlannerAssistanceLevel
  currentWorkoutPlan: WorkoutPlannerWeeklyPlan
  performanceSummary: CoachPerformanceSummary
  checkInAnalysis: CheckInAnalysis
}

export type AIWorkoutAdjustmentDecision = 'progress' | 'maintain' | 'reduce' | 'deload'

export type AIWorkoutPlannerDraft = {
  summary: string
  rationale: string[]
  weeklyPlan: WorkoutPlannerWeeklyPlan
}

export type AIWorkoutAdjustmentDraft = {
  summary: string
  decision: AIWorkoutAdjustmentDecision
  reasoning: string[]
  adjustments: string[]
  updatedWeeklyPlan: WorkoutPlannerWeeklyPlan
}

export const EMPTY_WORKOUT_PLANNER_WEEK: WorkoutPlannerWeeklyPlan = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
}

export const AI_WORKOUT_PLANNER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: {
      type: 'string',
      description: 'A short summary of the generated plan and how aggressive or conservative it is.',
    },
    rationale: {
      type: 'array',
      items: { type: 'string' },
      description: 'A few short reasons tied to the client context.',
    },
    weeklyPlan: {
      type: 'object',
      additionalProperties: false,
      properties: {
        monday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        tuesday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        wednesday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        thursday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        friday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        saturday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        sunday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
      },
      required: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
  },
  required: ['summary', 'rationale', 'weeklyPlan'],
} as const

export const AI_WORKOUT_ADJUSTMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: {
      type: 'string',
      description: 'A short summary of the weekly adjustment recommendation.',
    },
    decision: {
      type: 'string',
      enum: ['progress', 'maintain', 'reduce', 'deload'],
      description: 'The overall weekly adjustment decision.',
    },
    reasoning: {
      type: 'array',
      items: { type: 'string' },
      description: 'Short reasons tied to adherence, recovery, and recent trend data.',
    },
    adjustments: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific changes the coach can review before applying.',
    },
    updatedWeeklyPlan: {
      type: 'object',
      additionalProperties: false,
      properties: {
        monday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        tuesday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        wednesday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        thursday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        friday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        saturday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
        sunday: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              exercise: { type: 'string' },
              sets: { type: 'string' },
              reps: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['exercise', 'sets', 'reps', 'notes'],
          },
        },
      },
      required: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
  },
  required: ['summary', 'decision', 'reasoning', 'adjustments', 'updatedWeeklyPlan'],
} as const

export function normalizeWorkoutPlannerDraft(input: unknown): AIWorkoutPlannerDraft | null {
  if (!input || typeof input !== 'object') return null

  const raw = input as Partial<AIWorkoutPlannerDraft>

  if (
    typeof raw.summary !== 'string' ||
    !Array.isArray(raw.rationale) ||
    !raw.rationale.every((entry) => typeof entry === 'string') ||
    !raw.weeklyPlan ||
    typeof raw.weeklyPlan !== 'object'
  ) {
    return null
  }

  const weeklyPlan = normalizeWorkoutPlannerWeeklyPlan(raw.weeklyPlan)

  return {
    summary: raw.summary,
    rationale: raw.rationale,
    weeklyPlan,
  }
}

export function normalizeWorkoutAdjustmentDraft(input: unknown): AIWorkoutAdjustmentDraft | null {
  if (!input || typeof input !== 'object') return null

  const raw = input as Partial<AIWorkoutAdjustmentDraft>

  if (
    typeof raw.summary !== 'string' ||
    !isAdjustmentDecision(raw.decision) ||
    !Array.isArray(raw.reasoning) ||
    !raw.reasoning.every((entry) => typeof entry === 'string') ||
    !Array.isArray(raw.adjustments) ||
    !raw.adjustments.every((entry) => typeof entry === 'string') ||
    !raw.updatedWeeklyPlan ||
    typeof raw.updatedWeeklyPlan !== 'object'
  ) {
    return null
  }

  return {
    summary: raw.summary,
    decision: raw.decision,
    reasoning: raw.reasoning,
    adjustments: raw.adjustments,
    updatedWeeklyPlan: normalizeWorkoutPlannerWeeklyPlan(raw.updatedWeeklyPlan),
  }
}

export function normalizeWorkoutPlannerWeeklyPlan(input: unknown): WorkoutPlannerWeeklyPlan {
  if (!input || typeof input !== 'object') {
    return { ...EMPTY_WORKOUT_PLANNER_WEEK }
  }

  const raw = input as Partial<Record<WorkoutPlannerDay, unknown>>
  const nextPlan = { ...EMPTY_WORKOUT_PLANNER_WEEK }
  const days: WorkoutPlannerDay[] = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ]

  for (const day of days) {
    const entries = Array.isArray(raw[day]) ? raw[day] : []
    nextPlan[day] = entries
      .map((entry) => normalizeWorkoutPlannerEntry(entry))
      .filter((entry): entry is WorkoutPlannerEntry => entry !== null)
  }

  return nextPlan
}

function normalizeWorkoutPlannerEntry(input: unknown): WorkoutPlannerEntry | null {
  if (!input || typeof input !== 'object') return null

  const raw = input as Partial<WorkoutPlannerEntry>

  return {
    exercise: typeof raw.exercise === 'string' ? raw.exercise : '',
    sets: typeof raw.sets === 'string' ? raw.sets : '',
    reps: typeof raw.reps === 'string' ? raw.reps : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  }
}

function isAdjustmentDecision(value: unknown): value is AIWorkoutAdjustmentDecision {
  return (
    value === 'progress' ||
    value === 'maintain' ||
    value === 'reduce' ||
    value === 'deload'
  )
}

function formatWeight(value: number | null) {
  if (value === null) return 'not available'
  return Number.isInteger(value) ? `${value.toFixed(0)} lb` : `${value.toFixed(1)} lb`
}

function formatWeightChange(value: number | null) {
  if (value === null) return 'not available'
  if (value === 0) return '0 lb'

  const prefix = value > 0 ? '+' : ''
  return Number.isInteger(value) ? `${prefix}${value.toFixed(0)} lb` : `${prefix}${value.toFixed(1)} lb`
}

export function buildAIWorkoutPlannerPrompt(input: AIWorkoutPlannerInput) {
  const assistanceInstructions = {
    low: [
      'Focus on suggesting weekly structure and exercise selection only.',
      'Keep sets and reps light-touch and optional when possible.',
      'Use notes to explain intent, but do not over-prescribe.',
    ],
    medium: [
      'Suggest exercises and give practical sets/reps for the main work.',
      'Keep the week realistic and easy for a coach to edit.',
      'Use notes to call out intensity or substitutions when useful.',
    ],
    high: [
      'Generate a fuller weekly draft that a coach can review and then save manually.',
      'Include exercises, sets, reps, and clear notes/intensity guidance for active days.',
      'Still avoid overloading the client or making the week feel overwhelming.',
    ],
  }[input.assistanceLevel]

  return `
You are the AI Workout Planner inside CoachOS, an AI-powered coaching platform for online fitness coaches.

Product rules:
- You are assistive only.
- You must never imply that the workout plan has already been saved.
- You must never imply that the plan will be sent automatically to the client.
- Keep the plan practical, editable, and simple.
- Respect adherence and recovery signals. If the client is struggling, simplify rather than expand.
- Use rest days when appropriate. Do not force all 7 days to contain workouts.

Assistance level: ${input.assistanceLevel}
Instructions for this level:
${assistanceInstructions.map((line) => `- ${line}`).join('\n')}

Return a JSON object matching the provided schema.

Client context:
- Name: ${input.client.fullName}
- Status: ${input.client.status}
- Joined: ${input.client.joinedAt}
- Goals: ${input.client.goals.length > 0 ? input.client.goals.join(' | ') : 'No explicit goals available'}
- Notes: ${input.client.notes.length > 0 ? input.client.notes.join(' | ') : 'No additional client notes available'}

Current workout plan:
${JSON.stringify(input.currentWorkoutPlan, null, 2)}

Performance summary:
${JSON.stringify(input.performanceSummary, null, 2)}

Check-in analysis:
${JSON.stringify(input.checkInAnalysis, null, 2)}

Output guidance:
- summary: 1 to 3 sentences.
- rationale: 2 to 5 short bullets.
- weeklyPlan: match monday through sunday using arrays of { exercise, sets, reps, notes }.
- Empty arrays are valid for rest days.
- Notes should be concise and coach-friendly.
- For low assistance, prioritize exercise structure and keep sets/reps minimal if uncertain.
- For medium assistance, include practical sets/reps on active days.
- For high assistance, generate the most complete weekly draft while staying realistic and low-friction.
`.trim()
}

export function buildAIWorkoutAdjustmentPrompt(input: AIWorkoutPlannerInput) {
  const { client, performanceSummary, checkInAnalysis } = input
  const { weightTrend } = checkInAnalysis

  return `
You are the Weekly Adjustment Engine inside CoachOS, an AI-powered coaching platform for online fitness coaches.

Product rules:
- You are suggestion-only.
- You must never imply that the adjustment has already been applied or saved.
- You must never replace the existing plan from scratch unless the current plan clearly needs a major reduction such as a deload.
- Modify the current plan conservatively and keep the week practical, editable, and low-friction.
- Respect adherence and recovery signals. If execution or recovery is weak, reduce complexity before adding more work.
- Prefer small, explainable changes over dramatic rewrites.

Return a JSON object matching the provided schema.

Decision guidance:
- progress: use when adherence and recovery support a reasonable progression.
- maintain: use when the current structure is working and only light tweaks are needed.
- reduce: use when volume, complexity, or exercise selection should be pulled back.
- deload: use when recovery, stress, or recent signals suggest a clear need for a lighter week.

Client context:
- Name: ${client.fullName}
- Status: ${client.status}
- Joined: ${client.joinedAt}
- Goals: ${client.goals.length > 0 ? client.goals.join(' | ') : 'No explicit goals available'}
- Notes: ${client.notes.length > 0 ? client.notes.join(' | ') : 'No additional client notes available'}

Current workout plan:
${JSON.stringify(input.currentWorkoutPlan, null, 2)}

Workout adherence signals:
${JSON.stringify(performanceSummary.workout, null, 2)}

Habit adherence signals:
${JSON.stringify(performanceSummary.habits, null, 2)}

Risk signals:
${JSON.stringify(performanceSummary.risk, null, 2)}

Weight trend:
${JSON.stringify(
    {
      start: formatWeight(weightTrend.startingWeight),
      current: formatWeight(weightTrend.currentWeight),
      totalChange: formatWeightChange(weightTrend.totalChange),
      recentChange: formatWeightChange(weightTrend.recentChange),
      latestCheckInDate: weightTrend.latestCheckInDate,
      previousCheckInDate: weightTrend.previousCheckInDate,
    },
    null,
    2,
  )}

Check-in analysis:
${JSON.stringify(checkInAnalysis.sections, null, 2)}

Output guidance:
- summary: 1 to 3 sentences.
- decision: exactly one of progress, maintain, reduce, deload.
- reasoning: 2 to 5 short bullets tied to the available data.
- adjustments: 2 to 6 short bullets describing the exact plan edits.
- updatedWeeklyPlan: reuse monday through sunday with arrays of { exercise, sets, reps, notes }.
- Keep as much of the current weekly structure as reasonably possible.
- Empty arrays are valid for rest days.
- Notes should stay concise and coach-friendly.
`.trim()
}
