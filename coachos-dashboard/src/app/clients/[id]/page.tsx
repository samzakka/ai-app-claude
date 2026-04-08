'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { buildCheckInAnalysis } from '@/lib/check-in-analysis'
import { buildCoachPerformanceSummary } from '@/lib/client-performance-summary'
import { type AICoachingAssistantSuggestion } from '@/lib/ai-coaching-assistant'
import {
  getAISuggestionHistorySummary,
  getAISuggestionTypeLabel,
  mergeAISuggestionHistoryEntry,
  normalizeAISuggestionHistory,
  normalizeAISuggestionHistoryEntry,
  type AISuggestionHistoryEntry,
  type AISuggestionType,
} from '@/lib/ai-suggestion-history'
import {
  normalizeWorkoutPlannerWeeklyPlan,
  type AIWorkoutAdjustmentDraft,
  type AIWorkoutAdjustmentDecision,
  type AIWorkoutPlannerDraft,
  type WorkoutPlannerAssistanceLevel,
} from '@/lib/ai-workout-planner'
import {
  getLatestMessage,
  getMessagePreviewText,
  getOutgoingMessageStatusLabel,
  getUnreadIncomingMessageIds,
  getUnreadIncomingMessageCount,
  mergeClientMessage,
  normalizeClientMessage,
  normalizeClientMessages,
  type ClientMessage,
} from '@/lib/messages'
import {
  CHECK_IN_DAYS,
  CHECK_IN_FIELDS,
  type CheckInFieldKey,
  type CheckInSubmission,
  type CoachCheckInSettings,
  createDefaultCheckInSettings,
  getCheckInScheduleStatus,
  getEnabledCheckInFields,
  normalizeCheckInSettings,
  normalizeCheckInSubmissions,
} from '@/lib/check-ins'
import { getDateDaysAgo, normalizeHabitCompletionLogs, type HabitCompletionLog } from '@/lib/habit-completions'
import { normalizeWorkoutExerciseLogs, type WorkoutExerciseLog } from '@/lib/workout-logs'

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientStatus = 'active' | 'at_risk' | 'review' | string

type Client = {
  id: string
  full_name: string
  email: string
  status: ClientStatus
  created_at: string
} & Record<string, unknown>

type WorkoutEntry = {
  exercise: string
  sets: string
  reps: string
  notes: string
}

type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

type WeeklyPlan = Record<Day, WorkoutEntry[]>

type TextPlanType = 'nutrition'

type HabitCategory =
  | 'Nutrition'
  | 'Training'
  | 'Recovery'
  | 'Lifestyle'
  | 'Mindset'
  | 'Supplements'
  | 'Other'

type HabitEntry = {
  category: HabitCategory
  habit: string
  target: string
  frequency: string
}

type GeneratedAICoachingSuggestion = {
  suggestion: AICoachingAssistantSuggestion
  generatedAt: string
  model: string
  historyId: string | null
}

type GeneratedAIWorkoutPlan = {
  draft: AIWorkoutPlannerDraft
  generatedAt: string
  model: string
  historyId: string | null
}

type GeneratedAIWorkoutAdjustment = {
  draft: AIWorkoutAdjustmentDraft
  generatedAt: string
  model: string
  historyId: string | null
}

type AIWorkoutPlanSource = 'planner' | 'adjustment' | null

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DAY_NAMES: Record<Day, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
}

const DAY_LABELS: Record<Day, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

