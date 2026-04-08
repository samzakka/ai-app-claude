import type { CheckInSubmission } from '@/lib/check-ins'
import { createHabitKey } from '@/lib/habit-completions'
import { createWorkoutExerciseKey } from '@/lib/workout-logs'

export type Day =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type WorkoutEntry = {
  exercise_key: string
  exercise: string
  sets: string
  reps: string
  notes: string
  substitutions: string[]
  rest_seconds: number | null
  allow_logged_weight: boolean
  allow_logged_reps: boolean
}

export type WeeklyPlan = Record<Day, WorkoutEntry[]>

export type HabitCategory =
  | 'Nutrition'
  | 'Training'
  | 'Recovery'
  | 'Lifestyle'
  | 'Mindset'
  | 'Supplements'
  | 'Other'

export type HabitEntry = {
  habit_key: string
  category: HabitCategory
  habit: string
  target: string
  frequency: string
}

export const DAYS: Day[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export const DAY_NAMES: Record<Day, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const EMPTY_WEEK: WeeklyPlan = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
}

const HABIT_CATEGORIES: HabitCategory[] = [
  'Nutrition',
  'Training',
  'Recovery',
  'Lifestyle',
  'Mindset',
  'Supplements',
  'Other',
]

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

function normalizeWorkoutSubstitutions(input: unknown) {
  if (!Array.isArray(input)) return []

  return input
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim()
      if (!entry || typeof entry !== 'object') return ''

      const raw = entry as { name?: unknown; label?: unknown; exercise?: unknown }
      if (typeof raw.name === 'string') return raw.name.trim()
      if (typeof raw.label === 'string') return raw.label.trim()
      if (typeof raw.exercise === 'string') return raw.exercise.trim()
      return ''
    })
    .filter(Boolean)
}

function normalizeWorkoutEntry(entry: unknown, day: Day, index: number): WorkoutEntry | null {
  if (!entry || typeof entry !== 'object') return null

  const raw = entry as Partial<WorkoutEntry> & {
    substitutions?: unknown
    rest_seconds?: unknown
    restSeconds?: unknown
    allow_logged_weight?: unknown
    allowLoggedWeight?: unknown
    track_weight?: unknown
    allow_logged_reps?: unknown
    allowLoggedReps?: unknown
    track_reps?: unknown
  }

  const exercise = typeof raw.exercise === 'string' ? raw.exercise : ''
  const sets = typeof raw.sets === 'string' ? raw.sets : ''
  const reps = typeof raw.reps === 'string' ? raw.reps : ''
  const notes = typeof raw.notes === 'string' ? raw.notes : ''
  const restSecondsRaw =
    typeof raw.rest_seconds === 'number'
      ? raw.rest_seconds
      : typeof raw.restSeconds === 'number'
      ? raw.restSeconds
      : null
  const substitutions = normalizeWorkoutSubstitutions(raw.substitutions)
  const allowLoggedWeight =
    raw.allow_logged_weight === true ||
    raw.allowLoggedWeight === true ||
    raw.track_weight === true
  const allowLoggedReps =
    raw.allow_logged_reps === true ||
    raw.allowLoggedReps === true ||
    raw.track_reps === true

  return {
    exercise_key: createWorkoutExerciseKey(day, index, {
      exercise_key: typeof raw.exercise_key === 'string' ? raw.exercise_key : undefined,
      exercise,
      sets,
      reps,
      notes,
    }),
    exercise,
    sets,
    reps,
    notes,
    substitutions,
    rest_seconds: restSecondsRaw !== null && Number.isFinite(restSecondsRaw) ? restSecondsRaw : null,
    allow_logged_weight: allowLoggedWeight,
    allow_logged_reps: allowLoggedReps,
  }
}

function normalizeHabitEntry(entry: unknown): HabitEntry | null {
  if (!entry || typeof entry !== 'object') return null

  const raw = entry as Partial<HabitEntry>
  const category = HABIT_CATEGORIES.includes(raw.category as HabitCategory)
    ? (raw.category as HabitCategory)
    : 'Other'

  return {
    habit_key: createHabitKey({
      category,
      habit: typeof raw.habit === 'string' ? raw.habit : '',
      target: typeof raw.target === 'string' ? raw.target : '',
      frequency: typeof raw.frequency === 'string' ? raw.frequency : '',
    }),
    category,
    habit: typeof raw.habit === 'string' ? raw.habit : '',
    target: typeof raw.target === 'string' ? raw.target : '',
    frequency: typeof raw.frequency === 'string' ? raw.frequency : '',
  }
}

function parseWeightValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const numeric = Number.parseFloat(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(numeric) ? numeric : null
}

