export type PlatformRole = "platform_admin" | "customer";
export type WorkspaceMode = "recruitment" | "consulting" | "hybrid";
export type JobType = "internal_role" | "client_assignment";
export type ApplicationStage = "new" | "review" | "interview" | "offer" | "hired" | "rejected";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  platform_role: PlatformRole;
}

export interface Organization {
  id: string;
  name: string;
  workspace_mode: WorkspaceMode;
}

export interface Job {
  id: string;
  organization_id: string;
  title: string;
  department: string;
  location: string;
  description: string;
  employment_type: string;
  job_type: JobType;
  status: "draft" | "open" | "paused" | "closed";
  created_at: string;
}

export interface Candidate {
  id: string;
  organization_id: string;
  full_name: string;
  professional_title: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  summary: string;
  skills: string[];
  candidate_type: "external" | "employee" | "subcontractor";
  available_from: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  organization_id: string;
  job_id: string;
  candidate_id: string;
  stage: ApplicationStage;
  position: number;
  stage_changed_at: string;
  created_at: string;
}

export interface AiEvaluation {
  id: string;
  application_id: string;
  summary: string;
  strengths: string[];
  gaps: string[];
  follow_up_questions: string[];
  created_at: string;
}

export interface WorkspaceData {
  profile: Profile;
  organizations: Organization[];
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  evaluations: AiEvaluation[];
}
