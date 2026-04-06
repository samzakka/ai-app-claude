export type LeadStatus = "hot" | "warm" | "new" | "cold";
export type ClientStatus = "on_track" | "review" | "at_risk";
export type UrgencyLevel = "red" | "amber" | "green";
export type AgentType = "SALES" | "RETENTION" | "CHECK-IN" | "CONTENT";

export interface PriorityItem {
  id: string;
  urgency: UrgencyLevel;
  agent: AgentType;
  text: string;
  action: string;
  route: string;
}

export interface Lead {
  id: string;
  name: string;
  initials: string;
  submittedAt: string;
  goal: string;
  status: LeadStatus;
  briefReady: boolean;
  formAnswers: { question: string; answer: string }[];
  brief?: {
    openingScript: string;
    objections: { objection: string; response: string }[];
    followUpEmail: string;
  };
}

export interface Client {
  id: string;
  name: string;
  initials: string;
  programWeek: number;
  lastCheckIn: string;
  status: ClientStatus;
  goal: string;
  startDate: string;
  checkIns: CheckIn[];
  metrics: { label: string; value: string; change?: string }[];
}

export interface CheckIn {
  id: string;
  date: string;
  summary: string;
  aiAnalysis: string;
  planAdjustments: string;
  mood: "good" | "average" | "needs_attention";
}

export interface ContentIdea {
  id: string;
  topic: string;
  clientCount: number;
  angle: string;
  status: "draft" | "ready" | "posted";
  hooks?: string[];
  fullPost?: string;
}

export interface RetentionClient {
  id: string;
  name: string;
  initials: string;
  status: "at_risk" | "review" | "on_track";
  signals: string[];
  recommendation: string;
  sentimentScore: number;
  lastSeen: string;
}

// Priority queue items
export const priorityItems: PriorityItem[] = [
  {
    id: "1",
    urgency: "red",
    agent: "RETENTION",
    text: "Aisha M. has been silent 9 days — send a personal message today",
    action: "Draft message",
    route: "/retention",
  },
  {
    id: "2",
    urgency: "red",
    agent: "SALES",
    text: "Marcus W. call is tomorrow — your AI brief is ready",
    action: "View brief",
    route: "/sales-agent",
  },
  {
    id: "3",
    urgency: "amber",
    agent: "RETENTION",
    text: "Jordan K. renewal in 12 days — schedule a win review call",
    action: "Plan call",
    route: "/retention",
  },
  {
    id: "4",
    urgency: "amber",
    agent: "CHECK-IN",
    text: "Leon F. missed 3 workouts this week — needs a reply",
    action: "Reply",
    route: "/coaching",
  },
  {
    id: "5",
    urgency: "green",
    agent: "CONTENT",
    text: "3 clients mentioned weekend consistency — strong content angle",
    action: "View idea",
    route: "/content",
  },
  {
    id: "6",
    urgency: "green",
    agent: "CHECK-IN",
    text: "Dana W. hit a bench press PR — worth celebrating in your reply",
    action: "Reply",
    route: "/coaching",
  },
];

