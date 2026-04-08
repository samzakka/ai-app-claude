'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  CHECK_IN_PHOTO_BUCKET,
  RATING_OPTIONS,
  type CheckInFieldKey,
  type CheckInSubmission,
  type ClientPhotoUpload,
  type CoachCheckInSettings,
  getCheckInScheduleStatus,
  getEnabledCheckInFields,
  normalizeCheckInSettings,
  normalizeCheckInSubmissions,
} from '@/lib/check-ins'

type ClientProfile = {
  id: string
  full_name: string
}

type FormValues = Record<Exclude<CheckInFieldKey, 'progress_photos'>, string>

const emptyFormValues: FormValues = {
  weight: '',
  wins_challenges: '',
  hunger: '',
  energy: '',
  stress: '',
  workout_adherence: '',
  sleep: '',
  habit_adherence: '',
  measurements: '',
  text_update: '',
}

function buildErrorMap() {
  return {} as Partial<Record<CheckInFieldKey, string>>
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]+/g, '-').toLowerCase()
}

export default function ClientCheckInPage() {
  const params = useParams<{ token: string }>()
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [settings, setSettings] = useState<CoachCheckInSettings | null>(null)
  const [submissions, setSubmissions] = useState<CheckInSubmission[]>([])
  const [formValues, setFormValues] = useState<FormValues>(emptyFormValues)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Partial<Record<CheckInFieldKey, string>>>(buildErrorMap())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedThisSession, setSubmittedThisSession] = useState(false)

  useEffect(() => {
    async function fetchCheckInContext() {
      setLoading(true)
      setSubmitError(null)

      const { data: settingsData, error: settingsError } = await supabase
        .from('client_check_in_settings')
        .select('id, client_id, frequency, due_day, custom_interval_weeks, schedule_anchor_date, public_access_token, field_config, created_at, updated_at')
        .eq('public_access_token', params.token)
        .single()

      if (settingsError || !settingsData) {
        setSettings(null)
        setLoading(false)
        return
      }

      const normalizedSettings = normalizeCheckInSettings(settingsData)
      setSettings(normalizedSettings)

      const [{ data: clientData }, { data: submissionData }] = await Promise.all([
        supabase
          .from('clients')
          .select('id, full_name')
          .eq('id', normalizedSettings.client_id)
          .single(),
        supabase
          .from('client_check_in_submissions')
          .select('id, client_id, check_in_settings_id, due_date, submitted_at, content, field_config_snapshot')
          .eq('client_id', normalizedSettings.client_id)
          .order('submitted_at', { ascending: false })
          .limit(10),
      ])

      setClient(clientData ?? null)
      setSubmissions(normalizeCheckInSubmissions(submissionData ?? []))
      setFormValues(emptyFormValues)
      setPhotoFiles([])
      setErrors(buildErrorMap())
      setLoading(false)
    }

    void fetchCheckInContext()
  }, [params.token])

  const latestSubmission = submissions[0] ?? null
  const scheduleStatus = settings
    ? getCheckInScheduleStatus(settings, latestSubmission?.submitted_at ?? null)
    : null
  const enabledFields = settings ? getEnabledCheckInFields(settings.field_config) : []

  const heroLabel = useMemo(() => {
    if (!scheduleStatus) return null
    if (scheduleStatus.isDue) return `Check-in due ${scheduleStatus.dueLabel}`
    return `Next check-in ${scheduleStatus.nextDueLabel}`
  }, [scheduleStatus])

  function updateValue(field: Exclude<CheckInFieldKey, 'progress_photos'>, value: string) {
    setFormValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function uploadProgressPhotos() {
    const uploads: ClientPhotoUpload[] = []

    for (const [index, file] of photoFiles.entries()) {
      const path = `${settings?.client_id}/${Date.now()}-${index}-${safeFileName(file.name)}`
      const { data, error } = await supabase.storage.from(CHECK_IN_PHOTO_BUCKET).upload(path, file)

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from(CHECK_IN_PHOTO_BUCKET)
        .getPublicUrl(data.path)

      uploads.push({
        path: data.path,
        url: publicUrlData.publicUrl,
        name: file.name,
      })
    }

    return uploads
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!settings || !scheduleStatus) return

    const nextErrors = buildErrorMap()

    enabledFields.forEach((field) => {
      const rule = settings.field_config[field.key]
      if (!rule.required) return

      if (field.key === 'progress_photos') {
        if (photoFiles.length === 0) nextErrors.progress_photos = 'Please upload your progress photos.'
        return
      }

      if (!formValues[field.key as Exclude<CheckInFieldKey, 'progress_photos'>]?.trim()) {
        nextErrors[field.key] = 'This field is required.'
      }
    })

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setSaving(true)
    setSubmitError(null)

    try {
      let uploadedPhotos: ClientPhotoUpload[] = []

      if (photoFiles.length > 0) {
        uploadedPhotos = await uploadProgressPhotos()
      }

      const content: Record<string, unknown> = {}

      enabledFields.forEach((field) => {
        if (field.key === 'progress_photos') {
          content.progress_photos = uploadedPhotos
        } else {
          content[field.key] = formValues[field.key as Exclude<CheckInFieldKey, 'progress_photos'>].trim()
        }
      })

      const submittedAt = new Date().toISOString()
      const { data, error } = await supabase
        .from('client_check_in_submissions')
        .insert({
          client_id: settings.client_id,
          check_in_settings_id: settings.id,
          due_date: scheduleStatus.dueDate.toISOString().slice(0, 10),
          submitted_at: submittedAt,
          content,
          field_config_snapshot: settings.field_config,
        })
        .select('id, client_id, check_in_settings_id, due_date, submitted_at, content, field_config_snapshot')
        .single()

      if (error) throw error

      setSubmissions((prev) => normalizeCheckInSubmissions([data, ...prev]))
      setSubmittedThisSession(true)
      setPhotoFiles([])
      setErrors(buildErrorMap())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit your check-in.'
      setSubmitError(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>Loading check-in...</div>
      </div>
    )
  }

  if (!settings || !client) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: '8px' }}>
            <span style={{ color: '#111827' }}>Coach</span>
            <span style={{ color: '#7F77DD' }}>OS</span>
          </div>
          <div style={{ fontSize: '14px', color: '#111827', marginBottom: '6px' }}>This check-in link is unavailable.</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Ask your coach for a fresh check-in link if you expected this page to be active.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '24px' }}>
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: '6px' }}>
            <span style={{ color: '#111827' }}>Coach</span>
            <span style={{ color: '#7F77DD' }}>OS</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 500, color: '#111827', marginBottom: '4px' }}>
            {client.full_name}&apos;s check-in
          </div>
          {heroLabel && (
            <div style={{ fontSize: '12px', color: scheduleStatus?.isDue ? '#A32D2D' : '#6b7280' }}>
              {heroLabel}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '16px', padding: '20px' }}>
          {scheduleStatus?.isDue ? (
            <div
              style={{
                marginBottom: '16px',
                background: '#fee2e2',
                border: '0.5px solid #fecaca',
                color: '#A32D2D',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              Your check-in is due now. Take a minute and send it in so your coach can review it.
            </div>
          ) : (
            <div
              style={{
                marginBottom: '16px',
                background: '#f9fafb',
                border: '0.5px solid #e5e7eb',
                color: '#6b7280',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '12px',
              }}
            >
              {latestSubmission
                ? `Last submitted ${scheduleStatus?.lastSubmittedLabel}. Your next due date is ${scheduleStatus?.nextDueLabel}.`
                : `Your next due date is ${scheduleStatus?.nextDueLabel}.`}
            </div>
          )}

          {submittedThisSession ? (
            <div
              style={{
                background: '#ecfdf5',
                border: '0.5px solid #a7f3d0',
                color: '#065f46',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              Check-in submitted successfully. Your coach can review it now.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {enabledFields.map((field) => {
                const rule = settings.field_config[field.key]
                const isRequired = rule.required
                const fieldError = errors[field.key]
                const valueKey = field.key as Exclude<CheckInFieldKey, 'progress_photos'>

                return (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#6b7280', marginBottom: '5px' }}>
                      {field.label}{isRequired ? ' *' : ''}
                    </label>

                    {field.type === 'number' && (
                      <input
                        type="number"
                        step="0.1"
                        value={formValues[valueKey]}
                        onChange={(event) => updateValue(valueKey, event.target.value)}
                        placeholder="Enter value"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          fontSize: '13px',
                          color: '#111827',
                          border: '0.5px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          background: '#fff',
                          outline: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                    )}

                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={formValues[valueKey]}
                        onChange={(event) => updateValue(valueKey, event.target.value)}
                        placeholder="Add details"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          fontSize: '13px',
                          color: '#111827',
                          border: '0.5px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          background: '#fff',
                          outline: 'none',
                          fontFamily: 'inherit',
                        }}
                      />
                    )}

                    {field.type === 'textarea' && (
                      <textarea
                        value={formValues[valueKey]}
                        onChange={(event) => updateValue(valueKey, event.target.value)}
                        rows={field.key === 'text_update' ? 4 : 3}
                        placeholder={field.key === 'wins_challenges' ? 'Share your wins, challenges, and anything your coach should know.' : 'Add an update'}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          fontSize: '13px',
                          lineHeight: 1.6,
                          color: '#111827',
                          border: '0.5px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          background: '#fff',
                          outline: 'none',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                        }}
                      />
                    )}

                    {field.type === 'rating' && (
                      <select
                        value={formValues[valueKey]}
                        onChange={(event) => updateValue(valueKey, event.target.value)}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          fontSize: '13px',
                          color: '#111827',
                          border: '0.5px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          background: '#fff',
                          outline: 'none',
                          fontFamily: 'inherit',
                        }}
                      >
                        <option value="">Choose a rating</option>
                        {RATING_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {field.type === 'photos' && (
                      <div
                        style={{
                          background: '#f9fafb',
                          border: '0.5px dashed #d1d5db',
                          borderRadius: '8px',
                          padding: '12px',
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => {
                            const files = Array.from(event.target.files ?? [])
                            setPhotoFiles(files)
                            setErrors((prev) => ({ ...prev, progress_photos: undefined }))
                          }}
                          style={{ fontSize: '12px', color: '#374151', width: '100%' }}
                        />
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                          {photoFiles.length > 0
                            ? `${photoFiles.length} photo${photoFiles.length === 1 ? '' : 's'} ready to upload`
                            : 'Choose front, side, or back progress photos if your coach requested them.'}
                        </div>
                      </div>
                    )}

                    {fieldError && (
                      <div style={{ marginTop: '5px', fontSize: '11px', color: '#A32D2D' }}>
                        {fieldError}
                      </div>
                    )}
                  </div>
                )
              })}

              {submitError && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#A32D2D',
                    background: '#fee2e2',
                    border: '0.5px solid #fecaca',
                    borderRadius: '8px',
                    padding: '8px 10px',
                  }}
                >
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  background: saving ? '#d1d5db' : '#7F77DD',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 500,
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Submitting…' : 'Submit check-in'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
