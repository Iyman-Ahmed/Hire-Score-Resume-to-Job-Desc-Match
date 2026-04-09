"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, FileText, Briefcase, X, Loader2, Zap,
  CheckCircle, XCircle, Lightbulb, TrendingUp,
  Award, BookOpen, Code, Clock, Target,
  ChevronDown, ChevronUp, ShieldCheck,
} from "lucide-react";

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

// ── Types ──────────────────────────────────────────────────────────────────
interface Candidate {
  match_id: number;
  resume_id: number;
  rank: number;
  candidate_name: string;
  email: string;
  overall_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  keyword_score: number;
  recommendation: string;
  matching_skills: string[];
  skill_gaps: string[];
  strengths: string[];
  weaknesses: string[];
}

type Phase = "idle" | "uploading" | "creating" | "matching" | "done" | "error";

interface StreamEvent {
  event: string;
  current?: number;
  total?: number;
  candidate?: string;
  score?: number;
  total_processed?: number;
}

// ── Animated Score Bar ─────────────────────────────────────────────────────
function ScoreBar({
  label, score, color, icon, animate,
}: {
  label: string;
  score: number;
  color: string;
  icon: React.ReactNode;
  animate: boolean;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setWidth(score), 120);
      return () => clearTimeout(t);
    } else {
      setWidth(0);
    }
  }, [animate, score]);

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--muted)" }}>
          {icon}
          {label}
        </span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}%</span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "var(--surface2)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}70, ${color})`,
            transition: "width 1.1s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}

// ── Overall Score Ring ──────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "#10b981" :
    score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center border-[3px] flex-shrink-0"
      style={{ borderColor: color }}
    >
      <span className="text-lg font-black leading-none" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

// ── ATS Section Types ──────────────────────────────────────────────────────
interface ATSSection {
  score: number;
  status: "good" | "needs_work" | "missing";
  suggestions: string[];
}
interface ATSData {
  overall_ats_score: number;
  readability_score: number;
  keyword_density_score: number;
  format_score: number;
  sections: {
    contact_info?: ATSSection;
    summary?: ATSSection;
    skills?: ATSSection;
    experience?: ATSSection;
    education?: ATSSection;
    certifications?: ATSSection;
  };
  top_improvements: string[];
  ats_tips: string[];
}

const ATS_SECTION_LABELS: Record<string, string> = {
  contact_info:   "Contact Info",
  summary:        "Professional Summary",
  skills:         "Skills Section",
  experience:     "Work Experience",
  education:      "Education",
  certifications: "Certifications",
};
const ATS_SECTION_COLORS: Record<string, string> = {
  contact_info:   "#3b82f6",
  summary:        "#8b5cf6",
  skills:         "#10b981",
  experience:     "#f59e0b",
  education:      "#06b6d4",
  certifications: "#f97316",
};

