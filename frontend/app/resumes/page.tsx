"use client";
import { useEffect, useState } from "react";
import { listResumes, deleteResume } from "@/lib/api";
import type { Resume } from "@/lib/types";
import Link from "next/link";

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = () => {
    listResumes()
      .then(d => setResumes(d as Resume[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this resume?")) return;
    await deleteResume(id);
    setResumes(r => r.filter(x => x.id !== id));
  };

  const filtered = resumes.filter(r =>
    r.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.email || "").toLowerCase().includes(search.toLowerCase()) ||
    r.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>Resumes</h1>
          <p style={{ color: "var(--muted)", marginTop: 4 }}>{resumes.length} candidate(s) in pool</p>
        </div>
        <Link href="/upload">
          <button style={{
            padding: "10px 20px", background: "var(--accent)", color: "white",
            border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            + Upload
          </button>
        </Link>
      </div>

      <input
        placeholder="Search by name, email, or skill..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: "100%", padding: "10px 14px", borderRadius: 8,
          background: "var(--surface)", border: "1px solid var(--border)",
          color: "var(--text)", fontSize: 14, marginBottom: 16, outline: "none",
        }}
      />

      {loading ? (
        <div style={{ color: "var(--muted)", textAlign: "center", marginTop: 40 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "var(--muted)", textAlign: "center", marginTop: 60 }}>
          {search ? "No results match your search." : "No resumes uploaded yet."}
          {!search && (
            <div style={{ marginTop: 12 }}>
              <Link href="/upload" style={{ color: "var(--accent)", fontSize: 14 }}>Upload your first resume →</Link>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(r => (
            <div key={r.id} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "16px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%",
                    background: "var(--accent)", display: "flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 700, fontSize: 15, flexShrink: 0,
                  }}>
                    {r.candidate_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{r.candidate_name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {r.email || r.filename}
                      {r.years_of_experience ? ` · ${r.years_of_experience}y exp` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {r.skills.slice(0, 8).map(s => (
                    <span key={s} style={{
                      fontSize: 11, padding: "3px 8px", borderRadius: 4,
                      background: "rgba(59,130,246,0.15)", color: "var(--accent)",
                    }}>{s}</span>
                  ))}
                  {r.skills.length > 8 && (
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>+{r.skills.length - 8} more</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
                <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDelete(r.id)}
                  style={{
                    padding: "6px 12px", background: "rgba(239,68,68,0.1)",
                    color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 6, cursor: "pointer", fontSize: 12,
                  }}
                >Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
