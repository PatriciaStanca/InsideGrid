import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type {
  AiEvaluation,
  Activity,
  Application,
  ApplicationStage,
  Candidate,
  CandidateDocument,
  Job,
  Organization,
  OrganizationMembership,
  Profile,
  WorkspaceData,
  WorkspaceMode,
} from "../types";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

export async function getSession(): Promise<Session | null> {
  const client = requireClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signIn(email: string, password: string) {
  const client = requireClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const client = requireClient();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(callback: (session: Session | null) => void) {
  const client = requireClient();
  return client.auth.onAuthStateChange((_event, session) => callback(session))
    .data.subscription;
}

export async function loadWorkspace(userId: string): Promise<WorkspaceData> {
  const client = requireClient();
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, full_name, email, platform_role")
    .eq("id", userId)
    .single();
  if (profileError) throw profileError;

  let organizationQuery = client
    .from("organizations")
    .select("id, name, workspace_mode")
    .order("name");
  if ((profile as Profile).platform_role !== "platform_admin") {
    const { data: memberships, error: membershipError } = await client
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId);
    if (membershipError) throw membershipError;
    const ids = (memberships ?? []).map(
      (item) => item.organization_id as string,
    );
    organizationQuery = organizationQuery.in(
      "id",
      ids.length ? ids : ["00000000-0000-0000-0000-000000000000"],
    );
  }

  const [
    organizationResult,
    membershipResult,
    jobsResult,
    candidatesResult,
    applicationsResult,
    evaluationsResult,
    documentsResult,
    activitiesResult,
  ] = await Promise.all([
    organizationQuery,
    client
      .from("organization_members")
      .select("organization_id, user_id, role, permissions"),
    client.from("jobs").select("*").order("created_at", { ascending: false }),
    client
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false }),
    client
      .from("applications")
      .select("*")
      .order("position")
      .order("created_at", { ascending: false }),
    client
      .from("ai_evaluations")
      .select("*")
      .order("created_at", { ascending: false }),
    client
      .from("candidate_documents")
      .select("*")
      .is("superseded_at", null)
      .order("uploaded_at", { ascending: false }),
    client
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const firstError = [
    organizationResult,
    membershipResult,
    jobsResult,
    candidatesResult,
    applicationsResult,
    evaluationsResult,
    documentsResult,
    activitiesResult,
  ].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const hydratedCandidates = await Promise.all(
    ((candidatesResult.data ?? []) as Candidate[]).map(async (candidate) => {
      const document = (
        (documentsResult.data ?? []) as CandidateDocument[]
      ).find((item) => item.candidate_id === candidate.id);
      let photoUrl: string | undefined;
      if (candidate.photo_path) {
        const { data } = await client.storage
          .from("candidate-photos")
          .createSignedUrl(candidate.photo_path, 3600);
        photoUrl = data?.signedUrl;
      }
      return {
        ...candidate,
        ...(document
          ? {
              cv_file_name: document.file_name,
              cv_uploaded_at: document.uploaded_at,
              cv_source: "uploaded" as const,
              cv_storage_path: document.storage_path,
              cv_pages: document.extracted_pages,
            }
          : {}),
        ...(photoUrl ? { photo_url: photoUrl } : {}),
      };
    }),
  );

  return {
    profile: profile as Profile,
    organizations: (organizationResult.data ?? []) as Organization[],
    memberships: (membershipResult.data ?? []) as OrganizationMembership[],
    jobs: (jobsResult.data ?? []) as Job[],
    candidates: hydratedCandidates,
    applications: (applicationsResult.data ?? []) as Application[],
    evaluations: (evaluationsResult.data ?? []) as AiEvaluation[],
    documents: (documentsResult.data ?? []) as CandidateDocument[],
    activities: (activitiesResult.data ?? []) as Activity[],
  };
}

export async function uploadCandidateCv(
  candidate: Candidate,
  file: File,
  extractedPages: Array<{ page: number; text: string }>,
): Promise<CandidateDocument> {
  if (file.type !== "application/pdf")
    throw new Error("CV must be a PDF file.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("CV must be 10 MB or smaller.");
  const client = requireClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${candidate.organization_id}/${candidate.id}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await client.storage
    .from("candidate-resumes")
    .upload(storagePath, file, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) throw uploadError;
  const { data, error } = await client
    .from("candidate_documents")
    .insert({
      organization_id: candidate.organization_id,
      candidate_id: candidate.id,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      extracted_pages: extractedPages,
      extraction_status: "complete",
      extraction_error: null,
    })
    .select()
    .single();
  if (error) {
    await client.storage.from("candidate-resumes").remove([storagePath]);
    throw error;
  }
  return data as CandidateDocument;
}

export async function getCandidateCvUrl(
  storagePath: string,
  downloadFileName?: string,
): Promise<string> {
  const client = requireClient();
  const { data, error } = await client.storage
    .from("candidate-resumes")
    .createSignedUrl(
      storagePath,
      60,
      downloadFileName ? { download: downloadFileName } : undefined,
    );
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadCandidatePhoto(
  candidate: Candidate,
  file: File,
): Promise<{ path: string; url: string }> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type))
    throw new Error("Photo must be JPG, PNG, or WebP.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Photo must be 5 MB or smaller.");
  const client = requireClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${candidate.organization_id}/${candidate.id}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await client.storage
    .from("candidate-photos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { error: updateError } = await client
    .from("candidates")
    .update({ photo_path: path, photo_file_name: file.name })
    .eq("id", candidate.id);
  if (updateError) {
    await client.storage.from("candidate-photos").remove([path]);
    throw updateError;
  }
  const { data, error } = await client.storage
    .from("candidate-photos")
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return { path, url: data.signedUrl };
}

export async function createJob(
  input: Omit<Job, "id" | "created_at">,
): Promise<Job> {
  const client = requireClient();
  const { data, error } = await client
    .from("jobs")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Job;
}

export async function createCandidate(
  input: Omit<Candidate, "id" | "created_at">,
): Promise<Candidate> {
  const client = requireClient();
  const { data, error } = await client
    .from("candidates")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Candidate;
}

export async function updateCandidateNotes(
  id: string,
  notes: string[],
): Promise<Candidate> {
  const client = requireClient();
  const { data, error } = await client
    .from("candidates")
    .update({ notes })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Candidate;
}

export async function createApplication(
  input: Pick<Application, "organization_id" | "job_id" | "candidate_id">,
): Promise<Application> {
  const client = requireClient();
  const { data, error } = await client
    .from("applications")
    .insert({ ...input, stage: "new" })
    .select()
    .single();
  if (error) throw error;
  return data as Application;
}

export async function updateApplicationStage(
  id: string,
  stage: ApplicationStage,
): Promise<Application> {
  const client = requireClient();
  const { data, error } = await client
    .from("applications")
    .update({ stage, stage_changed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Application;
}

export async function createOrganization(
  name: string,
  workspaceMode: WorkspaceMode,
): Promise<Organization> {
  const client = requireClient();
  const { data, error } = await client
    .from("organizations")
    .insert({ name, workspace_mode: workspaceMode })
    .select("id, name, workspace_mode")
    .single();
  if (error) throw error;
  return data as Organization;
}

export async function createUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: "customer" | "platform_admin";
  organizationId?: string;
  organizationName?: string;
  workspaceMode?: WorkspaceMode;
  permissions?: string[];
}) {
  const client = requireClient();
  const { data, error } = await client.functions.invoke("create-user", {
    body: input,
  });
  if (error) throw error;
  if (!data?.user)
    throw new Error(data?.error ?? "The account could not be created.");
  return data;
}

export async function requestAiEvaluation(
  applicationId: string,
): Promise<AiEvaluation> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke("evaluate-candidate", {
    body: { applicationId },
  });
  if (error) throw error;
  if (!data?.evaluation)
    throw new Error(data?.error ?? "The AI insights could not be created.");
  return data.evaluation as AiEvaluation;
}