// ── Candidate Card ─────────────────────────────────────────────────────────
function CandidateCard({ c, animate }: { c: Candidate; animate: boolean }) {
  const [open, setOpen]         = useState(false);
  const [atsOpen, setAtsOpen]   = useState(false);
  const [atsData, setAtsData]   = useState<ATSData | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState("");

  const scoreColor =
    c.overall_score >= 80 ? "#10b981" :
    c.overall_score >= 60 ? "#f59e0b" : "#ef4444";

  const recBadge: Record<string, { bg: string; text: string }> = {
    "Strong Match":    { bg: "#10b98118", text: "#10b981" },
    "Good Match":      { bg: "#3b82f618", text: "#3b82f6" },
    "Potential Match": { bg: "#f59e0b18", text: "#f59e0b" },
    "Weak Match":      { bg: "#6b728018", text: "#6b7280" },
  };
  const badge = recBadge[c.recommendation] ?? recBadge["Weak Match"];

  const rankEmoji = c.rank === 1 ? "🥇" : c.rank === 2 ? "🥈" : c.rank === 3 ? "🥉" : null;
  const hasImprovements = (c.weaknesses?.length ?? 0) > 0 || (c.skill_gaps?.length ?? 0) > 0;

  const loadAts = async () => {
    if (atsData) { setAtsOpen((p) => !p); return; }
    setAtsOpen(true);
    setAtsLoading(true);
    setAtsError("");
    try {
      const res = await fetch(`${BASE}/api/resumes/${c.resume_id}/ats`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "ATS analysis failed");
      }
      setAtsData(await res.json());
    } catch (e: unknown) {
      setAtsError(e instanceof Error ? e.message : "Failed to load ATS analysis");
    } finally {
      setAtsLoading(false);
    }
  };

  const atsColor = (score: number) =>
    score >= 75 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const atsStatusIcon = (status: string) =>
    status === "good" ? "✓" : status === "needs_work" ? "~" : "✗";
  const atsStatusColor = (status: string) =>
    status === "good" ? "#10b981" : status === "needs_work" ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{
        background: "var(--surface)",
        borderColor: c.rank === 1 ? `${scoreColor}50` : "var(--border)",
        boxShadow: c.rank === 1 ? `0 0 32px ${scoreColor}15` : "none",
      }}
    >
      {/* Card Header */}
      <div className="p-5">
        {/* Top Row */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "var(--surface2)" }}
            >
              {rankEmoji ?? <span style={{ color: "var(--muted)" }}>#{c.rank}</span>}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>
                {c.candidate_name || "Unknown Candidate"}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{c.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: badge.bg, color: badge.text }}
            >
              {c.recommendation}
            </span>
            <ScoreRing score={c.overall_score} />
          </div>
        </div>

        {/* Score Bars */}
        <ScoreBar label="Skills Match" score={c.skill_score}      color="#3b82f6" icon={<Code size={11} />}     animate={animate} />
        <ScoreBar label="Experience"   score={c.experience_score} color="#8b5cf6" icon={<Clock size={11} />}    animate={animate} />
        <ScoreBar label="Education"    score={c.education_score}  color="#06b6d4" icon={<BookOpen size={11} />} animate={animate} />
        <ScoreBar label="Keywords"     score={c.keyword_score}    color="#f59e0b" icon={<Target size={11} />}   animate={animate} />

        {/* Skill Tags */}
        {((c.matching_skills?.length ?? 0) > 0 || (c.skill_gaps?.length ?? 0) > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {c.matching_skills?.slice(0, 6).map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-md text-xs font-medium"
                style={{ background: "#10b98118", color: "#10b981" }}>✓ {s}</span>
            ))}
            {c.skill_gaps?.slice(0, 4).map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-md text-xs font-medium"
                style={{ background: "#ef444418", color: "#ef4444" }}>✗ {s}</span>
            ))}
          </div>
        )}

        {/* Toggles row */}
        <div className="flex items-center gap-4 mt-4">
          {hasImprovements && (
            <button
              onClick={() => setOpen((p) => !p)}
              className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
              style={{ color: "var(--muted)" }}
            >
              <Lightbulb size={11} />
              {open ? "Hide" : "Show"} improvements
              {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
          <button
            onClick={loadAts}
            className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: atsData ? "#10b981" : "var(--muted)" }}
          >
            <ShieldCheck size={11} />
            {atsOpen ? "Hide" : "Check"} ATS Score
            {atsData && <span className="font-bold ml-0.5" style={{ color: atsColor(atsData.overall_ats_score) }}>
              {atsData.overall_ats_score}%
            </span>}
            {atsLoading ? <Loader2 size={11} className="animate-spin" /> : atsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>

      {/* Match Improvement Section */}
      {open && hasImprovements && (
        <div className="px-5 pb-5 pt-4 border-t" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
          <p className="text-xs font-semibold tracking-wide mb-3" style={{ color: "var(--muted)" }}>
            JOB MATCH — AREAS TO IMPROVE
          </p>
          <ul className="space-y-2">
            {c.weaknesses?.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--muted)" }}>
                <XCircle size={12} className="flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                {w}
              </li>
            ))}
            {c.skill_gaps?.map((g, i) => (
              <li key={`gap-${i}`} className="flex items-start gap-2 text-xs" style={{ color: "var(--muted)" }}>
                <TrendingUp size={12} className="flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                Consider adding <strong className="mx-0.5" style={{ color: "#f59e0b" }}>{g}</strong> to your profile
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ATS Score Panel */}
      {atsOpen && (
        <div className="border-t" style={{ borderColor: "var(--border)" }}>
          {atsLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm" style={{ color: "var(--muted)" }}>
              <Loader2 size={16} className="animate-spin" />
              Running ATS analysis…
            </div>
          )}
          {atsError && (
            <div className="px-5 py-4 text-xs" style={{ color: "#ef4444" }}>
              <XCircle size={12} className="inline mr-1.5" />{atsError}
            </div>
          )}
          {atsData && !atsLoading && (
            <div className="px-5 py-5" style={{ background: "var(--surface2)" }}>
              {/* ATS Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={15} style={{ color: atsColor(atsData.overall_ats_score) }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    ATS Readability Analysis
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {[
                    { label: "Readable", score: atsData.readability_score },
                    { label: "Keywords", score: atsData.keyword_density_score },
                    { label: "Format",   score: atsData.format_score },
                  ].map(({ label, score }) => (
                    <div key={label} className="text-center">
                      <div className="text-xs font-bold tabular-nums" style={{ color: atsColor(score) }}>{score}%</div>
                      <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
                    </div>
                  ))}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                    style={{ borderColor: atsColor(atsData.overall_ats_score) }}
                  >
                    <span className="text-base font-black" style={{ color: atsColor(atsData.overall_ats_score) }}>
                      {atsData.overall_ats_score}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section Scores */}
              <p className="text-xs font-semibold tracking-wide mb-3" style={{ color: "var(--muted)" }}>
                SECTION BREAKDOWN
              </p>
              <div className="space-y-3 mb-5">
                {Object.entries(atsData.sections ?? {}).map(([key, sec]) => {
                  if (!sec) return null;
                  const color = ATS_SECTION_COLORS[key] ?? "#6b7280";
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                          <span style={{ color: atsStatusColor(sec.status), fontWeight: 700, fontSize: 11 }}>
                            {atsStatusIcon(sec.status)}
                          </span>
                          {ATS_SECTION_LABELS[key] ?? key}
                        </span>
                        <span className="text-xs font-bold tabular-nums" style={{ color }}>{sec.score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${sec.score}%`,
                            background: `linear-gradient(90deg, ${color}70, ${color})`,
                            transition: "width 0.8s ease-out",
                          }}
                        />
                      </div>
                      {sec.suggestions?.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {sec.suggestions.map((s, i) => (
                            <li key={i} className="text-xs pl-3" style={{ color: "var(--muted)" }}>
                              • {s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Top Improvements */}
              {(atsData.top_improvements?.length ?? 0) > 0 && (
                <>
                  <p className="text-xs font-semibold tracking-wide mb-2" style={{ color: "var(--muted)" }}>
                    TOP IMPROVEMENTS
                  </p>
                  <ul className="space-y-1.5 mb-4">
                    {atsData.top_improvements.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--muted)" }}>
                        <TrendingUp size={11} className="flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* ATS Tips */}
              {(atsData.ats_tips?.length ?? 0) > 0 && (
                <>
                  <p className="text-xs font-semibold tracking-wide mb-2" style={{ color: "var(--muted)" }}>
                    ATS FORMATTING TIPS
                  </p>
                  <ul className="space-y-1.5">
                    {atsData.ats_tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--muted)" }}>
                        <CheckCircle size={11} className="flex-shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function HomePage() {
  const [files, setFiles]       = useState<File[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany]   = useState("");
  const [jdText, setJdText]     = useState("");
  const [phase, setPhase]       = useState<Phase>("idle");
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError]       = useState("");
  const [animateBars, setAnimateBars] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ──────────────────────────────────────────────────────
  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter(
      (f) =>
        f.type === "application/pdf" ||
        f.name.endsWith(".docx") ||
        f.name.endsWith(".doc") ||
        f.type === "text/plain"
    );
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !existing.has(f.name))];
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (name: string) => setFiles((p) => p.filter((f) => f.name !== name));

  // ── Ranking flow ───────────────────────────────────────────────────────
  const handleRank = async () => {
    if (files.length === 0) { setError("Upload at least one resume to continue."); return; }
    if (!jdText.trim())     { setError("Paste a job description to continue."); return; }
    setError("");
    setAnimateBars(false);
    setCandidates([]);

    try {
      // 0 — Verify backend is reachable (retry once after 2s for cold starts)
      let healthPassed = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
          const ping = await fetch(`${BASE}/health`);
          if (!ping.ok) throw new Error("http_error");
          const { groq_key_set } = await ping.json();
          if (!groq_key_set) {
            setError("GROQ_API_KEY is not set on the server. Add it as a Space Secret on HuggingFace.");
            setPhase("error");
            return;
          }
          healthPassed = true;
          break;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "";
          if (msg === "http_error") break; // server is up but returned error — no point retrying
        }
      }
      if (!healthPassed) {
        setError("Cannot reach the API server. Make sure the backend is running.");
        setPhase("error");
        return;
      }

      // 1a — Clear previous session data so old CVs don't carry over
      await fetch(`${BASE}/api/dashboard/clear`, { method: "POST" });

      // 1 — Upload resumes
      setPhase("uploading");
      setProgress({ current: 0, total: files.length, label: "Parsing resumes with AI…" });
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      const uploadRes = await fetch(`${BASE}/api/resumes/upload`, { method: "POST", body: form });
      if (!uploadRes.ok) throw new Error("Resume upload failed — check backend is running");

      // 2 — Create job
      setPhase("creating");
      setProgress({ current: 0, total: 0, label: "Extracting requirements from job description…" });
      const jobRes = await fetch(`${BASE}/api/jobs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobTitle.trim() || "Untitled Position",
          company: company.trim() || undefined,
          description: jdText,
        }),
      });
      if (!jobRes.ok) throw new Error("Failed to create job");
      const job = await jobRes.json();

      // 3 — Stream AI matching
      setPhase("matching");
      setProgress({ current: 0, total: files.length, label: "Starting AI matching engine…" });

      await new Promise<void>((resolve) => {
        const es = new EventSource(`${BASE}/api/jobs/${job.id}/match/stream`);
        const timeout = setTimeout(() => { es.close(); resolve(); }, 120_000);

        es.onmessage = (e) => {
          try {
            const data: StreamEvent = JSON.parse(e.data);
            if (data.event === "progress" || data.event === "match_done") {
              setProgress({
                current: data.current ?? 0,
                total:   data.total   ?? files.length,
                label: data.candidate
                  ? data.score
                    ? `Scored ${data.candidate} — ${data.score}% match`
                    : `Analyzing ${data.candidate}…`
                  : "Processing…",
              });
            } else if (data.event === "complete") {
              clearTimeout(timeout);
              es.close();
              resolve();
            }
          } catch { /* skip */ }
        };
        es.onerror = () => { clearTimeout(timeout); es.close(); resolve(); };
      });

      // 4 — Fetch ranked list
      const candRes = await fetch(`${BASE}/api/jobs/${job.id}/candidates`);
      if (!candRes.ok) throw new Error("Failed to fetch ranking results");
      const body = await candRes.json();
      const ranked: Candidate[] = body.candidates ?? body;
      setCandidates(ranked);
      setPhase("done");
      setTimeout(() => setAnimateBars(true), 150);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setPhase("error");
    }
  };

  const reset = () => {
    setPhase("idle");
    setFiles([]);
    setJobTitle("");
    setCompany("");
    setJdText("");
    setCandidates([]);
    setError("");
    setAnimateBars(false);
    setProgress({ current: 0, total: 0, label: "" });
  };

  const busy        = phase === "uploading" || phase === "creating" || phase === "matching";
  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  // ── Phase labels ───────────────────────────────────────────────────────
  const phaseLabel: Record<string, string> = {
    uploading: "Parsing Resumes",
    creating:  "Analyzing Job Description",
    matching:  "AI Matching in Progress",
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 border-b px-6 py-3 flex items-center justify-between backdrop-blur"
        style={{
          borderColor: "var(--border)",
          background: "rgba(30,41,59,0.92)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
            style={{ background: "var(--accent)" }}
          >
            🎯
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>RecruitAI</span>
          <span
            className="hidden sm:inline px-2 py-0.5 rounded text-xs"
            style={{ background: "var(--surface2)", color: "var(--muted)" }}
          >
            Powered by Groq LLM
          </span>
        </div>
        {phase === "done" && (
          <button
            onClick={reset}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-opacity hover:opacity-70"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            New Analysis
          </button>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-5 py-10">

        {/* ── Hero Text ────────────────────────────────────────────────── */}
        {(phase === "idle" || phase === "error") && (
          <div className="text-center mb-10">
            <h1
              className="text-4xl font-black mb-3 tracking-tight"
              style={{ color: "var(--text)" }}
            >
              AI Resume Ranker
            </h1>
            <p className="text-sm max-w-md mx-auto" style={{ color: "var(--muted)" }}>
              Upload resumes, paste a job description, and let AI rank candidates
              by skills, experience, and keyword match — instantly.
            </p>
          </div>
        )}

        {/* ── Input Phase ──────────────────────────────────────────────── */}
        {(phase === "idle" || phase === "error") && (
          <div className="space-y-4">

            {/* Two-column input grid */}
            <div className="grid md:grid-cols-2 gap-4">

              {/* ── Upload Card ──────────────────────────────────────── */}
              <div
                className="rounded-2xl border p-5"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={15} style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    Upload Resumes
                  </span>
                  {files.length > 0 && (
                    <span
                      className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: "#3b82f620", color: "var(--accent)" }}
                    >
                      {files.length}
                    </span>
                  )}
                </div>

                {/* Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all mb-3"
                  style={{
                    borderColor: dragOver ? "var(--accent)" : "var(--border)",
                    background: dragOver ? "#3b82f608" : "var(--surface2)",
                  }}
                >
                  <Upload
                    size={22}
                    className="mx-auto mb-2"
                    style={{ color: dragOver ? "var(--accent)" : "var(--muted)" }}
                  />
                  <p className="text-sm font-medium mb-0.5" style={{ color: "var(--text)" }}>
                    Drop resumes here
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    PDF · DOCX · TXT — multiple files OK
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <ul className="space-y-1.5 max-h-44 overflow-y-auto">
                    {files.map((f) => (
                      <li
                        key={f.name}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                        style={{ background: "var(--surface2)" }}
                      >
                        <FileText size={11} style={{ color: "var(--accent)" }} className="flex-shrink-0" />
                        <span className="flex-1 truncate" style={{ color: "var(--text)" }}>
                          {f.name}
                        </span>
                        <button
                          onClick={() => removeFile(f.name)}
                          className="flex-shrink-0 transition-opacity hover:opacity-60"
                        >
                          <X size={11} style={{ color: "var(--muted)" }} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ── Job Description Card ─────────────────────────────── */}
              <div
                className="rounded-2xl border p-5 flex flex-col"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase size={15} style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    Job Description
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="Job Title  (e.g. Senior Backend Engineer)"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm mb-2 outline-none"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Company  (optional)"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm mb-2 outline-none"
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <textarea
                  placeholder={"Paste the full job description here…\n\nInclude required skills, responsibilities, and qualifications for best matching accuracy."}
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  className="flex-1 w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
                  rows={9}
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm"
                style={{
                  background: "#ef444412",
                  border: "1px solid #ef444430",
                  color: "#ef4444",
                }}
              >
                <XCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleRank}
              className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                color: "#fff",
                boxShadow: "0 4px 28px rgba(59,130,246,0.25)",
              }}
            >
              <Zap size={16} />
              Rank Resumes with AI
            </button>
          </div>
        )}

        {/* ── Processing State ─────────────────────────────────────────── */}
        {busy && (
          <div className="flex flex-col items-center py-24">
            {/* Spinner */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: "linear-gradient(135deg, #3b82f620, #8b5cf620)" }}
            >
              <Loader2 size={28} className="animate-spin" style={{ color: "var(--accent)" }} />
            </div>

            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>
              {phaseLabel[phase] ?? "Processing…"}
            </h2>
            <p
              className="text-sm mb-10 text-center max-w-sm"
              style={{ color: "var(--muted)" }}
            >
              {progress.label || "Please wait while AI processes your data…"}
            </p>

            {/* Matching progress bar */}
            {phase === "matching" && progress.total > 0 && (
              <div className="w-full max-w-sm">
                <div
                  className="flex justify-between text-xs mb-2"
                  style={{ color: "var(--muted)" }}
                >
                  <span>Candidates processed</span>
                  <span className="font-semibold tabular-nums">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "var(--surface2)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                    }}
                  />
                </div>
                <p
                  className="text-center mt-2 text-xs font-bold tabular-nums"
                  style={{ color: "var(--accent)" }}
                >
                  {progressPct}%
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
        {phase === "done" && (
          <>
            {/* Results Header */}
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>
                  Ranking Results
                </h2>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} ranked by overall AI match score
                </p>
              </div>
              {candidates[0] && (
                <div className="text-right">
                  <Award size={18} style={{ color: "#f59e0b" }} className="ml-auto mb-1" />
                  <p className="text-xs font-semibold" style={{ color: "#10b981" }}>
                    {candidates[0].overall_score}% — {candidates[0].candidate_name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Top match</p>
                </div>
              )}
            </div>

            {/* Score Legend */}
            <div
              className="rounded-xl px-4 py-3 mb-5 flex flex-wrap items-center gap-x-5 gap-y-2"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {[
                { color: "#3b82f6", label: "Skills Match" },
                { color: "#8b5cf6", label: "Experience" },
                { color: "#06b6d4", label: "Education" },
                { color: "#f59e0b", label: "Keywords" },
              ].map(({ color, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  <span
                    className="inline-block w-3 h-1.5 rounded-full"
                    style={{ background: color }}
                  />
                  {label}
                </span>
              ))}
              <span className="text-xs ml-auto" style={{ color: "var(--muted)" }}>
                <Lightbulb size={11} className="inline mr-1" />
                Expand a card to see improvement suggestions
              </span>
            </div>

            {/* Candidate Cards */}
            <div className="space-y-4">
              {candidates.map((c) => (
                <CandidateCard key={c.match_id} c={c} animate={animateBars} />
              ))}
            </div>

            {/* Footer CTA */}
            <div
              className="mt-8 rounded-2xl p-6 text-center border"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <CheckCircle size={22} className="mx-auto mb-2" style={{ color: "#10b981" }} />
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text)" }}>
                Analysis complete
              </p>
              <p className="text-xs mb-5" style={{ color: "var(--muted)" }}>
                Expand each card to view personalized improvement suggestions
              </p>
              <button
                onClick={reset}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ background: "var(--surface2)", color: "var(--text)" }}
              >
                Start New Analysis
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
