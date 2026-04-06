"use client";

import { useParams, useRouter } from "next/navigation";
import { leads } from "@/lib/mock-data";
import { useState } from "react";

const avatarColors: Record<string, string> = {
  MW: "#A32D2D",
  PS: "#0d9488",
  DT: "#4338ca",
  SC: "#ec4899",
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lead = leads.find((l) => l.id === params.id);
  const [copied, setCopied] = useState(false);

  if (!lead) {
    return (
      <div style={{ padding: "24px" }}>
        <p style={{ color: "#6b7280" }}>Lead not found.</p>
      </div>
    );
  }

  const copyEmail = () => {
    if (lead.brief?.followUpEmail) {
      navigator.clipboard.writeText(lead.brief.followUpEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusStyle =
    lead.status === "hot"
      ? { bg: "#fee2e2", color: "#A32D2D" }
      : lead.status === "warm"
      ? { bg: "#fef3c7", color: "#BA7517" }
      : { bg: "#e0e7ff", color: "#4338ca" };

  return (
    <div style={{ padding: "24px", maxWidth: "820px" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "#7F77DD",
            fontSize: "13px",
            cursor: "pointer",
            padding: 0,
            marginBottom: "12px",
            display: "block",
          }}
        >
          ← Back to leads
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: avatarColors[lead.initials] || "#7F77DD",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {lead.initials}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "17px", fontWeight: 500, color: "#111827", margin: 0 }}>
                {lead.name}
              </h1>
              <span
                style={{
                  background: statusStyle.bg,
                  color: statusStyle.color,
                  fontSize: "10px",
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: "999px",
                }}
              >
                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af" }}>
              Submitted {new Date(lead.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          {["Mark as called", "Convert to client", "Archive"].map((action) => (
            <button
              key={action}
              style={{
                fontSize: "12px",
                fontWeight: 500,
                padding: "7px 14px",
                borderRadius: "8px",
                border: "0.5px solid #e5e7eb",
                background: action === "Convert to client" ? "#7F77DD" : "#fff",
                color: action === "Convert to client" ? "#fff" : "#374151",
                cursor: "pointer",
              }}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {/* Form answers */}
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "14px" }}>
            Form answers
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {lead.formAnswers.map((qa, i) => (
              <div key={i}>
                <div style={{ fontSize: "11px", fontWeight: 500, color: "#9ca3af", marginBottom: "3px" }}>
                  {qa.question}
                </div>
                <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>
                  {qa.answer}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Brief */}
        {lead.brief ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Opening script */}
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "10px" }}>
                Opening script
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
                {lead.brief.openingScript}
              </p>
            </div>

            {/* Objection map */}
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "10px" }}>
                Objection map
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {lead.brief.objections.map((obj, i) => (
                  <div
                    key={i}
                    style={{
                      borderLeft: "2px solid #A32D2D",
                      paddingLeft: "12px",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "#A32D2D", marginBottom: "4px" }}>
                      &ldquo;{obj.objection}&rdquo;
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: 1.5 }}>
                      {obj.response}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Follow-up email */}
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280" }}>
                  Follow-up email
                </div>
                <button
                  onClick={copyEmail}
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    color: copied ? "#639922" : "#7F77DD",
                    border: "0.5px solid #e5e7eb",
                    background: "#fff",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  {copied ? "Copied!" : "Copy email"}
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
                }}
              >
                {lead.brief.followUpEmail}
              </pre>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              border: "0.5px solid #e5e7eb",
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                AI brief not yet generated
              </div>
              <button
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#7F77DD",
                  border: "0.5px solid #7F77DD",
                  background: "#fff",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Generate brief
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