export async function reviewAiEvaluation(
  id: string,
  comment: string,
): Promise<AiEvaluation> {
  const client = requireClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    throw (
      authError ?? new Error("You must be signed in to review an evaluation.")
    );
  }
  const { data, error } = await client
    .from("ai_evaluations")
    .update({
      reviewed_comment: comment,
      reviewed_at: new Date().toISOString(),
      reviewed_by: authData.user.id,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AiEvaluation;
}

export async function generateJobDescription(input: {
  organizationId: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  workspaceMode: WorkspaceMode;
  companyWebsite?: string;
  companyName?: string;
  companyValues?: string;
  exampleAdvertisement?: string;
  currentDraft?: string;
  researchNotes?: string[];
}): Promise<{ description: string; sources: { title: string; url: string }[] }> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke(
    "generate-job-description",
    {
      body: { ...input, action: "draft" },
    },
  );
  const serverError = error?.context instanceof Response ? await error.context.clone().json().catch(() => null) : null;
  if (error || !data?.description) {
    throw new Error(
      serverError?.error ?? data?.error ??
        error?.message ??
        "The job description could not be generated.",
    );
  }
  return { description: String(data.description), sources: Array.isArray(data.sources) ? data.sources : [] };
}

export async function researchJobWithAi(input: {
  organizationId: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  workspaceMode: WorkspaceMode;
  companyWebsite: string;
  companyName?: string;
  companyValues?: string;
  exampleAdvertisement?: string;
  researchNotes: string[];
  message: string;
}): Promise<{ reply: string; sources: { title: string; url: string }[] }> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke(
    "generate-job-description",
    {
      body: { ...input, action: "chat" },
    },
  );
  const serverError = error?.context instanceof Response ? await error.context.clone().json().catch(() => null) : null;
  if (error || !data?.reply) {
    throw new Error(
      serverError?.error ?? data?.error ??
        error?.message ??
        "The AI research could not be completed.",
    );
  }
  return {
    reply: String(data.reply),
    sources: Array.isArray(data.sources) ? data.sources : [],
  };
}

export async function setJobPublication(jobId: string, publish: boolean): Promise<Job> {
  const { data, error } = await requireClient().rpc("set_job_publication", { job_id: jobId, publish });
  if (error) throw error;
  if (!data?.[0]) throw new Error("The publication status could not be saved.");
  return data[0] as Job;
}
