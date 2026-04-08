import { type CheckInSubmission } from '@/lib/check-ins'
import { type CoachPerformanceSummary } from '@/lib/client-performance-summary'
import { type ClientMessage } from '@/lib/messages'

type SourceType = 'leads' | 'messages' | 'check-ins' | 'adherence'

type ThemeId =
  | 'busy_schedule'
  | 'stress_overwhelm'
  | 'low_energy_recovery'
  | 'missed_workouts'
  | 'anchor_habits'
  | 'weekend_consistency'
  | 'price_objection'
  | 'previous_failure'
  | 'pain_or_injury'
  | 'accountability'
  | 'fat_loss_goal'
  | 'muscle_goal'
  | 'endurance_goal'

type ThemeConfig = {
  topic: string
  hook: string
  whyItMatters: string
  scriptStarter?: string
  talkingPoints: string[]
}

type ThemeEvidence = {
  score: number
  sourceTypes: Set<SourceType>
  sourceKeys: Set<string>
}

type LeadLike = {
  id: string
  goal?: string | null
  budget_range?: string | null
  timeline?: string | null
  ai_brief?: unknown
}

export type CoachContentIdea = {
  id: string
  topic: string
  hook: string
  whyItMatters: string
  scriptStarter: string | null
  talkingPoints: string[]
  evidenceLabel: string
  isFallback: boolean
}

export type CoachContentIdeasResult = {
  ideas: CoachContentIdea[]
  sourceSummary: string
  usedFallback: boolean
}

type BuildCoachContentIdeasInput = {
  leads: LeadLike[]
  checkInSubmissions: CheckInSubmission[]
  clientMessages: ClientMessage[]
  performanceSummaries: CoachPerformanceSummary[]
}

