"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  AIAttentionMessageInput,
  AIAttentionMessageSuggestion,
} from "@/lib/ai-attention-message";
import { supabase } from "@/lib/supabase";
import {
  buildCoachPerformanceSummary,
  type CoachPerformanceSummary,
} from "@/lib/client-performance-summary";
import {
  buildCoachContentIdeas,
  type CoachContentIdea,
} from "@/lib/coach-content-ideas";
import {
  buildCoachAttentionItem,
  getAttentionSummaryLabel,
  sortCoachAttentionItems,
  type CoachAttentionItem,
} from "@/lib/coach-attention";
import {
  createDefaultCheckInSettings,
  normalizeCheckInSettings,
  normalizeCheckInSubmissions,
  type CheckInSubmission,
} from "@/lib/check-ins";
import { normalizeWorkoutPlan, normalizeHabitPlan } from "@/lib/client-dashboard";
import { getDateDaysAgo, normalizeHabitCompletionLogs } from "@/lib/habit-completions";
import {
  getLeadInitials,
  getLeadStageLabel,
  getLeadStageStyle,
  normalizeLeadRecords,
  type LeadRecord,
} from "@/lib/leads";
import {
  priorityItems,
  clients,
  metrics,
  opsInsights,
  type UrgencyLevel,
  type AgentType,
} from "@/lib/mock-data";
import { normalizeClientMessages, type ClientMessage } from "@/lib/messages";
import { normalizeWorkoutExerciseLogs } from "@/lib/workout-logs";

type DashboardClient = {
  id: string;
  full_name: string;
  email?: string;
  status: string;
  created_at: string;
} & Record<string, unknown>;

type DashboardLead = {
  id: string;
  full_name: string;
  email: string;
  heat_score: string | null;
  stage: string | null;
  created_at: string;
  goal: string | null;
  budget_range: string | null;
  timeline: string | null;
  ai_brief: unknown;
};

type AttentionDraftLatestCheckIn = {
  submittedAt: string | null;
  energy: number | null;
  stress: number | null;
  sleep: number | null;
  workoutAdherence: number | null;
  habitAdherence: number | null;
  winsChallenges: string | null;
  textUpdate: string | null;
};

type AttentionDraftContext = {
  clientId: string;
  clientName: string;
  reasons: string[];
  suggestedNextAction: CoachAttentionItem["suggestedNextAction"];
  latestCheckIn: AttentionDraftLatestCheckIn | null;
  recentContext: string[];
};

type AttentionDraftModalState = {
  clientId: string;
  clientName: string;
  draftMessage: string;
  generatedAt: string | null;
  loading: boolean;
  error: string | null;
};

