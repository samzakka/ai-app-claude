export type HabitLike = {
  category?: string
  habit: string
  target?: string
  frequency?: string
}

export type HabitCompletionLog = {
  id?: string
  client_id: string
  date: string
  habit_key: string
  habit_name: string
  completed: boolean
  completed_at: string | null
  created_at?: string | null
  updated_at?: string | null
}

function normalizeKeyPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function createHabitKey(habit: HabitLike) {
  const parts = [
    normalizeKeyPart(habit.category ?? ''),
    normalizeKeyPart(habit.habit),
    normalizeKeyPart(habit.target ?? ''),
    normalizeKeyPart(habit.frequency ?? ''),
  ].filter(Boolean)

  return parts.join('__') || 'habit'
}

export function getLocalDateString(value = new Date()) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getDateDaysAgo(days: number, from = new Date()) {
  const next = new Date(from)
  next.setDate(next.getDate() - days)
  return getLocalDateString(next)
}

export function normalizeHabitCompletionLog(input: unknown): HabitCompletionLog | null {
  if (!input || typeof input !== 'object') return null

  const raw = input as Partial<HabitCompletionLog>

  if (
    typeof raw.client_id !== 'string' ||
    typeof raw.date !== 'string' ||
    typeof raw.habit_key !== 'string' ||
    typeof raw.habit_name !== 'string'
  ) {
    return null
  }

  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    client_id: raw.client_id,
    date: raw.date,
    habit_key: raw.habit_key,
    habit_name: raw.habit_name,
    completed: raw.completed !== false,
    completed_at: typeof raw.completed_at === 'string' ? raw.completed_at : null,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : null,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
  }
}

export function normalizeHabitCompletionLogs(input: unknown) {
  if (!Array.isArray(input)) return []

  return input
    .map((entry) => normalizeHabitCompletionLog(entry))
    .filter((entry): entry is HabitCompletionLog => entry !== null)
}

export function mergeHabitCompletionLog(
  logs: HabitCompletionLog[],
  nextLog: HabitCompletionLog,
) {
  const withoutCurrent = logs.filter(
    (entry) => !(entry.date === nextLog.date && entry.habit_key === nextLog.habit_key),
  )

  return [nextLog, ...withoutCurrent].sort((a, b) => {
    if (a.date === b.date) return a.habit_key.localeCompare(b.habit_key)
    return b.date.localeCompare(a.date)
  })
}

export function getHabitCompletionMapForDate(
  logs: HabitCompletionLog[],
  date: string,
) {
  return logs.reduce<Record<string, boolean>>((acc, entry) => {
    if (entry.date !== date) return acc
    acc[entry.habit_key] = entry.completed
    return acc
  }, {})
}

export function getCompletedHabitCountForDate(
  habitKeys: string[],
  logs: HabitCompletionLog[],
  date: string,
) {
  const completionMap = getHabitCompletionMapForDate(logs, date)

  return habitKeys.filter((key) => completionMap[key]).length
}

function hasFullCompletionForDate(
  habitKeys: string[],
  logsByDate: Map<string, Map<string, boolean>>,
  date: string,
) {
  if (habitKeys.length === 0) return false

  const dailyMap = logsByDate.get(date)
  if (!dailyMap) return false

  return habitKeys.every((habitKey) => dailyMap.get(habitKey) === true)
}

export function getCurrentHabitStreak(
  habitKeys: string[],
  logs: HabitCompletionLog[],
  today = new Date(),
) {
  if (habitKeys.length === 0) return 0

  const logsByDate = logs.reduce<Map<string, Map<string, boolean>>>((acc, entry) => {
    let dailyMap = acc.get(entry.date)

    if (!dailyMap) {
      dailyMap = new Map<string, boolean>()
      acc.set(entry.date, dailyMap)
    }

    dailyMap.set(entry.habit_key, entry.completed)
    return acc
  }, new Map())

  const cursor = new Date(today)
  const todayKey = getLocalDateString(cursor)
  const todayComplete = hasFullCompletionForDate(habitKeys, logsByDate, todayKey)

  if (!todayComplete) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0

  while (true) {
    const dateKey = getLocalDateString(cursor)
    if (!hasFullCompletionForDate(habitKeys, logsByDate, dateKey)) break

    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}
