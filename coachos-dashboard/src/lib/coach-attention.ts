import { getCheckInScheduleStatus, type CheckInSubmission, type CoachCheckInSettings } from '@/lib/check-ins'
import { type CoachPerformanceSummary } from '@/lib/client-performance-summary'
import { type HabitCompletionLog, getLocalDateString } from '@/lib/habit-completions'
import { type ClientMessage } from '@/lib/messages'
import { type WorkoutExerciseLog } from '@/lib/workout-logs'

type AttentionPriority = 'high' | 'medium' | 'low'

type AttentionAction = 'Review check-in' | 'Send message' | 'Adjust workout plan' | 'Follow up on adherence'

export type CoachAttentionItem = {
  clientId: string
  clientName: string
  priority: AttentionPriority
  score: number
  reasons: string[]
  suggestedNextAction: AttentionAction
}

type CoachAttentionInput = {
  client: {
    id: string
    full_name: string
  }
  checkInSettings: CoachCheckInSettings
  checkInSubmissions: CheckInSubmission[]
  performanceSummary: CoachPerformanceSummary
  workoutLogs: WorkoutExerciseLog[]
  habitLogs: HabitCompletionLog[]
  messages: ClientMessage[]
  now?: Date
}

type AttentionSignal = {
  points: number
  reason: string
  action: AttentionAction
}

const PRIORITY_THRESHOLDS = {
  high: 7,
  medium: 4,
  low: 2,
} as const

function parseNumericRating(content: Record<string, unknown>, key: string) {
  const raw = content[key]

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw
  }

  if (typeof raw === 'string') {
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function getCompactCheckInNotes(submission: CheckInSubmission | null) {
  if (!submission) return ''

  return [
    typeof submission.content.wins_challenges === 'string' ? submission.content.wins_challenges : '',
    typeof submission.content.text_update === 'string' ? submission.content.text_update : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
}

function hasNegativeCheckInText(notes: string) {
  if (!notes) return false

  return [
    /\bstress(?:ed)?\b/i,
    /\boverwhelm(?:ed)?\b/i,
    /\bbusy\b/i,
    /\bexhaust(?:ed|ing)?\b/i,
    /\bdrained\b/i,
    /\btired\b/i,
    /\bmiss(?:ed|ing)?\b/i,
    /\boff track\b/i,
    /\bstruggl(?:e|ing)\b/i,
    /\bhard week\b/i,
    /\brough week\b/i,
    /\bcan'?t\b/i,
    /\bunmotivated\b/i,
    /\bburn(?:ed)? out\b/i,
  ].some((pattern) => pattern.test(notes))
}

function getUnreadClientMessageCount(messages: ClientMessage[]) {
  return messages.filter((message) => message.sender === 'client' && !message.read).length
}

function getLatestClientActivityAt(input: {
  checkInSubmissions: CheckInSubmission[]
  workoutLogs: WorkoutExerciseLog[]
  habitLogs: HabitCompletionLog[]
  messages: ClientMessage[]
}) {
  const candidates = [
    ...input.checkInSubmissions
      .map((submission) => getCheckInSubmissionActivityAt(submission))
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ...input.workoutLogs.flatMap((entry) => [entry.completed_at, entry.updated_at, entry.created_at]),
    ...input.habitLogs.flatMap((entry) => [entry.completed_at, entry.updated_at, entry.created_at]),
    ...input.messages.map((message) => message.created_at),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)

  if (candidates.length === 0) return null

  return [...candidates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null
}

function getCheckInSubmissionActivityAt(submission: CheckInSubmission) {
  if (submission.submitted_at) return submission.submitted_at

  if (hasMeaningfulSubmissionActivity(submission)) {
    return submission.due_date ? `${submission.due_date}T00:00:00.000Z` : null
  }

  return null
}

function hasMeaningfulSubmissionActivity(submission: CheckInSubmission) {
  const activityKeys = [
    'energy',
    'stress',
    'sleep',
    'workout_adherence',
    'habit_adherence',
    'wins_challenges',
    'text_update',
  ] as const

  return activityKeys.some((key) => {
    const value = submission.content[key]

    if (typeof value === 'string') return value.trim().length > 0
    return value !== undefined && value !== null
  })
}

function getDaysSince(value: string, now: Date) {
  const msPerDay = 86400000
  return Math.floor((now.getTime() - new Date(value).getTime()) / msPerDay)
}

function getPriority(score: number): AttentionPriority | null {
  if (score >= PRIORITY_THRESHOLDS.high) return 'high'
  if (score >= PRIORITY_THRESHOLDS.medium) return 'medium'
  if (score >= PRIORITY_THRESHOLDS.low) return 'low'
  return null
}

function choosePrimarySignal(signals: AttentionSignal[]) {
  return [...signals].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return a.reason.localeCompare(b.reason)
  })[0] ?? null
}

function chooseTopReasons(signals: AttentionSignal[]) {
  const seenReasons = new Set<string>()

  return [...signals]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return a.reason.localeCompare(b.reason)
    })
    .filter((signal) => {
      if (seenReasons.has(signal.reason)) return false
      seenReasons.add(signal.reason)
      return true
    })
    .slice(0, 2)
    .map((signal) => signal.reason)
}

