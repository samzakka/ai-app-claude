export type CheckInFrequency = 'weekly' | 'bi-weekly' | 'custom'

export type CheckInDueDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type CheckInFieldKey =
  | 'weight'
  | 'progress_photos'
  | 'wins_challenges'
  | 'hunger'
  | 'energy'
  | 'stress'
  | 'workout_adherence'
  | 'sleep'
  | 'habit_adherence'
  | 'measurements'
  | 'text_update'

export type CheckInFieldType = 'number' | 'photos' | 'textarea' | 'rating' | 'text'

export type CheckInFieldRule = {
  enabled: boolean
  required: boolean
}

export type CheckInFieldConfig = Record<CheckInFieldKey, CheckInFieldRule>

export type CoachCheckInSettings = {
  id?: string
  client_id?: string
  frequency: CheckInFrequency
  custom_interval_weeks: number
  due_day: CheckInDueDay
  schedule_anchor_date: string
  public_access_token: string
  field_config: CheckInFieldConfig
  created_at?: string | null
  updated_at?: string | null
}

export type CheckInSubmission = {
  id: string
  client_id: string
  check_in_settings_id?: string | null
  due_date?: string | null
  submitted_at: string
  content: Record<string, unknown>
  field_config_snapshot?: CheckInFieldConfig | null
}

export type ClientPhotoUpload = {
  path: string
  url: string
  name: string
}

export const CHECK_IN_PHOTO_BUCKET = 'check-in-photos'

export const CHECK_IN_DAYS: { value: CheckInDueDay; label: string }[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
]

export const CHECK_IN_FIELDS: Array<{
  key: CheckInFieldKey
  label: string
  type: CheckInFieldType
  alwaysEnabled?: boolean
}> = [
  { key: 'weight', label: 'Weight', type: 'number' },
  { key: 'progress_photos', label: 'Progress photos', type: 'photos' },
  { key: 'wins_challenges', label: 'Wins / challenges', type: 'textarea' },
  { key: 'hunger', label: 'Hunger', type: 'rating' },
  { key: 'energy', label: 'Energy', type: 'rating' },
  { key: 'stress', label: 'Stress', type: 'rating' },
  { key: 'workout_adherence', label: 'Workout adherence', type: 'rating' },
  { key: 'sleep', label: 'Sleep', type: 'rating' },
  { key: 'habit_adherence', label: 'Habit adherence', type: 'rating' },
  { key: 'measurements', label: 'Measurements', type: 'text' },
  { key: 'text_update', label: 'Text update', type: 'textarea', alwaysEnabled: true },
]

const DEFAULT_REQUIRED_FIELDS = new Set<CheckInFieldKey>([
  'weight',
  'progress_photos',
  'wins_challenges',
  'hunger',
])

const DAY_INDEX: Record<CheckInDueDay, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

export const RATING_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
]

export function createDefaultCheckInFieldConfig(): CheckInFieldConfig {
  return CHECK_IN_FIELDS.reduce((acc, field) => {
    acc[field.key] = {
      enabled: true,
      required: DEFAULT_REQUIRED_FIELDS.has(field.key),
    }
    return acc
  }, {} as CheckInFieldConfig)
}