const THEME_CONFIGS: Record<ThemeId, ThemeConfig> = {
  busy_schedule: {
    topic: 'Content angle: busy weeks break fragile plans',
    hook: 'If your plan only works on calm weeks, it is not built for real life.',
    whyItMatters: 'Busy schedules keep surfacing when people want results but cannot consistently protect long workouts, meal prep, or a perfect routine.',
    scriptStarter: 'Talk about how good coaching removes friction first, then adds intensity once the schedule can support it.',
    talkingPoints: [
      'Show what a minimum-effective week actually looks like.',
      'Explain how to keep momentum with shorter sessions and simpler nutrition.',
    ],
  },
  stress_overwhelm: {
    topic: 'Content angle: stress changes the plan before discipline does',
    hook: 'When life feels heavy, more pressure is rarely the answer.',
    whyItMatters: 'Stress and overwhelm are strong drop-off triggers, so content that normalizes lower-friction coaching can build trust fast.',
    scriptStarter: 'Frame stress as a coaching variable, not a personal failure.',
    talkingPoints: [
      'Explain why stressed clients need simpler decisions, not harsher accountability.',
      'Share how to adjust training expectations without feeling like you are quitting.',
    ],
  },
  low_energy_recovery: {
    topic: 'Content angle: low energy is a planning signal',
    hook: 'Low energy usually means the system needs attention, not that the client is lazy.',
    whyItMatters: 'Recovery issues quietly affect adherence, mood, and confidence, and they often show up before someone asks for help.',
    scriptStarter: 'Teach your audience how recovery markers predict whether a plan is sustainable.',
    talkingPoints: [
      'Connect sleep, stress, and workout quality in plain language.',
      'Show how to scale effort before burnout leads to disengagement.',
    ],
  },
  missed_workouts: {
    topic: 'Content angle: missed workouts are usually a friction problem',
    hook: 'Most people do not need more motivation. They need a plan they can still execute on hard weeks.',
    whyItMatters: 'Recurring missed sessions are one of the clearest signs that people want results but are stuck in an all-or-nothing pattern.',
    scriptStarter: 'Lead with the idea that consistency is built by reducing decision fatigue, not by chasing perfect streaks.',
    talkingPoints: [
      'Break down why people miss sessions even when they care deeply.',
      'Offer a simple “get back on track” rule for the next 24 hours.',
    ],
  },
  anchor_habits: {
    topic: 'Content angle: fewer habits create better follow-through',
    hook: 'The fastest behavior change usually comes from one or two anchor habits, not a giant checklist.',
    whyItMatters: 'Low habit adherence usually points to overloaded routines, which makes simple habit content highly relatable and shareable.',
    scriptStarter: 'Show how strong coaches pick the smallest habit with the biggest downstream payoff.',
    talkingPoints: [
      'Use examples like steps, protein, sleep, or hydration as anchor habits.',
      'Explain why stacking too many habits often kills momentum.',
    ],
  },
  weekend_consistency: {
    topic: 'Content angle: weekends expose weak systems',
    hook: 'Your weekends do not need to be perfect. They do need a floor.',
    whyItMatters: 'Weekend inconsistency is one of the most common reasons weekday effort never compounds into visible progress.',
    scriptStarter: 'Talk about two or three weekend non-negotiables instead of a full “stay on plan” lecture.',
    talkingPoints: [
      'Give a coach-approved reset for one off-plan meal or missed session.',
      'Explain how to protect momentum without turning weekends into punishment.',
    ],
  },
  price_objection: {
    topic: 'Content angle: what people are really buying in coaching',
    hook: 'Price objections usually mean the value is still too abstract.',
    whyItMatters: 'When leads hesitate around cost, they often need clearer language around support, personalization, and long-term outcomes.',
    scriptStarter: 'Position coaching as faster clarity and better follow-through, not just another plan to download.',
    talkingPoints: [
      'Contrast a generic plan with ongoing adjustment and accountability.',
      'Show the hidden cost of staying stuck or restarting every month.',
    ],
  },
  previous_failure: {
    topic: 'Content angle: speak to people who think nothing works for them',
    hook: '“I have tried everything” usually means they have tried everything alone.',
    whyItMatters: 'Past failure is a major trust barrier, so content that names it directly can make the right leads feel understood quickly.',
    scriptStarter: 'Acknowledge past frustration before explaining how structure and feedback change the outcome.',
    talkingPoints: [
      'Differentiate between failing a plan and being given the wrong system.',
      'Share how weekly adjustments prevent the usual relapse cycle.',
    ],
  },
  pain_or_injury: {
    topic: 'Content angle: progress still matters when pain is in the picture',
    hook: 'Pain changes the plan, but it does not have to cancel progress.',
    whyItMatters: 'Prospects dealing with pain or old injuries are often skeptical, cautious, and highly responsive to calm, practical reassurance.',
    scriptStarter: 'Teach how smart programming adapts around limitations without turning training into guesswork.',
    talkingPoints: [
      'Explain the difference between avoiding everything and training intelligently.',
      'Show how movement quality and confidence can improve together.',
    ],
  },
  accountability: {
    topic: 'Content angle: accountability should feel personal, not punishing',
    hook: 'The best accountability makes people feel supported enough to keep going.',
    whyItMatters: 'People who struggle with motivation often need content that reframes accountability as clarity and consistency, not shame.',
    scriptStarter: 'Explain what real accountability sounds like inside a high-touch coaching relationship.',
    talkingPoints: [
      'Show how a coach catches small slips before they become big drop-offs.',
      'Contrast supportive accountability with guilt-based motivation.',
    ],
  },
  fat_loss_goal: {
    topic: 'Content angle: fat loss needs a plan people can actually live with',
    hook: 'Most fat-loss plateaus are a sustainability problem before they are a calorie problem.',
    whyItMatters: 'Fat-loss goals are a strong audience signal, especially when people also report stress, missed workouts, or inconsistency.',
    scriptStarter: 'Speak to the person who wants visible progress without another extreme reset.',
    talkingPoints: [
      'Connect sustainable fat loss to routine design, not just effort.',
      'Explain why consistency beats short bursts of perfection.',
    ],
  },
  muscle_goal: {
    topic: 'Content angle: muscle gain starts with repeatable basics',
    hook: 'You do not need a complicated split to start building muscle.',
    whyItMatters: 'Muscle-building audiences respond well to simple, confidence-building education that removes overwhelm and guesswork.',
    scriptStarter: 'Teach what actually moves early muscle-building results for busy adults.',
    talkingPoints: [
      'Reinforce progressive overload, protein, and recovery in plain language.',
      'Show why consistency usually matters more than variety early on.',
    ],
  },
  endurance_goal: {
    topic: 'Content angle: endurance progress falls apart without recovery',
    hook: 'More training only works when recovery and structure are keeping up.',
    whyItMatters: 'Endurance and event-based goals often come with fatigue, pain flare-ups, and pacing mistakes that make practical coaching content valuable.',
    scriptStarter: 'Use this angle to talk about balancing ambition with joint stress, recovery, and realistic progression.',
    talkingPoints: [
      'Explain why strategic reduction can outperform random extra volume.',
      'Show how consistency beats heroic training spikes.',
    ],
  },
}

