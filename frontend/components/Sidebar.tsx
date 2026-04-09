"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/",          label: "Dashboard",   icon: "⬛" },
  { href: "/jobs",      label: "Jobs",         icon: "💼" },
  { href: "/upload",    label: "Upload CVs",   icon: "📤" },
  { href: "/resumes",   label: "Resumes",      icon: "📄" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside style={{
      width: 220,
      minHeight: "100vh",
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      padding: "0",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34,
            background: "var(--accent)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>🎯</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>RecruitAI</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Resume Ranker</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {nav.map(({ href, label, icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                marginBottom: 2,
                background: active ? "rgba(59,130,246,0.15)" : "transparent",
                color: active ? "var(--accent)" : "var(--muted)",
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                {label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: "16px 20px",
        borderTop: "1px solid var(--border)",
        fontSize: 11,
        color: "var(--muted)",
      }}>
        Powered by Groq LLM
      </div>
    </aside>
  );
}
