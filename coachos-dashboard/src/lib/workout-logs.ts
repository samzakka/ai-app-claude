export type WorkoutExerciseLike = {
  exercise_key?: string
  exercise: string
  sets?: string
  reps?: string
  notes?: string
}

export type WorkoutExerciseLog = {
  id?: string
  client_id: string
  workout_date: string
  workout_day: string
  exercise_key: string
  exercise_order: number
  exercise_name: string
  target_sets: string | null
  target_reps: string | null
  prescribed_notes: string | null
  selected_substitution: string | null
  completed: boolean
  completed_at: string | null
  client_notes: string | null
  difficulty_rpe: number | null
  logged_weight: string | null
  logged_reps: string | null
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

export function createWorkoutExerciseKey(
  workoutDay: string,
  order: number,
  exercise: WorkoutExerciseLike,
) {
  const explicitKey = typeof exercise.exercise_key === 'string'
    ? normalizeKeyPart(exercise.exercise_key)
    : ''

  if (explicitKey) return explicitKey

  const parts = [
    normalizeKeyPart(workoutDay),
    String(order + 1),
    normalizeKeyPart(exercise.exercise),
    normalizeKeyPart(exercise.sets ?? ''),
    normalizeKeyPart(exercise.reps ?? ''),
  ].filter(Boolean)

  return parts.join('__') || `${normalizeKeyPart(workoutDay)}__${order + 1}`
}

export function normalizeWorkoutExerciseLog(input: unknown): WorkoutExerciseLog | null {
  if (!input || typeof input !== 'object') return null

  const raw = input as Partial<WorkoutExerciseLog>

  if (
    typeof raw.client_id !== 'string' ||
    typeof raw.workout_date !== 'string' ||
    typeof raw.workout_day !== 'string' ||
    typeof raw.exercise_key !== 'string' ||
    typeof raw.exercise_name !== 'string'
  ) {
    return null
  }

  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    client_id: raw.client_id,
    workout_date: raw.workout_date,
    workout_day: raw.workout_day,
    exercise_key: raw.exercise_key,
    exercise_order: typeof raw.exercise_order === 'number' ? raw.exercise_order : 0,
    exercise_name: raw.exercise_name,
    target_sets: typeof raw.target_sets === 'string' ? raw.target_sets : null,
    target_reps: typeof raw.target_reps === 'string' ? raw.target_reps : null,
    prescribed_notes: typeof raw.prescribed_notes === 'string' ? raw.prescribed_notes : null,
    selected_substitution: typeof raw.selected_substitution === 'string' ? raw.selected_substitution : null,
    completed: raw.completed === true,
    completed_at: typeof raw.completed_at === 'string' ? raw.completed_at : null,
    client_notes: typeof raw.client_notes === 'string' ? raw.client_notes : null,
    difficulty_rpe:
      typeof raw.difficulty_rpe === 'number' && Number.isFinite(raw.difficulty_rpe)
        ? raw.difficulty_rpe
        : null,
    logged_weight: typeof raw.logged_weight === 'string' ? raw.logged_weight : null,
    logged_reps: typeof raw.logged_reps === 'string' ? raw.logged_reps : null,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : null,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
  }
}

export function normalizeWorkoutExerciseLogs(input: unknown) {
  if (!Array.isArray(input)) return []

  return input
    .map((entry) => normalizeWorkoutExerciseLog(entry))
    .filter((entry): entry is WorkoutExerciseLog => entry !== null)
}

export function mergeWorkoutExerciseLog(
  logs: WorkoutExerciseLog[],
  nextLog: WorkoutExerciseLog,
) {
  const withoutCurrent = logs.filter(
    (entry) => !(entry.workout_date === nextLog.workout_date && entry.exercise_key === nextLog.exercise_key),
  )

  return [nextLog, ...withoutCurrent].sort((a, b) => {
    if (a.workout_date === b.workout_date) return a.exercise_order - b.exercise_order
    return b.workout_date.localeCompare(a.workout_date)
  })
}

export function getWorkoutLogMapForDate(
  logs: WorkoutExerciseLog[],
  workoutDate: string,
) {
  return logs.reduce<Record<string, WorkoutExerciseLog>>((acc, entry) => {
    if (entry.workout_date !== workoutDate) return acc
    acc[entry.exercise_key] = entry
    return acc
  }, {})
}

export function getCompletedExerciseCountForDate(
  exerciseKeys: string[],
  logs: WorkoutExerciseLog[],
  workoutDate: string,
) {
  const logMap = getWorkoutLogMapForDate(logs, workoutDate)
  return exerciseKeys.filter((exerciseKey) => logMap[exerciseKey]?.completed).length
}
