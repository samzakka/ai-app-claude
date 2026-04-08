import type { CheckInSubmission } from '@/lib/check-ins'
import { createHabitKey, getCurrentHabitStreak, getLocalDateString, type HabitCompletionLog } from '@/lib/habit-completions'
import type { WorkoutExerciseLog } from '@/lib/workout-logs'

type Day =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

type WorkoutPlanEntry = {
  exercise: string
}

type WeeklyPlanLike = Record<Day, WorkoutPlanEntry[]>

type HabitLike = {
  category?: string
  habit: string
  target?: string
  frequency?: string
}

export type WorkoutAdherenceSummary = {
  completedThisWeek: number
  assignedThisWeek: number
  completionPercentage: number
  lastCompletionDateLabel: string | null
  missedSessions: number
}

export type HabitAdherenceSummary = {
  completedThisWeek: number
  totalPossibleThisWeek: number
  completionPercentage: number
  currentStreak: number
  mostMissedHabit: string | null
}

type RiskLevel = 'Low' | 'Medium' | 'High'

export type RiskIndicatorSummary = {
  level: RiskLevel
  reasons: string[]
}

export type CoachPerformanceSummary = {
  workout: WorkoutAdherenceSummary
  habits: HabitAdherenceSummary
  risk: RiskIndicatorSummary
}

const DAYS: Day[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function addDays(value: Date, amount: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + amount)
  return startOfDay(next)
}

function getCurrentWeekDates(now = new Date()) {
  const today = startOfDay(now)
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = addDays(today, mondayOffset)

  return DAYS.map((day, index) => ({
    day,
    date: addDays(monday, index),
    dateKey: getLocalDateString(addDays(monday, index)),
  }))
}

