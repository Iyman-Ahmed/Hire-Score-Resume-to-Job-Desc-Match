"use client";
import { useState } from "react";
import { createJob } from "@/lib/api";
import { useRouter } from "next/navigation";

const label = { fontSize: 13, fontWeight: 600, color: "var(--muted)", marginBottom: 6, display: "block" };
const input = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  background: "var(--surface2)", border: "1px solid var(--border)",
  color: "var(--text)", fontSize: 14, outline: "none",
};

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", company: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const job = await createJob(form) as { id: number };
      router.push(`/jobs/${job.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create job");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>New Job Posting</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28 }}>
        AI will analyze the description and extract requirements automatically.
      </p>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={label}>Job Title *</label>
          <input style={input as React.CSSProperties} placeholder="e.g. Senior Backend Engineer" value={form.title} onChange={set("title")} />
        </div>

        <div>
          <label style={label}>Company (optional)</label>
          <input style={input as React.CSSProperties} placeholder="e.g. Acme Corp" value={form.company} onChange={set("company")} />
        </div>

        <div>
          <label style={label}>Job Description *</label>
          <textarea
            style={{ ...input as React.CSSProperties, minHeight: 280, resize: "vertical", fontFamily: "inherit" }}
            placeholder="Paste the full job description here. Include responsibilities, requirements, preferred skills..."
            value={form.description}
            onChange={set("description")}
          />
        </div>

        {error && (
          <div style={{
            padding: 12, borderRadius: 8,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444", fontSize: 14,
          }}>{error}</div>
        )}

        {loading && (
          <div style={{
            padding: 14, borderRadius: 8,
            background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
            color: "var(--accent)", fontSize: 14,
          }}>
            AI is analyzing the job description and extracting requirements...
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 28px", background: loading ? "var(--surface2)" : "var(--accent)",
              color: loading ? "var(--muted)" : "white", border: "none",
              borderRadius: 8, fontSize: 15, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating..." : "Create Job Posting"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            style={{
              padding: "12px 24px", background: "none",
              color: "var(--muted)", border: "1px solid var(--border)",
              borderRadius: 8, fontSize: 15, cursor: "pointer",
            }}
          >Cancel</button>
        </div>
      </form>
    </div>
  );
}
