export interface Resume {
  id: number;
  filename: string;
  candidate_name: string;
  email?: string;
  skills: string[];
  years_of_experience?: number;
  education?: Array<{ degree: string; institution: string; year: string }>;
  created_at: string;
}

export interface ParsedResume {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  years_of_experience?: number;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{ degree: string; institution: string; year: string }>;
  certifications: string[];
  projects: Array<{ name: string; description: string; technologies: string[] }>;
}

export interface Job {
  id: number;
  title: string;
  company?: string;
  status: string;
  required_skills: string[];
  seniority_level: string;
  experience_required: string;
  match_count: number;
  created_at: string;
}

export interface JobDetail extends Job {
  description: string;
  parsed_requirements: {
    required_skills: string[];
    preferred_skills: string[];
    experience_required: string;
    education_required: string;
    responsibilities: string[];
    keywords: string[];
    seniority_level: string;
    experience_years_min: number;
    experience_years_max: number;
  };
}

export interface Candidate {
  match_id: number;
  resume_id: number;
  candidate_name: string;
  email?: string;
  rank: number;
  overall_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  keyword_score: number;
  recommendation: "Strong Match" | "Good Match" | "Potential Match" | "Weak Match";
  matching_skills: string[];
  skill_gaps: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface CandidateAnalysis {
  match_id: number;
  job_id: number;
  resume_id: number;
  candidate: ParsedResume & { name: string };
  scores: {
    overall: number;
    skill: number;
    experience: number;
    education: number;
    keyword: number;
  };
  recommendation: string;
  rank: number;
  matching_skills: string[];
  skill_gaps: string[];
  strengths: string[];
  weaknesses: string[];
  explanation: string;
  resume_feedback: string;
}

export interface DashboardStats {
  total_resumes: number;
  total_jobs: number;
  total_matches: number;
  avg_match_score: number;
  strong_matches: number;
  shortlisted: number;
  score_distribution: Array<{ range: string; count: number }>;
  recent_resumes: Array<{ id: number; name: string; created_at: string }>;
  recent_jobs: Array<{ id: number; title: string; company: string; created_at: string }>;
}
