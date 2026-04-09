"use client";
import { useEffect, useState } from "react";
import { getCandidateAnalysis } from "@/lib/api";
import type { CandidateAnalysis } from "@/lib/types";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  Tooltip, BarChart, Bar, XAxis, YAxis, Cell,
} from "recharts";

const recColor: Record<string, string> = {
  "Strong Match": "#10b981",
  "Good Match": "#3b82f6",
  "Potential Match": "#f59e0b",
  "Weak Match": "#ef4444",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "18px 22px", marginBottom: 16,
    }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", marginBottom: 14 }}>
        {title.toUpperCase()}
      </h3>
      {children}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 11, padding: "3px 9px", borderRadius: 4, margin: "2px",
      background: `${color}18`, color,
    }}>{label}</span>
  );
}

export default function CandidateAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CandidateAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCandidateAnalysis(Number(id))
      .then(d => setData(d as CandidateAnalysis))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ color: "var(--muted)", marginTop: 40 }}>Loading analysis...</div>;
  if (!data) return <div style={{ color: "#ef4444" }}>Analysis not found.</div>;

  const { candidate, scores, recommendation } = data;
  const radarData = [
    { axis: "Skills",     value: scores.skill },
    { axis: "Experience", value: scores.experience },
    { axis: "Education",  value: scores.education },
    { axis: "Keywords",   value: scores.keyword },
  ];
  const barData = [
    { name: "Skills",     score: scores.skill },
    { name: "Experience", score: scores.experience },
    { name: "Education",  score: scores.education },
    { name: "Keywords",   score: scores.keyword },
  ];
  const barColors = ["#3b82f6", "#10b981", "#a855f7", "#f59e0b"];
  const recCol = recColor[recommendation] || "var(--text)";

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Back */}
      <Link href={`/jobs/${data.job_id}`} style={{ color: "var(--muted)", fontSize: 13, textDecoration: "none" }}>
        ← Back to Job
      </Link>

      {/* Hero */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "24px 28px", margin: "16px 0 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%", background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 700, flexShrink: 0,
          }}>
            {candidate.name?.charAt(0) || "?"}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>{candidate.name}</h1>
            <div style={{ color: "var(--muted)", fontSize: 14, marginTop: 2 }}>
              {candidate.email} {candidate.phone ? `· ${candidate.phone}` : ""} {candidate.location ? `· ${candidate.location}` : ""}
            </div>
            {candidate.years_of_experience && (
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 2 }}>
                {candidate.years_of_experience} years of experience
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: recCol, lineHeight: 1 }}>
            {scores.overall.toFixed(0)}
            <span style={{ fontSize: 20 }}>%</span>
          </div>
          <div style={{
            marginTop: 6, fontSize: 13, fontWeight: 600, padding: "4px 12px",
            borderRadius: 20, background: `${recCol}20`, color: recCol,
          }}>{recommendation}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Rank #{data.rank}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Radar */}
        <Section title="Score Breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted)", fontSize: 12 }} />
              <Radar dataKey="value" fill="var(--accent)" fillOpacity={0.3} stroke="var(--accent)" />
              <Tooltip
                contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Section>

        {/* Bar */}
        <Section title="Score Detail">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={36}>
              <XAxis dataKey="name" stroke="var(--muted)" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="var(--muted)" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(v: number) => [`${v.toFixed(0)}%`, "Score"]}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={barColors[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Strengths */}
        <Section title="Strengths">
          {(data.strengths || []).map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 14 }}>
              <span style={{ color: "#10b981", flexShrink: 0 }}>✓</span>
              <span>{s}</span>
            </div>
          ))}
        </Section>

        {/* Weaknesses */}
        <Section title="Areas of Concern">
          {(data.weaknesses || []).map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 14 }}>
              <span style={{ color: "#ef4444", flexShrink: 0 }}>✗</span>
              <span>{w}</span>
            </div>
          ))}
        </Section>
      </div>

      {/* Skills */}
      <Section title="Skills Analysis">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Matching Skills</div>
          <div>{(data.matching_skills || []).map(s => <Chip key={s} label={`✓ ${s}`} color="#10b981" />)}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Skill Gaps</div>
          <div>{(data.skill_gaps || []).map(s => <Chip key={s} label={`✗ ${s}`} color="#ef4444" />)}</div>
        </div>
      </Section>

      {/* AI Explanation */}
      {data.explanation && (
        <Section title="AI Recruiter Analysis">
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)" }}>{data.explanation}</p>
        </Section>
      )}

      {/* Resume Feedback */}
      {data.resume_feedback && (
        <Section title="Resume Improvement Suggestions">
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--muted)", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
            {typeof data.resume_feedback === "string"
              ? data.resume_feedback
              : JSON.stringify(data.resume_feedback, null, 2)}
          </p>
        </Section>
      )}

      {/* Experience */}
      {(candidate.experience || []).length > 0 && (
        <Section title="Work Experience">
          {candidate.experience.map((e, i) => (
            <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div>
              <div style={{ color: "var(--accent)", fontSize: 13 }}>{e.company}</div>
              <div style={{ color: "var(--muted)", fontSize: 12, margin: "2px 0 6px" }}>{e.duration}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{e.description}</div>
            </div>
          ))}
        </Section>
      )}

      {/* Education + Certs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Section title="Education">
          {(candidate.education || []).map((ed, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{ed.degree}</div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{ed.institution} · {ed.year}</div>
            </div>
          ))}
        </Section>
        {(candidate.certifications || []).length > 0 && (
          <Section title="Certifications">
            {candidate.certifications.map((c, i) => (
              <div key={i} style={{ fontSize: 14, marginBottom: 6 }}>🏅 {c}</div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}