// Leads
export const leads: Lead[] = [
  {
    id: "1",
    name: "Marcus Williams",
    initials: "MW",
    submittedAt: "2025-03-28",
    goal: "Lose 25 lbs and build sustainable habits before summer",
    status: "hot",
    briefReady: true,
    formAnswers: [
      { question: "What is your primary fitness goal?", answer: "I want to lose about 25 pounds before summer and build habits that actually stick. I've tried dieting on my own before but always fall off after 3-4 weeks." },
      { question: "Have you worked with a coach before?", answer: "No, this would be my first time. I've done online programs but never had personal guidance." },
      { question: "What's your biggest obstacle?", answer: "My schedule is unpredictable — I work in sales and travel at least twice a month. I need something flexible." },
      { question: "What's your budget range?", answer: "I'm open to investing seriously if the results are real. Probably $500-800/month range." },
      { question: "What's your timeline?", answer: "My friend's wedding is in 14 weeks. That's my target." },
    ],
    brief: {
      openingScript: "Hey Marcus, thanks for jumping on a call today. I took a look at your form and I have to say — your goal is 100% achievable in 14 weeks, especially with your level of self-awareness about what's held you back before. Before I walk you through how we'd approach this together, I want to ask you one thing: what would it mean to you personally to show up to that wedding feeling like the best version of yourself? [pause for answer] That's exactly what we're going to build toward.",
      objections: [
        {
          objection: "I travel a lot and can't keep a consistent schedule",
          response: "That's actually something I'm set up to handle really well. Your program will be designed around your travel weeks — not despite them. We'll have a 'travel mode' protocol that takes 20 minutes, works in any hotel gym, and keeps you on track without white-knuckling it. Consistency doesn't mean the same routine every day — it means never fully stopping.",
        },
        {
          objection: "I've failed at programs before and I'm not sure this is different",
          response: "I appreciate you being honest about that — most people aren't. Here's the difference: every program you've tried before was built for a generic person. This is built specifically for Marcus, using your schedule, your food preferences, your history. And more importantly, we have weekly check-ins where I catch things before they become failures. You don't have to figure out why you're struggling — I'm here to figure that out with you.",
        },
        {
          objection: "The price feels like a lot right now",
          response: "I completely hear you on that. Let me ask: what have you spent on gym memberships, meal plans, and programs in the last two years that didn't work? [pause] Most people tell me it's more than they realize. What I offer is a one-time investment that actually sticks — and that 14-week goal? We build the habits so you never have to pay for this problem again.",
        },
      ],
      followUpEmail: "Hi Marcus,\n\nReally enjoyed our conversation today. Just wanted to send a quick note while everything is fresh.\n\nYou mentioned that showing up to Tyler's wedding feeling confident is the real goal here — and I genuinely believe we can get you there. The 14-week timeline is tight but very doable, especially given how clear you are about what hasn't worked before.\n\nHere's what I'd suggest as a next step: let's schedule a 15-minute kickoff call this week where I walk you through the first 3 weeks of your program. No commitment required — just so you can see exactly what the day-to-day looks like before deciding.\n\nDoes Thursday or Friday afternoon work for you?\n\nLooking forward to it,\nCoach",
    },
  },
  {
    id: "2",
    name: "Priya Sharma",
    initials: "PS",
    submittedAt: "2025-03-29",
    goal: "Post-pregnancy strength rebuild and energy recovery",
    status: "warm",
    briefReady: true,
    formAnswers: [
      { question: "What is your primary fitness goal?", answer: "I had my baby 6 months ago and I just feel so far from myself. I want to rebuild my strength and have more energy to keep up with my daughter." },
      { question: "Have you worked with a coach before?", answer: "Yes, I had a personal trainer at the gym before I got pregnant. Really loved having someone keep me accountable." },
      { question: "What's your biggest obstacle?", answer: "Time. I have about 30-40 minutes a few times a week and my schedule is totally dependent on nap schedules." },
      { question: "What's your budget range?", answer: "Around $300-400/month feels manageable." },
    ],
    brief: {
      openingScript: "Hi Priya, thanks so much for filling out the form — I read it carefully before this call. First, I just want to say: 6 months postpartum and already taking steps to invest in yourself? That takes real self-awareness. I want to start by understanding what 'feeling like yourself again' actually looks like for you. Not just physically — energetically. Can you describe a morning where you felt really good recently?",
      objections: [
        {
          objection: "I only have 30-40 minutes and the schedule is unpredictable",
          response: "Honestly, 30-40 minutes 3 times a week is all you need — especially in this phase. We'll design every session to run exactly that long, with a 5-minute 'if nap ends early' cutoff point built in. You'll never be mid-set wondering if you can finish.",
        },
      ],
      followUpEmail: "Hi Priya,\n\nThank you so much for taking the time to chat today. It was really inspiring to hear where you are and where you want to go.\n\nJust a reminder of what we discussed: a 3x/week strength program designed specifically for the postpartum phase, with sessions that fit into nap windows and adjust when life happens. We'll track energy and mood alongside the physical metrics because those matter just as much right now.\n\nI'd love to get you started with a complimentary 1-week trial program to show you what the structure looks like in practice. Want me to send that over?\n\nWarm regards,\nCoach",
    },
  },
  {
    id: "3",
    name: "Derek Thompson",
    initials: "DT",
    submittedAt: "2025-03-27",
    goal: "Train for first marathon while managing knee issues",
    status: "warm",
    briefReady: false,
    formAnswers: [
      { question: "What is your primary fitness goal?", answer: "I signed up for my first marathon in October. I've been running casually for 2 years but never structured training. Also dealing with some knee pain that flares up at higher mileage." },
      { question: "What's your biggest obstacle?", answer: "The knee thing worries me. I don't want to get injured and have to drop out." },
    ],
    brief: undefined,
  },
  {
    id: "4",
    name: "Sophie Chen",
    initials: "SC",
    submittedAt: "2025-03-25",
    goal: "Body recomposition — lose fat, gain visible muscle",
    status: "new",
    briefReady: false,
    formAnswers: [
      { question: "What is your primary fitness goal?", answer: "I want to lose fat but also build muscle — I know everyone says that's hard to do at the same time but I'm willing to be patient." },
      { question: "What's your budget range?", answer: "I'm not sure yet, still exploring options." },
    ],
    brief: undefined,
  },
];

