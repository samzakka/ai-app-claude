import type { CheckInAnalysis } from '@/lib/check-in-analysis'
import type { CoachPerformanceSummary } from '@/lib/client-performance-summary'

export type AICoachingAssistantInput = {
  client: {
    id: string
    fullName: string
    status: string
    joinedAt: string
  }
  performanceSummary: CoachPerformanceSummary
  checkInAnalysis: CheckInAnalysis
}

export type AICoachingAssistantSuggestion = {
  summary: string
  keyIssues: string[]
  recommendations: string[]
  suggestedCoachMessage: string
}

export const AI_COACHING_ASSISTANT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: {
      type: 'string',
      description: 'A short overview of the client status for the coach.',
    },
    keyIssues: {
      type: 'array',
      items: { type: 'string' },
      description: 'Key issues or watchouts the coach should review.',
    },
    recommendations: {
      type: 'array',
      items: { type: 'string' },
      description: 'Specific, coach-reviewable suggestions only. Never imply auto-application.',
    },
    suggestedCoachMessage: {
      type: 'string',
      description: 'A concise draft message the coach could optionally send to the client.',
    },
  },
  required: ['summary', 'keyIssues', 'recommendations', 'suggestedCoachMessage'],
} as const

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

export function buildAICoachingAssistantPrompt(input: AICoachingAssistantInput) {
  const { client, performanceSummary, checkInAnalysis } = input
  const { weightTrend } = checkInAnalysis

  return `
You are the AI Coaching Assistant inside CoachOS, an AI-powered coaching platform for online fitness coaches.

Product rules:
- You are suggestion-only.
- You must never imply that a plan change has already been applied.
- You must never imply that a message has already been sent to the client.
- Keep recommendations simple, practical, and coach-reviewable.
- Prefer maintaining the current plan when the data is mixed or insufficient instead of overreacting.
- Only suggest nutrition changes if the current signals clearly justify reviewing nutrition.
- The client experience should stay motivating and low-friction, not overwhelming.

Return a JSON object matching the provided schema.

Client context:
- Name: ${client.fullName}
- Status: ${client.status}
- Joined: ${client.joinedAt}

Workout adherence summary:
${JSON.stringify(performanceSummary.workout, null, 2)}

Habit adherence summary:
${JSON.stringify(performanceSummary.habits, null, 2)}

Risk summary:
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
- summary: 1 to 3 sentences, concise and specific.
- keyIssues: 2 to 5 short bullets.
- recommendations: 2 to 5 specific draft suggestions for the coach to review, covering training, habits, nutrition, or monitoring only when justified by the data.
- suggestedCoachMessage: 3 to 6 sentences, supportive, clear, and realistic. It should sound like a draft the coach could send after review, not an automated system message.
`.trim()
}
