"use client";

import { retentionClients } from "@/lib/mock-data";
import { useState } from "react";

const avatarColors: Record<string, string> = {
  AM: "#A32D2D",
  JK: "#BA7517",
  LF: "#BA7517",
  DW: "#639922",
  RP: "#7F77DD",
};

type Filter = "all" | "at_risk" | "review" | "on_track";

export default function RetentionPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const filtered = retentionClients.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const atRisk = retentionClients.filter((c) => c.status === "at_risk").length;
  const review = retentionClients.filter((c) => c.status === "review").length;
  const onTrack = retentionClients.filter((c) => c.status === "on_track").length;
  const avgSentiment = (retentionClients.reduce((sum, c) => sum + c.sentimentScore, 0) / retentionClients.length).toFixed(1);

  const getStatusConfig = (status: string) => {
    if (status === "at_risk") return { color: "#A32D2D", border: "#A32D2D", bg: "#fee2e2", label: "At risk" };
    if (status === "review") return { color: "#BA7517", border: "#BA7517", bg: "#fef3c7", label: "Review" };
    return { color: "#639922", border: "#639922", bg: "#dcfce7", label: "On track" };
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All clients" },
    { key: "at_risk", label: "At risk only" },
    { key: "review", label: "Needs review" },
    { key: "on_track", label: "On track" },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "900px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "17px", fontWeight: 500, color: "#111827", margin: 0 }}>Retention Agent</h1>
        <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: "13px" }}>AI-powered client retention intelligence</p>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
        {[
          { label: "At risk", value: atRisk, color: "#A32D2D" },
          { label: "Needs review", value: review, color: "#BA7517" },
          { label: "On track", value: onTrack, color: "#639922" },
          { label: "Avg. sentiment", value: `${avgSentiment}/10`, color: "#7F77DD" },
        ].map((m) => (
          <div key={m.label} style={{ background: "#f9fafb", borderRadius: "10px", padding: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "#9ca3af", letterSpacing: "0.04em", textTransform: "uppercase" as const, marginBottom: "6px" }}>
              {m.label}
            </div>
            <div style={{ fontSize: "22px", fontWeight: 500, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              fontSize: "12px",
              fontWeight: 500,
              padding: "6px 14px",
              borderRadius: "999px",
              border: "0.5px solid #e5e7eb",
              background: filter === f.key ? "#7F77DD" : "#fff",
              color: filter === f.key ? "#fff" : "#6b7280",
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Client cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.map((client) => {
          const cfg = getStatusConfig(client.status);
          const isResolved = resolved.has(client.id);

          return (
            <div
              key={client.id}
              style={{
                background: "#fff",
                border: "0.5px solid #e5e7eb",
                borderLeft: `3px solid ${cfg.border}`,
                borderRadius: "12px",
                padding: "16px",
                opacity: isResolved ? 0.5 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                <div
                  style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: avatarColors[client.initials] || "#7F77DD",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 500, flexShrink: 0,
                  }}
                >
                  {client.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{client.name}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>Last seen {client.lastSeen} · Sentiment {client.sentimentScore}/10</div>
                </div>
                <span style={{ background: cfg.bg, color: cfg.color, fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "999px" }}>
                  {cfg.label}
                </span>
              </div>

              {/* Signals */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const, marginBottom: "10px" }}>
                {client.signals.map((signal) => (
                  <span
                    key={signal}
                    style={{
                      fontSize: "11px",
                      background: "#f3f4f6",
                      color: "#6b7280",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontWeight: 500,
                    }}
                  >
                    {signal}
                  </span>
                ))}
              </div>

              {/* Recommendation */}
              <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                {client.recommendation}
              </p>

              {/* Actions */}
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    padding: "6px 14px",
                    borderRadius: "7px",
                    border: "0.5px solid #7F77DD",
                    background: "#7F77DD",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Draft message
                </button>
                <button
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    padding: "6px 14px",
                    borderRadius: "7px",
                    border: "0.5px solid #e5e7eb",
                    background: "#fff",
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  View history
                </button>
                <button
                  onClick={() => setResolved((prev) => { const next = new Set(prev); if (next.has(client.id)) next.delete(client.id); else next.add(client.id); return next; })}
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    padding: "6px 14px",
                    borderRadius: "7px",
                    border: "0.5px solid #e5e7eb",
                    background: isResolved ? "#dcfce7" : "#fff",
                    color: isResolved ? "#639922" : "#374151",
                    cursor: "pointer",
                  }}
                >
                  {isResolved ? "Resolved ✓" : "Mark resolved"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
