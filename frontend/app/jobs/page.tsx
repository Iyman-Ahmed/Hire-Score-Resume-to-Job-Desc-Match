"use client";
import { useEffect, useState } from "react";
import { listJobs, deleteJob } from "@/lib/api";
import type { Job } from "@/lib/types";
import Link from "next/link";

const badge = (level: string) => {
  const colors: Record<string, string> = {
    junior: "#10b981", mid: "#3b82f6", senior: "#a855f7",
    lead: "#f59e0b", executive: "#ef4444",
  };
  return colors[level?.toLowerCase()] || "var(--muted)";
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    listJobs()
      .then(d => setJobs(d as Job[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this job posting?")) return;
    await deleteJob(id);
    setJobs(j => j.filter(x => x.id !== id));
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>Job Postings</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>{jobs.length} active position(s)</p>
        </div>
        <Link href="/jobs/new">
          <button style={{
            padding: "10px 20px", background: "var(--accent)", color: "white",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            + New Job
          </button>
        </Link>
      </div>

      {loading ? (
        <div style={{ color: "var(--muted)", textAlign: "center", marginTop: 40 }}>Loading...</div>
      ) : jobs.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 80, color: "var(--muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💼</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No job postings yet</div>
          <Link href="/jobs/new" style={{ color: "var(--accent)", fontSize: 14 }}>Create your first job →</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {jobs.map(j => (
            <div key={j.id} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 12, padding: "18px 22px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <h2 style={{ fontSize: 17, fontWeight: 600 }}>{j.title}</h2>
                    {j.seniority_level && (
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 20,
                        background: `${badge(j.seniority_level)}22`,
                        color: badge(j.seniority_level), fontWeight: 600, textTransform: "capitalize",
                      }}>{j.seniority_level}</span>
                    )}
                  </div>
                  {j.company && <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{j.company}</div>}
                  {j.experience_required && (
                    <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
                      Experience: {j.experience_required}
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {j.required_skills.map(s => (
                      <span key={s} style={{
                        fontSize: 11, padding: "3px 8px", borderRadius: 4,
                        background: "rgba(59,130,246,0.12)", color: "var(--accent)",
                      }}>{s}</span>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginLeft: 20 }}>
                  <span style={{
                    fontSize: 12, padding: "4px 10px", borderRadius: 20,
                    background: j.match_count > 0 ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.2)",
                    color: j.match_count > 0 ? "#10b981" : "var(--muted)",
                  }}>
                    {j.match_count > 0 ? `${j.match_count} matched` : "Not matched yet"}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/jobs/${j.id}`}>
                      <button style={{
                        padding: "6px 14px", background: "var(--accent)", color: "white",
                        border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13,
                      }}>View</button>
                    </Link>
                    <button
                      onClick={() => handleDelete(j.id)}
                      style={{
                        padding: "6px 12px", background: "rgba(239,68,68,0.1)",
                        color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: 6, cursor: "pointer", fontSize: 13,
                      }}
                    >Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