const TEXT_THEME_MATCHERS: Array<{ themeId: ThemeId; patterns: RegExp[] }> = [
  { themeId: 'busy_schedule', patterns: [/\bbusy\b/i, /\bwork\b/i, /\bschedule\b/i, /\btravel\b/i, /\bhectic\b/i, /\bnap\b/i, /\bkids?\b/i] },
  { themeId: 'stress_overwhelm', patterns: [/\bstress/i, /\bstressed\b/i, /\boverwhelm/i, /\banxious\b/i, /\bburn(ed)?\s*out\b/i] },
  { themeId: 'low_energy_recovery', patterns: [/\blow energy\b/i, /\benergy\b/i, /\btired\b/i, /\bexhaust/i, /\bdrained\b/i, /\bfatigue\b/i, /\bsleep\b/i, /\brecovery\b/i] },
  { themeId: 'missed_workouts', patterns: [/\bmissed\b/i, /\bskipp?ed\b/i, /\bfell off\b/i, /\boff track\b/i, /\binconsistent\b/i] },
  { themeId: 'anchor_habits', patterns: [/\bhabit/i, /\broutine\b/i, /\bwater\b/i, /\bhydrat/i, /\bprotein\b/i, /\bsteps?\b/i] },
  { themeId: 'weekend_consistency', patterns: [/\bweekend/i, /\bsaturday\b/i, /\bsunday\b/i, /\bmonday\b/i] },
  { themeId: 'price_objection', patterns: [/\bbudget\b/i, /\bcost\b/i, /\bprice\b/i, /\bafford\b/i, /\bexpensive\b/i, /\binvestment\b/i] },
  { themeId: 'previous_failure', patterns: [/\bfailed\b/i, /\bfailure\b/i, /\btried everything\b/i, /\bnothing works\b/i, /\bstart over\b/i, /\bnever sticks\b/i] },
  { themeId: 'pain_or_injury', patterns: [/\bpain\b/i, /\binjury\b/i, /\bknee\b/i, /\bback\b/i, /\bshoulder\b/i] },
  { themeId: 'accountability', patterns: [/\baccountability\b/i, /\bmotivation\b/i, /\bdiscipline\b/i, /\bkeep me on track\b/i] },
]

const GOAL_THEME_MATCHERS: Array<{ themeId: ThemeId; patterns: RegExp[] }> = [
  { themeId: 'fat_loss_goal', patterns: [/\blose\b/i, /\bweight loss\b/i, /\bfat loss\b/i, /\bfat\b/i, /\blean(er)?\b/i] },
  { themeId: 'muscle_goal', patterns: [/\bmuscle\b/i, /\bstrength\b/i, /\brecomp/i, /\btoned\b/i] },
  { themeId: 'endurance_goal', patterns: [/\brun/i, /\bmarathon\b/i, /\bhalf marathon\b/i, /\bendurance\b/i] },
]

const PAIN_THEME_IDS: ThemeId[] = [
  'busy_schedule',
  'stress_overwhelm',
  'low_energy_recovery',
  'missed_workouts',
  'anchor_habits',
  'weekend_consistency',
  'price_objection',
  'previous_failure',
  'pain_or_injury',
  'accountability',
]