function formatDateLabel(value: Date | string) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : value

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function parseRating(content: Record<string, unknown>, key: string) {
  const raw = content[key]
  if (typeof raw !== 'string') return null

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function buildWorkoutSummary(
  weeklyPlan: WeeklyPlanLike,
  workoutLogs: WorkoutExerciseLog[],
  now = new Date(),
): WorkoutAdherenceSummary {
  const todayKey = getLocalDateString(now)
  const weekDates = getCurrentWeekDates(now)
  const logsByDate = workoutLogs.reduce<Map<string, WorkoutExerciseLog[]>>((acc, entry) => {
    const current = acc.get(entry.workout_date) ?? []
    current.push(entry)
    acc.set(entry.workout_date, current)
    return acc
  }, new Map())

  const assignedSessions = weekDates.filter(({ day }) => weeklyPlan[day]?.length > 0)
  const completedSessions = assignedSessions.filter(({ day, dateKey }) => {
    const assignedCount = weeklyPlan[day].length
    const completedCount = (logsByDate.get(dateKey) ?? []).filter((entry) => entry.completed).length
    return assignedCount > 0 && completedCount >= assignedCount
  })
  const missedSessions = assignedSessions.filter(({ day, dateKey }) => {
    if (dateKey >= todayKey) return false
    const assignedCount = weeklyPlan[day].length
    const completedCount = (logsByDate.get(dateKey) ?? []).filter((entry) => entry.completed).length
    return assignedCount > 0 && completedCount < assignedCount
  }).length

  const lastCompletion = [...logsByDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .find(([dateKey, entries]) => {
      const day = DAYS[new Date(`${dateKey}T00:00:00`).getDay() === 0 ? 6 : new Date(`${dateKey}T00:00:00`).getDay() - 1]
      const assignedCount = weeklyPlan[day]?.length ?? 0
      const completedCount = entries.filter((entry) => entry.completed).length
      return assignedCount > 0 && completedCount >= assignedCount
    })?.[0] ?? null

  return {
    completedThisWeek: completedSessions.length,
    assignedThisWeek: assignedSessions.length,
    completionPercentage:
      assignedSessions.length > 0
        ? Math.round((completedSessions.length / assignedSessions.length) * 100)
        : 0,
    lastCompletionDateLabel: lastCompletion ? formatDateLabel(lastCompletion) : null,
    missedSessions,
  }
}

function buildHabitSummary(
  habits: HabitLike[],
  habitLogs: HabitCompletionLog[],
  now = new Date(),
): HabitAdherenceSummary {
  const weekDates = getCurrentWeekDates(now).filter(({ dateKey }) => dateKey <= getLocalDateString(now))
  const habitKeys = habits.map((habit) => ({
    name: habit.habit,
    key: createHabitKey({
      category: habit.category,
      habit: habit.habit,
      target: habit.target,
      frequency: habit.frequency,
    }),
  }))

  const logsByDate = habitLogs.reduce<Map<string, Map<string, boolean>>>((acc, entry) => {
    let dayMap = acc.get(entry.date)

    if (!dayMap) {
      dayMap = new Map<string, boolean>()
      acc.set(entry.date, dayMap)
    }

    dayMap.set(entry.habit_key, entry.completed)
    return acc
  }, new Map())

  const completedThisWeek = weekDates.reduce((count, { dateKey }) => {
    const dayMap = logsByDate.get(dateKey)
    if (!dayMap) return count

    return count + habitKeys.filter(({ key }) => dayMap?.get(key) === true).length
  }, 0)
  const totalPossibleThisWeek = habitKeys.length * weekDates.length
  const missedByHabit = habitKeys.map(({ name, key }) => ({
    name,
    missed: weekDates.reduce((count, { dateKey }) => {
      const dayMap = logsByDate.get(dateKey)
      return count + (dayMap?.get(key) === true ? 0 : 1)
    }, 0),
  }))
  const mostMissedHabit = [...missedByHabit].sort((a, b) => b.missed - a.missed)[0]

  return {
    completedThisWeek,
    totalPossibleThisWeek,
    completionPercentage:
      totalPossibleThisWeek > 0
        ? Math.round((completedThisWeek / totalPossibleThisWeek) * 100)
        : 0,
    currentStreak: getCurrentHabitStreak(habitKeys.map(({ key }) => key), habitLogs, now),
    mostMissedHabit: mostMissedHabit && mostMissedHabit.missed > 0 ? mostMissedHabit.name : null,
  }
}

function buildRiskSummary(
  workout: WorkoutAdherenceSummary,
  habits: HabitAdherenceSummary,
  submissions: CheckInSubmission[],
): RiskIndicatorSummary {
  const latestSubmission = submissions[0] ?? null
  let points = 0
  const reasons: string[] = []

  if (workout.assignedThisWeek > 0) {
    if (workout.completionPercentage < 50) {
      points += 2
      reasons.push('Workout adherence is below 50% this week.')
    } else if (workout.completionPercentage < 80) {
      points += 1
      reasons.push('Workout adherence is below target this week.')
    }
  }

  if (habits.totalPossibleThisWeek > 0) {
    if (habits.completionPercentage < 60) {
      points += 2
      reasons.push('Habit consistency is low this week.')
    } else if (habits.completionPercentage < 80) {
      points += 1
      reasons.push('Habit consistency is moderate this week.')
    }
  }

  if (latestSubmission) {
    const energy = parseRating(latestSubmission.content, 'energy')
    const stress = parseRating(latestSubmission.content, 'stress')
    const workoutAdherence = parseRating(latestSubmission.content, 'workout_adherence')
    const habitAdherence = parseRating(latestSubmission.content, 'habit_adherence')

    if (energy !== null && energy <= 2) {
      points += 1
      reasons.push('Latest check-in shows low energy.')
    }

    if (stress !== null && stress >= 4) {
      points += 1
      reasons.push('Latest check-in shows elevated stress.')
    }

    if (
      (workoutAdherence !== null && workoutAdherence <= 2) ||
      (habitAdherence !== null && habitAdherence <= 2)
    ) {
      points += 1
      reasons.push('Latest check-in adherence signals are weak.')
    }
  }

  if (reasons.length === 0) {
    reasons.push('No major adherence or check-in risk flags surfaced this week.')
  }

  if (points >= 4) {
    return { level: 'High', reasons }
  }

  if (points >= 2) {
    return { level: 'Medium', reasons }
  }

  return { level: 'Low', reasons }
}

export function buildCoachPerformanceSummary(args: {
  weeklyPlan: WeeklyPlanLike
  habits: HabitLike[]
  workoutLogs: WorkoutExerciseLog[]
  habitLogs: HabitCompletionLog[]
  checkInSubmissions: CheckInSubmission[]
  now?: Date
}): CoachPerformanceSummary {
  const now = args.now ?? new Date()
  const workout = buildWorkoutSummary(args.weeklyPlan, args.workoutLogs, now)
  const habits = buildHabitSummary(args.habits, args.habitLogs, now)
  const risk = buildRiskSummary(workout, habits, args.checkInSubmissions)

  return {
    workout,
    habits,
    risk,
  }
}
