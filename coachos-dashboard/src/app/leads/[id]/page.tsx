'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { supabase } from '@/lib/supabase'
import {
  canConvertLead,
  formatLeadStageAgeLabel,
  getFollowUpBadge,
  getLeadBriefText,
  getLeadInitials,
  getLeadStageLabel,
  getLeadStageStyle,
  getLeadSummary,
  normalizeLeadRecord,
  type LeadRecord,
  type LeadStage,
} from '@/lib/leads'

const LEAD_STAGES: LeadStage[] = [
  'new',
  'contacted',
  'call_booked',
  'proposal_sent',
  'won',
  'lost',
]

const avatarColors = ['#A32D2D', '#0d9488', '#4338ca', '#ec4899', '#7F77DD', '#b45309']

type LeadDraft = {
  stage: LeadStage
  coach_notes: string
  follow_up_date: string
}

function buildLeadDraft(lead: LeadRecord): LeadDraft {
  return {
    stage: lead.stage,
    coach_notes: lead.coach_notes ?? '',
    follow_up_date: lead.follow_up_date ?? '',
  }
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<LeadRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<LeadDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    async function fetchLead() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('id, full_name, email, coach_id, heat_score, budget_range, timeline, goal, ai_brief, stage, coach_notes, follow_up_date, last_contacted_at, stage_updated_at, converted_client_id, converted_at, created_at')
        .eq('id', params.id)
        .single()

      if (fetchError) {
        console.error('Error fetching lead:', fetchError)
        setError('Lead not found.')
        setLoading(false)
        return
      }

      const nextLead = normalizeLeadRecord(data)

      if (!nextLead) {
        setError('Lead not found.')
        setLoading(false)
        return
      }

      setLead(nextLead)
      setDraft(buildLeadDraft(nextLead))
      setLoading(false)
    }

    fetchLead()
  }, [params.id])

  async function saveLead() {
    if (!lead || !draft) return

    setSaving(true)

    const nowIso = new Date().toISOString()
    const stageChanged = draft.stage !== lead.stage
    const shouldTrackContact =
      draft.stage === 'contacted' ||
      draft.stage === 'call_booked' ||
      draft.stage === 'proposal_sent' ||
      draft.stage === 'won'

    const { data, error: saveError } = await supabase
      .from('leads')
      .update({
        stage: draft.stage,
        coach_notes: draft.coach_notes.trim() ? draft.coach_notes.trim() : null,
        follow_up_date: draft.follow_up_date || null,
        stage_updated_at: stageChanged ? nowIso : lead.stage_updated_at,
        last_contacted_at:
          shouldTrackContact && (stageChanged || !lead.last_contacted_at)
            ? nowIso
            : lead.last_contacted_at,
      })
      .eq('id', lead.id)
      .select('id, full_name, email, coach_id, heat_score, budget_range, timeline, goal, ai_brief, stage, coach_notes, follow_up_date, last_contacted_at, stage_updated_at, converted_client_id, converted_at, created_at')
      .single()

    if (saveError) {
      console.error('Error saving lead:', saveError)
      alert(`Failed to save lead: ${saveError.message}`)
      setSaving(false)
      return
    }

    const nextLead = normalizeLeadRecord(data)
    if (nextLead) {
      setLead(nextLead)
      setDraft(buildLeadDraft(nextLead))
    }

    setSaving(false)
  }

  async function convertToClient() {
    if (!lead || !canConvertLead(lead)) return

    setConverting(true)

    try {
      const { data: clientData, error: insertError } = await supabase
        .from('clients')
        .insert({
          full_name: lead.full_name,
          email: lead.email,
          coach_id: lead.coach_id,
          status: 'active',
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      const nowIso = new Date().toISOString()
      const { data: updatedLeadData, error: updateError } = await supabase
        .from('leads')
        .update({
          stage: 'won',
          converted_client_id: clientData.id,
          converted_at: nowIso,
          stage_updated_at: nowIso,
          last_contacted_at: lead.last_contacted_at ?? nowIso,
        })
        .eq('id', lead.id)
        .select('id, full_name, email, coach_id, heat_score, budget_range, timeline, goal, ai_brief, stage, coach_notes, follow_up_date, last_contacted_at, stage_updated_at, converted_client_id, converted_at, created_at')
        .single()

      if (updateError) throw updateError

      const nextLead = normalizeLeadRecord(updatedLeadData)
      if (nextLead) {
        setLead(nextLead)
        setDraft(buildLeadDraft(nextLead))
      }

      router.push(`/clients/${clientData.id}`)
    } catch (conversionError) {
      const message =
        conversionError instanceof Error ? conversionError.message : 'We could not convert this lead yet.'
      console.error('Error converting lead:', conversionError)
      alert(`Failed to convert lead: ${message}`)
    } finally {
      setConverting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', color: '#6b7280', fontSize: '13px' }}>
        Loading lead...
      </div>
    )
  }

  if (error || !lead || !draft) {
    return (
      <div style={{ padding: '24px' }}>
        <button
          onClick={() => router.push('/leads')}
          style={{
            background: 'none',
            border: 'none',
            color: '#7F77DD',
            fontSize: '13px',
            cursor: 'pointer',
            padding: 0,
            marginBottom: '12px',
          }}
        >
          ← Back to leads
        </button>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>{error ?? 'Lead not found.'}</div>
      </div>
    )
  }

  const stageStyle = getLeadStageStyle(lead.stage)
  const followUpBadge = getFollowUpBadge(lead)
  const brief = getLeadBriefText(lead.ai_brief)
  const summary = getLeadSummary(lead)
  const isDirty =
    draft.stage !== lead.stage ||
    draft.follow_up_date !== (lead.follow_up_date ?? '') ||
    draft.coach_notes !== (lead.coach_notes ?? '')

  return (
    <div style={{ padding: '24px', maxWidth: '920px' }}>
      <button
        onClick={() => router.push('/leads')}
        style={{
          background: 'none',
          border: 'none',
          color: '#7F77DD',
          fontSize: '13px',
          cursor: 'pointer',
          padding: 0,
          marginBottom: '14px',
        }}
      >
        ← Back to leads
      </button>

      <div
        style={{
          background: '#fff',
          border: '0.5px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: avatarColors[0],
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {getLeadInitials(lead.full_name)}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
                {lead.full_name}
              </h1>
              <span
                style={{
                  background: stageStyle.bg,
                  color: stageStyle.color,
                  border: `1px solid ${stageStyle.border}`,
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {getLeadStageLabel(lead.stage)}
              </span>
              {followUpBadge && (
                <span
                  style={{
                    background: followUpBadge.bg,
                    color: followUpBadge.color,
                    border: `1px solid ${followUpBadge.border}`,
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  {followUpBadge.label}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
              {lead.email}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              Submitted {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {formatLeadStageAgeLabel(lead)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {lead.goal && (
            <span style={{ fontSize: '11px', color: '#374151', background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '999px', padding: '4px 8px' }}>
              {lead.goal}
            </span>
          )}
          {lead.timeline && (
            <span style={{ fontSize: '11px', color: '#374151', background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '999px', padding: '4px 8px' }}>
              {lead.timeline}
            </span>
          )}
          {lead.budget_range && (
            <span style={{ fontSize: '11px', color: '#374151', background: '#f9fafb', border: '0.5px solid #e5e7eb', borderRadius: '999px', padding: '4px 8px' }}>
              {lead.budget_range}
            </span>
          )}
          {lead.converted_client_id && (
            <span style={{ fontSize: '11px', color: '#166534', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '999px', padding: '4px 8px' }}>
              Converted to client
            </span>
          )}
        </div>

        <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
          {summary ?? 'No coach note or summary saved yet.'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
        <div
          style={{
            background: '#fff',
            border: '0.5px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Pipeline actions
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#111827' }}>Stage</span>
              <select
                value={draft.stage}
                onChange={(event) => setDraft((prev) => (prev ? { ...prev, stage: event.target.value as LeadStage } : prev))}
                style={{
                  minHeight: '40px',
                  borderRadius: '10px',
                  border: '0.5px solid #e5e7eb',
                  background: '#fff',
                  padding: '0 12px',
                  fontSize: '12px',
                  color: '#111827',
                }}
              >
                {LEAD_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {getLeadStageLabel(stage)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#111827' }}>Follow-up date</span>
              <input
                type="date"
                value={draft.follow_up_date}
                onChange={(event) => setDraft((prev) => (prev ? { ...prev, follow_up_date: event.target.value } : prev))}
                style={{
                  minHeight: '40px',
                  borderRadius: '10px',
                  border: '0.5px solid #e5e7eb',
                  background: '#fff',
                  padding: '0 12px',
                  fontSize: '12px',
                  color: '#111827',
                }}
              />
            </label>

            <label style={{ display: 'grid', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#111827' }}>Coach notes</span>
              <textarea
                value={draft.coach_notes}
                onChange={(event) => setDraft((prev) => (prev ? { ...prev, coach_notes: event.target.value } : prev))}
                rows={8}
                placeholder="Add context from the last conversation, objection, or next best move..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: '12px',
                  border: '0.5px solid #e5e7eb',
                  background: '#fff',
                  padding: '12px',
                  fontSize: '12px',
                  color: '#374151',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => void saveLead()}
                disabled={!isDirty || saving}
                style={{
                  background: !isDirty || saving ? '#f3f4f6' : '#111827',
                  color: !isDirty || saving ? '#9ca3af' : '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: !isDirty || saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>

              <button
                onClick={() => void convertToClient()}
                disabled={!canConvertLead(lead) || converting}
                style={{
                  background: canConvertLead(lead) && !converting ? '#ecfdf5' : '#f3f4f6',
                  color: canConvertLead(lead) && !converting ? '#047857' : '#9ca3af',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: `0.5px solid ${canConvertLead(lead) && !converting ? '#a7f3d0' : '#e5e7eb'}`,
                  cursor: canConvertLead(lead) && !converting ? 'pointer' : 'not-allowed',
                }}
              >
                {converting ? 'Converting…' : lead.converted_client_id ? 'Converted' : 'Convert to client'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          <div
            style={{
              background: '#fff',
              border: '0.5px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Lead context
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Goal</div>
                <div style={{ fontSize: '13px', color: '#374151' }}>{lead.goal ?? 'Not captured'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Timeline</div>
                <div style={{ fontSize: '13px', color: '#374151' }}>{lead.timeline ?? 'Not captured'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Budget range</div>
                <div style={{ fontSize: '13px', color: '#374151' }}>{lead.budget_range ?? 'Not captured'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Last contacted</div>
                <div style={{ fontSize: '13px', color: '#374151' }}>
                  {lead.last_contacted_at
                    ? new Date(lead.last_contacted_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'No contact logged yet'}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#fff',
              border: '0.5px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                AI brief
              </div>
            </div>

            {brief ? (
              <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                <ReactMarkdown>{brief}</ReactMarkdown>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                No AI brief available yet for this lead.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
