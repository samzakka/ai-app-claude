'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getGreeting,
  getProgressSnapshot,
  getTodayWorkout,
  normalizeHabitPlan,
  normalizeWorkoutPlan,
  type HabitEntry,
  type WorkoutEntry,
  type WeeklyPlan,
} from '@/lib/client-dashboard'
import {
  getCheckInScheduleStatus,
  normalizeCheckInSettings,
  normalizeCheckInSubmissions,
  type CheckInSubmission,
  type CoachCheckInSettings,
} from '@/lib/check-ins'
import {
  getCompletedHabitCountForDate,
  getCurrentHabitStreak,
  getDateDaysAgo,
  getHabitCompletionMapForDate,
  getLocalDateString,
  mergeHabitCompletionLog,
  normalizeHabitCompletionLog,
  normalizeHabitCompletionLogs,
  type HabitCompletionLog,
} from '@/lib/habit-completions'
import {
  getCompletedExerciseCountForDate,
  getWorkoutLogMapForDate,
  mergeWorkoutExerciseLog,
  normalizeWorkoutExerciseLog,
  normalizeWorkoutExerciseLogs,
  type WorkoutExerciseLog,
} from '@/lib/workout-logs'
import {
  mergeClientMessage,
  normalizeClientMessage,
  normalizeClientMessages,
  type ClientMessage,
} from '@/lib/messages'

type ClientRecord = {
  id: string
  full_name: string
  email: string
  created_at: string
  status?: string
} & Record<string, unknown>

type WorkoutExerciseDraft = {
  completed: boolean
  client_notes: string
  difficulty_rpe: string
  logged_weight: string
  logged_reps: string
  selected_substitution: string
}

const emptyWorkoutPlan: WeeklyPlan = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
}

const pageBackground = '#f4f1ea'
const cardBackground = 'rgba(255, 255, 255, 0.92)'
const borderColor = 'rgba(148, 163, 184, 0.18)'

function cardStyle(padding = '22px'): CSSProperties {
  return {
    background: cardBackground,
    border: `1px solid ${borderColor}`,
    borderRadius: '24px',
    padding,
    boxShadow: '0 18px 40px rgba(148, 163, 184, 0.08)',
    backdropFilter: 'blur(10px)',
  }
}

function labelStyle(): CSSProperties {
  return {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#94a3b8',
    marginBottom: '10px',
  }
}

function primaryButtonStyle(disabled = false): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '0 18px',
    borderRadius: '999px',
    border: 'none',
    background: disabled ? '#dbe4ee' : '#111827',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
  }
}

function secondaryButtonStyle(disabled = false): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '42px',
    padding: '0 16px',
    borderRadius: '999px',
    border: `1px solid ${disabled ? '#e5e7eb' : '#d7dde5'}`,
    background: '#fff',
    color: disabled ? '#94a3b8' : '#374151',
    fontSize: '13px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
  }
}

function createWorkoutDraft(
  entry: WorkoutEntry,
  savedLog?: WorkoutExerciseLog | null,
  draft?: WorkoutExerciseDraft | null,
): WorkoutExerciseDraft {
  if (draft) return draft

  return {
    completed: savedLog?.completed ?? false,
    client_notes: savedLog?.client_notes ?? '',
    difficulty_rpe: savedLog?.difficulty_rpe ? String(savedLog.difficulty_rpe) : '',
    logged_weight: savedLog?.logged_weight ?? '',
    logged_reps: savedLog?.logged_reps ?? '',
    selected_substitution: savedLog?.selected_substitution ?? '',
  }
}

