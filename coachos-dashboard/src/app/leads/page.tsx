'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  normalizeLeadRecords,
  sortLeadRecords,
  type LeadRecord,
  type LeadStage,
} from '@/lib/leads'

type LeadDraft = {
  stage: LeadStage
  coach_notes: string
  follow_up_date: string
}

const LEAD_STAGES: LeadStage[] = [
  'new',
  'contacted',
  'call_booked',
  'proposal_sent',
  'won',
  'lost',
]

const avatarColors = ['#A32D2D', '#0d9488', '#4338ca', '#ec4899', '#7F77DD', '#b45309']

function getAvatarColor(index: number) {
  return avatarColors[index % avatarColors.length]
}

function buildLeadDraft(lead: LeadRecord): LeadDraft {
  return {
    stage: lead.stage,
    coach_notes: lead.coach_notes ?? '',
    follow_up_date: lead.follow_up_date ?? '',
  }
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, LeadDraft>>({})
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null)
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null)
  const [expandedLeadIds, setExpandedLeadIds] = useState<Record<string, boolean>>({})
  const [selectedBrief, setSelectedBrief] = useState<{ name: string; brief: string } | null>(null)

  useEffect(() => {
    async function fetchLeads() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('id, full_name, email, coach_id, heat_score, budget_range, timeline, goal, ai_brief, stage, coach_notes, follow_up_date, last_contacted_at, stage_updated_at, converted_client_id, converted_at, created_at')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Error fetching leads:', fetchError)
        setError('Unable to load the lead pipeline right now.')
        setLeads([])
        setDrafts({})
        setLoading(false)
        return
      }

      const normalizedLeads = sortLeadRecords(normalizeLeadRecords(data ?? []))
      const nextDrafts = normalizedLeads.reduce<Record<string, LeadDraft>>((acc, lead) => {
        acc[lead.id] = buildLeadDraft(lead)
        return acc
      }, {})

      setLeads(normalizedLeads)
      setDrafts(nextDrafts)
      setLoading(false)
    }

    fetchLeads()
  }, [])

  const groupedLeads = useMemo(() => {
    return LEAD_STAGES
      .map((stage) => ({
        stage,
        label: getLeadStageLabel(stage),
        leads: leads.filter((lead) => lead.stage === stage),
      }))
      .filter((group) => group.leads.length > 0)
  }, [leads])

  const stageCounts = useMemo(() => {
    return LEAD_STAGES.map((stage) => ({
      stage,
      label: getLeadStageLabel(stage),
      count: leads.filter((lead) => lead.stage === stage).length,
    }))
  }, [leads])

  const openLeadCount = leads.filter((lead) => lead.stage !== 'won' && lead.stage !== 'lost').length
  const overdueFollowUpCount = leads.filter((lead) => {
    const badge = getFollowUpBadge(lead)
    return badge?.label === 'Follow-up overdue'
  }).length
  const wonLeadCount = leads.filter((lead) => lead.stage === 'won').length

  function updateDraft(leadId: string, nextPatch: Partial<LeadDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [leadId]: {
        ...prev[leadId],
        ...nextPatch,
      },
    }))
  }

  function toggleExpanded(leadId: string) {
    setExpandedLeadIds((prev) => ({
      ...prev,
      [leadId]: !prev[leadId],
    }))
  }

  async function saveLead(lead: LeadRecord) {
    const draft = drafts[lead.id]
    if (!draft) return

    setSavingLeadId(lead.id)

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
      setSavingLeadId(null)
      return
    }

    const nextLead = normalizeLeadRecord(data)

    if (nextLead) {
      setLeads((prev) => sortLeadRecords(prev.map((entry) => (entry.id === nextLead.id ? nextLead : entry))))
      setDrafts((prev) => ({
        ...prev,
        [nextLead.id]: buildLeadDraft(nextLead),
      }))
    }

    setSavingLeadId(null)
  }

  async function convertToClient(lead: LeadRecord) {
    if (!canConvertLead(lead)) return

    setConvertingLeadId(lead.id)

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
        setLeads((prev) => sortLeadRecords(prev.map((entry) => (entry.id === nextLead.id ? nextLead : entry))))
        setDrafts((prev) => ({
          ...prev,
          [nextLead.id]: buildLeadDraft(nextLead),
        }))
      }

      router.push(`/clients/${clientData.id}`)
    } catch (conversionError) {
      const message =
        conversionError instanceof Error ? conversionError.message : 'We could not convert this lead yet.'
      console.error('Error converting lead:', conversionError)
      alert(`Failed to convert lead: ${message}`)
    } finally {
      setConvertingLeadId(null)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 500, color: '#111827', margin: 0 }}>Lead Pipeline</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '13px' }}>
          Keep lead follow-up simple, visible, and coach-owned.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        {[
          { label: 'Open leads', value: openLeadCount, sub: 'active pipeline' },
          { label: 'Follow-ups overdue', value: overdueFollowUpCount, sub: 'needs action' },
          { label: 'Won leads', value: wonLeadCount, sub: 'ready to convert' },
        ].map((item) => (
          <div key={item.label} style={{ background: '#f9fafb', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#9ca3af', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 500, color: '#111827', marginTop: '6px' }}>
              {item.value}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#fff',
          border: '0.5px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '12px' }}>
          Pipeline stages
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px' }}>
          {stageCounts.map((item) => {
            const stageStyle = getLeadStageStyle(item.stage)
            return (
              <div
                key={item.stage}
                style={{
                  background: stageStyle.bg,
                  border: `1px solid ${stageStyle.border}`,
                  borderRadius: '10px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 600, color: stageStyle.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginTop: '4px' }}>
                  {item.count}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {loading && (
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          Loading lead pipeline...
        </div>
      )}

      {error && !loading && (
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
          {error}
        </div>
      )}

      {!loading && !error && leads.length === 0 && (
        <div
          style={{
            background: '#fff',
            border: '0.5px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827', marginBottom: '4px' }}>
            No leads yet
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
            New form submissions will appear here and move through the coaching sales pipeline.
          </div>
        </div>
      )}

      {!loading && !error && groupedLeads.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groupedLeads.map((group) => (
            <div
              key={group.stage}
              style={{
                background: '#fff',
                border: '0.5px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{group.label}</div>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>{group.leads.length} lead{group.leads.length === 1 ? '' : 's'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {group.leads.map((lead, index) => {
                  const stageStyle = getLeadStageStyle(lead.stage)
                  const followUpBadge = getFollowUpBadge(lead)
                  const summary = getLeadSummary(lead)
                  const brief = getLeadBriefText(lead.ai_brief)
                  const draft = drafts[lead.id] ?? buildLeadDraft(lead)
                  const isDirty =
                    draft.stage !== lead.stage ||
                    draft.follow_up_date !== (lead.follow_up_date ?? '') ||
                    draft.coach_notes !== (lead.coach_notes ?? '')
                  const isExpanded = expandedLeadIds[lead.id] === true

                  return (
                    <div
                      key={lead.id}
                      style={{
                        background: '#fafafa',
                        border: '0.5px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: getAvatarColor(index),
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {getLeadInitials(lead.full_name)}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                              <button
                                onClick={() => router.push(`/leads/${lead.id}`)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: '#111827',
                                }}
                              >
                                {lead.full_name}
                              </button>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                              {lead.goal && (
                                <span style={{ fontSize: '11px', color: '#374151', background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '999px', padding: '4px 8px' }}>
                                  {lead.goal}
                                </span>
                              )}
                              {lead.timeline && (
                                <span style={{ fontSize: '11px', color: '#374151', background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '999px', padding: '4px 8px' }}>
                                  {lead.timeline}
                                </span>
                              )}
                              {lead.budget_range && (
                                <span style={{ fontSize: '11px', color: '#374151', background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: '999px', padding: '4px 8px' }}>
                                  {lead.budget_range}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.6 }}>
                              {summary ?? 'No coach note yet. Add one so the next follow-up is easier to pick up.'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                              {formatLeadStageAgeLabel(lead)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: isExpanded ? '10px' : 0 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '180px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Stage
                          </span>
                          <select
                            value={draft.stage}
                            onChange={(event) => updateDraft(lead.id, { stage: event.target.value as LeadStage })}
                            style={{
                              minHeight: '38px',
                              borderRadius: '8px',
                              border: '0.5px solid #e5e7eb',
                              background: '#fff',
                              padding: '0 10px',
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

                        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#9ca3af', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Follow-up
                          </span>
                          <input
                            type="date"
                            value={draft.follow_up_date}
                            onChange={(event) => updateDraft(lead.id, { follow_up_date: event.target.value })}
                            style={{
                              minHeight: '38px',
                              borderRadius: '8px',
                              border: '0.5px solid #e5e7eb',
                              background: '#fff',
                              padding: '0 10px',
                              fontSize: '12px',
                              color: '#111827',
                            }}
                          />
                        </label>

                        <button
                          onClick={() => toggleExpanded(lead.id)}
                          style={{
                            alignSelf: 'flex-end',
                            background: '#fff',
                            color: '#374151',
                            fontSize: '12px',
                            fontWeight: 500,
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: '0.5px solid #e5e7eb',
                            cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? 'Hide notes' : 'Add note'}
                        </button>

                        {brief && (
                          <button
                            onClick={() => setSelectedBrief({ name: lead.full_name, brief })}
                            style={{
                              alignSelf: 'flex-end',
                              background: '#fff',
                              color: '#374151',
                              fontSize: '12px',
                              fontWeight: 500,
                              padding: '7px 12px',
                              borderRadius: '8px',
                              border: '0.5px solid #e5e7eb',
                              cursor: 'pointer',
                            }}
                          >
                            View brief
                          </button>
                        )}

                        <button
                          onClick={() => void saveLead(lead)}
                          disabled={!isDirty || savingLeadId === lead.id}
                          style={{
                            alignSelf: 'flex-end',
                            background: !isDirty || savingLeadId === lead.id ? '#f3f4f6' : '#111827',
                            color: !isDirty || savingLeadId === lead.id ? '#9ca3af' : '#fff',
                            fontSize: '12px',
                            fontWeight: 500,
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: !isDirty || savingLeadId === lead.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {savingLeadId === lead.id ? 'Saving…' : 'Save'}
                        </button>

                        <button
                          onClick={() => void convertToClient(lead)}
                          disabled={!canConvertLead(lead) || convertingLeadId === lead.id}
                          style={{
                            alignSelf: 'flex-end',
                            background: canConvertLead(lead) && convertingLeadId !== lead.id ? '#ecfdf5' : '#f3f4f6',
                            color: canConvertLead(lead) && convertingLeadId !== lead.id ? '#047857' : '#9ca3af',
                            fontSize: '12px',
                            fontWeight: 500,
                            padding: '7px 12px',
                            borderRadius: '8px',
                            border: `0.5px solid ${canConvertLead(lead) && convertingLeadId !== lead.id ? '#a7f3d0' : '#e5e7eb'}`,
                            cursor: canConvertLead(lead) && convertingLeadId !== lead.id ? 'pointer' : 'not-allowed',
                          }}
                        >
                          {convertingLeadId === lead.id ? 'Converting…' : lead.converted_client_id ? 'Converted' : 'Convert to client'}
                        </button>
                      </div>

                      {isExpanded && (
                        <textarea
                          value={draft.coach_notes}
                          onChange={(event) => updateDraft(lead.id, { coach_notes: event.target.value })}
                          placeholder="Add a quick note about the last conversation, objection, or next step..."
                          rows={4}
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            borderRadius: '10px',
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
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBrief && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.48)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0,0,0,0.16)',
            }}
          >
            <div style={{ padding: '18px 20px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{selectedBrief.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>AI sales brief</div>
              </div>
              <button
                onClick={() => setSelectedBrief(null)}
                style={{
                  background: '#fff',
                  border: '0.5px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#374151',
                }}
              >
                Close
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                <ReactMarkdown>{selectedBrief.brief}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