// Clients
export const clients: Client[] = [
  {
    id: "1",
    name: "Aisha Mohammed",
    initials: "AM",
    programWeek: 8,
    lastCheckIn: "9 days ago",
    status: "at_risk",
    goal: "Lose 15 lbs, improve energy and sleep",
    startDate: "2025-01-20",
    checkIns: [
      {
        id: "1",
        date: "March 19",
        summary: "Submitted check-in. Reported feeling overwhelmed at work. Missed 2 sessions.",
        aiAnalysis: "Aisha's tone in this check-in shows significantly lower energy than previous weeks. Language patterns suggest stress-related disengagement rather than physical barriers. This is her second consecutive week of declining check-in quality.",
        planAdjustments: "Consider reducing session frequency to 3x/week temporarily. Recommend stress-reduction protocol and adjust expectations for the next 2 weeks.",
        mood: "needs_attention",
      },
      {
        id: "2",
        date: "March 10",
        summary: "Completed all 4 sessions. Hit new squat PR. Feeling strong.",
        aiAnalysis: "Excellent week. Strength metrics trending up. Positive language and specific goal references indicate high engagement.",
        planAdjustments: "Maintain current program. Consider progressive overload on lower body compounds.",
        mood: "good",
      },
    ],
    metrics: [
      { label: "Weight", value: "162 lbs", change: "-8 lbs" },
      { label: "Sessions/week", value: "2", change: "-2" },
      { label: "Habit streak", value: "3 days", change: "-11" },
      { label: "Sentiment score", value: "3.1/10" },
    ],
  },
  {
    id: "2",
    name: "Jordan Kim",
    initials: "JK",
    programWeek: 14,
    lastCheckIn: "2 days ago",
    status: "review",
    goal: "Increase strength and athletic performance",
    startDate: "2024-12-15",
    checkIns: [
      {
        id: "1",
        date: "March 28",
        summary: "Good week overall. Hit 80% of sessions. Bench press improving.",
        aiAnalysis: "Jordan is performing consistently but showing signs of plateau in lower body strength. Renewal coming up in 12 days — this is a great time for a win review call to reinforce progress.",
        planAdjustments: "Introduce periodization block to break through strength plateau.",
        mood: "average",
      },
    ],
    metrics: [
      { label: "Bench press", value: "195 lbs", change: "+25 lbs" },
      { label: "Sessions/week", value: "4", change: "0" },
      { label: "Habit streak", value: "18 days" },
      { label: "Sentiment score", value: "6.8/10" },
    ],
  },
  {
    id: "3",
    name: "Leon Foster",
    initials: "LF",
    programWeek: 6,
    lastCheckIn: "1 day ago",
    status: "review",
    goal: "Build consistent workout habit and lose 10 lbs",
    startDate: "2025-02-10",
    checkIns: [
      {
        id: "1",
        date: "March 29",
        summary: "Missed 3 workouts this week. Life got busy. Still doing nutrition.",
        aiAnalysis: "Leon missed 3 workouts but maintained nutrition compliance — a positive signal. He's in week 6, which is historically the most dropout-prone period. A direct, non-judgmental reply today could prevent disengagement.",
        planAdjustments: "Simplify workout plan to 2 sessions this week. Reframe as a 'mini-week' to reduce shame. Send encouraging message today.",
        mood: "needs_attention",
      },
    ],
    metrics: [
      { label: "Weight", value: "214 lbs", change: "-4 lbs" },
      { label: "Sessions/week", value: "1", change: "-3" },
      { label: "Nutrition streak", value: "9 days" },
      { label: "Sentiment score", value: "5.2/10" },
    ],
  },
  {
    id: "4",
    name: "Dana Wilson",
    initials: "DW",
    programWeek: 11,
    lastCheckIn: "Today",
    status: "on_track",
    goal: "Compete in first powerlifting meet",
    startDate: "2025-01-05",
    checkIns: [
      {
        id: "1",
        date: "March 30",
        summary: "Hit a 135 lb bench press PR! Feeling incredible. All sessions completed.",
        aiAnalysis: "Dana is thriving. New bench press PR is a significant milestone for her competition prep. Her language shows high confidence and motivation. This is the perfect moment for positive reinforcement in your reply.",
        planAdjustments: "Begin competition prep phase. Introduce peak week protocol in 4 weeks. Celebrate the PR explicitly in reply.",
        mood: "good",
      },
    ],
    metrics: [
      { label: "Bench press", value: "135 lbs", change: "+20 lbs" },
      { label: "Squat", value: "185 lbs", change: "+35 lbs" },
      { label: "Sessions/week", value: "4", change: "0" },
      { label: "Sentiment score", value: "9.2/10" },
    ],
  },
  {
    id: "5",
    name: "Ryan Park",
    initials: "RP",
    programWeek: 3,
    lastCheckIn: "3 days ago",
    status: "on_track",
    goal: "General fitness and weight loss",
    startDate: "2025-03-08",
    checkIns: [
      {
        id: "1",
        date: "March 27",
        summary: "Good first few weeks. Getting the hang of the routine.",
        aiAnalysis: "Ryan is adapting well to the early phase of his program. Compliance is high. Enthusiasm is genuine but still exploring his identity as someone who works out.",
        planAdjustments: "Maintain current structure. Begin introducing progressive overload signals next week.",
        mood: "good",
      },
    ],
    metrics: [
      { label: "Weight", value: "198 lbs", change: "-2 lbs" },
      { label: "Sessions/week", value: "3", change: "0" },
      { label: "Habit streak", value: "12 days" },
      { label: "Sentiment score", value: "7.4/10" },
    ],
  },
];