function formatRestTime(totalSeconds: number) {
  const safe = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function getExerciseSummary(entry: WorkoutEntry) {
  const parts = [
    entry.sets ? `${entry.sets} sets` : null,
    entry.reps ? `${entry.reps} reps` : null,
  ].filter(Boolean)

  if (parts.length > 0) return parts.join(' · ')
  if (entry.notes) return entry.notes
  return 'Open to log your progress'
}

function formatMessageTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ClientDashboardPage() {
  const params = useParams<{ id: string }>()
  const todayDate = getLocalDateString()
  const [client, setClient] = useState<ClientRecord | null>(null)
  const [workoutPlan, setWorkoutPlan] = useState<WeeklyPlan>(emptyWorkoutPlan)
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutExerciseLog[]>([])
  const [habits, setHabits] = useState<HabitEntry[]>([])
  const [habitLogs, setHabitLogs] = useState<HabitCompletionLog[]>([])
  const [checkInSettings, setCheckInSettings] = useState<CoachCheckInSettings | null>(null)
  const [checkInSubmissions, setCheckInSubmissions] = useState<CheckInSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [activeExerciseKey, setActiveExerciseKey] = useState<string | null>(null)
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, WorkoutExerciseDraft>>({})
  const [workoutSavingKey, setWorkoutSavingKey] = useState<string | null>(null)
  const [workoutSyncError, setWorkoutSyncError] = useState<string | null>(null)
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | null>(null)
  const [restTimerRunning, setRestTimerRunning] = useState(false)
  const [habitSavingKeys, setHabitSavingKeys] = useState<Record<string, boolean>>({})
  const [habitSyncError, setHabitSyncError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ClientMessage[]>([])
  const [messageError, setMessageError] = useState<string | null>(null)
  const [messageDraft, setMessageDraft] = useState('')
  const [messageSending, setMessageSending] = useState(false)

  useEffect(() => {
    const syncViewport = () => setIsMobile(window.innerWidth < 960)

    syncViewport()
    window.addEventListener('resize', syncViewport)

    return () => window.removeEventListener('resize', syncViewport)
  }, [])

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true)
      setError(null)
      setHabitSyncError(null)

      const clientId = params.id
      const habitLogLookback = getDateDaysAgo(90)

      const [
        { data: clientData, error: clientError },
        { data: planRows, error: planError },
        { data: settingsData, error: settingsError },
        { data: submissionRows, error: submissionError },
        { data: habitLogRows, error: habitLogError },
        { data: workoutLogRows, error: workoutLogError },
        { data: messageRows, error: messageRowsError },
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single(),
        supabase
          .from('client_plans')
          .select('type, content, updated_at')
          .eq('client_id', clientId),
        supabase
          .from('client_check_in_settings')
          .select('id, client_id, frequency, due_day, custom_interval_weeks, schedule_anchor_date, public_access_token, field_config, created_at, updated_at')
          .eq('client_id', clientId)
          .maybeSingle(),
        supabase
          .from('client_check_in_submissions')
          .select('id, client_id, check_in_settings_id, due_date, submitted_at, content, field_config_snapshot')
          .eq('client_id', clientId)
          .order('submitted_at', { ascending: false })
          .limit(50),
        supabase
          .from('client_habit_completion_logs')
          .select('id, client_id, date, habit_key, habit_name, completed, completed_at, created_at, updated_at')
          .eq('client_id', clientId)
          .gte('date', habitLogLookback)
          .order('date', { ascending: false }),
        supabase
          .from('client_workout_exercise_logs')
          .select('id, client_id, workout_date, workout_day, exercise_key, exercise_order, exercise_name, target_sets, target_reps, prescribed_notes, selected_substitution, completed, completed_at, client_notes, difficulty_rpe, logged_weight, logged_reps, created_at, updated_at')
          .eq('client_id', clientId)
          .eq('workout_date', todayDate)
          .order('exercise_order', { ascending: true }),
        supabase
          .from('messages')
          .select('id, client_id, sender_type, content, created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: true })
          .limit(200),
      ])

      if (clientError || !clientData) {
        console.error('Error fetching client dashboard:', clientError)
        setError('Client dashboard is unavailable right now.')
        setLoading(false)
        return
      }

      if (planError) {
        console.error('Error fetching client plans:', planError)
      }

      if (settingsError) {
        console.error('Error fetching client check-in settings:', settingsError)
      }

      if (submissionError) {
        console.error('Error fetching client check-in submissions:', submissionError)
      }

      if (habitLogError) {
        console.error('Error fetching client habit logs:', habitLogError)
        setHabitSyncError('Habit tracking is not available until the new Supabase table is set up.')
      }

      if (workoutLogError) {
        console.error('Error fetching client workout logs:', workoutLogError)
        setWorkoutSyncError('Workout logging is not available until the new Supabase table is set up.')
      } else {
        setWorkoutSyncError(null)
      }

      if (messageRowsError) {
        console.error('Error fetching client messages:', messageRowsError)
        setMessageError('Messages are unavailable right now.')
      } else {
        setMessageError(null)
      }

      let nextWorkoutPlan = emptyWorkoutPlan
      let nextHabits: HabitEntry[] = []

      for (const row of planRows ?? []) {
        let parsedContent: unknown = row.content

        if (typeof row.content === 'string') {
          try {
            parsedContent = JSON.parse(row.content)
          } catch {
            parsedContent = row.content
          }
        }

        if (row.type === 'workout') {
          nextWorkoutPlan = normalizeWorkoutPlan(parsedContent)
        }

        if (row.type === 'habits') {
          nextHabits = normalizeHabitPlan(parsedContent)
        }
      }

      setClient(clientData as ClientRecord)
      setWorkoutPlan(nextWorkoutPlan)
      setWorkoutLogs(normalizeWorkoutExerciseLogs(workoutLogRows ?? []))
      setHabits(nextHabits)
      setHabitLogs(normalizeHabitCompletionLogs(habitLogRows ?? []))
      setCheckInSettings(settingsData ? normalizeCheckInSettings(settingsData) : null)
      setCheckInSubmissions(normalizeCheckInSubmissions(submissionRows ?? []))
      setMessages(normalizeClientMessages(messageRows ?? []))
      setLoading(false)
    }

    void fetchDashboard()
  }, [params.id, todayDate])

  const todayWorkout = useMemo(() => getTodayWorkout(workoutPlan), [workoutPlan])
  const todayWorkoutLogMap = useMemo(
    () => getWorkoutLogMapForDate(workoutLogs, todayDate),
    [workoutLogs, todayDate],
  )
  const completedWorkoutExercises = useMemo(
    () => getCompletedExerciseCountForDate(
      todayWorkout.entries.map((entry) => entry.exercise_key),
      workoutLogs,
      todayDate,
    ),
    [todayWorkout.entries, workoutLogs, todayDate],
  )
  const habitCompletionMap = useMemo(
    () => getHabitCompletionMapForDate(habitLogs, todayDate),
    [habitLogs, todayDate],
  )
  const completedHabitsToday = useMemo(
    () => getCompletedHabitCountForDate(
      habits.map((habit) => habit.habit_key),
      habitLogs,
      todayDate,
    ),
    [habits, habitLogs, todayDate],
  )
  const currentHabitStreak = useMemo(
    () => getCurrentHabitStreak(habits.map((habit) => habit.habit_key), habitLogs),
    [habits, habitLogs],
  )
  const progressMetrics = useMemo(
    () => getProgressSnapshot(client, checkInSubmissions, currentHabitStreak),
    [client, checkInSubmissions, currentHabitStreak],
  )
  const latestSubmission = checkInSubmissions[0] ?? null
  const scheduleStatus = checkInSettings
    ? getCheckInScheduleStatus(checkInSettings, latestSubmission?.submitted_at ?? null)
    : null
  const greeting = client ? getGreeting(client.full_name) : 'Good evening'
  const activeWorkoutEntry = activeExerciseKey
    ? todayWorkout.entries.find((entry) => entry.exercise_key === activeExerciseKey) ?? null
    : null
  const activeWorkoutIndex = activeWorkoutEntry
    ? todayWorkout.entries.findIndex((entry) => entry.exercise_key === activeWorkoutEntry.exercise_key)
    : -1
  const activeWorkoutDraft = activeWorkoutEntry
    ? createWorkoutDraft(
        activeWorkoutEntry,
        todayWorkoutLogMap[activeWorkoutEntry.exercise_key],
        exerciseDrafts[activeWorkoutEntry.exercise_key],
      )
    : null
  const checkInLink = checkInSettings?.public_access_token
    ? `/check-in/${checkInSettings.public_access_token}`
    : null

  useEffect(() => {
    if (!restTimerRunning || restTimerSeconds === null || restTimerSeconds <= 0) return

    const timer = window.setInterval(() => {
      setRestTimerSeconds((current) => {
        if (current === null || current <= 1) {
          window.clearInterval(timer)
          setRestTimerRunning(false)
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [restTimerRunning, restTimerSeconds])

  function openExercise(entry: WorkoutEntry) {
    setRestTimerSeconds(entry.rest_seconds ?? 90)
    setRestTimerRunning(false)
    setActiveExerciseKey(entry.exercise_key)
  }

  function closeExercise() {
    setRestTimerRunning(false)
    setRestTimerSeconds(null)
    setActiveExerciseKey(null)
  }

  function updateWorkoutDraft(
    exerciseKey: string,
    patch: Partial<WorkoutExerciseDraft>,
  ) {
    const entry = todayWorkout.entries.find((candidate) => candidate.exercise_key === exerciseKey)
    if (!entry) return

    setExerciseDrafts((prev) => ({
      ...prev,
      [exerciseKey]: {
        ...createWorkoutDraft(entry, todayWorkoutLogMap[exerciseKey], prev[exerciseKey]),
        ...patch,
      },
    }))
  }

  async function saveWorkoutExercise(
    entry: WorkoutEntry,
    draft: WorkoutExerciseDraft,
  ) {
    if (!client) return

    const existingLog = todayWorkoutLogMap[entry.exercise_key]
    const parsedRpe = Number.parseInt(draft.difficulty_rpe, 10)
    const nextLog: WorkoutExerciseLog = {
      id: existingLog?.id,
      client_id: client.id,
      workout_date: todayDate,
      workout_day: todayWorkout.day,
      exercise_key: entry.exercise_key,
      exercise_order: todayWorkout.entries.findIndex((candidate) => candidate.exercise_key === entry.exercise_key),
      exercise_name: entry.exercise,
      target_sets: entry.sets || null,
      target_reps: entry.reps || null,
      prescribed_notes: entry.notes || null,
      selected_substitution: draft.selected_substitution || null,
      completed: draft.completed,
      completed_at: draft.completed ? new Date().toISOString() : null,
      client_notes: draft.client_notes.trim() || null,
      difficulty_rpe: Number.isFinite(parsedRpe) ? parsedRpe : null,
      logged_weight: draft.logged_weight.trim() || null,
      logged_reps: draft.logged_reps.trim() || null,
      created_at: existingLog?.created_at ?? null,
      updated_at: new Date().toISOString(),
    }

    setWorkoutSyncError(null)
    setWorkoutSavingKey(entry.exercise_key)
    setWorkoutLogs((prev) => mergeWorkoutExerciseLog(prev, nextLog))

    const { data, error: saveError } = await supabase
      .from('client_workout_exercise_logs')
      .upsert(
        {
          client_id: client.id,
          workout_date: todayDate,
          workout_day: todayWorkout.day,
          exercise_key: entry.exercise_key,
          exercise_order: nextLog.exercise_order,
          exercise_name: entry.exercise,
          target_sets: entry.sets || null,
          target_reps: entry.reps || null,
          prescribed_notes: entry.notes || null,
          selected_substitution: draft.selected_substitution || null,
          completed: draft.completed,
          completed_at: draft.completed ? new Date().toISOString() : null,
          client_notes: draft.client_notes.trim() || null,
          difficulty_rpe: Number.isFinite(parsedRpe) ? parsedRpe : null,
          logged_weight: draft.logged_weight.trim() || null,
          logged_reps: draft.logged_reps.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,workout_date,exercise_key' },
      )
      .select('id, client_id, workout_date, workout_day, exercise_key, exercise_order, exercise_name, target_sets, target_reps, prescribed_notes, selected_substitution, completed, completed_at, client_notes, difficulty_rpe, logged_weight, logged_reps, created_at, updated_at')
      .single()

    if (saveError) {
      console.error('Error saving workout log:', saveError)
      setWorkoutSyncError('We could not save that exercise yet. Please try again.')
      setWorkoutLogs((prev) => {
        if (existingLog) return mergeWorkoutExerciseLog(prev, existingLog)
        return prev.filter(
          (log) => !(log.workout_date === todayDate && log.exercise_key === entry.exercise_key),
        )
      })
      setWorkoutSavingKey(null)
      return
    }

    const savedLog = normalizeWorkoutExerciseLog(data)
    if (savedLog) {
      setWorkoutLogs((prev) => mergeWorkoutExerciseLog(prev, savedLog))
    }

    setWorkoutSavingKey(null)
  }

  function openPrimaryWorkoutAction() {
    const firstIncomplete = todayWorkout.entries.find(
      (entry) => !todayWorkoutLogMap[entry.exercise_key]?.completed,
    )

    if (firstIncomplete) {
      openExercise(firstIncomplete)
      return
    }

    if (todayWorkout.entries[0]) {
      openExercise(todayWorkout.entries[0])
    }
  }

  async function toggleHabit(habit: HabitEntry) {
    if (!client || habitSavingKeys[habit.habit_key]) return

    const existingLog = habitLogs.find(
      (entry) => entry.date === todayDate && entry.habit_key === habit.habit_key,
    )
    const nextCompleted = !Boolean(habitCompletionMap[habit.habit_key])
    const optimisticLog: HabitCompletionLog = {
      id: existingLog?.id,
      client_id: client.id,
      date: todayDate,
      habit_key: habit.habit_key,
      habit_name: habit.habit,
      completed: nextCompleted,
      completed_at: nextCompleted ? new Date().toISOString() : null,
      created_at: existingLog?.created_at ?? null,
      updated_at: new Date().toISOString(),
    }

    setHabitSyncError(null)
    setHabitSavingKeys((prev) => ({ ...prev, [habit.habit_key]: true }))
    setHabitLogs((prev) => mergeHabitCompletionLog(prev, optimisticLog))

    const { data, error: saveError } = await supabase
      .from('client_habit_completion_logs')
      .upsert(
        {
          client_id: client.id,
          date: todayDate,
          habit_key: habit.habit_key,
          habit_name: habit.habit,
          completed: nextCompleted,
          completed_at: nextCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,date,habit_key' },
      )
      .select('id, client_id, date, habit_key, habit_name, completed, completed_at, created_at, updated_at')
      .single()

    if (saveError) {
      console.error('Error saving habit completion:', saveError)
      setHabitSyncError('We could not save that habit yet. Please try again.')
      setHabitLogs((prev) => {
        if (existingLog) {
          return mergeHabitCompletionLog(prev, existingLog)
        }

        return prev.filter(
          (entry) => !(entry.date === todayDate && entry.habit_key === habit.habit_key),
        )
      })
      setHabitSavingKeys((prev) => ({ ...prev, [habit.habit_key]: false }))
      return
    }

    const savedLog = normalizeHabitCompletionLog(data)
    if (savedLog) {
      setHabitLogs((prev) => mergeHabitCompletionLog(prev, savedLog))
    }

    setHabitSavingKeys((prev) => ({ ...prev, [habit.habit_key]: false }))
  }

  async function sendClientMessage() {
    if (!client || messageSending) return

    const content = messageDraft.trim()
    if (!content) return

    setMessageSending(true)
    setMessageError(null)

    const optimisticMessage: ClientMessage = {
      client_id: client.id,
      sender_type: 'client',
      content,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => mergeClientMessage(prev, optimisticMessage))

    const { data, error } = await supabase
      .from('messages')
      .insert({
        client_id: client.id,
        sender_type: 'client',
        content,
      })
      .select('id, client_id, sender_type, content, created_at')
      .single()

    if (error) {
      console.error('Error sending client message:', error)
      setMessageError('We could not send that message yet. Please try again.')
      setMessages((prev) => prev.filter((entry) => entry !== optimisticMessage))
      setMessageSending(false)
      return
    }

    const savedMessage = normalizeClientMessage(data)

    setMessages((prev) => {
      const withoutOptimistic = prev.filter((entry) => entry !== optimisticMessage)
      return savedMessage ? mergeClientMessage(withoutOptimistic, savedMessage) : withoutOptimistic
    })

    setMessageDraft('')
    setMessageSending(false)
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: pageBackground,
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ ...cardStyle('24px'), width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Loading your dashboard...</div>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: pageBackground,
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ ...cardStyle('24px'), width: '100%', maxWidth: '460px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
            Client dashboard unavailable
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            {error ?? 'We could not load this client experience right now.'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${pageBackground} 0%, #f8f7f3 100%)`,
        padding: isMobile ? '18px 16px 28px' : '32px 28px 40px',
      }}
    >
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        <div style={{ marginBottom: isMobile ? '18px' : '28px' }}>
          <div style={{ ...labelStyle(), marginBottom: '8px' }}>Client Dashboard</div>
          <h1
            style={{
              margin: 0,
              fontSize: isMobile ? '30px' : '38px',
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              color: '#111827',
            }}
          >
            {greeting}
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: '15px', color: '#6b7280' }}>
            Here&apos;s what to focus on today.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.4fr) minmax(320px, 0.9fr)',
            gap: '18px',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <section style={{ ...cardStyle(isMobile ? '22px 18px' : '28px 26px') }}>
              <div style={{ ...labelStyle(), color: '#7c8aa0' }}>Today&apos;s Workout</div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'stretch' : 'flex-start',
                  gap: '18px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: isMobile ? '28px' : '34px',
                      lineHeight: 1.05,
                      letterSpacing: '-0.04em',
                      fontWeight: 600,
                      color: '#111827',
                      marginBottom: '10px',
                    }}
                  >
                    {todayWorkout.title}
                  </div>
                  <div style={{ fontSize: '15px', color: '#475569', marginBottom: '8px' }}>
                    {todayWorkout.entries.length > 0
                      ? `${completedWorkoutExercises} of ${todayWorkout.entries.length} exercises complete`
                      : todayWorkout.summary}
                  </div>
                  {todayWorkout.focus && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '7px 12px',
                        borderRadius: '999px',
                        background: '#f5f7fa',
                        border: '1px solid rgba(148, 163, 184, 0.14)',
                        fontSize: '12px',
                        color: '#64748b',
                      }}
                    >
                      Session focus: {todayWorkout.focus}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: isMobile ? '100%' : '160px' }}>
                  <button
                    type="button"
                    onClick={openPrimaryWorkoutAction}
                    disabled={todayWorkout.entries.length === 0}
                    style={{ ...primaryButtonStyle(todayWorkout.entries.length === 0), width: '100%' }}
                  >
                    {completedWorkoutExercises === 0
                      ? 'Start Workout'
                      : completedWorkoutExercises === todayWorkout.entries.length
                      ? 'Review Workout'
                      : 'Continue Workout'}
                  </button>
                </div>
              </div>

              {todayWorkout.entries.length === 0 ? (
                <div
                  style={{
                    marginTop: '18px',
                    padding: '16px',
                    borderRadius: '18px',
                    background: '#f8fafc',
                    border: '1px dashed rgba(148, 163, 184, 0.22)',
                    color: '#64748b',
                    fontSize: '13px',
                  }}
                >
                  Today is set up as a lighter day. Take the win, recover well, and check back tomorrow.
                </div>
              ) : activeWorkoutEntry && activeWorkoutDraft ? (
                <div style={{ marginTop: '20px', display: 'grid', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={closeExercise}
                      style={{
                        ...secondaryButtonStyle(false),
                        minHeight: '36px',
                        padding: '0 14px',
                      }}
                    >
                      Back to list
                    </button>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Exercise {activeWorkoutIndex + 1} of {todayWorkout.entries.length}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '18px',
                      borderRadius: '20px',
                      background: '#fafaf9',
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <div style={{ fontSize: '22px', lineHeight: 1.1, fontWeight: 600, color: '#111827', marginBottom: '10px' }}>
                      {activeWorkoutEntry.exercise || `Exercise ${activeWorkoutIndex + 1}`}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: activeWorkoutEntry.notes ? '12px' : '0' }}>
                      {activeWorkoutEntry.sets && (
                        <span
                          style={{
                            padding: '6px 10px',
                            borderRadius: '999px',
                            background: '#fff',
                            border: `1px solid ${borderColor}`,
                            fontSize: '12px',
                            color: '#475569',
                          }}
                        >
                          {activeWorkoutEntry.sets} sets
                        </span>
                      )}
                      {activeWorkoutEntry.reps && (
                        <span
                          style={{
                            padding: '6px 10px',
                            borderRadius: '999px',
                            background: '#fff',
                            border: `1px solid ${borderColor}`,
                            fontSize: '12px',
                            color: '#475569',
                          }}
                        >
                          {activeWorkoutEntry.reps} reps
                        </span>
                      )}
                      <span
                        style={{
                          padding: '6px 10px',
                          borderRadius: '999px',
                          background: activeWorkoutDraft.completed ? '#ecfdf5' : '#fff',
                          border: `1px solid ${activeWorkoutDraft.completed ? 'rgba(16, 185, 129, 0.18)' : borderColor}`,
                          fontSize: '12px',
                          color: activeWorkoutDraft.completed ? '#047857' : '#64748b',
                        }}
                      >
                        {activeWorkoutDraft.completed ? 'Completed' : 'In progress'}
                      </span>
                    </div>
                    {activeWorkoutEntry.notes && (
                      <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                        {activeWorkoutEntry.notes}
                      </div>
                    )}
                  </div>

                  {workoutSyncError && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#A32D2D',
                        background: '#fff5f5',
                        border: '1px solid rgba(163, 45, 45, 0.12)',
                        borderRadius: '14px',
                        padding: '10px 12px',
                      }}
                    >
                      {workoutSyncError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => updateWorkoutDraft(activeWorkoutEntry.exercise_key, { completed: !activeWorkoutDraft.completed })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      textAlign: 'left',
                      border: `1px solid ${activeWorkoutDraft.completed ? 'rgba(17, 24, 39, 0.12)' : borderColor}`,
                      background: activeWorkoutDraft.completed ? '#f7faf7' : '#fbfbfa',
                      borderRadius: '18px',
                      padding: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '999px',
                        border: activeWorkoutDraft.completed ? 'none' : '1.5px solid #cbd5e1',
                        background: activeWorkoutDraft.completed ? '#111827' : '#fff',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {activeWorkoutDraft.completed ? '✓' : ''}
                    </span>
                    <span>
                      <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>
                        Mark this exercise complete
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Save this when you finish your working sets.
                      </span>
                    </span>
                  </button>

                  <div
                    style={{
                      display: 'grid',
                      gap: '12px',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    }}
                  >
                    <label style={{ display: 'grid', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Difficulty / RPE</span>
                      <select
                        value={activeWorkoutDraft.difficulty_rpe}
                        onChange={(event) => updateWorkoutDraft(activeWorkoutEntry.exercise_key, { difficulty_rpe: event.target.value })}
                        style={{
                          width: '100%',
                          minHeight: '42px',
                          borderRadius: '14px',
                          border: `1px solid ${borderColor}`,
                          background: '#fbfbfa',
                          padding: '0 12px',
                          color: '#111827',
                          fontSize: '13px',
                        }}
                      >
                        <option value="">Select</option>
                        {Array.from({ length: 10 }, (_, index) => {
                          const value = String(index + 1)
                          return (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          )
                        })}
                      </select>
                    </label>

                    <div
                      style={{
                        border: `1px solid ${borderColor}`,
                        borderRadius: '18px',
                        background: '#fbfbfa',
                        padding: '14px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        Rest timer
                      </div>
                      <div style={{ fontSize: '28px', lineHeight: 1, fontWeight: 600, color: '#111827', marginBottom: '10px' }}>
                        {formatRestTime(restTimerSeconds ?? 0)}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setRestTimerRunning((current) => !current)}
                          style={{ ...secondaryButtonStyle(false), minHeight: '34px', padding: '0 12px' }}
                        >
                          {restTimerRunning ? 'Pause' : 'Start'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRestTimerRunning(false)
                            setRestTimerSeconds(activeWorkoutEntry.rest_seconds ?? 90)
                          }}
                          style={{ ...secondaryButtonStyle(false), minHeight: '34px', padding: '0 12px' }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  {(activeWorkoutEntry.allow_logged_weight || activeWorkoutEntry.allow_logged_reps) && (
                    <div
                      style={{
                        display: 'grid',
                        gap: '12px',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      }}
                    >
                      {activeWorkoutEntry.allow_logged_weight && (
                        <label style={{ display: 'grid', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Weight used</span>
                          <input
                            value={activeWorkoutDraft.logged_weight}
                            onChange={(event) => updateWorkoutDraft(activeWorkoutEntry.exercise_key, { logged_weight: event.target.value })}
                            placeholder="e.g. 40 lb"
                            style={{
                              width: '100%',
                              minHeight: '42px',
                              borderRadius: '14px',
                              border: `1px solid ${borderColor}`,
                              background: '#fbfbfa',
                              padding: '0 12px',
                              color: '#111827',
                              fontSize: '13px',
                            }}
                          />
                        </label>
                      )}
                      {activeWorkoutEntry.allow_logged_reps && (
                        <label style={{ display: 'grid', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Actual reps</span>
                          <input
                            value={activeWorkoutDraft.logged_reps}
                            onChange={(event) => updateWorkoutDraft(activeWorkoutEntry.exercise_key, { logged_reps: event.target.value })}
                            placeholder="e.g. 12, 10, 9"
                            style={{
                              width: '100%',
                              minHeight: '42px',
                              borderRadius: '14px',
                              border: `1px solid ${borderColor}`,
                              background: '#fbfbfa',
                              padding: '0 12px',
                              color: '#111827',
                              fontSize: '13px',
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Client notes</span>
                    <textarea
                      value={activeWorkoutDraft.client_notes}
                      onChange={(event) => updateWorkoutDraft(activeWorkoutEntry.exercise_key, { client_notes: event.target.value })}
                      placeholder="Anything worth noting from this exercise?"
                      rows={4}
                      style={{
                        width: '100%',
                        borderRadius: '18px',
                        border: `1px solid ${borderColor}`,
                        background: '#fbfbfa',
                        padding: '12px',
                        color: '#111827',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                  </label>

                  <div
                    style={{
                      border: `1px solid ${borderColor}`,
                      borderRadius: '18px',
                      background: '#fbfbfa',
                      padding: '14px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Can&apos;t do this?
                    </div>
                    {activeWorkoutEntry.substitutions.length > 0 ? (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {activeWorkoutEntry.substitutions.map((option) => {
                          const selected = activeWorkoutDraft.selected_substitution === option

                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => updateWorkoutDraft(activeWorkoutEntry.exercise_key, {
                                selected_substitution: selected ? '' : option,
                              })}
                              style={{
                                minHeight: '34px',
                                padding: '0 12px',
                                borderRadius: '999px',
                                border: `1px solid ${selected ? 'rgba(17, 24, 39, 0.16)' : borderColor}`,
                                background: selected ? '#eef2f7' : '#fff',
                                color: '#374151',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {option}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                        No coach-defined substitutions are listed for this exercise yet.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => void saveWorkoutExercise(activeWorkoutEntry, activeWorkoutDraft)}
                      disabled={workoutSavingKey === activeWorkoutEntry.exercise_key}
                      style={{
                        ...primaryButtonStyle(workoutSavingKey === activeWorkoutEntry.exercise_key),
                        minWidth: isMobile ? '100%' : '160px',
                      }}
                    >
                      {workoutSavingKey === activeWorkoutEntry.exercise_key ? 'Saving...' : 'Save Exercise'}
                    </button>
                    <button
                      type="button"
                      onClick={closeExercise}
                      style={{
                        ...secondaryButtonStyle(false),
                        minWidth: isMobile ? '100%' : '140px',
                      }}
                    >
                      Back to workout
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: '20px', display: 'grid', gap: '10px' }}>
                  {workoutSyncError && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#A32D2D',
                        background: '#fff5f5',
                        border: '1px solid rgba(163, 45, 45, 0.12)',
                        borderRadius: '14px',
                        padding: '10px 12px',
                      }}
                    >
                      {workoutSyncError}
                    </div>
                  )}
                  {todayWorkout.entries.map((entry, index) => {
                    const savedLog = todayWorkoutLogMap[entry.exercise_key]
                    const complete = savedLog?.completed === true

                    return (
                      <button
                        key={entry.exercise_key}
                        type="button"
                        onClick={() => openExercise(entry)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                          gap: '12px',
                          alignItems: 'center',
                          padding: '14px',
                          borderRadius: '18px',
                          background: complete ? '#f7faf7' : '#fafaf9',
                          border: `1px solid ${complete ? 'rgba(17, 24, 39, 0.12)' : borderColor}`,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '999px',
                            border: complete ? 'none' : '1.5px solid #cbd5e1',
                            background: complete ? '#111827' : '#fff',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {complete ? '✓' : ''}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                            {entry.exercise || `Exercise ${index + 1}`}
                          </span>
                          <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: savedLog?.selected_substitution ? '4px' : '0' }}>
                            {getExerciseSummary(entry)}
                          </span>
                          {savedLog?.selected_substitution && (
                            <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>
                              Subbed with: {savedLog.selected_substitution}
                            </span>
                          )}
                        </span>
                        <span style={{ fontSize: '14px', color: '#cbd5e1' }}>›</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            <section style={cardStyle(isMobile ? '22px 18px' : '24px 24px')}>
              <div style={{ ...labelStyle(), marginBottom: '14px' }}>Habits</div>
              {habits.length === 0 ? (
                <div
                  style={{
                    padding: '18px',
                    borderRadius: '18px',
                    background: '#f8fafc',
                    border: '1px dashed rgba(148, 163, 184, 0.22)',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                    No habits assigned yet
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Your coach can add habits here when they want you focused on a few daily anchors.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '2px' }}>
                    {completedHabitsToday} of {habits.length} complete today
                  </div>
                  {habitSyncError && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#A32D2D',
                        background: '#fff5f5',
                        border: '1px solid rgba(163, 45, 45, 0.12)',
                        borderRadius: '14px',
                        padding: '10px 12px',
                      }}
                    >
                      {habitSyncError}
                    </div>
                  )}
                  {habits.map((habit, index) => {
                    const checked = Boolean(habitCompletionMap[habit.habit_key])
                    const isSaving = Boolean(habitSavingKeys[habit.habit_key])

                    return (
                      <button
                        key={habit.habit_key || `${habit.habit}-${index}`}
                        type="button"
                        onClick={() => void toggleHabit(habit)}
                        disabled={isSaving}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          width: '100%',
                          textAlign: 'left',
                          border: `1px solid ${checked ? 'rgba(17, 24, 39, 0.12)' : borderColor}`,
                          background: checked ? '#f7faf7' : '#fbfbfa',
                          borderRadius: '18px',
                          padding: '14px',
                          cursor: isSaving ? 'wait' : 'pointer',
                          opacity: isSaving ? 0.7 : 1,
                        }}
                      >
                        <span
                          style={{
                            marginTop: '2px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '999px',
                            border: checked ? 'none' : '1.5px solid #cbd5e1',
                            background: checked ? '#111827' : '#fff',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {checked ? '✓' : isSaving ? '…' : ''}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#111827',
                              marginBottom: '4px',
                              textDecoration: checked ? 'line-through' : 'none',
                            }}
                          >
                            {habit.habit}
                          </span>
                          <span style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {habit.target && (
                              <span style={{ fontSize: '12px', color: '#64748b' }}>Target: {habit.target}</span>
                            )}
                            {habit.frequency && (
                              <span style={{ fontSize: '12px', color: '#64748b' }}>{habit.frequency}</span>
                            )}
                            {isSaving && (
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Saving...</span>
                            )}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {scheduleStatus?.isDue ? (
              <section style={cardStyle(isMobile ? '22px 18px' : '24px 24px')}>
                <div style={{ ...labelStyle(), marginBottom: '12px' }}>Check-In</div>
                <div style={{ fontSize: '22px', lineHeight: 1.15, letterSpacing: '-0.03em', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                  Your check-in is due today
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                  Take two minutes to send your update so your coach can review it.
                </div>
                {checkInLink ? (
                  <Link href={checkInLink} style={primaryButtonStyle(false)}>
                    Start Check-in
                  </Link>
                ) : (
                  <button type="button" disabled style={primaryButtonStyle(true)}>
                    Start Check-in
                  </button>
                )}
              </section>
            ) : scheduleStatus ? (
              <section style={cardStyle(isMobile ? '20px 18px' : '22px 22px')}>
                <div style={{ ...labelStyle(), marginBottom: '8px' }}>Check-In</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                  You&apos;re all caught up
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Next check-in: {scheduleStatus.nextDueLabel}
                </div>
              </section>
            ) : null}

            <section style={cardStyle(isMobile ? '22px 18px' : '24px 24px')}>
              <div style={{ ...labelStyle(), marginBottom: '14px' }}>Progress Snapshot</div>
              <div style={{ display: 'grid', gap: '10px' }}>
                {progressMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '18px',
                      background: '#fbfbfa',
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{metric.label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={cardStyle(isMobile ? '22px 18px' : '24px 24px')}>
              <div style={{ ...labelStyle(), marginBottom: '14px' }}>Messages</div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  padding: '2px',
                  marginBottom: '12px',
                }}
              >
                {messages.length === 0 ? (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: '18px',
                      background: '#f8fafc',
                      border: '1px dashed rgba(148, 163, 184, 0.22)',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      No messages yet
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                      Your coach can message you here, and you can reply when you need support or clarification.
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isClientMessage = message.sender_type === 'client'
                    const showLabel =
                      index === 0 || messages[index - 1]?.sender_type !== message.sender_type

                    return (
                      <div
                        key={`${message.id ?? message.created_at}-${index}`}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isClientMessage ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {showLabel && (
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>
                            {isClientMessage ? 'You' : 'Coach'}
                          </div>
                        )}
                        <div
                          style={{
                            maxWidth: '88%',
                            borderRadius: '18px',
                            padding: '12px 14px',
                            background: isClientMessage ? '#111827' : '#fbfbfa',
                            color: isClientMessage ? '#fff' : '#374151',
                            border: isClientMessage ? 'none' : `1px solid ${borderColor}`,
                          }}
                        >
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.6 }}>
                            {message.content}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: isClientMessage ? 'rgba(255,255,255,0.72)' : '#94a3b8',
                              marginTop: '6px',
                            }}
                          >
                            {formatMessageTimestamp(message.created_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {messageError && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#A32D2D',
                    background: '#fff5f5',
                    border: '1px solid rgba(163, 45, 45, 0.12)',
                    borderRadius: '14px',
                    padding: '10px 12px',
                    marginBottom: '12px',
                  }}
                >
                  {messageError}
                </div>
              )}

              <textarea
                value={messageDraft}
                onChange={(event) => setMessageDraft(event.target.value)}
                placeholder="Reply to your coach..."
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: '#111827',
                  background: '#fbfbfa',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '16px',
                  padding: '12px 14px',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  marginBottom: '12px',
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                  Keep it simple. Ask a question, share an update, or flag anything you need help with.
                </div>
                <button
                  type="button"
                  onClick={() => void sendClientMessage()}
                  disabled={messageSending || !messageDraft.trim()}
                  style={{ ...primaryButtonStyle(messageSending || !messageDraft.trim()) }}
                >
                  {messageSending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </section>

            <section style={cardStyle(isMobile ? '20px 18px' : '22px 22px')}>
              <div style={{ ...labelStyle(), marginBottom: '8px' }}>Account</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                {client.full_name}
              </div>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>{client.email}</div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
