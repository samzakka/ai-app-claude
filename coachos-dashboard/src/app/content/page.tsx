"use client";

import { contentIdeas } from "@/lib/mock-data";
import { useState } from "react";

type ContentStatus = "draft" | "ready" | "posted";

const statusConfig: Record<ContentStatus, { bg: string; color: string; label: string }> = {
  draft: { bg: "#fef3c7", color: "#BA7517", label: "Draft" },
  ready: { bg: "#dcfce7", color: "#639922", label: "Ready" },
  posted: { bg: "#e0e7ff", color: "#4338ca", label: "Posted" },
};

export default function ContentPage() {
  const [expandedHooks, setExpandedHooks] = useState<Set<string>>(new Set());
  const [expandedPost, setExpandedPost] = useState<Set<string>>(new Set());

  const toggleHooks = (id: string) => {
    setExpandedHooks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePost = (id: string) => {
    setExpandedPost((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeIdeas = contentIdeas.filter((i) => i.status !== "posted");
  const postedIdeas = contentIdeas.filter((i) => i.status === "posted");

  return (
    <div style={{ padding: "24px", maxWidth: "900px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "17px", fontWeight: 500, color: "#111827", margin: 0 }}>Content Agent</h1>
        <p style={{ margin: "2px 0 0", color: "#6b7280", fontSize: "13px" }}>
          Content ideas detected from client check-ins
        </p>
      </div>

      {/* Active ideas */}
      <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "10px" }}>
        Content ideas
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        {activeIdeas.map((idea) => {
          const cfg = statusConfig[idea.status];
          const showHooks = expandedHooks.has(idea.id);
          const showPost = expandedPost.has(idea.id);

          return (
            <div
              key={idea.id}
              style={{
                background: "#fff",
                border: "0.5px solid #e5e7eb",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{idea.topic}</span>
                    <span style={{ background: cfg.bg, color: cfg.color, fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "999px" }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>
                    {idea.clientCount} clients mentioned this
                  </div>
                  <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>{idea.angle}</div>
                </div>
              </div>

              {/* Generated hooks */}
              {showHooks && idea.hooks && (
                <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 500, color: "#ec4899", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "8px" }}>
                    Hook variations
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {idea.hooks.map((hook, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px" }}>
                        <span style={{ fontSize: "11px", color: "#9ca3af", flexShrink: 0, paddingTop: "1px" }}>{i + 1}.</span>
                        <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>{hook}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full post */}
              {showPost && idea.fullPost && (
                <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 500, color: "#7F77DD", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: "8px" }}>
                    Full caption
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {idea.fullPost}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: "6px" }}>
                {idea.hooks && (
                  <button
                    onClick={() => toggleHooks(idea.id)}
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      padding: "6px 14px",
                      borderRadius: "7px",
                      border: `0.5px solid ${showHooks ? "#ec4899" : "#e5e7eb"}`,
                      background: showHooks ? "#fce7f3" : "#fff",
                      color: showHooks ? "#ec4899" : "#374151",
                      cursor: "pointer",
                    }}
                  >
                    {showHooks ? "Hide hooks" : "Generate hook"}
                  </button>
                )}
                {idea.fullPost && (
                  <button
                    onClick={() => togglePost(idea.id)}
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      padding: "6px 14px",
                      borderRadius: "7px",
                      border: `0.5px solid ${showPost ? "#7F77DD" : "#e5e7eb"}`,
                      background: showPost ? "#ede9fe" : "#fff",
                      color: showPost ? "#7F77DD" : "#374151",
                      cursor: "pointer",
                    }}
                  >
                    {showPost ? "Hide post" : "Generate full post"}
                  </button>
                )}
                {!idea.hooks && !idea.fullPost && (
                  <>
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
                      Generate hook
                    </button>
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
                      Generate full post
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Posted */}
      {postedIdeas.length > 0 && (
        <>
          <div style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: "#6b7280", marginBottom: "10px" }}>
            Posted
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {postedIdeas.map((idea) => (
              <div
                key={idea.id}
                style={{
                  background: "#fff",
                  border: "0.5px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  opacity: 0.6,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>{idea.topic}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>{idea.angle}</div>
                </div>
                <span style={{ background: "#e0e7ff", color: "#4338ca", fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "999px" }}>
                  Posted
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
