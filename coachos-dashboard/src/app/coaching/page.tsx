"use client";

import Link from "next/link";
import { clients } from "@/lib/mock-data";
import { useState } from "react";

const avatarColors: Record<string, string> = {
  AM: "#A32D2D",
  JK: "#BA7517",
  LF: "#BA7517",
  DW: "#639922",
  RP: "#7F77DD",
};

export default function CoachingPage() {
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);

  const clientsWithCheckIns = clients.filter((c) => c.checkIns.length > 0);

  const handleAccept = (clientId: string) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      next.add(clientId);
      return next;
    });
    setEditing(null);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "900px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "17px", fontWeight: 500, color: "#111827", margin: 0 }}>Coaching Agent</h1>
        <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: "13px" }}>
          {clientsWithCheckIns.length} clients with recent check-ins
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {clientsWithCheckIns.map((client) => {
          const checkIn = client.checkIns[0];
          const mood = checkIn.mood;
          const moodColor = mood === "good" ? "#639922" : mood === "needs_attention" ? "#A32D2D" : "#BA7517";
          const moodLabel = mood === "good" ? "Good" : mood === "needs_attention" ? "Needs attention" : "Average";
          const isAccepted = accepted.has(client.id);
          const isEditing = editing === client.id;

          return (
            <div
              key={client.id}
              style={{
                background: "#fff",
                border: "0.5px solid #e5e7eb",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {/* Client header */}
              <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #f3f4f6", display: "flex", alignItems: "center", gap: "12px" }}>
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
                  <Link href={`/clients/${client.id}`} style={{ fontSize: "14px", fontWeight: 500, color: "#111827", textDecoration: "none" }}>
                    {client.name}
                  </Link>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>Week {client.programWeek} · {checkIn.date}</div>
                </div>
                <span
                  style={{
                    background: `${moodColor}15`,
                    color: moodColor,
                    fontSize: "10px",
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: "999px",
                  }}
                >
                  {moodLabel}
                </span>
              </div>

              {/* Body */}
              <div style={{ padding: "14px 16px" }}>
                {/* Summary */}
                <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5, marginBottom: "10px" }}>
                  {checkIn.summary}
                </div>

                {/* AI Analysis */}
                <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "10px 12px", marginBottom: "8px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 500, color: "#7F77DD", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "4px" }}>
                    AI Analysis
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>{checkIn.aiAnalysis}</p>
                </div>

                {/* Suggested plan adjustments */}
                <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 500, color: "#0d9488", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "4px" }}>
                    Suggested plan adjustments
                  </div>
                  {isEditing ? (
                    <textarea
                      defaultValue={overrides[client.id] || checkIn.planAdjustments}
                      onChange={(e) => setOverrides((prev) => ({ ...prev, [client.id]: e.target.value }))}
                      style={{
                        width: "100%",
                        minHeight: "80px",
                        fontSize: "12px",
                        color: "#374151",
                        border: "0.5px solid #d1d5db",
                        borderRadius: "6px",
                        padding: "8px",
                        fontFamily: "inherit",
                        resize: "vertical" as const,
                        outline: "none",
                      }}
                    />
                  ) : (
                    <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>
                      {overrides[client.id] || checkIn.planAdjustments}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "6px" }}>
                  {!isAccepted ? (
                    <>
                      <button
                        onClick={() => handleAccept(client.id)}
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          padding: "6px 14px",
                          borderRadius: "7px",
                          border: "0.5px solid #639922",
                          background: "#639922",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setEditing(isEditing ? null : client.id)}
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          padding: "6px 14px",
                          borderRadius: "7px",
                          border: "0.5px solid #e5e7eb",
                          background: isEditing ? "#f3f4f6" : "#fff",
                          color: "#374151",
                          cursor: "pointer",
                        }}
                      >
                        {isEditing ? "Cancel edit" : "Edit"}
                      </button>
                      {isEditing && (
                        <button
                          onClick={() => handleAccept(client.id)}
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
                          Save override
                        </button>
                      )}
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
                        Send feedback to client
                      </button>
                    </>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", color: "#639922", fontWeight: 500 }}>✓ Accepted</span>
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
                        Send feedback to client
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
