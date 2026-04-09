// In Docker/HF Spaces: NEXT_PUBLIC_API_URL="" → BASE="" (relative, same origin)
// In local dev:        NEXT_PUBLIC_API_URL="http://localhost:8000"
// Use || not ?? so that empty-string also falls through to "" (not localhost)
const BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardStats = () => req("/api/dashboard/stats");

// ── Resumes ───────────────────────────────────────────────────────────────────
export const listResumes = () => req("/api/resumes/");

export const getResume = (id: number) => req(`/api/resumes/${id}`);

export const uploadResumes = async (files: File[]) => {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch(`${BASE}/api/resumes/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
};

export const deleteResume = (id: number) =>
  req(`/api/resumes/${id}`, { method: "DELETE" });

export const getSimilarCandidates = (id: number, n = 5) =>
  req(`/api/resumes/${id}/similar?n=${n}`);

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const listJobs = () => req("/api/jobs/");

export const getJob = (id: number) => req(`/api/jobs/${id}`);

export const createJob = (data: { title: string; company?: string; description: string }) =>
  req("/api/jobs/", { method: "POST", body: JSON.stringify(data) });

export const deleteJob = (id: number) =>
  req(`/api/jobs/${id}`, { method: "DELETE" });

export const matchResumes = (jobId: number) =>
  req(`/api/jobs/${jobId}/match`, { method: "POST" });

export const getCandidates = (jobId: number) => req(`/api/jobs/${jobId}/candidates`);

// ── Candidates ────────────────────────────────────────────────────────────────
export const getCandidateAnalysis = (matchId: number) =>
  req(`/api/candidates/${matchId}/analysis`);

export const getResumeMatches = (resumeId: number) =>
  req(`/api/candidates/resume/${resumeId}/matches`);

// ── Streaming match ───────────────────────────────────────────────────────────
export function streamMatch(
  jobId: number,
  onEvent: (event: { event: string; [key: string]: unknown }) => void,
  onDone: () => void,
) {
  const es = new EventSource(`${BASE}/api/jobs/${jobId}/match/stream`);
  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
      if (data.event === "complete" || data.event === "data") {
        es.close();
        if (data.event === "data") onDone();
      }
    } catch {}
  };
  es.onerror = () => { es.close(); onDone(); };
  return () => es.close();
}
