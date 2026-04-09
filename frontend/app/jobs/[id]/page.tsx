"use client";
import { useEffect, useState, useCallback } from "react";
import { getJob, getCandidates, streamMatch } from "@/lib/api";
import type { JobDetail, Candidate } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from "recharts";

type StreamEvent = { event: string; message?: string; current?: number; total?: number; overall_score?: number; recommendation?: string; [key: string]: unknown };

const recColor: Record<string, string> = {
  "Strong Match": "#10b981",
  "Good Match": "#3b82f6",
  "Potential Match": "#f59e0b",
  "Weak Match": "#ef4444",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "#10b981" : value >= 60 ? "#3b82f6" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--muted)" }}>{label}</span>
        <span style={{ fontWeight: 600, color }}>{value.toFixed(0)}%</span>
      </div>
      <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);

  const [job, setJob] = useState<JobDetail | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [progress, setProgress] = useState<{ message: string; current: number; total: number } | null>(null);

  const load = useCallback(async () => {
    const [j, c] = await Promise.all([
      getJob(jobId) as Promise<JobDetail>,
      getCandidates(jobId).then((r: unknown) => (r as { candidates: Candidate[] }).candidates).catch(() => []),
    ]);
    setJob(j);
    setCandidates(c);
    setLoading(false);
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const runMatch = () => {
    setMatching(true);
    setProgress({ message: "Starting...", current: 0, total: 0 });
    const cleanup = streamMatch(
      jobId,
      (ev: StreamEvent) => {
        if (ev.event === "progress") {
          setProgress({ message: ev.message || "", current: ev.current || 0, total: ev.total || 0 });
        }
      },
      () => {
        setMatching(false);
        setProgress(null);
        load();
      },
    );
    return cleanup;
  };

  if (loading) return <div style={{ color: "var(--muted)", marginTop: 40 }}>Loading...</div>;
  if (!job) return <div style={{ color: "#ef4444" }}>Job not found.</div>;

  const req = job.parsed_requirements || ({} as JobDetail["parsed_requirements"]);

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/jobs" style={{ color: "var(--muted)", fontSize: 13, textDecoration: "none" }}>← Jobs</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 10 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700 }}>{job.title}</h1>
            {job.company && <p style={{ color: "var(--muted)", marginTop: 2 }}>{job.company}</p>}
          </div>
          <button
            onClick={runMatch}
            disabled={matching}
            style={{
              padding: "10px 22px",
              background: matching ? "var(--surface2)" : "var(--accent)",
              color: matching ? "var(--muted)" : "white",
              border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: matching ? "not-allowed" : "pointer",
            }}
          >
            {matching ? "Analyzing..." : candidates.length > 0 ? "Re-run Matching" : "Run AI Matching"}
          </button>
        </div>
      </div>

      {/* Streaming progress */}
      {matching && progress && (
        <div style={{
          background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: 10, padding: 16, marginBottom: 20,
        }}>
          <div style={{ color: "var(--accent)", fontSize: 14, marginBottom: 8 }}>{progress.message}</div>
          {progress.total > 0 && (
            <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                width: `${(progress.current / progress.total) * 100}%`,
                height: "100%", background: "var(--accent)", borderRadius: 3, transition: "width 0.3s",
              }} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
        {/* Left: Job info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: 16,
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 10 }}>REQUIRED SKILLS</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(req.required_skills || []).map(s => (
                <span key={s} style={{
                  fontSize: 11, padding: "3px 8px", borderRadius: 4,
                  background: "rgba(59,130,246,0.15)", color: "var(--accent)",
                }}>{s}</span>
              ))}
            </div>
          </div>

          {(req.preferred_skills || []).length > 0 && (
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: 16,
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 10 }}>PREFERRED SKILLS</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {req.preferred_skills.map(s => (
                  <span key={s} style={{
                    fontSize: 11, padding: "3px 8px", borderRadius: 4,
                    background: "rgba(168,85,247,0.12)", color: "#a855f7",
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: 16, fontSize: 13,
          }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: "var(--muted)" }}>Experience: </span>
              <span>{req.experience_required || "Not specified"}</span>
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: "var(--muted)" }}>Level: </span>
              <span style={{ textTransform: "capitalize" }}>{req.seniority_level || "—"}</span>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Education: </span>
              <span>{req.education_required || "Not specified"}</span>
            </div>
          </div>
        </div>

        {/* Right: candidates */}
        <div>
          {candidates.length === 0 ? (
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: 48, textAlign: "center", color: "var(--muted)",
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>No candidates ranked yet</div>
              <div style={{ fontSize: 13 }}>
                Upload resumes first, then click "Run AI Matching".
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {candidates.map(c => (
                <div key={c.match_id} style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: 16,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: "var(--accent)", display: "flex", alignItems: "center",
                        justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0,
                      }}>
                        {c.rank}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{c.candidate_name}</div>
                        {c.email && <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.email}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        fontSize: 20, fontWeight: 700,
                        color: recColor[c.recommendation] || "var(--text)",
                      }}>
                        {c.overall_score.toFixed(0)}%
                      </div>
                      <span style={{
                        fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 600,
                        background: `${recColor[c.recommendation] || "var(--muted)"}22`,
                        color: recColor[c.recommendation] || "var(--muted)",
                      }}>{c.recommendation}</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <ScoreBar label="Skills" value={c.skill_score} />
                    <ScoreBar label="Experience" value={c.experience_score} />
                    <ScoreBar label="Keywords" value={c.keyword_score} />
                  </div>

                  {c.matching_skills.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                      {c.matching_skills.slice(0, 6).map(s => (
                        <span key={s} style={{
                          fontSize: 11, padding: "2px 7px", borderRadius: 4,
                          background: "rgba(16,185,129,0.12)", color: "#10b981",
                        }}>✓ {s}</span>
                      ))}
                      {c.skill_gaps.slice(0, 3).map(s => (
                        <span key={s} style={{
                          fontSize: 11, padding: "2px 7px", borderRadius: 4,
                          background: "rgba(239,68,68,0.1)", color: "#ef4444",
                        }}>✗ {s}</span>
                      ))}
                    </div>
                  )}

                  <Link href={`/candidates/${c.match_id}`}>
                    <button style={{
                      padding: "6px 14px", background: "rgba(59,130,246,0.15)",
                      color: "var(--accent)", border: "1px solid rgba(59,130,246,0.3)",
                      borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 500,
                    }}>View Full Analysis →</button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
