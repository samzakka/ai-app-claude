import type { CheckInSubmission } from '@/lib/check-ins'

export type AnalysisSection = {
  title: string
  items: string[]
}

export type CheckInWeightTrend = {
  startingWeight: number | null
  currentWeight: number | null
  totalChange: number | null
  recentChange: number | null
  latestCheckInDate: string | null
  previousCheckInDate: string | null
}

export type CheckInAnalysis = {
  sections: AnalysisSection[]
  weightTrend: CheckInWeightTrend
}

const STARTING_WEIGHT_KEYS = [
  'starting_weight',
  'start_weight',
  'starting_weight_lb',
  'start_weight_lb',
  'initial_weight',
  'initial_weight_lb',
  'baseline_weight',
  'baseline_weight_lb',
  'weight',
]

function parseWeightValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const numeric = Number.parseFloat(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(numeric) ? numeric : null
}

function formatWeight(value: number | null) {
  if (value === null) return 'Not available'

  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
  return `${rounded} lb`
}

function formatWeightChange(value: number | null) {
  if (value === null) return 'Not available'
  if (value === 0) return '0 lb'

  const prefix = value > 0 ? '+' : ''
  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
  return `${prefix}${rounded} lb`
}

function getNumericRating(content: Record<string, unknown>, key: string) {
  const raw = content[key]
  if (typeof raw !== 'string') return null

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function getWeightHistory(submissions: CheckInSubmission[]) {
  return [...submissions]
    .map((submission) => ({
      submission,
      weight: parseWeightValue(submission.content.weight),
    }))
    .filter((entry): entry is { submission: CheckInSubmission; weight: number } => entry.weight !== null)
    .sort((a, b) => new Date(a.submission.submitted_at).getTime() - new Date(b.submission.submitted_at).getTime())
}

function getStartingWeightFromClient(clientRecord: Record<string, unknown> | null) {
  if (!clientRecord) return null

  for (const key of STARTING_WEIGHT_KEYS) {
    const weight = parseWeightValue(clientRecord[key])
    if (weight !== null) return weight
  }

  return null
}

function formatSubmissionDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function buildCheckInAnalysis(
  clientRecord: Record<string, unknown> | null,
  submissions: CheckInSubmission[],
): CheckInAnalysis {
  const latestSubmission = [...submissions]
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0] ?? null
  const weightHistory = getWeightHistory(submissions)
  const earliestWeight = weightHistory[0]?.weight ?? null
  const latestWeight = weightHistory[weightHistory.length - 1]?.weight ?? null
  const startingWeight = getStartingWeightFromClient(clientRecord) ?? earliestWeight
  const totalChange = startingWeight !== null && latestWeight !== null ? latestWeight - startingWeight : null

  const previousWeightEntry = weightHistory.length >= 2 ? weightHistory[weightHistory.length - 2] : null
  const recentChange = previousWeightEntry && latestWeight !== null
    ? latestWeight - previousWeightEntry.weight
    : null

  const recentTrendItems: string[] = []
  if (previousWeightEntry && latestWeight !== null) {
    const direction = recentChange === 0 ? 'held steady' : recentChange !== null && recentChange < 0 ? 'moved down' : 'moved up'
    recentTrendItems.push(
      `Weight ${direction} ${recentChange === 0 ? 'at the last check-in' : `by ${formatWeightChange(recentChange)}`} since ${formatSubmissionDate(previousWeightEntry.submission.submitted_at)}.`,
    )
  } else {
    recentTrendItems.push('Not enough recent weight check-ins yet to identify a weekly trend.')
  }

  const keyIssues = new Set<string>()
  const recommendations = new Set<string>()
  const currentStatus: string[] = []

  if (latestSubmission) {
    const latestDate = formatSubmissionDate(latestSubmission.submitted_at)
    currentStatus.push(`Latest check-in submitted on ${latestDate}.`)

    const energy = getNumericRating(latestSubmission.content, 'energy')
    const stress = getNumericRating(latestSubmission.content, 'stress')
    const hunger = getNumericRating(latestSubmission.content, 'hunger')
    const workoutAdherence = getNumericRating(latestSubmission.content, 'workout_adherence')
    const habitAdherence = getNumericRating(latestSubmission.content, 'habit_adherence')
    const sleep = getNumericRating(latestSubmission.content, 'sleep')

    const ratingsSummary = [
      energy !== null ? `Energy ${energy}/5` : null,
      stress !== null ? `Stress ${stress}/5` : null,
      hunger !== null ? `Hunger ${hunger}/5` : null,
      workoutAdherence !== null ? `Workout adherence ${workoutAdherence}/5` : null,
      sleep !== null ? `Sleep ${sleep}/5` : null,
      habitAdherence !== null ? `Habit adherence ${habitAdherence}/5` : null,
    ].filter(Boolean)

    if (ratingsSummary.length > 0) {
      currentStatus.push(ratingsSummary.join(' · '))
    }

    const latestNotes = [
      typeof latestSubmission.content.wins_challenges === 'string' ? latestSubmission.content.wins_challenges : '',
      typeof latestSubmission.content.text_update === 'string' ? latestSubmission.content.text_update : '',
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (stress !== null && stress >= 4) {
      keyIssues.add('Stress is elevated in the latest check-in.')
      recommendations.add('Coach should clarify workload and recovery stress before approving any training changes.')
    }

    if (energy !== null && energy <= 2) {
      keyIssues.add('Energy is low right now.')
      recommendations.add('Coach should review recovery habits and daily routine before changing the plan.')
    }

    if (sleep !== null && sleep <= 2) {
      keyIssues.add('Sleep quality or quantity looks weak.')
      recommendations.add('Coach should ask follow-up questions about bedtime, wake time, and routine consistency.')
    }

    if (workoutAdherence !== null && workoutAdherence <= 2) {
      keyIssues.add('Workout adherence is slipping.')
      recommendations.add('Coach should explore barriers and only simplify training if they approve that change.')
    }

    if (habitAdherence !== null && habitAdherence <= 2) {
      keyIssues.add('Habit adherence is currently low.')
      recommendations.add('Coach should reinforce one or two anchor habits instead of broad changes.')
    }

    if (hunger !== null && hunger >= 4) {
      keyIssues.add('Hunger is trending high.')
      recommendations.add('Coach should review meal structure and satiety signals before adjusting nutrition targets.')
    }

    if (latestNotes.includes('stress') || latestNotes.includes('overwhelmed') || latestNotes.includes('busy')) {
      keyIssues.add('Written update points to lifestyle stress or schedule pressure.')
      recommendations.add('Coach should respond with a low-friction plan for the coming week and confirm priorities.')
    }

    if (latestNotes.includes('missed')) {
      keyIssues.add('Client reported missed sessions or inconsistent execution.')
      recommendations.add('Coach should ask what specifically caused the misses before approving any program change.')
    }
  } else {
    currentStatus.push('No submitted check-ins yet, so the analyzer has no recent submission to review.')
  }

  if (startingWeight !== null && latestWeight !== null) {
    if (totalChange !== null && totalChange < 0) {
      currentStatus.push(`Long-term progress is moving down from the starting point by ${formatWeightChange(totalChange)}.`)
    } else if (totalChange !== null && totalChange > 0) {
      currentStatus.push(`Current weight is above the starting point by ${formatWeightChange(totalChange)}.`)
      keyIssues.add('Long-term scale trend is moving above the starting point.')
      recommendations.add('Coach should compare the scale trend against adherence, recovery, and phase expectations before adjusting the plan.')
    } else if (totalChange === 0) {
      currentStatus.push('Current weight is unchanged from the starting point.')
    }
  } else {
    currentStatus.push('Weight history is incomplete, so long-term scale progress is only partially available.')
  }

  if (recentChange !== null) {
    if (recentChange > 0) {
      keyIssues.add('Recent scale trend is moving upward.')
      recommendations.add('Coach should review recent adherence and context before deciding whether any intervention is needed.')
    } else if (recentChange === 0) {
      recommendations.add('Coach can treat the recent weight trend as stable and use adherence/context to guide next decisions.')
    }
  }

  if (keyIssues.size === 0) {
    keyIssues.add('No major risk flags surfaced from the latest structured check-in.')
  }

  if (recommendations.size === 0) {
    recommendations.add('Coach can reinforce current progress and decide manually whether the existing plan should stay as-is.')
  }

  return {
    sections: [
      {
        title: 'Starting Point',
        items: [
          `Started at ${formatWeight(startingWeight)}.`,
          `Currently ${formatWeight(latestWeight)}.`,
          `Total change: ${formatWeightChange(totalChange)}.`,
        ],
      },
      {
        title: 'Current Status',
        items: currentStatus,
      },
      {
        title: 'Recent Trend',
        items: recentTrendItems,
      },
      {
        title: 'Key Issues',
        items: [...keyIssues],
      },
      {
        title: 'Recommendations',
        items: [...recommendations],
      },
    ],
    weightTrend: {
      startingWeight,
      currentWeight: latestWeight,
      totalChange,
      recentChange,
      latestCheckInDate: latestSubmission?.submitted_at ?? null,
      previousCheckInDate: previousWeightEntry?.submission.submitted_at ?? null,
    },
  }
}