export function buildCoachContentIdeas(
  input: BuildCoachContentIdeasInput,
): CoachContentIdeasResult {
  const evidence = new Map<ThemeId, ThemeEvidence>()

  input.leads.forEach((lead) => {
    const text = compactText([
      lead.goal,
      lead.budget_range,
      lead.timeline,
      parseLeadBriefText(lead.ai_brief),
    ])

    matchThemesFromText(text, 'leads', `lead:${lead.id}`, evidence, 1)
    matchGoalThemes(text, 'leads', `lead-goal:${lead.id}`, evidence, 1)
  })

  input.clientMessages
    .filter((message) => message.sender === 'client')
    .forEach((message) => {
      matchThemesFromText(message.content, 'messages', `message:${message.id ?? message.created_at}`, evidence, 2)
    })

  input.checkInSubmissions.forEach((submission) => {
    const sourceKey = `check-in:${submission.id}`
    const text = compactText([
      getStringField(submission.content, 'wins_challenges'),
      getStringField(submission.content, 'text_update'),
    ])

    matchThemesFromText(text, 'check-ins', sourceKey, evidence, 2)

    const energy = getNumericField(submission.content, 'energy')
    const stress = getNumericField(submission.content, 'stress')
    const sleep = getNumericField(submission.content, 'sleep')
    const workoutAdherence = getNumericField(submission.content, 'workout_adherence')
    const habitAdherence = getNumericField(submission.content, 'habit_adherence')

    if (energy !== null && energy <= 2) {
      addEvidence(evidence, 'low_energy_recovery', 'check-ins', `${sourceKey}:energy`, 2)
    }

    if (stress !== null && stress >= 4) {
      addEvidence(evidence, 'stress_overwhelm', 'check-ins', `${sourceKey}:stress`, 2)
    }

    if (sleep !== null && sleep <= 2) {
      addEvidence(evidence, 'low_energy_recovery', 'check-ins', `${sourceKey}:sleep`, 2)
    }

    if (workoutAdherence !== null && workoutAdherence <= 2) {
      addEvidence(evidence, 'missed_workouts', 'check-ins', `${sourceKey}:workouts`, 2)
    }

    if (habitAdherence !== null && habitAdherence <= 2) {
      addEvidence(evidence, 'anchor_habits', 'check-ins', `${sourceKey}:habits`, 2)
    }
  })

  input.performanceSummaries.forEach((summary, index) => {
    const sourceKey = `performance:${index}`

    if (summary.workout.assignedThisWeek > 0 && summary.workout.completionPercentage < 70) {
      addEvidence(evidence, 'missed_workouts', 'adherence', `${sourceKey}:workouts`, 2)
    }

    if (summary.habits.totalPossibleThisWeek > 0 && summary.habits.completionPercentage < 70) {
      addEvidence(evidence, 'anchor_habits', 'adherence', `${sourceKey}:habits`, 2)
    }

    if (summary.habits.currentStreak === 0 && summary.habits.totalPossibleThisWeek > 0) {
      addEvidence(evidence, 'anchor_habits', 'adherence', `${sourceKey}:streak`, 1)
    }

    if (summary.risk.level === 'High') {
      addEvidence(evidence, 'stress_overwhelm', 'adherence', `${sourceKey}:risk`, 1)
    }
  })

  const recurringPainThemes = rankThemes(evidence, PAIN_THEME_IDS).filter((item) => item.entry.sourceKeys.size >= 2)
  const goalThemes = rankThemes(evidence, GOAL_THEME_MATCHERS.map((item) => item.themeId)).filter((item) => item.entry.sourceKeys.size >= 2)

  const ideas: CoachContentIdea[] = recurringPainThemes
    .slice(0, 3)
    .map(({ themeId, entry }) => toIdea(themeId, entry, false))

  if (ideas.length < 3) {
    goalThemes.forEach(({ themeId, entry }) => {
      if (ideas.length >= 3) return
      if (ideas.some((idea) => idea.id === themeId)) return
      ideas.push(toIdea(themeId, entry, true))
    })
  }

  const sourceSummary = buildSourceSummary(input, ideas.length > 0)

  return {
    ideas,
    sourceSummary,
    usedFallback: ideas.some((idea) => idea.isFallback),
  }
}

function parseLeadBriefText(value: unknown) {
  if (!value) return ''

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as { brief?: unknown }
      if (typeof parsed?.brief === 'string') return parsed.brief
    } catch {
      return value
    }

    return value
  }

  if (typeof value === 'object') {
    const candidate = value as { brief?: unknown }
    return typeof candidate.brief === 'string' ? candidate.brief : JSON.stringify(value)
  }

  return String(value)
}

function compactText(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
}

function getStringField(content: Record<string, unknown>, key: string) {
  return typeof content[key] === 'string' ? content[key] : ''
}

