"use client";

import Link from "next/link";
import {
  priorityItems,
  leads,
  clients,
  metrics,
  opsInsights,
  type UrgencyLevel,
  type AgentType,
} from "@/lib/mock-data";

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
  const totalActions = priorityItems.length;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const newLeads = leads.slice(0, 3);
  const alertClients = clients.filter((c) => c.status !== "on_track").slice(0, 3);
  const todayCheckIns = clients.filter((c) => c.checkIns[0]?.date === "March 30").slice(0, 3);

  return (
    <div style={{ padding: "24px", maxWidth: "1100px" }}>
      {/* Top bar */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 500, color: "#111827", margin: 0 }}>
          {getGreeting()}, Coach Jordan
        </h1>
        <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: "13px" }}>
          {today} · {totalActions} things need your attention today
        </p>
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
          { label: "New leads", value: metrics.newLeadsWithBriefs, sub: "briefs ready", href: "/leads", danger: false },
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
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {newLeads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
                <Avatar initials={lead.initials} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{lead.name}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lead.goal}
                  </div>
                </div>
                <StatusPill status={lead.status} label={lead.status.charAt(0).toUpperCase() + lead.status.slice(1)} />
              </Link>
            ))}
          </div>
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
  );
}