function formatWeight(value: number | null) {
  if (value === null) return 'Not available'

  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} lb`
}

function formatWeightChange(value: number | null) {
  if (value === null) return 'Not available'
  if (value === 0) return '0 lb'

  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
  return `${value > 0 ? '+' : ''}${rounded} lb`
}

function getStartingWeight(clientRecord: Record<string, unknown> | null) {
  if (!clientRecord) return null

  for (const key of STARTING_WEIGHT_KEYS) {
    const value = parseWeightValue(clientRecord[key])
    if (value !== null) return value
  }

  return null
}

function getLatestWeight(submissions: CheckInSubmission[]) {
  for (const submission of submissions) {
    const weight = parseWeightValue(submission.content.weight)
    if (weight !== null) return weight
  }

  return null
}

function getLatestAdherence(submissions: CheckInSubmission[]) {
  const latest = submissions[0]
  if (!latest) return null

  const workout = Number.parseInt(String(latest.content.workout_adherence ?? ''), 10)
  const habits = Number.parseInt(String(latest.content.habit_adherence ?? ''), 10)
  const values = [workout, habits].filter((value) => Number.isFinite(value))

  if (values.length === 0) return null

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  return `${average.toFixed(1)}/5`
}

function inferWorkoutFocus(entries: WorkoutEntry[]) {
  const notedEntry = entries.find((entry) => entry.notes.trim().length > 0)
  if (notedEntry?.notes.trim()) return notedEntry.notes.trim()

  const namedEntries = entries
    .map((entry) => entry.exercise.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (namedEntries.length === 0) return null
  if (namedEntries.length === 1) return namedEntries[0]

  return `${namedEntries[0]} + ${namedEntries[1]}`
}

export function getGreeting(name: string) {
  const hour = new Date().getHours()
  const firstName = name.trim().split(' ')[0] || 'there'

  if (hour < 12) return `Good morning, ${firstName}`
  if (hour < 17) return `Good afternoon, ${firstName}`
  return `Good evening, ${firstName}`
}

export function normalizeWorkoutPlan(content: unknown): WeeklyPlan {
  if (!content || typeof content !== 'object') return { ...EMPTY_WEEK }

  const raw = content as Partial<Record<Day, unknown>>
  const nextPlan = { ...EMPTY_WEEK }

  DAYS.forEach((day) => {
    const entries = Array.isArray(raw[day]) ? raw[day] : []
    nextPlan[day] = entries
      .map((entry, index) => normalizeWorkoutEntry(entry, day, index))
      .filter((entry): entry is WorkoutEntry => entry !== null)
  })

  return nextPlan
}

export function normalizeHabitPlan(content: unknown): HabitEntry[] {
  if (typeof content === 'string') {
    const legacyHabit = content.trim()
    return legacyHabit
      ? [{
          habit_key: createHabitKey({ category: 'Other', habit: legacyHabit }),
          category: 'Other',
          habit: legacyHabit,
          target: '',
          frequency: '',
        }]
      : []
  }

  if (Array.isArray(content)) {
    return content
      .map((entry) => normalizeHabitEntry(entry))
      .filter((entry): entry is HabitEntry => entry !== null)
      .filter((entry) => entry.habit.trim().length > 0)
  }

  if (!content || typeof content !== 'object') return []

  const raw = content as { habits?: unknown }
  const entries = Array.isArray(raw.habits) ? raw.habits : []

  return entries
    .map((entry) => normalizeHabitEntry(entry))
    .filter((entry): entry is HabitEntry => entry !== null)
    .filter((entry) => entry.habit.trim().length > 0)
}

export function getTodayDay(now = new Date()): Day {
  const dayIndex = now.getDay()
  if (dayIndex === 0) return 'sunday'
  return DAYS[dayIndex - 1]
}

export function getTodayWorkout(plan: WeeklyPlan, now = new Date()) {
  const day = getTodayDay(now)
  const entries = plan[day]
  const focus = inferWorkoutFocus(entries)

  return {
    day,
    dayLabel: DAY_NAMES[day],
    entries,
    title: entries.length > 0 ? `${DAY_NAMES[day]} Session` : 'Recovery Day',
    summary:
      entries.length > 0
        ? `${entries.length} exercise${entries.length === 1 ? '' : 's'} planned`
        : 'No workout is scheduled for today',
    focus,
  }
}

export function getProgressSnapshot(
  clientRecord: Record<string, unknown> | null,
  submissions: CheckInSubmission[],
  currentHabitStreak: number,
) {
  const startingWeight = getStartingWeight(clientRecord)
  const currentWeight = getLatestWeight(submissions)
  const totalChange =
    startingWeight !== null && currentWeight !== null
      ? currentWeight - startingWeight
      : null
  const latestAdherence = getLatestAdherence(submissions)
  const streakLabel =
    currentHabitStreak > 0
      ? `${currentHabitStreak} day${currentHabitStreak === 1 ? '' : 's'}`
      : 'Start today'

  return [
    {
      label: 'Current weight',
      value: formatWeight(currentWeight),
    },
    {
      label: 'Since start',
      value: formatWeightChange(totalChange),
    },
    {
      label: 'Habit streak',
      value: streakLabel,
    },
    {
      label: 'Latest adherence',
      value: latestAdherence ?? 'Pending',
    },
  ]
}