function getNumericField(content: Record<string, unknown>, key: string) {
  const raw = content[key]
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

function matchThemesFromText(
  text: string,
  sourceType: SourceType,
  sourceKey: string,
  evidence: Map<ThemeId, ThemeEvidence>,
  weight: number,
) {
  if (!text.trim()) return

  TEXT_THEME_MATCHERS.forEach(({ themeId, patterns }) => {
    if (patterns.some((pattern) => pattern.test(text))) {
      addEvidence(evidence, themeId, sourceType, sourceKey, weight)
    }
  })
}

function matchGoalThemes(
  text: string,
  sourceType: SourceType,
  sourceKey: string,
  evidence: Map<ThemeId, ThemeEvidence>,
  weight: number,
) {
  if (!text.trim()) return

  GOAL_THEME_MATCHERS.forEach(({ themeId, patterns }) => {
    if (patterns.some((pattern) => pattern.test(text))) {
      addEvidence(evidence, themeId, sourceType, sourceKey, weight)
    }
  })
}

function addEvidence(
  evidence: Map<ThemeId, ThemeEvidence>,
  themeId: ThemeId,
  sourceType: SourceType,
  sourceKey: string,
  weight: number,
) {
  const current = evidence.get(themeId) ?? {
    score: 0,
    sourceTypes: new Set<SourceType>(),
    sourceKeys: new Set<string>(),
  }

  if (current.sourceKeys.has(sourceKey)) {
    current.sourceTypes.add(sourceType)
    evidence.set(themeId, current)
    return
  }

  current.score += weight
  current.sourceTypes.add(sourceType)
  current.sourceKeys.add(sourceKey)
  evidence.set(themeId, current)
}

function rankThemes(
  evidence: Map<ThemeId, ThemeEvidence>,
  themeIds: ThemeId[],
) {
  return themeIds
    .map((themeId) => ({
      themeId,
      entry: evidence.get(themeId),
    }))
    .filter((item): item is { themeId: ThemeId; entry: ThemeEvidence } => !!item.entry)
    .sort((a, b) => {
      if (b.entry.score !== a.entry.score) return b.entry.score - a.entry.score
      if (b.entry.sourceKeys.size !== a.entry.sourceKeys.size) {
        return b.entry.sourceKeys.size - a.entry.sourceKeys.size
      }
      return a.themeId.localeCompare(b.themeId)
    })
}

function toIdea(
  themeId: ThemeId,
  entry: ThemeEvidence,
  isFallback: boolean,
): CoachContentIdea {
  const config = THEME_CONFIGS[themeId]

  return {
    id: themeId,
    topic: config.topic,
    hook: config.hook,
    whyItMatters: config.whyItMatters,
    scriptStarter: config.scriptStarter ?? null,
    talkingPoints: config.talkingPoints,
    evidenceLabel: buildEvidenceLabel(entry),
    isFallback,
  }
}

function buildEvidenceLabel(entry: ThemeEvidence) {
  const sourceCount = entry.sourceKeys.size
  const sourceLabel = formatSourceList([...entry.sourceTypes])

  return `${sourceCount} recurring signal${sourceCount === 1 ? '' : 's'} across ${sourceLabel}`
}

function formatSourceList(sourceTypes: SourceType[]) {
  const labels = sourceTypes
    .map((sourceType) => {
      if (sourceType === 'leads') return 'leads'
      if (sourceType === 'messages') return 'client messages'
      if (sourceType === 'check-ins') return 'check-ins'
      return 'adherence data'
    })
    .sort()

  if (labels.length <= 1) return labels[0] ?? 'app data'
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`

  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

function buildSourceSummary(
  input: BuildCoachContentIdeasInput,
  hasIdeas: boolean,
) {
  const sources: string[] = []

  if (input.leads.length > 0) sources.push('leads')
  if (input.clientMessages.some((message) => message.sender === 'client')) sources.push('client messages')
  if (input.checkInSubmissions.length > 0) sources.push('check-ins')
  if (input.performanceSummaries.length > 0) sources.push('adherence trends')

  if (sources.length === 0) {
    return hasIdeas ? 'Based on current app activity.' : 'Not enough app data yet to spot repeated themes.'
  }

  return `Based on ${formatReadableList(sources)}.`
}

function formatReadableList(items: string[]) {
  if (items.length <= 1) return items[0] ?? 'current app data'
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}
