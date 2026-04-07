"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface NavItem {
  label: string;
  href: string;
  dot: string;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Home", href: "/", dot: "#7F77DD" }],
  },
  {
    title: "Pipeline",
    items: [
      { label: "Leads", href: "/leads", dot: "#639922", badge: 2 },
      { label: "Clients", href: "/clients", dot: "#3b82f6" },
    ],
  },
  {
    title: "AI Agents",
    items: [
      { label: "Sales agent", href: "/sales-agent", dot: "#d97706" },
      { label: "Retention", href: "/retention", dot: "#A32D2D", badge: 1 },
      { label: "Content", href: "/content", dot: "#ec4899" },
      { label: "Coaching", href: "/coaching", dot: "#0d9488" },
    ],
  },
  {
    title: "Settings",
    items: [{ label: "Settings", href: "/settings", dot: "#9ca3af" }],
  },
];

function getCoachLabel(email: string | null) {
  return email ?? "Coach";
}

function getCoachInitials(email: string | null) {
  if (!email) return "C";

  const [localPart] = email.split("@");
  const cleaned = localPart.replace(/[^a-zA-Z0-9]/g, "");

  return cleaned.slice(0, 2).toUpperCase() || "C";
}

export default function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error signing out:", error);
      setSigningOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  return (
    <aside
      style={{
        width: "200px",
        minWidth: "200px",
        borderRight: "0.5px solid #e5e7eb",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 10,
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px" }}>
        <span style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.01em" }}>
          <span style={{ color: "#111827" }}>Coach</span>
          <span style={{ color: "#7F77DD" }}>OS</span>
        </span>
      </div>

      {/* Nav */}
      <nav style={{ padding: "4px 0", flex: 1 }}>
        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: "4px" }}>
            <div
              style={{
                padding: "6px 16px 4px",
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#9ca3af",
              }}
            >
              {section.title}
            </div>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 16px",
                    margin: "0 4px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    background: active ? "#f3f4f6" : "transparent",
                    color: active ? "#111827" : "#6b7280",
                    fontWeight: active ? 500 : 400,
                    fontSize: "13px",
                    transition: "background 0.1s, color 0.1s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: item.dot,
                        flexShrink: 0,
                      }}
                    />
                    {item.label}
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span
                      style={{
                        background: active ? "#7F77DD" : "#e5e7eb",
                        color: active ? "#ffffff" : "#6b7280",
                        fontSize: "10px",
                        fontWeight: 500,
                        padding: "1px 6px",
                        borderRadius: "999px",
                        lineHeight: "16px",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Coach name */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "0.5px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "#7F77DD",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {getCoachInitials(userEmail)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "#111827",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {getCoachLabel(userEmail)}
          </div>
          <div style={{ fontSize: "10px", color: "#9ca3af" }}>Authenticated</div>
        </div>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            width: "100%",
            fontSize: "12px",
            fontWeight: 500,
            color: signingOut ? "#9ca3af" : "#6b7280",
            border: "0.5px solid #e5e7eb",
            background: "#fff",
            padding: "8px 12px",
            borderRadius: "8px",
            cursor: signingOut ? "not-allowed" : "pointer",
          }}
        >
          {signingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
