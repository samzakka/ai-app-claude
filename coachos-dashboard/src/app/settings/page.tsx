"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [coachName, setCoachName] = useState("Coach Jordan");
  const [email, setEmail] = useState("jordan@coachOS.com");
  const [notifications, setNotifications] = useState({
    atRiskAlerts: true,
    newLeads: true,
    checkInReminders: true,
    contentIdeas: false,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: "24px", maxWidth: "600px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "17px", fontWeight: 500, color: "#111827", margin: 0 }}>Settings</h1>
        <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: "13px" }}>Manage your CoachOS preferences</p>
      </div>

      {/* Profile */}
      <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "14px" }}>
          Profile
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
          <div
            style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: "#7F77DD", color: "#fff", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "16px", fontWeight: 500,
            }}
          >
            CJ
          </div>
          <button
            style={{
              fontSize: "12px", fontWeight: 500, color: "#7F77DD",
              border: "0.5px solid #7F77DD", background: "#fff",
              padding: "6px 14px", borderRadius: "8px", cursor: "pointer",
            }}
          >
            Change photo
          </button>
        </div>

        {[
          { label: "Coach name", value: coachName, onChange: setCoachName },
          { label: "Email", value: email, onChange: setEmail },
        ].map((field) => (
          <div key={field.label} style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "#6b7280", marginBottom: "4px" }}>
              {field.label}
            </label>
            <input
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              style={{
                width: "100%",
                fontSize: "13px",
                color: "#111827",
                border: "0.5px solid #e5e7eb",
                borderRadius: "8px",
                padding: "8px 12px",
                outline: "none",
                fontFamily: "inherit",
                background: "#fff",
              }}
            />
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "14px" }}>
          Notifications
        </div>
        {[
          { key: "atRiskAlerts" as const, label: "At-risk client alerts", sub: "Get notified when a client enters at-risk status" },
          { key: "newLeads" as const, label: "New lead alerts", sub: "Get notified when a new lead submits a form" },
          { key: "checkInReminders" as const, label: "Check-in reminders", sub: "Daily reminder for pending check-ins" },
          { key: "contentIdeas" as const, label: "Content idea alerts", sub: "Get notified when the AI detects a new content theme" },
        ].map((n) => (
          <div
            key={n.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "0.5px solid #f3f4f6",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{n.label}</div>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>{n.sub}</div>
            </div>
            <button
              onClick={() => setNotifications((prev) => ({ ...prev, [n.key]: !prev[n.key] }))}
              style={{
                width: "36px",
                height: "20px",
                borderRadius: "10px",
                background: notifications[n.key] ? "#7F77DD" : "#e5e7eb",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.15s",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "2px",
                  left: notifications[n.key] ? "18px" : "2px",
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "#fff",
                  transition: "left 0.15s",
                }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Supabase */}
      <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "14px" }}>
          Integrations
        </div>
        {[
          { label: "Supabase URL", placeholder: "https://xxxx.supabase.co" },
          { label: "Supabase Anon Key", placeholder: "eyJhbGciOiJIUzI1NiIs..." },
          { label: "Anthropic API Key", placeholder: "sk-ant-..." },
        ].map((field) => (
          <div key={field.label} style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "#6b7280", marginBottom: "4px" }}>
              {field.label}
            </label>
            <input
              placeholder={field.placeholder}
              type={field.label.includes("Key") ? "password" : "text"}
              style={{
                width: "100%",
                fontSize: "13px",
                color: "#111827",
                border: "0.5px solid #e5e7eb",
                borderRadius: "8px",
                padding: "8px 12px",
                outline: "none",
                fontFamily: "inherit",
                background: "#fff",
              }}
            />
          </div>
        ))}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        style={{
          fontSize: "13px",
          fontWeight: 500,
          padding: "10px 24px",
          borderRadius: "8px",
          border: "none",
          background: saved ? "#639922" : "#7F77DD",
          color: "#fff",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        {saved ? "Saved!" : "Save changes"}
      </button>
    </div>
  );
}
