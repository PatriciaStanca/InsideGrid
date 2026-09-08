import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type {
  AiEvaluation,
  Application,
  ApplicationStage,
  Candidate,
  Job,
  Organization,
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
    jobsResult,
    candidatesResult,
    applicationsResult,
    evaluationsResult,
  ] = await Promise.all([
    organizationQuery,
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
  ]);

  const firstError = [
    organizationResult,
    jobsResult,
    candidatesResult,
    applicationsResult,
    evaluationsResult,
  ].find((result) => result.error)?.error;
  if (firstError) throw firstError;

  return {
    profile: profile as Profile,
    organizations: (organizationResult.data ?? []) as Organization[],
    jobs: (jobsResult.data ?? []) as Job[],
    candidates: (candidatesResult.data ?? []) as Candidate[],
    applications: (applicationsResult.data ?? []) as Application[],
    evaluations: (evaluationsResult.data ?? []) as AiEvaluation[],
  };
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

export async function generateJobDescription(input: {
  organizationId: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  workspaceMode: WorkspaceMode;
  companyWebsite?: string;
  researchNotes?: string[];
}): Promise<string> {
  const client = requireClient();
  const { data, error } = await client.functions.invoke(
    "generate-job-description",
    {
      body: { ...input, action: "draft" },
    },
  );
  if (error || !data?.description) {
    throw new Error(
      data?.error ?? error?.message ?? "The job description could not be generated.",
    );
  }
  return String(data.description);
}

export async function researchJobWithAi(input: {
  organizationId: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  workspaceMode: WorkspaceMode;
  companyWebsite: string;
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
  if (error || !data?.reply) {
    throw new Error(
      data?.error ?? error?.message ?? "The AI research could not be completed.",
    );
  }
  return {
    reply: String(data.reply),
    sources: Array.isArray(data.sources) ? data.sources : [],
  };
}