// Retention clients
export const retentionClients: RetentionClient[] = [
  {
    id: "1",
    name: "Aisha Mohammed",
    initials: "AM",
    status: "at_risk",
    signals: ["9 days silent", "missed 3 sessions", "declining sentiment"],
    recommendation: "Aisha's check-in language over the past 3 weeks shows a clear downward trend in energy and engagement. She's historically responded well to personal, non-workout-focused outreach. Recommend a brief voice note or personal message acknowledging the difficulty of her current period without asking about her program.",
    sentimentScore: 3.1,
    lastSeen: "9 days ago",
  },
  {
    id: "2",
    name: "Jordan Kim",
    initials: "JK",
    status: "review",
    signals: ["renewal in 12 days", "strength plateau"],
    recommendation: "Jordan's renewal is in 12 days and he's at a natural plateau point in his training. This is the ideal time to schedule a 'win review call' — walk through his progress since day one, then position next phase as the unlock for his next level of performance.",
    sentimentScore: 6.8,
    lastSeen: "2 days ago",
  },
  {
    id: "3",
    name: "Leon Foster",
    initials: "LF",
    status: "review",
    signals: ["missed 3 workouts", "week 6 risk window"],
    recommendation: "Leon missed 3 workouts this week but maintained nutrition — a key distinction. He's in the statistically highest-dropout window (weeks 5-7). A non-judgmental, simple reply today that focuses on his nutrition win and simplifies next week's expectations could be the difference between retention and churn.",
    sentimentScore: 5.2,
    lastSeen: "1 day ago",
  },
  {
    id: "4",
    name: "Dana Wilson",
    initials: "DW",
    status: "on_track",
    signals: ["PR hit today", "competition prep phase"],
    recommendation: "Dana is your most engaged client right now. Her bench press PR today is a significant milestone. Positive reinforcement at this moment will deepen her commitment heading into competition prep. Consider a quick personal congratulations message today.",
    sentimentScore: 9.2,
    lastSeen: "Today",
  },
  {
    id: "5",
    name: "Ryan Park",
    initials: "RP",
    status: "on_track",
    signals: ["high compliance", "adapting well"],
    recommendation: "Ryan is in the honeymoon phase of his program. Continue strong — consider checking in personally around week 5 before the typical engagement dip.",
    sentimentScore: 7.4,
    lastSeen: "3 days ago",
  },
];

