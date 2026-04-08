export type LeadStage =
  | 'new'
  | 'contacted'
  | 'call_booked'
  | 'proposal_sent'
  | 'won'
  | 'lost'

export type LeadRecord = {
  id: string
  full_name: string
  email: string
  coach_id: string | null
  heat_score: string | null
  budget_range: string | null
  timeline: string | null
  goal: string | null
  ai_brief: unknown
  stage: LeadStage
  coach_notes: string | null
  follow_up_date: string | null
  last_contacted_at: string | null
  stage_updated_at: string
  converted_client_id: string | null
  converted_at: string | null
  created_at: string
}

const VALID_STAGES: LeadStage[] = [
  'new',
  'contacted',
  'call_booked',
  'proposal_sent',
  'won',
  'lost',
]

const STAGE_ORDER: LeadStage[] = [
  'new',
  'contacted',
  'call_booked',
  'proposal_sent',
  'won',
  'lost',
]

export function normalizeLeadRecord(input: unknown): LeadRecord | null {
  if (!input || typeof input !== 'object') return null

  const raw = input as Partial<LeadRecord>

  if (
    typeof raw.id !== 'string' ||
    typeof raw.full_name !== 'string' ||
    typeof raw.email !== 'string' ||
    typeof raw.created_at !== 'string'
  ) {
    return null
  }

  return {
    id: raw.id,
    full_name: raw.full_name,
    email: raw.email,
    coach_id: typeof raw.coach_id === 'string' ? raw.coach_id : null,
    heat_score: typeof raw.heat_score === 'string' ? raw.heat_score : null,
    budget_range: typeof raw.budget_range === 'string' ? raw.budget_range : null,
    timeline: typeof raw.timeline === 'string' ? raw.timeline : null,
    goal: typeof raw.goal === 'string' ? raw.goal : null,
    ai_brief: raw.ai_brief ?? null,
    stage: isLeadStage(raw.stage) ? raw.stage : 'new',
    coach_notes: typeof raw.coach_notes === 'string' ? raw.coach_notes : null,
    follow_up_date: typeof raw.follow_up_date === 'string' ? raw.follow_up_date : null,
    last_contacted_at: typeof raw.last_contacted_at === 'string' ? raw.last_contacted_at : null,
    stage_updated_at:
      typeof raw.stage_updated_at === 'string' ? raw.stage_updated_at : raw.created_at,
    converted_client_id:
      typeof raw.converted_client_id === 'string' ? raw.converted_client_id : null,
    converted_at: typeof raw.converted_at === 'string' ? raw.converted_at : null,
    created_at: raw.created_at,
  }
}

export function normalizeLeadRecords(input: unknown) {
  if (!Array.isArray(input)) return []

  return input
    .map((lead) => normalizeLeadRecord(lead))
    .filter((lead): lead is LeadRecord => lead !== null)
}

export function isLeadStage(value: unknown): value is LeadStage {
  return VALID_STAGES.includes(value as LeadStage)
}

export function getLeadStageLabel(stage: LeadStage) {
  if (stage === 'new') return 'New'
  if (stage === 'contacted') return 'Contacted'
  if (stage === 'call_booked') return 'Call booked'
  if (stage === 'proposal_sent') return 'Proposal sent'
  if (stage === 'won') return 'Won'
  return 'Lost'
}

export function getLeadStageStyle(stage: LeadStage) {
  if (stage === 'new') return { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' }
  if (stage === 'contacted') return { bg: '#e0f2fe', color: '#0f4c81', border: '#bae6fd' }
  if (stage === 'call_booked') return { bg: '#ecfccb', color: '#3f6212', border: '#bef264' }
  if (stage === 'proposal_sent') return { bg: '#fef3c7', color: '#92400e', border: '#fde68a' }
  if (stage === 'won') return { bg: '#dcfce7', color: '#166534', border: '#86efac' }
  return { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' }
}

export function sortLeadRecords(leads: LeadRecord[]) {
  const stageRank = new Map(STAGE_ORDER.map((stage, index) => [stage, index]))

  return [...leads].sort((a, b) => {
    const aRank = stageRank.get(a.stage) ?? 0
    const bRank = stageRank.get(b.stage) ?? 0

    if (aRank !== bRank) return aRank - bRank

    const aFollowUp = a.follow_up_date ?? '9999-12-31'
    const bFollowUp = b.follow_up_date ?? '9999-12-31'
    if (aFollowUp !== bFollowUp) return aFollowUp.localeCompare(bFollowUp)

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function getLeadSummary(lead: LeadRecord) {
  const note = lead.coach_notes?.trim()
  if (note) return truncateText(note, 140)

  const brief = getLeadBriefText(lead.ai_brief)
  if (brief) return truncateText(brief, 140)

  return null
}

export function getLeadBriefText(value: unknown) {
  if (!value) return null

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as { brief?: unknown }
      if (typeof parsed?.brief === 'string' && parsed.brief.trim()) {
        return parsed.brief.trim()
      }
    } catch {
      return value.trim() || null
    }

    return value.trim() || null
  }

  if (typeof value === 'object') {
    const candidate = value as { brief?: unknown }
    if (typeof candidate.brief === 'string' && candidate.brief.trim()) {
      return candidate.brief.trim()
    }
  }

  return null
}

export function getLeadInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function canConvertLead(lead: LeadRecord) {
  return lead.stage === 'won' && !lead.converted_client_id
}

export function isOpenLeadStage(stage: LeadStage) {
  return stage !== 'won' && stage !== 'lost'
}

export function getFollowUpBadge(lead: LeadRecord, now = new Date()) {
  if (!lead.follow_up_date || !isOpenLeadStage(lead.stage)) return null

  const todayKey = getDateKey(now)

  if (lead.follow_up_date < todayKey) {
    return {
      label: 'Follow-up overdue',
      bg: '#fee2e2',
      color: '#A32D2D',
      border: '#fecaca',
    }
  }

  if (lead.follow_up_date === todayKey) {
    return {
      label: 'Follow up today',
      bg: '#fef3c7',
      color: '#92400e',
      border: '#fde68a',
    }
  }

  return {
    label: `Follow up ${formatDateLabel(lead.follow_up_date)}`,
    bg: '#f9fafb',
    color: '#6b7280',
    border: '#e5e7eb',
  }
}

export function formatLeadStageAgeLabel(lead: LeadRecord, now = new Date()) {
  const days = Math.max(
    0,
    Math.floor((now.getTime() - new Date(lead.stage_updated_at).getTime()) / 86400000),
  )

  if (days === 0) return 'Updated today'
  if (days === 1) return 'In this stage for 1 day'
  return `In this stage for ${days} days`
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}…`
}

function getDateKey(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
