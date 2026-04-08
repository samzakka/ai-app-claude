export type AISuggestionType =
  | 'coaching_assistant'
  | 'workout_generation'
  | 'weekly_adjustment'

export type AISuggestionHistoryEntry = {
  id: string
  client_id: string
  suggestion_type: AISuggestionType
  input_snapshot: Record<string, unknown>
  output_snapshot: Record<string, unknown>
  approved: boolean
  approved_at: string | null
  created_at: string
}

export function normalizeAISuggestionHistoryEntry(
  input: unknown,
): AISuggestionHistoryEntry | null {
  if (!input || typeof input !== 'object') return null

  const raw = input as Partial<AISuggestionHistoryEntry>

  if (
    typeof raw.id !== 'string' ||
    typeof raw.client_id !== 'string' ||
    !isAISuggestionType(raw.suggestion_type) ||
    !isPlainRecord(raw.input_snapshot) ||
    !isPlainRecord(raw.output_snapshot) ||
    typeof raw.created_at !== 'string'
  ) {
    return null
  }

  return {
    id: raw.id,
    client_id: raw.client_id,
    suggestion_type: raw.suggestion_type,
    input_snapshot: raw.input_snapshot,
    output_snapshot: raw.output_snapshot,
    approved: raw.approved === true,
    approved_at: typeof raw.approved_at === 'string' ? raw.approved_at : null,
    created_at: raw.created_at,
  }
}

export function normalizeAISuggestionHistory(
  input: unknown,
) {
  if (!Array.isArray(input)) return []

  return input
    .map((entry) => normalizeAISuggestionHistoryEntry(entry))
    .filter((entry): entry is AISuggestionHistoryEntry => entry !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function mergeAISuggestionHistoryEntry(
  entries: AISuggestionHistoryEntry[],
  nextEntry: AISuggestionHistoryEntry,
) {
  const withoutCurrent = entries.filter((entry) => entry.id !== nextEntry.id)

  return [...withoutCurrent, nextEntry].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function getAISuggestionTypeLabel(type: AISuggestionType) {
  if (type === 'coaching_assistant') return 'Coaching Suggestion'
  if (type === 'workout_generation') return 'Workout Draft'
  return 'Weekly Adjustment'
}

export function getAISuggestionHistorySummary(
  entry: AISuggestionHistoryEntry,
) {
  const output = entry.output_snapshot

  if (entry.suggestion_type === 'coaching_assistant') {
    const summary = getStringFromRecord(output.suggestion, 'summary')
    if (summary) return summary
  }

  if (entry.suggestion_type === 'workout_generation') {
    const summary = getStringFromRecord(output.draft, 'summary')
    if (summary) return summary
  }

  if (entry.suggestion_type === 'weekly_adjustment') {
    const decision = getStringFromRecord(output.draft, 'decision')
    const summary = getStringFromRecord(output.draft, 'summary')

    if (decision && summary) {
      return `${capitalize(decision)}: ${summary}`
    }

    if (summary) return summary
  }

  return 'AI output saved for coach review.'
}

function isAISuggestionType(value: unknown): value is AISuggestionType {
  return (
    value === 'coaching_assistant' ||
    value === 'workout_generation' ||
    value === 'weekly_adjustment'
  )
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function getStringFromRecord(
  value: unknown,
  key: string,
) {
  if (!isPlainRecord(value)) return null

  return typeof value[key] === 'string' ? value[key] : null
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
