export type PlatformRole = "platform_admin" | "customer";
export type WorkspaceMode = "recruitment" | "consulting" | "hybrid";
export type JobType = "internal_role" | "client_assignment";
export type ApplicationStage =
  | "new"
  | "review"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";
export type AccountPermission =
  | "manage_jobs"
  | "manage_candidates"
  | "manage_consultants"
  | "manage_accounts";

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

export interface OrganizationMembership {
  organization_id: string;
  user_id: string;
  role: "owner" | "recruiter" | "viewer";
  permissions: AccountPermission[];
}

export interface Job {
  published?: boolean;
  public_slug?: string | null;
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
  updated_at?: string;
  responsibilities?: string[];
  required_skills?: string[];
  preferred_skills?: string[];
  hiring_manager?: string;
  closing_date?: string;
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
  experience?: Array<{
    role: string;
    company: string;
    period: string;
    summary: string;
  }>;
  education?: Array<{ qualification: string; school: string; period: string }>;
  recruiter?: string;
  next_step?: string;
  notes?: string[];
  cv_file_name?: string;
  cv_uploaded_at?: string;
  cv_source?: "uploaded" | "demo_profile";
  cv_storage_path?: string;
  photo_path?: string;
  photo_file_name?: string;
  photo_url?: string;
  explicitly_not_met?: string[];
  skill_evidence?: Record<string, { section: string; page?: number }>;
  cv_pages?: Array<{ page: number; text: string }>;
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
  model?: string;
  input_snapshot?: Record<string, unknown>;
  candidate_document_id?: string | null;
  job_updated_at?: string | null;
  reviewed_comment?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface CandidateDocument {
  id: string;
  organization_id: string;
  candidate_id: string;
  storage_path: string;
  file_name: string;
  mime_type: "application/pdf";
  size_bytes: number;
  uploaded_at: string;
  superseded_at: string | null;
  extracted_pages: Array<{ page: number; text: string }>;
  extraction_status: "pending" | "complete" | "failed";
  extraction_error: string | null;
}

export interface Activity {
  id: string;
  organization_id: string;
  actor_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WorkspaceData {
  profile: Profile;
  organizations: Organization[];
  memberships: OrganizationMembership[];
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  evaluations: AiEvaluation[];
  documents: CandidateDocument[];
  activities: Activity[];
}