const EMPTY_WEEK: WeeklyPlan = {
  monday: [], tuesday: [], wednesday: [], thursday: [],
  friday: [], saturday: [], sunday: [],
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

const EMPTY_HABIT: HabitEntry = {
  category: 'Nutrition',
  habit: '',
  target: '',
  frequency: '',
}

const TEXT_PLANS: { type: TextPlanType; label: string; placeholder: string }[] = [
  {
    type: 'nutrition',
    label: 'Nutrition Plan',
    placeholder: 'e.g. 2,000 kcal target. High protein, moderate carbs. Meal timing...',
  },
]

const avatarColors = ['#A32D2D', '#0d9488', '#4338ca', '#ec4899', '#7F77DD', '#b45309']

const riskColors = {
  Low: { bg: '#dcfce7', color: '#639922', border: '#639922' },
  Medium: { bg: '#fef3c7', color: '#BA7517', border: '#BA7517' },
  High: { bg: '#fee2e2', color: '#A32D2D', border: '#A32D2D' },
} as const

const adjustmentDecisionColors: Record<
  AIWorkoutAdjustmentDecision,
  { bg: string; color: string; border: string; label: string }
> = {
  progress: { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Progress' },
  maintain: { bg: '#e0f2fe', color: '#0f4c81', border: '#7dd3fc', label: 'Maintain' },
  reduce: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', label: 'Reduce' },
  deload: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', label: 'Deload' },
}

const sectionAnchorStyle: React.CSSProperties = {
  scrollMarginTop: '20px',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string) {
  return avatarColors[name.charCodeAt(0) % avatarColors.length]
}

function getStatusConfig(status: ClientStatus) {
  if (status === 'at_risk') return { bg: '#fee2e2', color: '#A32D2D', border: '#A32D2D', label: 'At risk' }
  if (status === 'review')  return { bg: '#fef3c7', color: '#BA7517', border: '#BA7517', label: 'Review' }
  return { bg: '#dcfce7', color: '#639922', border: '#639922', label: 'On track' }
}

function getWeekDates(): Record<Day, string> {
  const today = new Date()
  const dow = today.getDay() // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  const result: Partial<Record<Day, string>> = {}
  DAYS.forEach((day, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    result[day] = `${DAY_LABELS[day]} ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  })
  return result as Record<Day, string>
}

function normalizeWorkoutEntry(entry: unknown): WorkoutEntry | null {
  if (!entry || typeof entry !== 'object') return null
  const raw = entry as Partial<WorkoutEntry>
  return {
    exercise: typeof raw.exercise === 'string' ? raw.exercise : '',
    sets: typeof raw.sets === 'string' ? raw.sets : '',
    reps: typeof raw.reps === 'string' ? raw.reps : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  }
}

function normalizeWeeklyPlan(content: unknown): WeeklyPlan {
  if (!content || typeof content !== 'object') return { ...EMPTY_WEEK }

  const rawPlan = content as Partial<Record<Day, unknown>>
  const nextPlan = { ...EMPTY_WEEK }

  DAYS.forEach((day) => {
    const entries = Array.isArray(rawPlan[day]) ? rawPlan[day] : []
    nextPlan[day] = entries
      .map((entry) => normalizeWorkoutEntry(entry))
      .filter((entry): entry is WorkoutEntry => entry !== null)
  })

  return nextPlan
}

function normalizeHabitEntry(entry: unknown): HabitEntry | null {
  if (!entry || typeof entry !== 'object') return null

  const raw = entry as Partial<HabitEntry>
  const category = HABIT_CATEGORIES.includes(raw.category as HabitCategory)
    ? (raw.category as HabitCategory)
    : 'Other'

  return {
    category,
    habit: typeof raw.habit === 'string' ? raw.habit : '',
    target: typeof raw.target === 'string' ? raw.target : '',
    frequency: typeof raw.frequency === 'string' ? raw.frequency : '',
  }
}

function normalizeHabitPlan(content: unknown): HabitEntry[] {
  if (typeof content === 'string') {
    const legacyHabit = content.trim()
    return legacyHabit
      ? [{ ...EMPTY_HABIT, category: 'Other', habit: legacyHabit }]
      : []
  }

  if (Array.isArray(content)) {
    return content
      .map((entry) => normalizeHabitEntry(entry))
      .filter((entry): entry is HabitEntry => entry !== null)
  }

  if (!content || typeof content !== 'object') return []

  const raw = content as { habits?: unknown }
  const entries = Array.isArray(raw.habits) ? raw.habits : []

  return entries
    .map((entry) => normalizeHabitEntry(entry))
    .filter((entry): entry is HabitEntry => entry !== null)
}

const inputBase: React.CSSProperties = {
  fontSize: '12px', color: '#374151',
  background: '#f9fafb', border: '0.5px solid #e5e7eb',
  borderRadius: '6px', padding: '4px 6px',
  outline: 'none', fontFamily: 'inherit',
}

function formatMessageTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function extractClientContextValues(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return []

  return keys
    .map((key) => record[key])
    .flatMap((value) => {
      if (typeof value === 'string') return [value.trim()]
      if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim())
      }
      return []
    })
    .filter(Boolean)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()

  const [client, setClient]   = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Workout plan
  const [weeklyPlan, setWeeklyPlan]       = useState<WeeklyPlan>({ ...EMPTY_WEEK })
  const [workoutSaving, setWorkoutSaving] = useState(false)
  const [workoutSaved, setWorkoutSaved]   = useState(false)
  const [isMobile, setIsMobile]           = useState(false)
  const [workoutPlannerLevel, setWorkoutPlannerLevel] = useState<WorkoutPlannerAssistanceLevel>('medium')
  const [workoutPlannerLoading, setWorkoutPlannerLoading] = useState(false)
  const [workoutPlannerError, setWorkoutPlannerError] = useState<string | null>(null)
  const [generatedWorkoutPlan, setGeneratedWorkoutPlan] = useState<GeneratedAIWorkoutPlan | null>(null)
  const [workoutAdjustmentLoading, setWorkoutAdjustmentLoading] = useState(false)
  const [workoutAdjustmentError, setWorkoutAdjustmentError] = useState<string | null>(null)
  const [generatedWorkoutAdjustment, setGeneratedWorkoutAdjustment] = useState<GeneratedAIWorkoutAdjustment | null>(null)
  const [workoutAdjustmentApproved, setWorkoutAdjustmentApproved] = useState(false)
  const [workoutPlanApproved, setWorkoutPlanApproved] = useState(false)
  const [aiWorkoutPlanPendingApproval, setAiWorkoutPlanPendingApproval] = useState(false)
  const [aiWorkoutPlanSource, setAiWorkoutPlanSource] = useState<AIWorkoutPlanSource>(null)

  // Nutrition plan
  const [planContent, setPlanContent] = useState<Record<TextPlanType, string>>({ nutrition: '' })
  const [savingType, setSavingType]   = useState<TextPlanType | null>(null)
  const [savedType, setSavedType]     = useState<TextPlanType | null>(null)

  // Habit targets
  const [habitRows, setHabitRows]     = useState<HabitEntry[]>([])
  const [habitSaving, setHabitSaving] = useState(false)
  const [habitSaved, setHabitSaved]   = useState(false)

  // Check-ins
  const [checkInSettings, setCheckInSettings] = useState<CoachCheckInSettings>(() => createDefaultCheckInSettings())
  const [checkInSubmissions, setCheckInSubmissions] = useState<CheckInSubmission[]>([])
  const [checkInLoading, setCheckInLoading] = useState(true)
  const [checkInSaving, setCheckInSaving] = useState(false)
  const [checkInSaved, setCheckInSaved] = useState(false)
  const [checkInError, setCheckInError] = useState<string | null>(null)
  const [checkInLinkCopied, setCheckInLinkCopied] = useState(false)
  const [appOrigin, setAppOrigin] = useState('')
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutExerciseLog[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitCompletionLog[]>([])
  const [performanceLoading, setPerformanceLoading] = useState(true)
  const [performanceError, setPerformanceError] = useState<string | null>(null)
  const [aiSuggestion, setAiSuggestion] = useState<GeneratedAICoachingSuggestion | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiApproved, setAiApproved] = useState(false)
  const [aiMessageCopied, setAiMessageCopied] = useState(false)
  const [messages, setMessages] = useState<ClientMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [coachMessageDraft, setCoachMessageDraft] = useState('')
  const [coachMessageSending, setCoachMessageSending] = useState(false)
  const [coachMessageWasAIDrafted, setCoachMessageWasAIDrafted] = useState(false)
  const [coachUserId, setCoachUserId] = useState<string | null>(null)
  const [aiHistory, setAiHistory] = useState<AISuggestionHistoryEntry[]>([])
  const [aiHistoryLoading, setAiHistoryLoading] = useState(true)
  const [aiHistoryError, setAiHistoryError] = useState<string | null>(null)

  const weekDates = getWeekDates()

  useEffect(() => {
    const syncViewport = () => {
      setIsMobile(window.innerWidth < 768)
      setAppOrigin(window.location.origin)
    }

    syncViewport()
    window.addEventListener('resize', syncViewport)

    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    async function fetchCoachUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setCoachUserId(user?.id ?? null)
    }

    fetchCoachUser()
  }, [])

  useEffect(() => {
    function scrollToHashTarget() {
      if (typeof window === 'undefined') return

      const hash = window.location.hash.replace('#', '')
      if (!hash) return

      window.requestAnimationFrame(() => {
        const element = document.getElementById(hash)
        if (!element) return

        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }

    scrollToHashTarget()
    window.addEventListener('hashchange', scrollToHashTarget)

    return () => window.removeEventListener('hashchange', scrollToHashTarget)
  }, [loading])

  // ── Fetch client ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchClient() {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', params.id)
        .single()
      if (error) { console.error('Error fetching client:', error); setError('Client not found.') }
      else setClient(data)
      setLoading(false)
    }
    fetchClient()
  }, [params.id])

  // ── Fetch plans ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchPlans() {
      const { data, error } = await supabase
        .from('client_plans')
        .select('id, client_id, type, content, updated_at')
        .eq('client_id', params.id)
      if (error) { console.error('Error fetching plans:', error); return }
      if (!data) return
      for (const row of data) {
        if (row.type === 'workout') {
          try {
            const parsed = typeof row.content === 'string'
              ? JSON.parse(row.content || '{}')
              : row.content
            setWeeklyPlan(normalizeWeeklyPlan(parsed))
          } catch { /* keep empty week */ }
        } else if (row.type === 'nutrition') {
          setPlanContent((prev) => ({ ...prev, nutrition: row.content ?? '' }))
        } else if (row.type === 'habits') {
          let parsedContent: unknown = row.content

          if (typeof row.content === 'string') {
            try {
              parsedContent = JSON.parse(row.content)
            } catch {
              parsedContent = row.content
            }
          }

          setHabitRows(normalizeHabitPlan(parsedContent))
        }
      }
    }
    fetchPlans()
  }, [params.id])

  useEffect(() => {
    async function fetchCheckIns() {
      setCheckInLoading(true)
      setCheckInError(null)

      const [{ data: settingsData, error: settingsError }, { data: submissionsData, error: submissionsError }] = await Promise.all([
        supabase
          .from('client_check_in_settings')
          .select('id, client_id, frequency, due_day, custom_interval_weeks, schedule_anchor_date, public_access_token, field_config, created_at, updated_at')
          .eq('client_id', params.id)
          .maybeSingle(),
        supabase
          .from('client_check_in_submissions')
          .select('id, client_id, check_in_settings_id, due_date, submitted_at, content, field_config_snapshot')
          .eq('client_id', params.id)
          .order('submitted_at', { ascending: false })
          .limit(100),
      ])

      if (settingsError) {
        console.error('Error fetching check-in settings:', settingsError)
        setCheckInError('Unable to load check-in settings.')
      } else if (settingsData) {
        setCheckInSettings(normalizeCheckInSettings(settingsData))
      }

      if (submissionsError) {
        console.error('Error fetching check-in submissions:', submissionsError)
        setCheckInError('Unable to load recent check-ins.')
      } else {
        setCheckInSubmissions(normalizeCheckInSubmissions(submissionsData ?? []))
      }

      setCheckInLoading(false)
    }

    fetchCheckIns()
  }, [params.id])

  useEffect(() => {
    async function fetchPerformanceLogs() {
      setPerformanceLoading(true)
      setPerformanceError(null)

      const workoutLookback = getDateDaysAgo(120)
      const habitLookback = getDateDaysAgo(120)

      const [
        { data: workoutLogData, error: workoutLogError },
        { data: habitLogData, error: habitLogError },
      ] = await Promise.all([
        supabase
          .from('client_workout_exercise_logs')
          .select('id, client_id, workout_date, workout_day, exercise_key, exercise_order, exercise_name, target_sets, target_reps, prescribed_notes, selected_substitution, completed, completed_at, client_notes, difficulty_rpe, logged_weight, logged_reps, created_at, updated_at')
          .eq('client_id', params.id)
          .gte('workout_date', workoutLookback)
          .order('workout_date', { ascending: false }),
        supabase
          .from('client_habit_completion_logs')
          .select('id, client_id, date, habit_key, habit_name, completed, completed_at, created_at, updated_at')
          .eq('client_id', params.id)
          .gte('date', habitLookback)
          .order('date', { ascending: false }),
      ])

      if (workoutLogError) {
        console.error('Error fetching workout logs:', workoutLogError)
        setPerformanceError('Unable to load performance summary logs.')
      } else {
        setWorkoutLogs(normalizeWorkoutExerciseLogs(workoutLogData ?? []))
      }

      if (habitLogError) {
        console.error('Error fetching habit logs:', habitLogError)
        setPerformanceError('Unable to load performance summary logs.')
      } else {
        setHabitLogs(normalizeHabitCompletionLogs(habitLogData ?? []))
      }

      setPerformanceLoading(false)
    }

    fetchPerformanceLogs()
  }, [params.id])

  useEffect(() => {
    async function fetchMessages() {
      setMessagesLoading(true)
      setMessagesError(null)

      const { data, error } = await supabase
        .from('messages')
        .select('id, created_at, coach_id, client_id, sender, message_type, content, media_url, media_duration_seconds, read, read_at, was_ai_drafted')
        .eq('client_id', params.id)
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) {
        console.error('Error fetching client messages:', error)
        setMessagesError('Unable to load messages right now.')
      } else {
        setMessages(normalizeClientMessages(data ?? []))
      }

      setMessagesLoading(false)
    }

    fetchMessages()
  }, [params.id])

  useEffect(() => {
    async function fetchAISuggestionHistory() {
      setAiHistoryLoading(true)
      setAiHistoryError(null)

      const { data, error } = await supabase
        .from('ai_suggestion_history')
        .select('id, client_id, suggestion_type, input_snapshot, output_snapshot, approved, approved_at, created_at')
        .eq('client_id', params.id)
        .order('created_at', { ascending: false })
        .limit(12)

      if (error) {
        console.error('Error fetching AI suggestion history:', error)
        setAiHistoryError('AI history is unavailable until the new table is set up.')
      } else {
        setAiHistory(normalizeAISuggestionHistory(data ?? []))
      }

      setAiHistoryLoading(false)
    }

    fetchAISuggestionHistory()
  }, [params.id])

  useEffect(() => {
    async function markClientMessagesAsRead() {
      const unreadIds = getUnreadIncomingMessageIds(messages, 'coach')

      if (unreadIds.length === 0) return

      const readAt = new Date().toISOString()
      const { error } = await supabase
        .from('messages')
        .update({ read: true, read_at: readAt })
        .in('id', unreadIds)

      if (error) {
        console.error('Error marking client messages as read:', error)
        return
      }

      setMessages((prev) =>
        prev.map((message) => (
          unreadIds.includes(message.id ?? '')
            ? { ...message, read: true, read_at: readAt }
            : message
        )),
      )
    }

    markClientMessagesAsRead()
  }, [messages])

  async function storeAISuggestionHistory(
    suggestionType: AISuggestionType,
    inputSnapshot: Record<string, unknown>,
    outputSnapshot: Record<string, unknown>,
  ) {
    const { data, error } = await supabase
      .from('ai_suggestion_history')
      .insert({
        client_id: params.id,
        suggestion_type: suggestionType,
        input_snapshot: inputSnapshot,
        output_snapshot: outputSnapshot,
        approved: false,
        approved_at: null,
      })
      .select('id, client_id, suggestion_type, input_snapshot, output_snapshot, approved, approved_at, created_at')
      .single()

    if (error) {
      console.error('Error storing AI suggestion history:', error)
      setAiHistoryError('This AI result was generated, but history could not be saved right now.')
      return null
    }

    const nextEntry = normalizeAISuggestionHistoryEntry(data)

    if (nextEntry) {
      setAiHistory((prev) => mergeAISuggestionHistoryEntry(prev, nextEntry))
      setAiHistoryError(null)
    }

    return nextEntry
  }

  async function updateAISuggestionHistoryApproval(
    historyId: string | null,
    approved: boolean,
  ) {
    if (!historyId) return

    const approvedAt = approved ? new Date().toISOString() : null
    const { data, error } = await supabase
      .from('ai_suggestion_history')
      .update({
        approved,
        approved_at: approvedAt,
      })
      .eq('id', historyId)
      .select('id, client_id, suggestion_type, input_snapshot, output_snapshot, approved, approved_at, created_at')
      .single()

    if (error) {
      console.error('Error updating AI suggestion approval:', error)
      setAiHistoryError('Approval was updated locally, but history could not be refreshed yet.')
      return
    }

    const nextEntry = normalizeAISuggestionHistoryEntry(data)

    if (nextEntry) {
      setAiHistory((prev) => mergeAISuggestionHistoryEntry(prev, nextEntry))
      setAiHistoryError(null)
    }
  }

  // ── Workout plan handlers ────────────────────────────────────────────────────
  function addEntry(day: Day) {
    if (aiWorkoutPlanPendingApproval) {
      if (workoutPlanApproved) {
        const historyId =
          aiWorkoutPlanSource === 'planner'
            ? generatedWorkoutPlan?.historyId ?? null
            : generatedWorkoutAdjustment?.historyId ?? null
        void updateAISuggestionHistoryApproval(historyId, false)
      }
      setWorkoutPlanApproved(false)
    }

    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: [...prev[day], { exercise: '', sets: '', reps: '', notes: '' }],
    }))
  }

  function removeEntry(day: Day, index: number) {
    if (aiWorkoutPlanPendingApproval) {
      if (workoutPlanApproved) {
        const historyId =
          aiWorkoutPlanSource === 'planner'
            ? generatedWorkoutPlan?.historyId ?? null
            : generatedWorkoutAdjustment?.historyId ?? null
        void updateAISuggestionHistoryApproval(historyId, false)
      }
      setWorkoutPlanApproved(false)
    }

    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }))
  }

  function updateEntry(day: Day, index: number, field: keyof WorkoutEntry, value: string) {
    if (aiWorkoutPlanPendingApproval) {
      if (workoutPlanApproved) {
        const historyId =
          aiWorkoutPlanSource === 'planner'
            ? generatedWorkoutPlan?.historyId ?? null
            : generatedWorkoutAdjustment?.historyId ?? null
        void updateAISuggestionHistoryApproval(historyId, false)
      }
      setWorkoutPlanApproved(false)
    }

    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: prev[day].map((entry, i) => i === index ? { ...entry, [field]: value } : entry),
    }))
  }

  async function saveWorkoutPlan() {
    if (aiWorkoutPlanPendingApproval && !workoutPlanApproved) return

    setWorkoutSaving(true)
    const { error } = await supabase
      .from('client_plans')
      .upsert(
        { client_id: params.id, type: 'workout', content: JSON.stringify(weeklyPlan), updated_at: new Date().toISOString() },
        { onConflict: 'client_id,type' }
      )
    if (error) { console.error('Error saving workout plan:', error); alert(`Failed to save: ${error.message}`) }
    else {
      setWorkoutSaved(true)
      setAiWorkoutPlanPendingApproval(false)
      setAiWorkoutPlanSource(null)
      setWorkoutPlanApproved(false)
      setTimeout(() => setWorkoutSaved(false), 3000)
    }
    setWorkoutSaving(false)
  }

  async function generateAIWorkoutPlan() {
    if (!client) return

    setWorkoutPlannerLoading(true)
    setWorkoutPlannerError(null)
    setWorkoutPlanApproved(false)

    try {
      const plannerInput = {
        mode: 'generate' as const,
        client: {
          id: client.id,
          fullName: client.full_name,
          status: client.status,
          joinedAt: client.created_at,
          goals: clientGoals,
          notes: clientNotes,
        },
        assistanceLevel: workoutPlannerLevel,
        currentWorkoutPlan: weeklyPlan,
        performanceSummary,
        checkInAnalysis,
      }
      const response = await fetch('/api/ai/workout-planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: plannerInput,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to generate an AI workout plan right now.')
      }

      const nextDraft = payload as Omit<GeneratedAIWorkoutPlan, 'historyId'>
      const historyEntry = await storeAISuggestionHistory(
        'workout_generation',
        plannerInput as unknown as Record<string, unknown>,
        nextDraft as unknown as Record<string, unknown>,
      )

      setGeneratedWorkoutPlan({
        ...nextDraft,
        historyId: historyEntry?.id ?? null,
      })
      setWeeklyPlan(normalizeWorkoutPlannerWeeklyPlan(nextDraft.draft.weeklyPlan))
      setAiWorkoutPlanPendingApproval(true)
      setAiWorkoutPlanSource('planner')
    } catch (plannerError) {
      console.error('Error generating AI workout plan:', plannerError)
      setWorkoutPlannerError(
        plannerError instanceof Error
          ? plannerError.message
          : 'Unable to generate an AI workout plan right now.',
      )
    } finally {
      setWorkoutPlannerLoading(false)
    }
  }

  async function generateWeeklyAdjustment() {
    if (!client) return

    setWorkoutAdjustmentLoading(true)
    setWorkoutAdjustmentError(null)
    setWorkoutAdjustmentApproved(false)

    try {
      const plannerInput = {
        mode: 'adjust' as const,
        client: {
          id: client.id,
          fullName: client.full_name,
          status: client.status,
          joinedAt: client.created_at,
          goals: clientGoals,
          notes: clientNotes,
        },
        assistanceLevel: workoutPlannerLevel,
        currentWorkoutPlan: weeklyPlan,
        performanceSummary,
        checkInAnalysis,
      }
      const response = await fetch('/api/ai/workout-planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: plannerInput,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to generate a weekly adjustment right now.')
      }

      const nextDraft = payload as Omit<GeneratedAIWorkoutAdjustment, 'historyId'>
      const historyEntry = await storeAISuggestionHistory(
        'weekly_adjustment',
        plannerInput as unknown as Record<string, unknown>,
        nextDraft as unknown as Record<string, unknown>,
      )
      setGeneratedWorkoutAdjustment({
        ...nextDraft,
        historyId: historyEntry?.id ?? null,
      })
    } catch (adjustmentError) {
      console.error('Error generating weekly adjustment:', adjustmentError)
      setGeneratedWorkoutAdjustment(null)
      setWorkoutAdjustmentError(
        adjustmentError instanceof Error
          ? adjustmentError.message
          : 'Unable to generate a weekly adjustment right now.',
      )
    } finally {
      setWorkoutAdjustmentLoading(false)
    }
  }

  function applyWeeklyAdjustmentChanges() {
    if (!generatedWorkoutAdjustment || !workoutAdjustmentApproved) return

    setWeeklyPlan(normalizeWorkoutPlannerWeeklyPlan(generatedWorkoutAdjustment.draft.updatedWeeklyPlan))
    setAiWorkoutPlanPendingApproval(true)
    setAiWorkoutPlanSource('adjustment')
    setWorkoutPlanApproved(false)
  }

  // ── Text plan handler ────────────────────────────────────────────────────────
  async function savePlan(type: TextPlanType) {
    setSavingType(type)
    const { error } = await supabase
      .from('client_plans')
      .upsert(
        { client_id: params.id, type, content: planContent[type], updated_at: new Date().toISOString() },
        { onConflict: 'client_id,type' }
      )
    if (error) { console.error('Error saving plan:', error); alert(`Failed to save: ${error.message}`) }
    else { setSavedType(type); setTimeout(() => setSavedType(null), 3000) }
    setSavingType(null)
  }

  function addHabitRow() {
    setHabitRows((prev) => [...prev, { ...EMPTY_HABIT }])
  }

  function removeHabitRow(index: number) {
    setHabitRows((prev) => prev.filter((_, i) => i !== index))
  }

  function updateHabitRow(index: number, field: keyof HabitEntry, value: string) {
    setHabitRows((prev) => prev.map((entry, i) => (
      i === index ? { ...entry, [field]: value } : entry
    )))
  }

  async function saveHabitPlan() {
    setHabitSaving(true)
    const { error } = await supabase
      .from('client_plans')
      .upsert(
        {
          client_id: params.id,
          type: 'habits',
          content: JSON.stringify({ habits: habitRows }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,type' }
      )

    if (error) {
      console.error('Error saving habits:', error)
      alert(`Failed to save: ${error.message}`)
    } else {
      setHabitSaved(true)
      setTimeout(() => setHabitSaved(false), 3000)
    }

    setHabitSaving(false)
  }

  function updateCheckInFieldRule(key: CheckInFieldKey, field: 'enabled' | 'required', value: boolean) {
    setCheckInSettings((prev) => {
      const nextConfig = { ...prev.field_config }
      const current = nextConfig[key]
      const alwaysEnabled = CHECK_IN_FIELDS.find((item) => item.key === key)?.alwaysEnabled

      nextConfig[key] = {
        enabled: field === 'enabled'
          ? (alwaysEnabled ? true : value)
          : current.enabled,
        required: field === 'required' ? value : current.required,
      }

      if (!nextConfig[key].enabled) {
        nextConfig[key].required = false
      }

      if (alwaysEnabled) {
        nextConfig[key].enabled = true
      }

      return {
        ...prev,
        field_config: nextConfig,
      }
    })
  }

  async function saveCheckInSettings() {
    setCheckInSaving(true)
    setCheckInError(null)

    const payload = {
      client_id: params.id,
      frequency: checkInSettings.frequency,
      due_day: checkInSettings.due_day,
      custom_interval_weeks: Math.max(checkInSettings.custom_interval_weeks || 1, 1),
      schedule_anchor_date: checkInSettings.schedule_anchor_date,
      public_access_token: checkInSettings.public_access_token,
      field_config: checkInSettings.field_config,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('client_check_in_settings')
      .upsert(payload, { onConflict: 'client_id' })
      .select('id, client_id, frequency, due_day, custom_interval_weeks, schedule_anchor_date, public_access_token, field_config, created_at, updated_at')
      .single()

    if (error) {
      console.error('Error saving check-in settings:', error)
      setCheckInError(error.message)
    } else {
      setCheckInSettings(normalizeCheckInSettings(data))
      setCheckInSaved(true)
      setTimeout(() => setCheckInSaved(false), 3000)
    }

    setCheckInSaving(false)
  }

  async function copyCheckInLink() {
    if (!appOrigin || !checkInSettings.public_access_token) return

    await navigator.clipboard.writeText(`${appOrigin}/check-in/${checkInSettings.public_access_token}`)
    setCheckInLinkCopied(true)
    setTimeout(() => setCheckInLinkCopied(false), 2000)
  }

  async function requestAICoachingSuggestion() {
    if (!client) return

    setAiLoading(true)
    setAiError(null)
    setAiApproved(false)
    setAiMessageCopied(false)

    try {
      const coachingInput = {
        client: {
          id: client.id,
          fullName: client.full_name,
          status: client.status,
          joinedAt: client.created_at,
        },
        performanceSummary,
        checkInAnalysis,
      }
      const response = await fetch('/api/ai/coaching-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: coachingInput,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to generate AI coaching suggestions right now.')
      }

      const nextSuggestion = payload as Omit<GeneratedAICoachingSuggestion, 'historyId'>
      const historyEntry = await storeAISuggestionHistory(
        'coaching_assistant',
        coachingInput as unknown as Record<string, unknown>,
        nextSuggestion as unknown as Record<string, unknown>,
      )
      const nextSuggestionWithHistory = {
        ...nextSuggestion,
        historyId: historyEntry?.id ?? null,
      }

      setAiSuggestion(nextSuggestionWithHistory)
      return nextSuggestionWithHistory
    } catch (generationError) {
      console.error('Error generating AI coaching suggestions:', generationError)
      setAiSuggestion(null)
      setAiError(
        generationError instanceof Error
          ? generationError.message
          : 'Unable to generate AI coaching suggestions right now.',
      )
    } finally {
      setAiLoading(false)
    }
  }

  async function generateAICoachingSuggestions() {
    await requestAICoachingSuggestion()
  }

  async function generateCoachMessageDraft() {
    if (aiSuggestion?.suggestion.suggestedCoachMessage) {
      setCoachMessageDraft(aiSuggestion.suggestion.suggestedCoachMessage)
      setCoachMessageWasAIDrafted(true)
      return
    }

    const generatedSuggestion = await requestAICoachingSuggestion()

    if (generatedSuggestion?.suggestion.suggestedCoachMessage) {
      setCoachMessageDraft(generatedSuggestion.suggestion.suggestedCoachMessage)
      setCoachMessageWasAIDrafted(true)
    }
  }

  async function copySuggestedCoachMessage() {
    if (!aiSuggestion?.suggestion.suggestedCoachMessage || !aiApproved) return

    await navigator.clipboard.writeText(aiSuggestion.suggestion.suggestedCoachMessage)
    setAiMessageCopied(true)
    setTimeout(() => setAiMessageCopied(false), 2000)
  }

  function handleApplyChangesPlaceholder() {
    if (!aiApproved) return

    window.alert('Apply changes is coming next. For now, AI suggestions stay as draft guidance only and nothing will be saved automatically.')
  }

  async function handleAiSuggestionApprovalChange(approved: boolean) {
    setAiApproved(approved)
    await updateAISuggestionHistoryApproval(aiSuggestion?.historyId ?? null, approved)
  }

  async function handleWorkoutPlanApprovalChange(approved: boolean) {
    setWorkoutPlanApproved(approved)

    if (aiWorkoutPlanSource === 'planner') {
      await updateAISuggestionHistoryApproval(generatedWorkoutPlan?.historyId ?? null, approved)
    } else if (aiWorkoutPlanSource === 'adjustment') {
      await updateAISuggestionHistoryApproval(generatedWorkoutAdjustment?.historyId ?? null, approved)
    }
  }

  async function handleWorkoutAdjustmentApprovalChange(approved: boolean) {
    setWorkoutAdjustmentApproved(approved)
    await updateAISuggestionHistoryApproval(generatedWorkoutAdjustment?.historyId ?? null, approved)
  }

  async function sendCoachMessage() {
    if (!client || coachMessageSending) return

    const content = coachMessageDraft.trim()
    if (!content) return

    const resolvedCoachId =
      typeof client.coach_id === 'string' && client.coach_id
        ? client.coach_id
        : coachUserId

    if (!resolvedCoachId) {
      setMessagesError('We could not determine the coach ID for this message.')
      return
    }

    setCoachMessageSending(true)
    setMessagesError(null)

    const optimisticMessage: ClientMessage = {
      coach_id: resolvedCoachId,
      client_id: client.id,
      sender: 'coach',
      message_type: 'text',
      content,
      media_url: null,
      media_duration_seconds: null,
      read: false,
      read_at: null,
      was_ai_drafted: coachMessageWasAIDrafted,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => mergeClientMessage(prev, optimisticMessage))

    const { data, error } = await supabase
      .from('messages')
      .insert({
        coach_id: resolvedCoachId,
        client_id: client.id,
        sender: 'coach',
        message_type: 'text',
        content,
        media_url: null,
        media_duration_seconds: null,
        read: false,
        read_at: null,
        was_ai_drafted: coachMessageWasAIDrafted,
      })
      .select('id, created_at, coach_id, client_id, sender, message_type, content, media_url, media_duration_seconds, read, read_at, was_ai_drafted')
      .single()

    if (error) {
      console.error('Error sending coach message:', error)
      setMessagesError('We could not send that message yet. Please try again.')
      setMessages((prev) => prev.filter((entry) => entry !== optimisticMessage))
      setCoachMessageSending(false)
      return
    }

    const savedMessage = normalizeClientMessage(data)

    setMessages((prev) => {
      const withoutOptimistic = prev.filter((entry) => entry !== optimisticMessage)
      return savedMessage ? mergeClientMessage(withoutOptimistic, savedMessage) : withoutOptimistic
    })

    setCoachMessageDraft('')
    setCoachMessageWasAIDrafted(false)
    setCoachMessageSending(false)
  }

  const performanceSummary = useMemo(
    () => buildCoachPerformanceSummary({
      weeklyPlan,
      habits: habitRows,
      workoutLogs,
      habitLogs,
      checkInSubmissions,
    }),
    [weeklyPlan, habitRows, workoutLogs, habitLogs, checkInSubmissions],
  )

  // ── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: '900px' }}>
        <p style={{ fontSize: '13px', color: '#9ca3af' }}>Loading...</p>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div style={{ padding: '24px', maxWidth: '900px' }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#7F77DD', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '16px', display: 'block' }}>
          ← Back to clients
        </button>
        <div style={{ background: '#fee2e2', color: '#A32D2D', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
          {error ?? 'Client not found.'}
        </div>
      </div>
    )
  }

  const initials    = getInitials(client.full_name)
  const avatarColor = getAvatarColor(client.full_name)
  const cfg         = getStatusConfig(client.status)
  const joinedDate  = new Date(client.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const latestCheckIn = checkInSubmissions[0] ?? null
  const checkInSchedule = getCheckInScheduleStatus(checkInSettings, latestCheckIn?.submitted_at ?? null)
  const enabledCheckInFields = getEnabledCheckInFields(checkInSettings.field_config)
  const checkInLink = appOrigin && checkInSettings.public_access_token
    ? `${appOrigin}/check-in/${checkInSettings.public_access_token}`
    : ''
  const checkInAnalysis = buildCheckInAnalysis(client, checkInSubmissions)
  const riskConfig = riskColors[performanceSummary.risk.level]
  const clientGoals = extractClientContextValues(client, ['goal', 'goals', 'primary_goal', 'desired_outcome'])
  const clientNotes = extractClientContextValues(client, ['notes', 'client_notes', 'coach_notes', 'program_notes'])
  const currentPlanHasEntries = DAYS.some((day) => weeklyPlan[day].length > 0)
  const canGenerateAICoachingSuggestions =
    !aiLoading &&
    !performanceLoading &&
    !checkInLoading &&
    !performanceError &&
    !checkInError
  const canGenerateAIWorkoutPlan =
    !workoutPlannerLoading &&
    !performanceLoading &&
    !checkInLoading &&
    !performanceError &&
    !checkInError
  const canGenerateWeeklyAdjustment =
    currentPlanHasEntries &&
    !workoutAdjustmentLoading &&
    !performanceLoading &&
    !checkInLoading &&
    !performanceError &&
    !checkInError
  const workoutSaveDisabled = workoutSaving || (aiWorkoutPlanPendingApproval && !workoutPlanApproved)
  const adjustmentDecisionConfig = generatedWorkoutAdjustment
    ? adjustmentDecisionColors[generatedWorkoutAdjustment.draft.decision]
    : null
  const unreadClientMessageCount = getUnreadIncomingMessageCount(messages, 'coach')
  const latestThreadMessage = getLatestMessage(messages)
  const latestThreadPreview = getMessagePreviewText(latestThreadMessage)
  const latestCoachMessage = [...messages].reverse().find((message) => message.sender === 'coach') ?? null
  const latestCoachMessageKey = latestCoachMessage ? (latestCoachMessage.id ?? latestCoachMessage.created_at) : null
  const visibleAiHistory = aiHistory.slice(0, 6)

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>

      {/* Back */}
      <button onClick={() => router.back()}
        style={{ background: 'none', border: 'none', color: '#7F77DD', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '20px', display: 'block' }}>
        ← Back to clients
      </button>

      {/* Profile card */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderLeft: `3px solid ${cfg.border}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: avatarColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 500, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '17px', fontWeight: 500, color: '#111827', margin: 0 }}>{client.full_name}</h1>
              <span style={{ background: cfg.bg, color: cfg.color, fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '999px' }}>
                {cfg.label}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Joined {joinedDate}</div>
          </div>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Email</div>
          <div style={{ fontSize: '13px', color: '#374151' }}>{client.email}</div>
        </div>
      </div>

      <div id="check-in-summary" style={{ ...sectionAnchorStyle, background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>
              Client Performance Summary
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
              Fast read on workouts, habits, and current check-in signals
            </div>
          </div>
          <span
            style={{
              background: riskConfig.bg,
              color: riskConfig.color,
              border: `1px solid ${riskConfig.border}20`,
              fontSize: '11px',
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: '999px',
            }}
          >
            Risk: {performanceSummary.risk.level}
          </span>
        </div>

        {performanceLoading ? (
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>Loading performance summary...</div>
        ) : (
          <>
            {performanceError && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#A32D2D',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                {performanceError}
              </div>
            )}

            {!performanceError && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '6px' }}>
                    Workout Adherence
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 600, color: '#111827', lineHeight: 1.1, marginBottom: '6px' }}>
                    {performanceSummary.workout.completionPercentage}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                    {performanceSummary.workout.completedThisWeek} of {performanceSummary.workout.assignedThisWeek} assigned workouts completed this week.
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                    Last completed: {performanceSummary.workout.lastCompletionDateLabel ?? 'No completed session logged yet'}
                  </div>
                  <div style={{ fontSize: '11px', color: performanceSummary.workout.missedSessions > 0 ? '#A32D2D' : '#9ca3af', marginTop: '4px' }}>
                    Missed sessions: {performanceSummary.workout.missedSessions}
                  </div>
                </div>

                <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '6px' }}>
                    Habit Adherence
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 600, color: '#111827', lineHeight: 1.1, marginBottom: '6px' }}>
                    {performanceSummary.habits.completionPercentage}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                    {performanceSummary.habits.completedThisWeek} of {performanceSummary.habits.totalPossibleThisWeek} possible habit checkmarks completed this week.
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                    Current streak: {performanceSummary.habits.currentStreak} day{performanceSummary.habits.currentStreak === 1 ? '' : 's'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    Most missed: {performanceSummary.habits.mostMissedHabit ?? 'No clear miss pattern yet'}
                  </div>
                </div>

                <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '6px' }}>
                    Check-In Status
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                    {latestCheckIn
                      ? `Latest submitted ${new Date(latestCheckIn.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : 'No submitted check-ins yet'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                    {checkInSchedule.isDue
                      ? `Client is currently due. Due date: ${checkInSchedule.dueLabel}.`
                      : `Next check-in: ${checkInSchedule.nextDueLabel}.`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                    {checkInAnalysis.sections.find((section) => section.title === 'Current Status')?.items[0] ?? 'No recent check-in summary available.'}
                  </div>
                </div>

                <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '6px' }}>
                    Risk Indicator
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: riskConfig.color, marginBottom: '6px' }}>
                    {performanceSummary.risk.level}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {performanceSummary.risk.reasons.slice(0, 3).map((reason, index) => (
                      <div key={index} style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
                        - {reason}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '8px' }}>
              Check-In Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
              {checkInAnalysis.sections.map((section) => (
                <div
                  key={section.title}
                  style={{
                    background: '#f9fafb',
                    border: '0.5px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '12px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                    {section.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {section.items.map((item, index) => (
                      <div key={`${section.title}-${index}`} style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                        - {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div id="messages" style={{ ...sectionAnchorStyle, background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>
              AI Coaching Assistant
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px', maxWidth: '560px', lineHeight: 1.5 }}>
              Generate a draft summary, key issues, recommendations, and a coach message from current workout, habit, check-in, and weight-trend data. Nothing saves or sends automatically.
            </div>
          </div>

          <button
            onClick={generateAICoachingSuggestions}
            disabled={!canGenerateAICoachingSuggestions}
            style={{
              background: canGenerateAICoachingSuggestions ? '#111827' : '#f3f4f6',
              color: canGenerateAICoachingSuggestions ? '#fff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 500,
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: canGenerateAICoachingSuggestions ? 'pointer' : 'not-allowed',
            }}
          >
            {aiLoading ? 'Generating…' : 'Generate Suggestions'}
          </button>
        </div>

        <div
          style={{
            background: '#f9fafb',
            border: '0.5px solid #e5e7eb',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: aiSuggestion || aiError || aiLoading ? '12px' : 0,
          }}
        >
          <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.6 }}>
            Coach review is always required. Suggestions are draft-only and will never modify plans or send messages on their own.
          </div>
        </div>

        {aiLoading && (
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            Generating a coach review draft from the latest client signals...
          </div>
        )}

        {aiError && (
          <div
            style={{
              background: '#fee2e2',
              color: '#A32D2D',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
            }}
          >
            {aiError}
          </div>
        )}

        {!aiLoading && !aiError && !aiSuggestion && (
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>
            No draft generated yet. Use <span style={{ color: '#111827', fontWeight: 500 }}>Generate Suggestions</span> when you want a coach-reviewed AI summary for this client.
          </div>
        )}

        {aiSuggestion && !aiLoading && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  background: '#f9fafb',
                  border: '0.5px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px',
                  gridColumn: isMobile ? 'auto' : '1 / -1',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                  Summary
                </div>
                <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>
                  {aiSuggestion.suggestion.summary}
                </div>
              </div>

              <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                  Key Issues
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {aiSuggestion.suggestion.keyIssues.map((item, index) => (
                    <div key={`ai-key-issue-${index}`} style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                      - {item}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                  Recommendations
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {aiSuggestion.suggestion.recommendations.map((item, index) => (
                    <div key={`ai-recommendation-${index}`} style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                      - {item}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: '#f9fafb',
                  border: '0.5px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px',
                  gridColumn: isMobile ? 'auto' : '1 / -1',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                    Suggested Coach Message
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    Generated {new Date(aiSuggestion.generatedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '12px',
                    color: '#374151',
                    lineHeight: 1.7,
                    background: '#fff',
                    border: '0.5px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  {aiSuggestion.suggestion.suggestedCoachMessage}
                </div>
              </div>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: '#fff',
                border: '0.5px solid #e5e7eb',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '12px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={aiApproved}
                onChange={(event) => {
                  void handleAiSuggestionApprovalChange(event.target.checked)
                }}
                style={{ marginTop: '2px' }}
              />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#111827' }}>
                  I have reviewed and approve this AI-generated suggestion
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px', lineHeight: 1.5 }}>
                  Approval is required before any follow-up action. Applying changes is still a placeholder and will not modify the client plan yet.
                </div>
              </div>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handleApplyChangesPlaceholder}
                disabled={!aiApproved}
                style={{
                  background: aiApproved ? '#111827' : '#f3f4f6',
                  color: aiApproved ? '#fff' : '#9ca3af',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: aiApproved ? 'pointer' : 'not-allowed',
                }}
              >
                Apply changes
              </button>
              <button
                onClick={copySuggestedCoachMessage}
                disabled={!aiApproved}
                style={{
                  background: '#fff',
                  color: aiApproved ? '#374151' : '#9ca3af',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '0.5px solid #e5e7eb',
                  cursor: aiApproved ? 'pointer' : 'not-allowed',
                }}
              >
                {aiMessageCopied ? 'Message Copied' : 'Copy message'}
              </button>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                {aiApproved
                  ? 'Draft approved for manual follow-up.'
                  : 'Review and approve before copying or applying.'}
              </div>
            </div>
          </>
        )}
      </div>

      <div id="workout-planner" style={{ ...sectionAnchorStyle, background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>
                Messages
              </div>
              {unreadClientMessageCount > 0 && (
                <span
                  style={{
                    background: '#fee2e2',
                    color: '#A32D2D',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  {unreadClientMessageCount} new
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
              {latestThreadMessage
                ? `Latest ${latestThreadMessage.sender === 'client' ? 'from client' : 'from coach'}: ${latestThreadPreview}`
                : 'Simple coach-client conversation thread. Messages send manually and appear in order.'}
            </div>
          </div>
          <button
            onClick={generateCoachMessageDraft}
            disabled={!canGenerateAICoachingSuggestions}
            style={{
              background: '#fff',
              color: canGenerateAICoachingSuggestions ? '#374151' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 500,
              padding: '7px 14px',
              borderRadius: '8px',
              border: '0.5px solid #e5e7eb',
              cursor: canGenerateAICoachingSuggestions ? 'pointer' : 'not-allowed',
            }}
          >
            {aiLoading ? 'Generating…' : 'Generate message'}
          </button>
        </div>

        {latestThreadMessage && (
          <div
            style={{
              background: latestThreadMessage.sender === 'client' && !latestThreadMessage.read ? '#fff7ed' : '#f9fafb',
              border: `0.5px solid ${latestThreadMessage.sender === 'client' && !latestThreadMessage.read ? '#fed7aa' : '#e5e7eb'}`,
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Latest message
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                {formatMessageTimestamp(latestThreadMessage.created_at)}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {latestThreadMessage.sender === 'client' ? 'Client' : 'Coach'}:
              </span>{' '}
              {latestThreadPreview}
            </div>
          </div>
        )}

        <div
          style={{
            background: '#f9fafb',
            border: '0.5px solid #e5e7eb',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '12px',
            maxHeight: '360px',
            overflowY: 'auto',
          }}
        >
          {messagesLoading ? (
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>
              No messages yet. Start the conversation with a quick check-in or use AI to draft a message you can edit first.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map((message, index) => {
                const isCoach = message.sender === 'coach'
                const showLabel =
                  index === 0 || messages[index - 1]?.sender !== message.sender

                return (
                  <div
                    key={`${message.id ?? message.created_at}-${index}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isCoach ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {showLabel && (
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>
                        {isCoach ? 'Coach' : 'Client'}
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: isMobile ? '100%' : '78%',
                        background: isCoach ? '#111827' : message.read ? '#fff' : '#fff7ed',
                        color: isCoach ? '#fff' : '#374151',
                        border: isCoach ? 'none' : `0.5px solid ${message.read ? '#e5e7eb' : '#fed7aa'}`,
                        borderRadius: '12px',
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: '12px', lineHeight: 1.7 }}>
                        {message.content}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: isCoach ? 'rgba(255,255,255,0.7)' : '#9ca3af',
                          marginTop: '6px',
                        }}
                      >
                        {formatMessageTimestamp(message.created_at)}
                        {isCoach && (message.id ?? message.created_at) === latestCoachMessageKey && (
                          <> · {getOutgoingMessageStatusLabel(message, 'coach')}</>
                        )}
                        {!isCoach && !message.read && (
                          <> · Unread</>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {messagesError && (
          <div
            style={{
              background: '#fee2e2',
              color: '#A32D2D',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              marginBottom: '12px',
            }}
          >
            {messagesError}
          </div>
        )}

        {aiError && (
          <div
            style={{
              background: '#fff7ed',
              color: '#BA7517',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              marginBottom: '12px',
            }}
          >
            {aiError}
          </div>
        )}

        <textarea
          value={coachMessageDraft}
          onChange={(event) => setCoachMessageDraft(event.target.value)}
          placeholder="Write a message to the client..."
          rows={4}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontSize: '13px',
            lineHeight: '1.6',
            color: '#374151',
            background: '#f9fafb',
            border: '0.5px solid #e5e7eb',
            borderRadius: '10px',
            padding: '12px',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            marginBottom: '10px',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
            AI only drafts the message. Nothing sends until you review and click send.
          </div>
          <button
            onClick={sendCoachMessage}
            disabled={coachMessageSending || !coachMessageDraft.trim()}
            style={{
              background: coachMessageSending || !coachMessageDraft.trim() ? '#f3f4f6' : '#111827',
              color: coachMessageSending || !coachMessageDraft.trim() ? '#9ca3af' : '#fff',
              fontSize: '12px',
              fontWeight: 500,
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: coachMessageSending || !coachMessageDraft.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {coachMessageSending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </div>

      <div id="weekly-adjustment" style={{ ...sectionAnchorStyle, background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>
              AI Workout Planner
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px', maxWidth: '560px', lineHeight: 1.5 }}>
              Generate a draft weekly plan from the client&apos;s current program, adherence patterns, and check-in context. The draft fills the existing builder, but nothing saves until you approve and click Save Plan.
            </div>
          </div>
          <button
            onClick={generateAIWorkoutPlan}
            disabled={!canGenerateAIWorkoutPlan}
            style={{
              background: canGenerateAIWorkoutPlan ? '#111827' : '#f3f4f6',
              color: canGenerateAIWorkoutPlan ? '#fff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 500,
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: canGenerateAIWorkoutPlan ? 'pointer' : 'not-allowed',
            }}
          >
            {workoutPlannerLoading ? 'Generating…' : 'Generate Plan'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginBottom: '12px' }}>
          <div style={{ minWidth: isMobile ? '100%' : '220px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '6px' }}>
              Assistance Level
            </label>
            <select
              value={workoutPlannerLevel}
              onChange={(event) => setWorkoutPlannerLevel(event.target.value as WorkoutPlannerAssistanceLevel)}
              style={{ ...inputBase, width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: '#fff' }}
            >
              <option value="low">Low assistance</option>
              <option value="medium">Medium assistance</option>
              <option value="high">High assistance</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 0, background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '6px' }}>
              Planner Behavior
            </div>
            <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
              {workoutPlannerLevel === 'low' && 'Low assistance focuses on workout structure and exercise direction, with lighter prescription detail.'}
              {workoutPlannerLevel === 'medium' && 'Medium assistance suggests structure plus practical sets and reps for the main work.'}
              {workoutPlannerLevel === 'high' && 'High assistance generates the fullest weekly draft, while still keeping the plan coach-reviewable and simple.'}
            </div>
          </div>
        </div>

        {workoutPlannerError && (
          <div
            style={{
              background: '#fee2e2',
              color: '#A32D2D',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              marginBottom: '12px',
            }}
          >
            {workoutPlannerError}
          </div>
        )}

        {!generatedWorkoutPlan && !workoutPlannerLoading && !workoutPlannerError && (
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>
            No AI workout draft yet. Generate a draft when you want help structuring the week, then review it in the builder below before saving.
          </div>
        )}

        {generatedWorkoutPlan && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  background: '#f9fafb',
                  border: '0.5px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px',
                  gridColumn: isMobile ? 'auto' : '1 / -1',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                    Draft Summary
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    Generated {new Date(generatedWorkoutPlan.generatedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>
                  {generatedWorkoutPlan.draft.summary}
                </div>
              </div>

              <div
                style={{
                  background: '#f9fafb',
                  border: '0.5px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px',
                  gridColumn: isMobile ? 'auto' : '1 / -1',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                  Rationale
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {generatedWorkoutPlan.draft.rationale.map((item, index) => (
                    <div key={`workout-rationale-${index}`} style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                      - {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {aiWorkoutPlanSource === 'planner' && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: '#fff',
                  border: '0.5px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px',
                }}
              >
                <input
                  type="checkbox"
                  checked={workoutPlanApproved}
                  onChange={(event) => {
                    void handleWorkoutPlanApprovalChange(event.target.checked)
                  }}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#111827' }}>
                    I have reviewed this AI-generated plan and approve it for this client.
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px', lineHeight: 1.5 }}>
                    Save Plan stays disabled until this is checked. You can still edit any day or exercise row in the builder below before saving.
                  </div>
                </div>
              </label>
            )}
          </>
        )}
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>
              Weekly Adjustment
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px', maxWidth: '560px', lineHeight: 1.5 }}>
              Adjust the current plan using recent performance, adherence, check-in context, and weight trend. Nothing applies until you approve and click Apply Changes.
            </div>
          </div>
          <button
            onClick={generateWeeklyAdjustment}
            disabled={!canGenerateWeeklyAdjustment}
            style={{
              background: canGenerateWeeklyAdjustment ? '#111827' : '#f3f4f6',
              color: canGenerateWeeklyAdjustment ? '#fff' : '#9ca3af',
              fontSize: '12px',
              fontWeight: 500,
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: canGenerateWeeklyAdjustment ? 'pointer' : 'not-allowed',
            }}
          >
            {workoutAdjustmentLoading
              ? 'Generating…'
              : generatedWorkoutAdjustment
                ? 'Regenerate'
                : 'Generate Adjustment'}
          </button>
        </div>

        {!currentPlanHasEntries && (
          <div
            style={{
              background: '#f9fafb',
              color: '#6b7280',
              border: '0.5px solid #e5e7eb',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '12px',
              lineHeight: 1.6,
            }}
          >
            Add or generate a workout plan first. Weekly Adjustment is designed to evolve an existing week, not create one from scratch.
          </div>
        )}

        {currentPlanHasEntries && (
          <>
            {workoutAdjustmentError && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#A32D2D',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                {workoutAdjustmentError}
              </div>
            )}

            {!generatedWorkoutAdjustment && !workoutAdjustmentLoading && !workoutAdjustmentError && (
              <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>
                No adjustment drafted yet. Generate one when you want AI to review the existing week and suggest targeted changes instead of rebuilding the plan.
              </div>
            )}

            {generatedWorkoutAdjustment && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div
                    style={{
                      background: '#f9fafb',
                      border: '0.5px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '12px',
                      gridColumn: isMobile ? 'auto' : '1 / -1',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                        Adjustment Summary
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {adjustmentDecisionConfig && (
                          <span
                            style={{
                              background: adjustmentDecisionConfig.bg,
                              color: adjustmentDecisionConfig.color,
                              border: `1px solid ${adjustmentDecisionConfig.border}`,
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '4px 9px',
                              borderRadius: '999px',
                            }}
                          >
                            {adjustmentDecisionConfig.label}
                          </span>
                        )}
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                          Generated {new Date(generatedWorkoutAdjustment.generatedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>
                      {generatedWorkoutAdjustment.draft.summary}
                    </div>
                  </div>

                  <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                      Reasoning
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {generatedWorkoutAdjustment.draft.reasoning.map((item, index) => (
                        <div key={`workout-adjustment-reasoning-${index}`} style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                          - {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                      Changes
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {generatedWorkoutAdjustment.draft.adjustments.map((item, index) => (
                        <div key={`workout-adjustment-change-${index}`} style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                          - {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    background: '#fff',
                    border: '0.5px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={workoutAdjustmentApproved}
                    onChange={(event) => {
                      void handleWorkoutAdjustmentApprovalChange(event.target.checked)
                    }}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#111827' }}>
                      I have reviewed and approve these AI-generated adjustments before applying them.
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px', lineHeight: 1.5 }}>
                      Apply Changes only updates the builder below. Nothing is saved to the client plan until you review and click Save Plan.
                    </div>
                  </div>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={generateWeeklyAdjustment}
                    disabled={!canGenerateWeeklyAdjustment}
                    style={{
                      background: '#fff',
                      color: canGenerateWeeklyAdjustment ? '#374151' : '#9ca3af',
                      fontSize: '12px',
                      fontWeight: 500,
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: '0.5px solid #e5e7eb',
                      cursor: canGenerateWeeklyAdjustment ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {workoutAdjustmentLoading ? 'Generating…' : 'Regenerate'}
                  </button>
                  <button
                    onClick={applyWeeklyAdjustmentChanges}
                    disabled={!workoutAdjustmentApproved}
                    style={{
                      background: workoutAdjustmentApproved ? '#111827' : '#f3f4f6',
                      color: workoutAdjustmentApproved ? '#fff' : '#9ca3af',
                      fontSize: '12px',
                      fontWeight: 500,
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: workoutAdjustmentApproved ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Apply Changes
                  </button>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {workoutAdjustmentApproved
                      ? 'Ready to populate the builder with the updated week.'
                      : 'Approval is required before changes can be applied.'}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>
              AI History
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px', maxWidth: '560px', lineHeight: 1.5 }}>
              Recent AI-generated coaching suggestions and workout drafts for this client. History is review-only and does not auto-apply anything.
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
            {visibleAiHistory.length === 0 ? 'No entries yet' : `Showing ${visibleAiHistory.length} recent`}
          </div>
        </div>

        {aiHistoryError && (
          <div
            style={{
              background: '#fff7ed',
              color: '#BA7517',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              marginBottom: '12px',
            }}
          >
            {aiHistoryError}
          </div>
        )}

        {aiHistoryLoading ? (
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            Loading AI history...
          </div>
        ) : visibleAiHistory.length === 0 ? (
          <div
            style={{
              background: '#f9fafb',
              border: '0.5px solid #e5e7eb',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '12px',
              color: '#6b7280',
              lineHeight: 1.6,
            }}
          >
            No AI history yet. Generated suggestions and workout drafts will appear here after they are created.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleAiHistory.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: '#f9fafb',
                  border: '0.5px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                      {getAISuggestionTypeLabel(entry.suggestion_type)}
                    </div>
                    <span
                      style={{
                        background: entry.approved ? '#dcfce7' : '#f3f4f6',
                        color: entry.approved ? '#166534' : '#6b7280',
                        border: `1px solid ${entry.approved ? '#86efac' : '#e5e7eb'}`,
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      {entry.approved ? 'Approved' : 'Awaiting Review'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {new Date(entry.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                  {getAISuggestionHistorySummary(entry)}
                </div>
                {entry.approved && entry.approved_at && (
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
                    Approved {new Date(entry.approved_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Weekly Workout Plan ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px' }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>
              Workout Plan
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              Week of {weekDates.monday}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {workoutSaved && (
              <span style={{ fontSize: '12px', color: '#639922' }}>Saved ✓</span>
            )}
            <button
              onClick={saveWorkoutPlan}
              disabled={workoutSaveDisabled}
              style={{
                background: workoutSaveDisabled ? '#f3f4f6' : '#111827',
                color: workoutSaveDisabled ? '#9ca3af' : '#fff',
                fontSize: '12px', fontWeight: 500,
                padding: '5px 14px', borderRadius: '8px',
                border: 'none', cursor: workoutSaveDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              {workoutSaving ? 'Saving…' : 'Save Plan'}
            </button>
          </div>
        </div>

        {aiWorkoutPlanPendingApproval && !workoutPlanApproved && (
          <div
            style={{
              background: '#fff7ed',
              color: '#BA7517',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              marginBottom: '12px',
            }}
          >
            {aiWorkoutPlanSource === 'adjustment'
              ? 'These AI-adjusted changes were applied to the builder. Review the updated plan and approve it before saving.'
              : 'This workout draft came from AI assistance. Review the plan and approve it above before saving.'}
          </div>
        )}

        {aiWorkoutPlanPendingApproval && aiWorkoutPlanSource === 'adjustment' && (
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: '#fff',
              border: '0.5px solid #e5e7eb',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '12px',
            }}
          >
            <input
              type="checkbox"
              checked={workoutPlanApproved}
              onChange={(event) => {
                void handleWorkoutPlanApprovalChange(event.target.checked)
              }}
              style={{ marginTop: '2px' }}
            />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#111827' }}>
                I have reviewed the applied AI adjustment and approve this updated plan for saving.
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px', lineHeight: 1.5 }}>
                You can still edit any day or exercise row below before saving the final plan.
              </div>
            </div>
          </label>
        )}

        {/* Day cards */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '8px',
            overflowX: isMobile ? 'visible' : 'auto',
            paddingBottom: isMobile ? '0' : '4px',
          }}
        >
          {DAYS.map((day) => {
            const isWeekend = day === 'saturday' || day === 'sunday'
            const entries = weeklyPlan[day]

            return (
              <div
                key={day}
                style={{
                  minWidth: isMobile ? '100%' : '188px',
                  flex: isMobile ? '1 1 auto' : '0 0 188px',
                  background: isWeekend ? '#fafafa' : '#fff',
                  border: '0.5px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Day header */}
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{DAY_NAMES[day]}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>{weekDates[day]}</div>
                </div>

                {/* Entries */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {entries.length === 0 ? (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        textAlign: 'center',
                        padding: '12px 10px',
                        fontStyle: 'italic',
                        background: '#f9fafb',
                        border: '0.5px dashed #e5e7eb',
                        borderRadius: '8px',
                      }}
                    >
                      Rest day
                    </div>
                  ) : (
                    entries.map((entry, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#f9fafb',
                          border: '0.5px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        {/* Exercise name row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="text"
                            value={entry.exercise}
                            onChange={(e) => updateEntry(day, idx, 'exercise', e.target.value)}
                            placeholder="Exercise"
                            style={{ ...inputBase, flex: 1, minWidth: 0, boxSizing: 'border-box' }}
                          />
                          <button
                            onClick={() => removeEntry(day, idx)}
                            aria-label={`Remove ${DAY_NAMES[day]} workout ${idx + 1}`}
                            style={{
                              width: '24px',
                              height: '24px',
                              background: '#fff',
                              border: '0.5px solid #e5e7eb',
                              borderRadius: '6px',
                              color: '#9ca3af',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: 0,
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            ×
                          </button>
                        </div>
                        {/* Sets / Reps / Notes row */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="text"
                            value={entry.sets}
                            onChange={(e) => updateEntry(day, idx, 'sets', e.target.value)}
                            placeholder="Sets"
                            style={{ ...inputBase, width: '44px', textAlign: 'center', boxSizing: 'border-box' }}
                          />
                          <input
                            type="text"
                            value={entry.reps}
                            onChange={(e) => updateEntry(day, idx, 'reps', e.target.value)}
                            placeholder="Reps"
                            style={{ ...inputBase, width: '44px', textAlign: 'center', boxSizing: 'border-box' }}
                          />
                          <input
                            type="text"
                            value={entry.notes}
                            onChange={(e) => updateEntry(day, idx, 'notes', e.target.value)}
                            placeholder="Notes / intensity"
                            style={{ ...inputBase, flex: 1, minWidth: 0, boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add entry button */}
                <button
                  onClick={() => addEntry(day)}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    background: 'none',
                    border: '0.5px dashed #d1d5db',
                    borderRadius: '7px',
                    padding: '6px',
                    fontSize: '12px',
                    color: '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  + Add workout
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Nutrition Plan ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {TEXT_PLANS.map(({ type, label, placeholder }) => (
          <div key={type} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>
                {label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {savedType === type && (
                  <span style={{ fontSize: '12px', color: '#639922' }}>Saved ✓</span>
                )}
                <button
                  onClick={() => savePlan(type)}
                  disabled={savingType === type}
                  style={{
                    background: savingType === type ? '#f3f4f6' : '#111827',
                    color: savingType === type ? '#9ca3af' : '#fff',
                    fontSize: '12px', fontWeight: 500,
                    padding: '5px 14px', borderRadius: '8px',
                    border: 'none', cursor: savingType === type ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingType === type ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
            <textarea
              value={planContent[type]}
              onChange={(e) => setPlanContent((prev) => ({ ...prev, [type]: e.target.value }))}
              placeholder={placeholder}
              rows={5}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontSize: '13px', lineHeight: '1.6', color: '#374151',
                background: '#f9fafb', border: '0.5px solid #e5e7eb',
                borderRadius: '8px', padding: '10px 12px',
                resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
        ))}

        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>
              Habit Targets
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {habitSaved && (
                <span style={{ fontSize: '12px', color: '#639922' }}>Saved ✓</span>
              )}
              <button
                onClick={saveHabitPlan}
                disabled={habitSaving}
                style={{
                  background: habitSaving ? '#f3f4f6' : '#111827',
                  color: habitSaving ? '#9ca3af' : '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '5px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: habitSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {habitSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {habitRows.length === 0 ? (
              <div
                style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  textAlign: 'center',
                  padding: '14px 12px',
                  background: '#f9fafb',
                  border: '0.5px dashed #e5e7eb',
                  borderRadius: '8px',
                }}
              >
                No habits added yet
              </div>
            ) : (
              habitRows.map((entry, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: '6px',
                    padding: '8px',
                    background: '#f9fafb',
                    border: '0.5px solid #e5e7eb',
                    borderRadius: '8px',
                    alignItems: isMobile ? 'stretch' : 'center',
                  }}
                >
                  <select
                    value={entry.category}
                    onChange={(e) => updateHabitRow(index, 'category', e.target.value)}
                    style={{
                      ...inputBase,
                      minWidth: isMobile ? '100%' : '122px',
                      boxSizing: 'border-box',
                      padding: '6px 8px',
                    }}
                  >
                    {HABIT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={entry.habit}
                    onChange={(e) => updateHabitRow(index, 'habit', e.target.value)}
                    placeholder="Habit"
                    style={{
                      ...inputBase,
                      flex: 1,
                      minWidth: 0,
                      boxSizing: 'border-box',
                      padding: '6px 8px',
                    }}
                  />
                  <input
                    type="text"
                    value={entry.target}
                    onChange={(e) => updateHabitRow(index, 'target', e.target.value)}
                    placeholder="Target"
                    style={{
                      ...inputBase,
                      width: isMobile ? '100%' : '96px',
                      boxSizing: 'border-box',
                      padding: '6px 8px',
                    }}
                  />
                  <input
                    type="text"
                    value={entry.frequency}
                    onChange={(e) => updateHabitRow(index, 'frequency', e.target.value)}
                    placeholder="Frequency / notes"
                    style={{
                      ...inputBase,
                      width: isMobile ? '100%' : '144px',
                      boxSizing: 'border-box',
                      padding: '6px 8px',
                    }}
                  />
                  <button
                    onClick={() => removeHabitRow(index)}
                    aria-label={`Remove habit ${index + 1}`}
                    style={{
                      width: isMobile ? '100%' : '28px',
                      height: isMobile ? '32px' : '28px',
                      background: '#fff',
                      border: '0.5px solid #e5e7eb',
                      borderRadius: '6px',
                      color: '#9ca3af',
                      cursor: 'pointer',
                      fontSize: '14px',
                      lineHeight: 1,
                      padding: 0,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            onClick={addHabitRow}
            style={{
              marginTop: '8px',
              width: '100%',
              background: 'none',
              border: '0.5px dashed #d1d5db',
              borderRadius: '7px',
              padding: '6px',
              fontSize: '12px',
              color: '#6b7280',
              cursor: 'pointer',
            }}
          >
            + Add habit
          </button>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280' }}>
                Check-In Setup
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                {checkInSchedule.isDue
                  ? `Client is due now. Current due date: ${checkInSchedule.dueLabel}`
                  : `Next check-in: ${checkInSchedule.nextDueLabel}`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {checkInSaved && (
                <span style={{ fontSize: '12px', color: '#639922' }}>Saved ✓</span>
              )}
              <button
                onClick={saveCheckInSettings}
                disabled={checkInSaving}
                style={{
                  background: checkInSaving ? '#f3f4f6' : '#111827',
                  color: checkInSaving ? '#9ca3af' : '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '5px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: checkInSaving ? 'not-allowed' : 'pointer',
                }}
              >
                {checkInSaving ? 'Saving…' : 'Save Setup'}
              </button>
            </div>
          </div>

          {checkInError && (
            <div
              style={{
                background: '#fee2e2',
                color: '#A32D2D',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                marginBottom: '12px',
              }}
            >
              {checkInError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '8px' }}>
                Schedule
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                    Frequency
                  </label>
                  <select
                    value={checkInSettings.frequency}
                    onChange={(event) => setCheckInSettings((prev) => ({ ...prev, frequency: event.target.value as CoachCheckInSettings['frequency'] }))}
                    style={{ ...inputBase, width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: '#fff' }}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {checkInSettings.frequency === 'custom' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                      Custom interval
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={checkInSettings.custom_interval_weeks}
                      onChange={(event) => setCheckInSettings((prev) => ({ ...prev, custom_interval_weeks: Number(event.target.value) || 1 }))}
                      style={{ ...inputBase, width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: '#fff' }}
                    />
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                      Every X weeks
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                    Due day
                  </label>
                  <select
                    value={checkInSettings.due_day}
                    onChange={(event) => setCheckInSettings((prev) => ({ ...prev, due_day: event.target.value as CoachCheckInSettings['due_day'] }))}
                    style={{ ...inputBase, width: '100%', boxSizing: 'border-box', padding: '8px 10px', background: '#fff' }}
                  >
                    {CHECK_IN_DAYS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '8px' }}>
                Client Link
              </div>
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, marginBottom: '10px' }}>
                Share this link with the client so they can complete the active check-in form on any device.
              </div>
              <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#6b7280', wordBreak: 'break-all', marginBottom: '8px' }}>
                {checkInLink || 'Saving the setup will generate the client check-in link.'}
              </div>
              <button
                onClick={copyCheckInLink}
                disabled={!checkInLink}
                style={{
                  width: '100%',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: !checkInLink ? '#9ca3af' : '#7F77DD',
                  border: '0.5px solid #e5e7eb',
                  background: '#fff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: !checkInLink ? 'not-allowed' : 'pointer',
                }}
              >
                {checkInLinkCopied ? 'Copied!' : 'Copy client link'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '8px' }}>
              Field Configuration
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CHECK_IN_FIELDS.map((field) => {
                const rule = checkInSettings.field_config[field.key]
                return (
                  <div
                    key={field.key}
                    style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'stretch' : 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      border: '0.5px solid #e5e7eb',
                      borderRadius: '10px',
                      background: '#f9fafb',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                        {field.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                        {field.alwaysEnabled ? 'Always available' : 'Coach can enable or hide this field'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => updateCheckInFieldRule(field.key, 'enabled', !rule.enabled)}
                        disabled={Boolean(field.alwaysEnabled)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '6px 10px',
                          borderRadius: '999px',
                          border: '0.5px solid #e5e7eb',
                          background: rule.enabled ? '#ede9fe' : '#fff',
                          color: rule.enabled ? '#7F77DD' : '#6b7280',
                          cursor: field.alwaysEnabled ? 'not-allowed' : 'pointer',
                          opacity: field.alwaysEnabled ? 0.6 : 1,
                        }}
                      >
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => updateCheckInFieldRule(field.key, 'required', !rule.required)}
                        disabled={!rule.enabled}
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '6px 10px',
                          borderRadius: '999px',
                          border: '0.5px solid #e5e7eb',
                          background: rule.required ? '#fee2e2' : '#fff',
                          color: rule.required ? '#A32D2D' : '#6b7280',
                          cursor: !rule.enabled ? 'not-allowed' : 'pointer',
                          opacity: !rule.enabled ? 0.5 : 1,
                        }}
                      >
                        {rule.required ? 'Required' : 'Optional'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: '8px' }}>
              Schedule Snapshot
            </div>
            <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
              {enabledCheckInFields.length} field{enabledCheckInFields.length === 1 ? '' : 's'} enabled.
              {' '}Current cycle started {checkInSchedule.currentCycleStartLabel}.{' '}
              {checkInSchedule.isDue
                ? `This client still owes the current check-in due ${checkInSchedule.dueLabel}.`
                : `The next due date is ${checkInSchedule.nextDueLabel}.`}
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6b7280', marginBottom: '10px' }}>
            Recent Check-Ins
          </div>

          {checkInLoading ? (
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>Loading recent submissions...</div>
          ) : checkInSubmissions.length === 0 ? (
            <div
              style={{
                background: '#f9fafb',
                border: '0.5px dashed #e5e7eb',
                borderRadius: '8px',
                padding: '14px 12px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#9ca3af',
              }}
            >
              No client check-ins have been submitted yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {checkInSubmissions.slice(0, 5).map((submission) => {
                const weight = typeof submission.content.weight === 'string' ? submission.content.weight : null
                const updateText =
                  typeof submission.content.wins_challenges === 'string' && submission.content.wins_challenges
                    ? submission.content.wins_challenges
                    : typeof submission.content.text_update === 'string'
                    ? submission.content.text_update
                    : ''
                const photos = Array.isArray(submission.content.progress_photos)
                  ? submission.content.progress_photos.length
                  : 0

                return (
                  <div
                    key={submission.id}
                    style={{
                      background: '#f9fafb',
                      border: '0.5px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                        Submitted {new Date(submission.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        Due {submission.due_date ? new Date(`${submission.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                      {weight ? `Weight: ${weight}. ` : ''}
                      {photos > 0 ? `${photos} progress photo${photos === 1 ? '' : 's'} uploaded. ` : ''}
                      {updateText ? updateText.slice(0, 180) : 'Structured check-in submitted.'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