export function buildCoachAttentionItem(input: CoachAttentionInput): CoachAttentionItem | null {
  const now = input.now ?? new Date()
  const signals: AttentionSignal[] = []
  const latestSubmission = input.checkInSubmissions[0] ?? null

  console.log('DEBUG', {
  client: input.client.full_name,
  latestSubmission,
  content: latestSubmission?.content,
})
  const latestCheckInNotes = getCompactCheckInNotes(latestSubmission)
  const unreadClientMessageCount = getUnreadClientMessageCount(input.messages)
  const schedule = getCheckInScheduleStatus(input.checkInSettings, latestSubmission?.submitted_at ?? null, now)
  const latestActivityAt = getLatestClientActivityAt(input)

  if (schedule.isDue) {
    const overdueDays = getDaysSince(schedule.dueDate.toISOString(), now)
    signals.push({
      points: 3,
      reason: overdueDays > 0
        ? `Check-in overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}.`
        : `Check-in is due today.`,
      action: 'Send message',
    })
  }

  if (input.performanceSummary.workout.assignedThisWeek > 0) {
    if (input.performanceSummary.workout.completionPercentage < 50) {
      signals.push({
        points: 3,
        reason: `Workout adherence is low at ${input.performanceSummary.workout.completionPercentage}%.`,
        action: 'Adjust workout plan',
      })
    } else if (input.performanceSummary.workout.completionPercentage < 80) {
      signals.push({
        points: 1,
        reason: `Workout adherence is slipping at ${input.performanceSummary.workout.completionPercentage}%.`,
        action: 'Follow up on adherence',
      })
    }
  }

  if (input.performanceSummary.habits.totalPossibleThisWeek > 0) {
    if (input.performanceSummary.habits.completionPercentage < 60) {
      signals.push({
        points: 2,
        reason: `Habit adherence is low at ${input.performanceSummary.habits.completionPercentage}%.`,
        action: 'Follow up on adherence',
      })
    } else if (input.performanceSummary.habits.completionPercentage < 80) {
      signals.push({
        points: 1,
        reason: `Habit adherence is below target at ${input.performanceSummary.habits.completionPercentage}%.`,
        action: 'Follow up on adherence',
      })
    }
  }

  if (input.performanceSummary.risk.level === 'High') {
    signals.push({
      points: 3,
      reason: 'Risk level is high based on recent adherence and check-in signals.',
      action: 'Review check-in',
    })
  } else if (input.performanceSummary.risk.level === 'Medium') {
    signals.push({
      points: 1,
      reason: 'Risk level is medium and worth reviewing this week.',
      action: 'Review check-in',
    })
  }

  if (latestSubmission) {
    const energy = parseNumericRating(latestSubmission.content, 'energy')
    const stress = parseNumericRating(latestSubmission.content, 'stress')
    const workoutAdherence = parseNumericRating(latestSubmission.content, 'workout_adherence')
    const habitAdherence = parseNumericRating(latestSubmission.content, 'habit_adherence')
    const sleep = parseNumericRating(latestSubmission.content, 'sleep')

    if (energy !== null && energy <= 2) {
      signals.push({
        points: 3,
        reason: 'Client energy is very low in the latest check-in.',
        action: 'Review check-in',
      })
    } else if (energy !== null && energy <= 4) {
      signals.push({
        points: 2,
        reason: 'Client energy is low in the latest check-in.',
        action: 'Review check-in',
      })
    }

    if (stress !== null && stress >= 9) {
      signals.push({
        points: 3,
        reason: 'Client reported very high stress in the latest check-in.',
        action: 'Review check-in',
      })
    } else if (stress !== null && stress >= 7) {
      signals.push({
        points: 2,
        reason: 'Client reported high stress in the latest check-in.',
        action: 'Review check-in',
      })
    }

    if (sleep !== null && sleep <= 2) {
      signals.push({
        points: 1,
        reason: `Latest check-in shows weak sleep at ${sleep}/5.`,
        action: 'Review check-in',
      })
    }

    if (workoutAdherence !== null && workoutAdherence <= 1) {
      signals.push({
        points: 3,
        reason: 'Client rated workout adherence as very low in the latest check-in.',
        action: 'Follow up on adherence',
      })
    } else if (workoutAdherence !== null && workoutAdherence <= 2) {
      signals.push({
        points: 2,
        reason: 'Client rated workout adherence as poor in the latest check-in.',
        action: 'Follow up on adherence',
      })
    }

    if (habitAdherence !== null && habitAdherence <= 1) {
      signals.push({
        points: 3,
        reason: 'Client rated habit adherence as very low in the latest check-in.',
        action: 'Follow up on adherence',
      })
    } else if (habitAdherence !== null && habitAdherence <= 2) {
      signals.push({
        points: 2,
        reason: 'Client rated habit adherence as poor in the latest check-in.',
        action: 'Follow up on adherence',
      })
    }

    if (hasNegativeCheckInText(latestCheckInNotes)) {
      signals.push({
        points: 2,
        reason: 'Latest check-in text suggests friction, stress, or missed follow-through.',
        action: 'Review check-in',
      })
    }
  }

  if (unreadClientMessageCount > 0) {
    signals.push({
      points: unreadClientMessageCount >= 2 ? 3 : 2,
      reason:
        unreadClientMessageCount === 1
          ? 'Client has 1 unread message waiting for review.'
          : `Client has ${unreadClientMessageCount} unread messages waiting for review.`,
      action: 'Send message',
    })
  }

  if (latestActivityAt) {
  const daysSinceActivity = getDaysSince(latestActivityAt, now)

  if (daysSinceActivity >= 10) {
    signals.push({
      points: 3,
      reason: `No recent client activity in the last ${daysSinceActivity} days.`,
      action: 'Send message',
    })
  } else if (daysSinceActivity >= 6) {
    signals.push({
      points: 1,
      reason: `Client activity has been quiet for ${daysSinceActivity} days.`,
      action: 'Send message',
    })
  }
}


  const totalScore = signals.reduce((sum, signal) => sum + signal.points, 0)
  const priority = getPriority(totalScore)
  const primarySignal = choosePrimarySignal(signals)
  const topReasons = chooseTopReasons(signals)


  const totalPoints = signals.reduce((sum, s) => sum + s.points, 0)

console.log('SCORE DEBUG', {
  client: input.client.full_name,
  signals,
  totalPoints,
})
  if (!priority || !primarySignal || topReasons.length === 0) return null

  return {
    clientId: input.client.id,
    clientName: input.client.full_name,
    priority,
    score: totalScore,
    reasons: topReasons,
    suggestedNextAction: primarySignal.action,
  }
}

export function sortCoachAttentionItems(items: CoachAttentionItem[]) {
  const priorityRank: Record<AttentionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  }

  return [...items].sort((a, b) => {
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority]
    }

    if (b.score !== a.score) return b.score - a.score

    return a.clientName.localeCompare(b.clientName)
  })
}

export function getAttentionSummaryLabel(items: CoachAttentionItem[]) {
  const total = items.length

  if (total === 0) return 'No clients need attention right now'
  if (total === 1) return '1 client needs attention today'

  return `${total} clients need attention today`
}

export function getAttentionRefreshKey(now = new Date()) {
  return getLocalDateString(now)
}