export function generateCheckInAccessToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }

  return `checkin-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function createDefaultCheckInSettings(
  token = generateCheckInAccessToken(),
  anchorDate = new Date().toISOString().slice(0, 10),
): CoachCheckInSettings {
  return {
    frequency: 'weekly',
    custom_interval_weeks: 3,
    due_day: 'monday',
    schedule_anchor_date: anchorDate,
    public_access_token: token,
    field_config: createDefaultCheckInFieldConfig(),
  }
}

export function normalizeCheckInFieldConfig(input: unknown): CheckInFieldConfig {
  const defaults = createDefaultCheckInFieldConfig()

  if (!input || typeof input !== 'object') return defaults

  const rawConfig = input as Partial<Record<CheckInFieldKey, Partial<CheckInFieldRule>>>
  const nextConfig = { ...defaults }

  CHECK_IN_FIELDS.forEach((field) => {
    const raw = rawConfig[field.key]
    if (!raw || typeof raw !== 'object') return

    nextConfig[field.key] = {
      enabled: field.alwaysEnabled ? true : typeof raw.enabled === 'boolean' ? raw.enabled : defaults[field.key].enabled,
      required: typeof raw.required === 'boolean' ? raw.required : defaults[field.key].required,
    }

    if (!nextConfig[field.key].enabled) {
      nextConfig[field.key].required = false
    }

    if (field.alwaysEnabled) {
      nextConfig[field.key].enabled = true
    }
  })

  return nextConfig
}

export function normalizeCheckInSettings(input: unknown): CoachCheckInSettings {
  const defaults = createDefaultCheckInSettings()

  if (!input || typeof input !== 'object') return defaults

  const raw = input as Partial<CoachCheckInSettings> & { field_config?: unknown }
  const frequency = raw.frequency === 'bi-weekly' || raw.frequency === 'custom' || raw.frequency === 'weekly'
    ? raw.frequency
    : defaults.frequency
  const dueDay = CHECK_IN_DAYS.some((day) => day.value === raw.due_day)
    ? (raw.due_day as CheckInDueDay)
    : defaults.due_day

  return {
    ...defaults,
    id: raw.id,
    client_id: raw.client_id,
    frequency,
    custom_interval_weeks:
      typeof raw.custom_interval_weeks === 'number' && raw.custom_interval_weeks > 0
        ? raw.custom_interval_weeks
        : defaults.custom_interval_weeks,
    due_day: dueDay,
    schedule_anchor_date:
      typeof raw.schedule_anchor_date === 'string' && raw.schedule_anchor_date
        ? raw.schedule_anchor_date
        : defaults.schedule_anchor_date,
    public_access_token:
      typeof raw.public_access_token === 'string' && raw.public_access_token
        ? raw.public_access_token
        : defaults.public_access_token,
    field_config: normalizeCheckInFieldConfig(raw.field_config),
    created_at: raw.created_at ?? null,
    updated_at: raw.updated_at ?? null,
  }
}

export function normalizeCheckInSubmission(input: unknown): CheckInSubmission | null {
  if (!input || typeof input !== 'object') return null

  const raw = input as Partial<CheckInSubmission> & Record<string, unknown>
  const content = buildNormalizedSubmissionContent(raw)
  const submittedAt = getNormalizedSubmissionTimestamp(raw, content)

  if (typeof raw.id !== 'string' || typeof raw.client_id !== 'string' || !submittedAt) {
    return null
  }

  return {
    id: raw.id,
    client_id: raw.client_id,
    check_in_settings_id: typeof raw.check_in_settings_id === 'string' ? raw.check_in_settings_id : null,
    due_date: typeof raw.due_date === 'string' ? raw.due_date : null,
    submitted_at: submittedAt,
    content,
    field_config_snapshot: normalizeCheckInFieldConfig(raw.field_config_snapshot),
  }
}

export function normalizeCheckInSubmissions(input: unknown): CheckInSubmission[] {
  if (!Array.isArray(input)) return []

  return input
    .map((entry) => normalizeCheckInSubmission(entry))
    .filter((entry): entry is CheckInSubmission => entry !== null)
}

function buildNormalizedSubmissionContent(
  input: Partial<CheckInSubmission> & Record<string, unknown>,
) {
  const baseContent =
    input.content && typeof input.content === 'object' && !Array.isArray(input.content)
      ? { ...(input.content as Record<string, unknown>) }
      : {}

  CHECK_IN_FIELDS.forEach(({ key }) => {
    if (baseContent[key] !== undefined) return

    const value = input[key]
    if (value !== undefined && value !== null && value !== '') {
      baseContent[key] = value
    }
  })

  return baseContent
}

function hasSubmissionActivityFields(content: Record<string, unknown>) {
  return CHECK_IN_FIELDS.some(({ key }) => {
    const value = content[key]

    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== null
  })
}

function getNormalizedSubmissionTimestamp(
  input: Partial<CheckInSubmission> & Record<string, unknown>,
  content: Record<string, unknown>,
) {
  if (typeof input.submitted_at === 'string' && input.submitted_at) {
    return input.submitted_at
  }

  if (typeof input.created_at === 'string' && input.created_at) {
    return input.created_at
  }

  if (typeof input.due_date === 'string' && input.due_date && hasSubmissionActivityFields(content)) {
    return `${input.due_date}T00:00:00.000Z`
  }

  return null
}

export function getCheckInIntervalWeeks(settings: CoachCheckInSettings) {
  if (settings.frequency === 'weekly') return 1
  if (settings.frequency === 'bi-weekly') return 2
  return Math.max(settings.custom_interval_weeks || 1, 1)
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function addDays(value: Date, amount: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + amount)
  return startOfDay(next)
}

function formatDate(value: Date) {
  return value.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function getFirstDueDate(anchorDate: Date, dueDay: CheckInDueDay) {
  const safeAnchor = startOfDay(anchorDate)
  const diff = (DAY_INDEX[dueDay] - safeAnchor.getDay() + 7) % 7
  return addDays(safeAnchor, diff)
}

export function getCheckInScheduleStatus(
  settings: CoachCheckInSettings,
  latestSubmittedAt?: string | null,
  now = new Date(),
) {
  const today = startOfDay(now)
  const intervalDays = getCheckInIntervalWeeks(settings) * 7
  const anchor = settings.schedule_anchor_date ? new Date(`${settings.schedule_anchor_date}T00:00:00`) : today
  const firstDueDate = getFirstDueDate(anchor, settings.due_day)

  let currentDueDate = firstDueDate
  if (today >= firstDueDate) {
    const elapsedDays = Math.floor((today.getTime() - firstDueDate.getTime()) / 86400000)
    const cyclesElapsed = Math.floor(elapsedDays / intervalDays)
    currentDueDate = addDays(firstDueDate, cyclesElapsed * intervalDays)
  }

  const previousDueDate = currentDueDate.getTime() > firstDueDate.getTime()
    ? addDays(currentDueDate, -intervalDays)
    : null

  const currentCycleStart = previousDueDate ? addDays(previousDueDate, 1) : startOfDay(anchor)
  const latestSubmittedDate = latestSubmittedAt ? startOfDay(new Date(latestSubmittedAt)) : null
  const hasSubmittedThisCycle = latestSubmittedDate ? latestSubmittedDate >= currentCycleStart : false
  const isDue = today >= currentDueDate && !hasSubmittedThisCycle

  const nextDueDate = today < currentDueDate
    ? currentDueDate
    : hasSubmittedThisCycle
    ? addDays(currentDueDate, intervalDays)
    : currentDueDate

  return {
    isDue,
    dueDate: currentDueDate,
    dueLabel: formatDate(currentDueDate),
    nextDueDate,
    nextDueLabel: formatDate(nextDueDate),
    currentCycleStart,
    currentCycleStartLabel: formatDate(currentCycleStart),
    lastSubmittedLabel: latestSubmittedDate ? formatDate(latestSubmittedDate) : null,
    intervalWeeks: getCheckInIntervalWeeks(settings),
  }
}

export function getEnabledCheckInFields(fieldConfig: CheckInFieldConfig) {
  return CHECK_IN_FIELDS.filter((field) => field.alwaysEnabled || fieldConfig[field.key].enabled)
}