type AttentionDraftApiResponse = {
  suggestion: AIAttentionMessageSuggestion;
  generatedAt: string;
  model: string;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getUrgencyColor(urgency: UrgencyLevel) {
  if (urgency === "red") return "#A32D2D";
  if (urgency === "amber") return "#BA7517";
  return "#639922";
}

function getAgentColor(agent: AgentType) {
  const map: Record<AgentType, string> = {
    SALES: "#7F77DD",
    RETENTION: "#A32D2D",
    "CHECK-IN": "#0d9488",
    CONTENT: "#ec4899",
  };
  return map[agent];
}

function getAgentBg(agent: AgentType) {
  const map: Record<AgentType, string> = {
    SALES: "#ede9fe",
    RETENTION: "#fee2e2",
    "CHECK-IN": "#ccfbf1",
    CONTENT: "#fce7f3",
  };
  return map[agent];
}

function getStatusStyle(status: string) {
  if (status === "hot") return { bg: "#fee2e2", color: "#A32D2D" };
  if (status === "warm") return { bg: "#fef3c7", color: "#BA7517" };
  if (status === "new") return { bg: "#e0e7ff", color: "#4338ca" };
  if (status === "cold") return { bg: "#f3f4f6", color: "#6b7280" };
  if (status === "at_risk") return { bg: "#fee2e2", color: "#A32D2D" };
  if (status === "review") return { bg: "#fef3c7", color: "#BA7517" };
  if (status === "on_track") return { bg: "#dcfce7", color: "#639922" };
  return { bg: "#f3f4f6", color: "#6b7280" };
}

function getPriorityStyle(priority: "high" | "medium" | "low") {
  if (priority === "high") return { bg: "#fee2e2", color: "#A32D2D", border: "#fecaca", label: "High" };
  if (priority === "medium") return { bg: "#fef3c7", color: "#BA7517", border: "#fde68a", label: "Medium" };
  return { bg: "#e0f2fe", color: "#0f4c81", border: "#bae6fd", label: "Low" };
}

function getAttentionActionLabel(action: CoachAttentionItem["suggestedNextAction"]) {
  if (action === "Review check-in") return "Review check-in";
  if (action === "Send message") return "Send message";
  if (action === "Adjust workout plan") return "Adjust plan";
  return "Open client";
}

function getAttentionActionHref(item: CoachAttentionItem) {
  if (item.suggestedNextAction === "Review check-in") {
    return `/clients/${item.clientId}#check-in-summary`;
  }

  if (item.suggestedNextAction === "Send message") {
    return `/clients/${item.clientId}#messages`;
  }

  if (item.suggestedNextAction === "Adjust workout plan") {
    return `/clients/${item.clientId}#weekly-adjustment`;
  }

  return `/clients/${item.clientId}`;
}

function parseCheckInRating(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCheckInTextValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildAttentionDraftLatestCheckIn(submission: CheckInSubmission | null): AttentionDraftLatestCheckIn | null {
  if (!submission) return null;

  return {
    submittedAt: submission.submitted_at ?? null,
    energy: parseCheckInRating(submission.content.energy),
    stress: parseCheckInRating(submission.content.stress),
    sleep: parseCheckInRating(submission.content.sleep),
    workoutAdherence: parseCheckInRating(submission.content.workout_adherence),
    habitAdherence: parseCheckInRating(submission.content.habit_adherence),
    winsChallenges: getCheckInTextValue(submission.content.wins_challenges),
    textUpdate: getCheckInTextValue(submission.content.text_update),
  };
}

function getUnreadClientMessagesCount(messages: ClientMessage[]) {
  return messages.filter((message) => message.sender === "client" && !message.read).length;
}

function formatAttentionDraftDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function buildAttentionDraftRecentContext(input: {
  item: CoachAttentionItem;
  latestCheckIn: AttentionDraftLatestCheckIn | null;
  unreadClientMessages: number;
}) {
  const context: string[] = [];

  if (input.latestCheckIn?.submittedAt) {
    context.push(`Latest check-in was submitted on ${formatAttentionDraftDate(input.latestCheckIn.submittedAt)}.`);
  }

  if (input.unreadClientMessages === 1) {
    context.push("There is 1 unread client message waiting for review.");
  } else if (input.unreadClientMessages >= 2) {
    context.push(`There are ${input.unreadClientMessages} unread client messages waiting for review.`);
  }

  input.item.reasons.forEach((reason) => {
    const normalizedReason = reason.toLowerCase();
    if (
      normalizedReason.includes("activity") ||
      normalizedReason.includes("unread message") ||
      normalizedReason.includes("check-in overdue") ||
      normalizedReason.includes("quiet")
    ) {
      context.push(reason);
    }
  });

  return [...new Set(context)];
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const s = getStatusStyle(status);
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: "10px",
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: "999px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

const avatarColors: Record<string, string> = {
  AM: "#A32D2D",
  JK: "#BA7517",
  LF: "#BA7517",
  DW: "#639922",
  RP: "#7F77DD",
  MW: "#A32D2D",
  PS: "#0d9488",
  DT: "#4338ca",
  SC: "#ec4899",
};

function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  const color = avatarColors[initials] || "#7F77DD";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function HomePage() {
  const [attentionItems, setAttentionItems] = useState<CoachAttentionItem[]>([]);
  const [attentionLoading, setAttentionLoading] = useState(true);
  const [attentionError, setAttentionError] = useState<string | null>(null);
  const [attentionDraftContexts, setAttentionDraftContexts] = useState<Record<string, AttentionDraftContext>>({});
  const [attentionDraftModal, setAttentionDraftModal] = useState<AttentionDraftModalState | null>(null);
  const [dashboardLeads, setDashboardLeads] = useState<LeadRecord[]>([]);
  const [contentIdeas, setContentIdeas] = useState<CoachContentIdea[]>([]);
  const [contentIdeasLoading, setContentIdeasLoading] = useState(true);
  const [contentIdeasError, setContentIdeasError] = useState<string | null>(null);
  const [contentIdeasSourceSummary, setContentIdeasSourceSummary] = useState("Reviewing leads, client conversations, and check-ins...");
  const [contentIdeasUsedFallback, setContentIdeasUsedFallback] = useState(false);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const visibleAttentionItems = attentionItems.slice(0, 5);
  const attentionSummary = getAttentionSummaryLabel(attentionItems);
  const visibleContentIdeas = contentIdeas.slice(0, 3);

  const newLeads = dashboardLeads.slice(0, 3);
  const newLeadCount = dashboardLeads.filter((lead) => lead.stage === "new").length;
  const alertClients = clients.filter((c) => c.status !== "on_track").slice(0, 3);
  const todayCheckIns = clients.filter((c) => c.checkIns[0]?.date === "March 30").slice(0, 3);

  useEffect(() => {
    async function fetchAttentionQueue() {
      setAttentionLoading(true);
      setAttentionError(null);
      setContentIdeasLoading(true);
      setContentIdeasError(null);

      const workoutLookback = getDateDaysAgo(45);
      const habitLookback = getDateDaysAgo(45);
      const messageLookback = new Date(Date.now() - 45 * 86400000).toISOString();

      const [
        { data: clientRows, error: clientError },
        { data: planRows, error: planError },
        { data: checkInSettingRows, error: checkInSettingError },
        { data: checkInSubmissionRows, error: checkInSubmissionError },
        { data: workoutLogRows, error: workoutLogError },
        { data: habitLogRows, error: habitLogError },
        { data: messageRows, error: messageError },
        { data: leadRows, error: leadError },
      ] = await Promise.all([
        supabase
          .from("clients")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("client_plans")
          .select("client_id, type, content, updated_at"),
        supabase
          .from("client_check_in_settings")
          .select("id, client_id, frequency, due_day, custom_interval_weeks, schedule_anchor_date, public_access_token, field_config, created_at, updated_at"),
        supabase
          .from("client_check_in_submissions")
          .select("*")
          .order("submitted_at", { ascending: false }),
        supabase
          .from("client_workout_exercise_logs")
          .select("id, client_id, workout_date, workout_day, exercise_key, exercise_order, exercise_name, target_sets, target_reps, prescribed_notes, selected_substitution, completed, completed_at, client_notes, difficulty_rpe, logged_weight, logged_reps, created_at, updated_at")
          .gte("workout_date", workoutLookback)
          .order("workout_date", { ascending: false }),
        supabase
          .from("client_habit_completion_logs")
          .select("id, client_id, date, habit_key, habit_name, completed, completed_at, created_at, updated_at")
          .gte("date", habitLookback)
          .order("date", { ascending: false }),
        supabase
          .from("messages")
          .select("id, created_at, coach_id, client_id, sender, message_type, content, media_url, media_duration_seconds, read, read_at, was_ai_drafted")
          .gte("created_at", messageLookback)
          .order("created_at", { ascending: false }),
        supabase
          .from("leads")
          .select("id, full_name, email, coach_id, heat_score, goal, budget_range, timeline, ai_brief, stage, coach_notes, follow_up_date, last_contacted_at, stage_updated_at, converted_client_id, converted_at, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const firstError =
        clientError ||
        planError ||
        checkInSettingError ||
        checkInSubmissionError ||
        workoutLogError ||
        habitLogError ||
        messageError;

      if (firstError) {
        console.error("Error loading coach attention data:", firstError);
        setAttentionError("Unable to load the attention queue right now.");
        setAttentionItems([]);
        setAttentionDraftContexts({});
        setAttentionLoading(false);
        setContentIdeas([]);
        setContentIdeasError("Unable to load content ideas right now.");
        setContentIdeasLoading(false);
        return;
      }

      const clientsData = (clientRows ?? []) as DashboardClient[];
      const planData = planRows ?? [];
      const checkInSettingsByClient = new Map<string, ReturnType<typeof normalizeCheckInSettings>>();
      const workoutPlanByClient = new Map<string, unknown>();
      const habitPlanByClient = new Map<string, unknown>();

      planData.forEach((row) => {
        if (row.type === "workout") {
          workoutPlanByClient.set(row.client_id, row.content);
        }

        if (row.type === "habits") {
          habitPlanByClient.set(row.client_id, row.content);
        }
      });

      (checkInSettingRows ?? []).forEach((row) => {
        if (typeof row.client_id === "string") {
          checkInSettingsByClient.set(row.client_id, normalizeCheckInSettings(row));
        }
      });

      const submissions = normalizeCheckInSubmissions(checkInSubmissionRows ?? []);
      const workoutLogs = normalizeWorkoutExerciseLogs(workoutLogRows ?? []);
      const habitLogs = normalizeHabitCompletionLogs(habitLogRows ?? []);
      const messages = normalizeClientMessages(messageRows ?? []);

      const submissionsByClient = new Map<string, typeof submissions>();
      const workoutLogsByClient = new Map<string, typeof workoutLogs>();
      const habitLogsByClient = new Map<string, typeof habitLogs>();
      const messagesByClient = new Map<string, typeof messages>();
      const performanceSummaries: CoachPerformanceSummary[] = [];
      const nextAttentionDraftContexts: Record<string, AttentionDraftContext> = {};

      submissions.forEach((entry) => {
        const current = submissionsByClient.get(entry.client_id) ?? [];
        current.push(entry);
        submissionsByClient.set(entry.client_id, current);
      });

      workoutLogs.forEach((entry) => {
        const current = workoutLogsByClient.get(entry.client_id) ?? [];
        current.push(entry);
        workoutLogsByClient.set(entry.client_id, current);
      });

      habitLogs.forEach((entry) => {
        const current = habitLogsByClient.get(entry.client_id) ?? [];
        current.push(entry);
        habitLogsByClient.set(entry.client_id, current);
      });

      messages.forEach((entry) => {
        const current = messagesByClient.get(entry.client_id) ?? [];
        current.push(entry);
        messagesByClient.set(entry.client_id, current);
      });

      const nextAttentionItems = clientsData
        .map((client) => {
          const clientSubmissions = submissionsByClient.get(client.id) ?? [];
          const clientWorkoutLogs = workoutLogsByClient.get(client.id) ?? [];
          const clientHabitLogs = habitLogsByClient.get(client.id) ?? [];
          const clientMessages = messagesByClient.get(client.id) ?? [];
          const weeklyPlan = normalizeWorkoutPlan(workoutPlanByClient.get(client.id));
          const habits = normalizeHabitPlan(habitPlanByClient.get(client.id));
          const performanceSummary = buildCoachPerformanceSummary({
            weeklyPlan,
            habits,
            workoutLogs: clientWorkoutLogs,
            habitLogs: clientHabitLogs,
            checkInSubmissions: clientSubmissions,
          });
          performanceSummaries.push(performanceSummary);
          const attentionItem = buildCoachAttentionItem({
            client,
            checkInSettings: checkInSettingsByClient.get(client.id) ?? createDefaultCheckInSettings(`default-${client.id}`),
            checkInSubmissions: clientSubmissions,
            performanceSummary,
            workoutLogs: clientWorkoutLogs,
            habitLogs: clientHabitLogs,
            messages: clientMessages,
          });

          if (attentionItem) {
            const latestCheckIn = buildAttentionDraftLatestCheckIn(clientSubmissions[0] ?? null);
            const unreadClientMessages = getUnreadClientMessagesCount(clientMessages);

            nextAttentionDraftContexts[attentionItem.clientId] = {
              clientId: attentionItem.clientId,
              clientName: attentionItem.clientName,
              reasons: attentionItem.reasons,
              suggestedNextAction: attentionItem.suggestedNextAction,
              latestCheckIn,
              recentContext: buildAttentionDraftRecentContext({
                item: attentionItem,
                latestCheckIn,
                unreadClientMessages,
              }),
            };
          }

          return attentionItem;
        })
        .filter((item): item is CoachAttentionItem => item !== null);

      setAttentionItems(sortCoachAttentionItems(nextAttentionItems));
      setAttentionDraftContexts(nextAttentionDraftContexts);
      setAttentionLoading(false);

      if (leadError) {
        console.error("Error loading lead data for content ideas:", leadError);
        setDashboardLeads([]);
      } else {
        setDashboardLeads(normalizeLeadRecords((leadRows ?? []) as DashboardLead[]));
      }

      const contentIdeasResult = buildCoachContentIdeas({
        leads: (leadRows ?? []) as DashboardLead[],
        checkInSubmissions: submissions,
        clientMessages: messages,
        performanceSummaries,
      });

      setContentIdeas(contentIdeasResult.ideas);
      setContentIdeasSourceSummary(contentIdeasResult.sourceSummary);
      setContentIdeasUsedFallback(contentIdeasResult.usedFallback);
      setContentIdeasError(
        leadError && contentIdeasResult.ideas.length === 0
          ? "Lead signals are unavailable right now, so content ideas are limited."
          : null,
      );
      setContentIdeasLoading(false);
    }

    fetchAttentionQueue();
  }, []);

  async function handleDraftAttentionMessage(item: CoachAttentionItem) {
    const context = attentionDraftContexts[item.clientId];

    if (!context) return;

    setAttentionDraftModal({
      clientId: item.clientId,
      clientName: item.clientName,
      draftMessage: "",
      generatedAt: null,
      loading: true,
      error: null,
    });

    const input: AIAttentionMessageInput = {
      client: {
        id: context.clientId,
        fullName: context.clientName,
      },
      attention: {
        reasons: context.reasons,
        suggestedNextAction: context.suggestedNextAction,
      },
      latestCheckIn: context.latestCheckIn,
      recentContext: context.recentContext,
    };

    try {
      const response = await fetch("/api/ai/attention-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      const payload = (await response.json().catch(() => null)) as AttentionDraftApiResponse | { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload && "error" in payload ? payload.error ?? "Unable to draft an AI message right now." : "Unable to draft an AI message right now.");
      }

      setAttentionDraftModal({
        clientId: item.clientId,
        clientName: item.clientName,
        draftMessage: payload?.suggestion.draftMessage ?? "",
        generatedAt: payload?.generatedAt ?? null,
        loading: false,
        error: null,
      });
    } catch (draftError) {
      setAttentionDraftModal({
        clientId: item.clientId,
        clientName: item.clientName,
        draftMessage: "",
        generatedAt: null,
        loading: false,
        error: draftError instanceof Error ? draftError.message : "Unable to draft an AI message right now.",
      });
    }
  }

  return (
    <>
      <div style={{ padding: "24px", maxWidth: "1100px" }}>
      {/* Top bar */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 500, color: "#111827", margin: 0 }}>
          {getGreeting()}, Coach Jordan
        </h1>
        <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: "13px" }}>
          {today} · {attentionLoading ? "Reviewing client signals..." : attentionSummary}
        </p>
      </div>

      <div
        style={{
          background: "#fff",
          border: "0.5px solid #e5e7eb",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              color: "#6b7280",
            }}
          >
            Needs Attention
          </span>
          <Link href="/clients" style={{ fontSize: "12px", color: "#7F77DD", textDecoration: "none" }}>
            View clients
          </Link>
        </div>

        {attentionLoading && (
          <div style={{ fontSize: "13px", color: "#9ca3af" }}>
            Reviewing recent check-ins, adherence, and client activity...
          </div>
        )}

        {attentionError && !attentionLoading && (
          <div
            style={{
              background: "#fee2e2",
              color: "#A32D2D",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "10px 12px",
              fontSize: "12px",
            }}
          >
            {attentionError}
          </div>
        )}

        {!attentionLoading && !attentionError && visibleAttentionItems.length === 0 && (
          <div
            style={{
              background: "#f9fafb",
              border: "0.5px solid #e5e7eb",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", marginBottom: "4px" }}>
              No clients need attention right now.
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.6 }}>
              Recent check-ins, adherence, and activity look stable across your current client list.
            </div>
          </div>
        )}

        {!attentionLoading && !attentionError && visibleAttentionItems.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {visibleAttentionItems.map((item) => {
              const priorityStyle = getPriorityStyle(item.priority);
              const actionLabel = getAttentionActionLabel(item.suggestedNextAction);
              const actionHref = getAttentionActionHref(item);

              return (
                <div
                  key={item.clientId}
                  style={{
                    background: "#fafafa",
                    border: "0.5px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                        <Link
                          href={actionHref}
                          style={{ fontSize: "13px", fontWeight: 600, color: "#111827", textDecoration: "none" }}
                        >
                          {item.clientName}
                        </Link>
                        <span
                          style={{
                            background: priorityStyle.bg,
                            color: priorityStyle.color,
                            border: `1px solid ${priorityStyle.border}`,
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {priorityStyle.label}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "6px" }}>
                        {item.reasons.map((reason, index) => (
                          <div key={`${item.clientId}-reason-${index}`} style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
                            {reason}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        Next step: <span style={{ color: "#111827", fontWeight: 500 }}>{item.suggestedNextAction}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "stretch" }}>
                      <Link
                        href={actionHref}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#7F77DD",
                          border: "0.5px solid #e5e7eb",
                          background: "#fff",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          whiteSpace: "nowrap",
                          textDecoration: "none",
                        }}
                      >
                        {actionLabel}
                      </Link>
                      <button
                        onClick={() => void handleDraftAttentionMessage(item)}
                        disabled={attentionDraftModal?.loading && attentionDraftModal.clientId === item.clientId}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: attentionDraftModal?.loading && attentionDraftModal.clientId === item.clientId ? "#9ca3af" : "#374151",
                          border: "0.5px solid #e5e7eb",
                          background: "#fff",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          whiteSpace: "nowrap",
                          cursor: attentionDraftModal?.loading && attentionDraftModal.clientId === item.clientId ? "not-allowed" : "pointer",
                        }}
                      >
                        {attentionDraftModal?.loading && attentionDraftModal.clientId === item.clientId
                          ? "Drafting..."
                          : "Draft AI message"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          background: "#fff",
          border: "0.5px solid #e5e7eb",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            marginBottom: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
                color: "#6b7280",
                marginBottom: "4px",
              }}
            >
              AI Content Coach
            </div>
            <div style={{ fontSize: "16px", fontWeight: 500, color: "#111827", marginBottom: "3px" }}>
              What Your Audience Needs to Hear
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.5 }}>
              {contentIdeasLoading ? "Reviewing recurring themes..." : contentIdeasSourceSummary}
            </div>
          </div>
          <Link href="/content" style={{ fontSize: "12px", color: "#7F77DD", textDecoration: "none", whiteSpace: "nowrap" }}>
            Open content agent
          </Link>
        </div>

        {contentIdeasLoading && (
          <div style={{ fontSize: "13px", color: "#9ca3af" }}>
            Pulling repeated themes from leads, check-ins, messages, and adherence data...
          </div>
        )}

        {contentIdeasError && !contentIdeasLoading && (
          <div
            style={{
              background: "#fff7ed",
              color: "#BA7517",
              border: "1px solid #fed7aa",
              borderRadius: "8px",
              padding: "10px 12px",
              fontSize: "12px",
              marginBottom: visibleContentIdeas.length > 0 ? "12px" : 0,
            }}
          >
            {contentIdeasError}
          </div>
        )}

        {!contentIdeasLoading && visibleContentIdeas.length === 0 && (
          <div
            style={{
              background: "#f9fafb",
              border: "0.5px solid #e5e7eb",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", marginBottom: "4px" }}>
              No strong recurring themes yet.
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.6 }}>
              As more leads, client conversations, and check-ins come in, this panel will surface clearer content angles instead of guessing.
            </div>
          </div>
        )}

        {!contentIdeasLoading && visibleContentIdeas.length > 0 && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "10px",
              }}
            >
              {visibleContentIdeas.map((idea) => (
                <div
                  key={idea.id}
                  style={{
                    background: "#fafafa",
                    border: "0.5px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", lineHeight: 1.4 }}>
                      {idea.topic}
                    </div>
                    <span
                      style={{
                        background: idea.isFallback ? "#f3f4f6" : "#e0f2fe",
                        color: idea.isFallback ? "#6b7280" : "#0f4c81",
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: "999px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {idea.isFallback ? "Goal trend" : "Pattern"}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#111827",
                      lineHeight: 1.6,
                      marginBottom: "8px",
                    }}
                  >
                    {idea.hook}
                  </div>

                  <div style={{ fontSize: "12px", color: "#4b5563", lineHeight: 1.6, marginBottom: "10px" }}>
                    {idea.whyItMatters}
                  </div>

                  {idea.scriptStarter && (
                    <div
                      style={{
                        background: "#fff",
                        border: "0.5px solid #e5e7eb",
                        borderRadius: "8px",
                        padding: "10px",
                        marginBottom: "10px",
                      }}
                    >
                      <div style={{ fontSize: "10px", fontWeight: 600, color: "#9ca3af", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "4px" }}>
                        Script starter
                      </div>
                      <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
                        {idea.scriptStarter}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "10px" }}>
                    {idea.talkingPoints.slice(0, 2).map((point, index) => (
                      <div key={`${idea.id}-point-${index}`} style={{ fontSize: "12px", color: "#374151", lineHeight: 1.5 }}>
                        {point}
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                    {idea.evidenceLabel}
                  </div>
                </div>
              ))}
            </div>

            {contentIdeasUsedFallback && (
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "12px", lineHeight: 1.5 }}>
                Some ideas are based on recurring goal trends because objection and pain-point patterns are still light.
              </div>
            )}
          </>
        )}
      </div>

      {/* Priority Queue */}
      <div
        style={{
          background: "#fff",
          border: "0.5px solid #e5e7eb",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              color: "#6b7280",
            }}
          >
            Priority Queue
          </span>
          <Link href="/coaching" style={{ fontSize: "12px", color: "#7F77DD", textDecoration: "none" }}>
            See all
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {priorityItems.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "9px 12px",
                borderRadius: "8px",
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: getUrgencyColor(item.urgency),
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: getAgentBg(item.agent),
                  color: getAgentColor(item.agent),
                  whiteSpace: "nowrap",
                  letterSpacing: "0.02em",
                }}
              >
                {item.agent}
              </span>
              <span style={{ flex: 1, fontSize: "13px", color: "#374151", lineHeight: 1.4 }}>
                {item.text}
              </span>
              <Link
                href={item.route}
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#7F77DD",
                  border: "0.5px solid #e5e7eb",
                  background: "#fff",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {item.action}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {[
          { label: "Active clients", value: metrics.activeClients, sub: null, href: "/clients", danger: false },
          { label: "New leads", value: newLeadCount, sub: "in pipeline", href: "/leads", danger: false },
          { label: "Check-ins due", value: metrics.checkInsDueToday, sub: "today", href: "/clients", danger: false },
          { label: "At-risk clients", value: metrics.atRiskClients, sub: null, href: "/retention", danger: metrics.atRiskClients > 0 },
        ].map((m) => (
          <Link key={m.label} href={m.href} style={{ textDecoration: "none" }}>
            <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "14px" }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#9ca3af",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase" as const,
                  marginBottom: "6px",
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 500,
                  color: m.danger ? "#A32D2D" : "#111827",
                }}
              >
                {m.value}
              </div>
              {m.sub && (
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>{m.sub}</div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* 2-column panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {/* New Leads */}
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "12px" }}>
          New leads
        </div>
        {newLeads.length === 0 ? (
          <div style={{ fontSize: "13px", color: "#9ca3af" }}>No real leads in the pipeline yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {newLeads.map((lead) => {
              const stageStyle = getLeadStageStyle(lead.stage)

              return (
              <Link key={lead.id} href={`/leads/${lead.id}`} style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
                <Avatar initials={getLeadInitials(lead.full_name)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{lead.full_name}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lead.goal ?? lead.email}
                  </div>
                </div>
                <span
                  style={{
                    background: stageStyle.bg,
                    color: stageStyle.color,
                    border: `1px solid ${stageStyle.border}`,
                    fontSize: "10px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getLeadStageLabel(lead.stage)}
                </span>
              </Link>
              )
            })}
          </div>
        )}
        <Link href="/leads" style={{ display: "block", marginTop: "12px", fontSize: "12px", color: "#7F77DD", textDecoration: "none" }}>
          View all leads →
        </Link>
        </div>

        {/* Client Alerts */}
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "12px" }}>
            Clients needing attention
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {alertClients.map((client) => {
              const statusColor = client.status === "at_risk" ? "#A32D2D" : "#BA7517";
              return (
                <Link key={client.id} href={`/clients/${client.id}`} style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
                  <div style={{ width: "3px", height: "36px", borderRadius: "2px", background: statusColor, flexShrink: 0 }} />
                  <Avatar initials={client.initials} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{client.name}</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {client.checkIns[0]?.summary?.slice(0, 60)}...
                    </div>
                  </div>
                  <StatusPill status={client.status} label={client.status === "at_risk" ? "At risk" : "Review"} />
                </Link>
              );
            })}
          </div>
          <Link href="/retention" style={{ display: "block", marginTop: "12px", fontSize: "12px", color: "#7F77DD", textDecoration: "none" }}>
            View all →
          </Link>
        </div>

        {/* Today's Check-ins */}
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "12px" }}>
            Check-ins received today
          </div>
          {todayCheckIns.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>No check-ins received today yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {todayCheckIns.map((client) => {
                const mood = client.checkIns[0]?.mood;
                const dotColor = mood === "good" ? "#639922" : mood === "needs_attention" ? "#A32D2D" : "#BA7517";
                return (
                  <Link key={client.id} href={`/clients/${client.id}`} style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                    <Avatar initials={client.initials} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{client.name}</div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {client.checkIns[0]?.summary?.slice(0, 55)}...
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "#7F77DD",
                        border: "0.5px solid #e5e7eb",
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      Review
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
          <Link href="/coaching" style={{ display: "block", marginTop: "12px", fontSize: "12px", color: "#7F77DD", textDecoration: "none" }}>
            View all →
          </Link>
        </div>

        {/* AI Ops Brief */}
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "12px" }}>
            AI ops agent — today&apos;s brief
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {opsInsights.map((insight, i) => (
              <Link
                key={i}
                href={insight.route}
                style={{ display: "block", padding: "10px 12px", background: "#fafafa", borderRadius: "8px", textDecoration: "none" }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 500,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: getAgentBg(insight.label),
                    color: getAgentColor(insight.label),
                    letterSpacing: "0.02em",
                    display: "inline-block",
                    marginBottom: "5px",
                  }}
                >
                  {insight.label}
                </span>
                <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>
                  {insight.insight}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
      </div>

      {attentionDraftModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17, 24, 39, 0.32)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 40,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              background: "#fff",
              border: "0.5px solid #e5e7eb",
              borderRadius: "14px",
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
              padding: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: "#6b7280", marginBottom: "4px" }}>
                  AI Draft Message
                </div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>
                  {attentionDraftModal.clientName}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px", lineHeight: 1.5 }}>
                  Review and edit before sending. Nothing is saved or sent automatically.
                </div>
              </div>
              <button
                onClick={() => setAttentionDraftModal(null)}
                style={{
                  border: "0.5px solid #e5e7eb",
                  background: "#fff",
                  color: "#6b7280",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  cursor: "pointer",
                  height: "fit-content",
                }}
              >
                Close
              </button>
            </div>

            {attentionDraftModal.loading && (
              <div
                style={{
                  background: "#f9fafb",
                  border: "0.5px solid #e5e7eb",
                  borderRadius: "10px",
                  padding: "14px",
                  fontSize: "13px",
                  color: "#6b7280",
                }}
              >
                Generating a supportive draft from the latest attention signals...
              </div>
            )}

            {attentionDraftModal.error && !attentionDraftModal.loading && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#A32D2D",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "12px",
                  marginBottom: "12px",
                }}
              >
                {attentionDraftModal.error}
              </div>
            )}

            {!attentionDraftModal.loading && !attentionDraftModal.error && (
              <>
                <textarea
                  value={attentionDraftModal.draftMessage}
                  onChange={(event) =>
                    setAttentionDraftModal((current) =>
                      current
                        ? {
                            ...current,
                            draftMessage: event.target.value,
                          }
                        : current,
                    )
                  }
                  style={{
                    width: "100%",
                    minHeight: "160px",
                    border: "0.5px solid #d1d5db",
                    borderRadius: "10px",
                    padding: "12px",
                    fontSize: "13px",
                    color: "#374151",
                    lineHeight: 1.6,
                    fontFamily: "inherit",
                    resize: "vertical",
                    outline: "none",
                  }}
                />

                {attentionDraftModal.generatedAt && (
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "10px" }}>
                    Draft generated {new Date(attentionDraftModal.generatedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