// Content ideas
export const contentIdeas: ContentIdea[] = [
  {
    id: "1",
    topic: "Weekend consistency",
    clientCount: 3,
    angle: "Why your weekends are making or breaking your results — and the 2-rule system that fixes it",
    status: "ready",
    hooks: [
      "Your weekend is either your secret weapon or your biggest sabotage. Here's how to tell which one it is for you.",
      "I've coached 50+ clients and the one thing that separates people who transform vs people who plateau? Their Saturday.",
      "Stop trying to be perfect Monday-Friday. The real results live in what you do on the other two days.",
    ],
    fullPost: "Your weekend isn't a break from your goals — it's where your goals are won or lost.\n\nI say this with love because I've watched it happen over and over: someone absolutely nails their Monday through Friday. Perfect nutrition, every session checked, crushing it. Then the weekend hits and everything resets.\n\nTwo or three days of 'I'll start fresh Monday' behavior undoes a week of progress.\n\nBut here's what I've noticed with my clients who actually transform: they don't try to be perfect on weekends. They just follow two non-negotiables:\n\n1. They move their body at least once, even if it's just a walk.\n2. They don't use the weekend as permission to eat past the point of feeling good.\n\nThat's it. Two rules. No complicated protocols.\n\nThe clients who tell me 'I'm consistent but not seeing results' almost always have weekend consistency issues they aren't aware of.\n\nWhat's your weekend rule? Drop it below 👇",
  },
  {
    id: "2",
    topic: "Scale anxiety",
    clientCount: 4,
    angle: "The number on the scale is lying to you — here's what to track instead",
    status: "draft",
  },
  {
    id: "3",
    topic: "Work stress and fitness",
    clientCount: 5,
    angle: "When work stress spikes, your fitness routine is the first to go — unless you use this approach",
    status: "draft",
  },
  {
    id: "4",
    topic: "First PR celebration",
    clientCount: 2,
    angle: "The moment everything changes — why celebrating small wins is actually the strategy, not the reward",
    status: "posted",
  },
];

// Metrics
export const metrics = {
  activeClients: 5,
  newLeadsWithBriefs: 2,
  checkInsDueToday: 3,
  atRiskClients: 1,
};

// AI Ops Brief
export const opsInsights = [
  {
    label: "SALES" as AgentType,
    insight: "Marcus W. has a call tomorrow and his brief is loaded with strong angles around his travel schedule and the wedding timeline. His price sensitivity is real but addressable — he's already framed it as an investment question in his form. Prioritize the ROI framing early in the call.",
    route: "/sales-agent",
  },
  {
    label: "RETENTION" as AgentType,
    insight: "Aisha M. represents your highest churn risk this week. 9 days of silence after 3 consecutive weeks of declining check-in quality is a pattern I've seen precede dropout. A personal, non-program-related message today has the highest probability of re-engagement.",
    route: "/retention",
  },
  {
    label: "CONTENT" as AgentType,
    insight: "Weekend consistency has come up in 3 separate check-ins this week from very different client profiles — Leon, Dana, and Ryan. This cross-segment pattern suggests a universal pain point your audience is experiencing right now. The content idea is staged and ready to post.",
    route: "/content",
  },
];
