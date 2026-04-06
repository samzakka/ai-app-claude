"use client";

import { leads } from "@/lib/mock-data";
import { useState } from "react";

const avatarColors: Record<string, string> = {
  MW: "#A32D2D",
  PS: "#0d9488",
  DT: "#4338ca",
  SC: "#ec4899",
};

type CallStatus = "called" | "converted" | "no_show" | "follow_up" | null;

export default function SalesAgentPage() {
  const leadsWithBriefs = leads.filter((l) => l.brief);
  const [statuses, setStatuses] = useState<Record<string, CallStatus>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const setStatus = (id: string, status: CallStatus) => {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  };

  const copyEmail = (id: string, email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusConfig = {
    called: { bg: "#dcfce7", color: "#639922", label: "Called" },
    converted: { bg: "#ede9fe", color: "#7F77DD", label: "Converted" },
    no_show: { bg: "#fee2e2", color: "#A32D2D", label: "No show" },
    follow_up: { bg: "#fef3c7", color: "#BA7517", label: "Follow up" },
  };

  return (
    <div style={{ padding: "24px", maxWidth: "900px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "17px", fontWeight: 500, color: "#111827", margin: 0 }}>Sales Agent</h1>
        <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: "13px" }}>
          {leadsWithBriefs.length} leads with AI briefs ready
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {leadsWithBriefs.map((lead) => {
          const currentStatus = statuses[lead.id];
          const statusCfg = currentStatus ? statusConfig[currentStatus] : null;

          return (
            <div
              key={lead.id}
              style={{
                background: "#fff",
                border: "0.5px solid #e5e7eb",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {/* Lead header */}
              <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #f3f4f6", display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: avatarColors[lead.initials] || "#7F77DD",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 500, flexShrink: 0,
                  }}
                >
                  {lead.initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{lead.name}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                    {new Date(lead.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })} · {lead.goal}
                  </div>
                </div>
                {statusCfg && (
                  <span style={{ background: statusCfg.bg, color: statusCfg.color, fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "999px" }}>
                    {statusCfg.label}
                  </span>
                )}
              </div>

              {/* Brief content */}
              {lead.brief && (
                <div style={{ padding: "16px" }}>
                  {/* Opening script */}
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 500, color: "#7F77DD", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "6px" }}>
                      Opening script
                    </div>
                    <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.6, background: "#f9fafb", borderRadius: "8px", padding: "10px 12px" }}>
                      {lead.brief.openingScript}
                    </p>
                  </div>

                  {/* Objections */}
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 500, color: "#A32D2D", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "8px" }}>
                      Objection map
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {lead.brief.objections.map((obj, i) => (
                        <div key={i} style={{ borderLeft: "2px solid #fca5a5", paddingLeft: "10px" }}>
                          <div style={{ fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "2px" }}>
                            &ldquo;{obj.objection}&rdquo;
                          </div>
                          <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>{obj.response}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Email */}
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <div style={{ fontSize: "10px", fontWeight: 500, color: "#0d9488", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>
                        Follow-up email
                      </div>
                      <button
                        onClick={() => copyEmail(lead.id, lead.brief!.followUpEmail)}
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          color: copiedId === lead.id ? "#639922" : "#7F77DD",
                          border: "0.5px solid #e5e7eb",
                          background: "#fff",
                          padding: "3px 8px",
                          borderRadius: "5px",
                          cursor: "pointer",
                        }}
                      >
                        {copiedId === lead.id ? "Copied!" : "Copy email"}
                      </button>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#374151",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        fontFamily: "inherit",
                        background: "#f9fafb",
                        borderRadius: "8px",
                        padding: "10px 12px",
                      }}
                    >
                      {lead.brief.followUpEmail}
                    </pre>
                  </div>

                  {/* Status buttons */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    {(["called", "converted", "no_show", "follow_up"] as CallStatus[]).map((s) => {
                      const cfg = statusConfig[s!];
                      const active = statuses[lead.id] === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setStatus(lead.id, active ? null : s)}
                          style={{
                            fontSize: "12px",
                            fontWeight: 500,
                            padding: "6px 12px",
                            borderRadius: "7px",
                            border: `0.5px solid ${active ? cfg.color : "#e5e7eb"}`,
                            background: active ? cfg.bg : "#fff",
                            color: active ? cfg.color : "#6b7280",
                            cursor: "pointer",
                          }}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
