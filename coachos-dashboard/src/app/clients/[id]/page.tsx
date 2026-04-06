'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientStatus = 'active' | 'at_risk' | 'review' | string

type Client = {
  id: string
  full_name: string
  email: string
  status: ClientStatus
  created_at: string
}

type WorkoutEntry = {
  exercise: string
  sets: string
  reps: string
  notes: string
}

type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

type WeeklyPlan = Record<Day, WorkoutEntry[]>

type TextPlanType = 'nutrition' | 'habits'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DAY_LABELS: Record<Day, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
}

const EMPTY_WEEK: WeeklyPlan = {
  monday: [], tuesday: [], wednesday: [], thursday: [],
  friday: [], saturday: [], sunday: [],
}

const TEXT_PLANS: { type: TextPlanType; label: string; placeholder: string }[] = [
  {
    type: 'nutrition',
    label: 'Nutrition Plan',
    placeholder: 'e.g. 2,000 kcal target. High protein, moderate carbs. Meal timing...',
  },
  {
    type: 'habits',
    label: 'Habit Targets',
    placeholder: 'e.g. 8hrs sleep, 2L water daily, 10k steps, no alcohol Mon–Thu...',
  },
]

const avatarColors = ['#A32D2D', '#0d9488', '#4338ca', '#ec4899', '#7F77DD', '#b45309']

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
    result[day] = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
  return result as Record<Day, string>
}

const inputBase: React.CSSProperties = {
  fontSize: '12px', color: '#374151',
  background: '#f9fafb', border: '0.5px solid #e5e7eb',
  borderRadius: '6px', padding: '4px 6px',
  outline: 'none', fontFamily: 'inherit',
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

  // Text plans (nutrition + habits)
  const [planContent, setPlanContent] = useState<Record<TextPlanType, string>>({ nutrition: '', habits: '' })
  const [savingType, setSavingType]   = useState<TextPlanType | null>(null)
  const [savedType, setSavedType]     = useState<TextPlanType | null>(null)

  const weekDates = getWeekDates()

  // ── Fetch client ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchClient() {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, email, status, created_at')
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
        .select('type, content')
        .eq('client_id', params.id)
      if (error) { console.error('Error fetching plans:', error); return }
      if (!data) return
      for (const row of data) {
        if (row.type === 'workout') {
          try {
            const parsed = JSON.parse(row.content ?? '{}')
            setWeeklyPlan({ ...EMPTY_WEEK, ...parsed })
          } catch { /* keep empty week */ }
        } else if (row.type === 'nutrition' || row.type === 'habits') {
          setPlanContent((prev) => ({ ...prev, [row.type]: row.content ?? '' }))
        }
      }
    }
    fetchPlans()
  }, [params.id])

  // ── Workout plan handlers ────────────────────────────────────────────────────
  function addEntry(day: Day) {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: [...prev[day], { exercise: '', sets: '', reps: '', notes: '' }],
    }))
  }

  function removeEntry(day: Day, index: number) {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }))
  }

  function updateEntry(day: Day, index: number, field: keyof WorkoutEntry, value: string) {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: prev[day].map((entry, i) => i === index ? { ...entry, [field]: value } : entry),
    }))
  }

  async function saveWorkoutPlan() {
    setWorkoutSaving(true)
    const { error } = await supabase
      .from('client_plans')
      .upsert(
        { client_id: params.id, type: 'workout', content: JSON.stringify(weeklyPlan), updated_at: new Date().toISOString() },
        { onConflict: 'client_id,type' }
      )
    if (error) { console.error('Error saving workout plan:', error); alert(`Failed to save: ${error.message}`) }
    else { setWorkoutSaved(true); setTimeout(() => setWorkoutSaved(false), 3000) }
    setWorkoutSaving(false)
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
              disabled={workoutSaving}
              style={{
                background: workoutSaving ? '#f3f4f6' : '#111827',
                color: workoutSaving ? '#9ca3af' : '#fff',
                fontSize: '12px', fontWeight: 500,
                padding: '5px 14px', borderRadius: '8px',
                border: 'none', cursor: workoutSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {workoutSaving ? 'Saving…' : 'Save Plan'}
            </button>
          </div>
        </div>

        {/* Day columns — horizontal scroll on desktop, wrap on narrow */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {DAYS.map((day) => {
            const isWeekend = day === 'saturday' || day === 'sunday'
            const entries = weeklyPlan[day]

            return (
              <div key={day} style={{
                minWidth: '164px', flex: '0 0 164px',
                background: isWeekend ? '#fafafa' : '#fff',
                border: '0.5px solid #e5e7eb',
                borderRadius: '10px', padding: '10px',
              }}>
                {/* Day header */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{DAY_LABELS[day]}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>{weekDates[day]}</div>
                </div>

                {/* Entries */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {entries.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#d1d5db', textAlign: 'center', padding: '10px 0', fontStyle: 'italic' }}>
                      Rest day
                    </div>
                  ) : (
                    entries.map((entry, idx) => (
                      <div key={idx} style={{ background: '#f9fafb', borderRadius: '6px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {/* Exercise name row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="text"
                            value={entry.exercise}
                            onChange={(e) => updateEntry(day, idx, 'exercise', e.target.value)}
                            placeholder="Exercise"
                            style={{ ...inputBase, flex: 1, minWidth: 0 }}
                          />
                          <button
                            onClick={() => removeEntry(day, idx)}
                            style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: '14px', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
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
                            style={{ ...inputBase, width: '38px', textAlign: 'center' }}
                          />
                          <input
                            type="text"
                            value={entry.reps}
                            onChange={(e) => updateEntry(day, idx, 'reps', e.target.value)}
                            placeholder="Reps"
                            style={{ ...inputBase, width: '38px', textAlign: 'center' }}
                          />
                          <input
                            type="text"
                            value={entry.notes}
                            onChange={(e) => updateEntry(day, idx, 'notes', e.target.value)}
                            placeholder="Notes"
                            style={{ ...inputBase, flex: 1, minWidth: 0 }}
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
                    marginTop: '6px', width: '100%',
                    background: 'none', border: '0.5px dashed #d1d5db',
                    borderRadius: '6px', padding: '4px',
                    fontSize: '12px', color: '#9ca3af', cursor: 'pointer',
                  }}
                >
                  + add
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Nutrition + Habits (unchanged) ──────────────────────────────────── */}
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
      </div>

    </div>
  )
}
