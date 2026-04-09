"use client";
import { useState, useRef } from "react";
import { uploadResumes } from "@/lib/api";

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{ uploaded: unknown[]; errors: unknown[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter(f =>
      [".pdf", ".docx", ".doc", ".txt"].some(e => f.name.toLowerCase().endsWith(e))
    );
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !names.has(f.name))];
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const remove = (name: string) => setFiles(f => f.filter(x => x.name !== name));

  const submit = async () => {
    if (!files.length) return;
    setUploading(true);
    setResults(null);
    try {
      const res = await uploadResumes(files);
      setResults(res);
      setFiles([]);
    } catch (e: unknown) {
      alert(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Upload Resumes</h1>
      <p style={{ color: "var(--muted)", marginBottom: 28 }}>
        Upload PDF, DOCX, or TXT resumes. AI will parse and index them automatically.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 12,
          padding: "48px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(59,130,246,0.05)" : "var(--surface)",
          transition: "all 0.2s",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
          Drag & drop resumes here
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          or click to browse — PDF, DOCX, TXT supported
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt"
          style={{ display: "none" }}
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          marginBottom: 20,
          overflow: "hidden",
        }}>
          {files.map(f => (
            <div key={f.name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>
                  {f.name.endsWith(".pdf") ? "📕" : f.name.endsWith(".txt") ? "📝" : "📘"}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {(f.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); remove(f.name); }}
                style={{
                  background: "none", border: "none", color: "var(--muted)",
                  cursor: "pointer", fontSize: 18, padding: 4,
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={submit}
        disabled={!files.length || uploading}
        style={{
          padding: "12px 28px",
          background: files.length && !uploading ? "var(--accent)" : "var(--surface2)",
          color: files.length && !uploading ? "white" : "var(--muted)",
          border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600,
          cursor: files.length && !uploading ? "pointer" : "not-allowed",
          transition: "background 0.2s",
        }}
      >
        {uploading ? "Processing with AI..." : `Upload ${files.length || ""} Resume${files.length !== 1 ? "s" : ""}`}
      </button>

      {uploading && (
        <div style={{
          marginTop: 20, padding: 16,
          background: "rgba(59,130,246,0.1)", borderRadius: 8,
          border: "1px solid rgba(59,130,246,0.3)",
          color: "var(--accent)", fontSize: 14,
        }}>
          AI is parsing resumes and extracting skills, experience, and education...
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ marginTop: 24 }}>
          {(results.uploaded as Array<{ id: number; candidate_name: string; skills_count: number; years_of_experience?: number }>).length > 0 && (
            <div style={{
              background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 10, padding: 16, marginBottom: 12,
            }}>
              <div style={{ color: "#10b981", fontWeight: 600, marginBottom: 10 }}>
                ✓ {(results.uploaded as unknown[]).length} resume(s) uploaded successfully
              </div>
              {(results.uploaded as Array<{ id: number; candidate_name: string; skills_count: number; years_of_experience?: number }>).map((r) => (
                <div key={r.id} style={{
                  fontSize: 13, color: "var(--text)", padding: "6px 0",
                  borderBottom: "1px solid rgba(16,185,129,0.2)",
                }}>
                  <strong>{r.candidate_name}</strong>
                  {" — "}
                  {r.skills_count} skills extracted
                  {r.years_of_experience ? `, ${r.years_of_experience}y exp` : ""}
                </div>
              ))}
            </div>
          )}
          {(results.errors as unknown[]).length > 0 && (
            <div style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 10, padding: 16,
            }}>
              <div style={{ color: "#ef4444", fontWeight: 600, marginBottom: 8 }}>
                ⚠ {(results.errors as unknown[]).length} file(s) failed
              </div>
              {(results.errors as Array<{ filename: string; error: string }>).map((e, i) => (
                <div key={i} style={{ fontSize: 13, color: "var(--muted)" }}>
                  {e.filename}: {e.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
