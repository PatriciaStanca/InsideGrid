create extension if not exists pgcrypto;

create type public.platform_role as enum ('platform_admin', 'customer');
create type public.organization_role as enum ('owner', 'recruiter', 'viewer');
create type public.workspace_mode as enum ('recruitment', 'consulting', 'hybrid');
create type public.job_type as enum ('internal_role', 'client_assignment');
create type public.job_status as enum ('draft', 'open', 'paused', 'closed');
create type public.candidate_type as enum ('external', 'employee', 'subcontractor');
create type public.application_stage as enum ('new', 'review', 'interview', 'offer', 'hired', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  platform_role public.platform_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  workspace_mode public.workspace_mode not null default 'recruitment',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'recruiter',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.client_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  contact_name text not null default '',
  contact_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_company_id uuid references public.client_companies(id) on delete set null,
  title text not null check (char_length(title) between 2 and 200),
  department text not null default '',
  location text not null default '',
  description text not null default '',
  employment_type text not null default '',
  job_type public.job_type not null default 'internal_role',
  status public.job_status not null default 'open',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 200),
  professional_title text not null default '',
  email text not null default '',
  phone text not null default '',
  location text not null default '',
  linkedin_url text not null default '',
  summary text not null default '',
  skills text[] not null default '{}',
  candidate_type public.candidate_type not null default 'external',
  available_from date,
  retention_until date,
  future_opportunities_consent_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  stage public.application_stage not null default 'new',
  position integer not null default 0 check (position >= 0),
  stage_changed_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, candidate_id)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.ai_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  summary text not null,
  strengths text[] not null default '{}',
  gaps text[] not null default '{}',
  follow_up_questions text[] not null default '{}',
  model text not null default 'rules-fallback',
  input_snapshot jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Keep every cross-table relationship inside the same tenant, even when a caller
-- supplies valid IDs from different organizations.
alter table public.client_companies add constraint client_companies_org_id_unique unique (organization_id, id);
alter table public.jobs add constraint jobs_org_id_unique unique (organization_id, id);
alter table public.candidates add constraint candidates_org_id_unique unique (organization_id, id);
alter table public.applications add constraint applications_org_id_unique unique (organization_id, id);
alter table public.jobs add constraint jobs_client_same_organization foreign key (organization_id, client_company_id) references public.client_companies(organization_id, id);
alter table public.applications add constraint applications_job_same_organization foreign key (organization_id, job_id) references public.jobs(organization_id, id);
alter table public.applications add constraint applications_candidate_same_organization foreign key (organization_id, candidate_id) references public.candidates(organization_id, id);
alter table public.ai_evaluations add constraint evaluations_application_same_organization foreign key (organization_id, application_id) references public.applications(organization_id, id);

create index jobs_organization_idx on public.jobs(organization_id, status);
create index candidates_organization_name_idx on public.candidates(organization_id, full_name);
create index applications_board_idx on public.applications(organization_id, job_id, stage, position);
create index activities_organization_created_idx on public.activities(organization_id, created_at desc);
create index evaluations_application_idx on public.ai_evaluations(application_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger organizations_updated before update on public.organizations for each row execute function public.set_updated_at();
create trigger clients_updated before update on public.client_companies for each row execute function public.set_updated_at();
create trigger jobs_updated before update on public.jobs for each row execute function public.set_updated_at();
create trigger candidates_updated before update on public.candidates for each row execute function public.set_updated_at();
create trigger applications_updated before update on public.applications for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.email, ''));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and platform_role = 'platform_admin');
$$;
create or replace function public.is_organization_member(target_organization_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.organization_members where organization_id = target_organization_id and user_id = (select auth.uid()));
$$;

create or replace function public.record_application_activity() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activities(organization_id, actor_id, entity_type, entity_id, action, metadata)
    values (new.organization_id, auth.uid(), 'application', new.id, 'application.created', jsonb_build_object('stage', new.stage));
  elsif old.stage is distinct from new.stage then
    insert into public.activities(organization_id, actor_id, entity_type, entity_id, action, metadata)
    values (new.organization_id, auth.uid(), 'application', new.id, 'application.stage_changed', jsonb_build_object('from', old.stage, 'to', new.stage));
  end if;
  return new;
end; $$;
create trigger application_activity after insert or update on public.applications for each row execute function public.record_application_activity();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.client_companies enable row level security;
alter table public.jobs enable row level security;
alter table public.candidates enable row level security;
alter table public.applications enable row level security;
alter table public.activities enable row level security;
alter table public.ai_evaluations enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.organizations, public.organization_members, public.activities, public.ai_evaluations to authenticated;
grant select, insert, update, delete on public.client_companies, public.jobs, public.candidates, public.applications to authenticated;
grant insert, update, delete on public.organizations, public.organization_members to authenticated;
grant insert on public.ai_evaluations to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_platform_admin());
create policy profiles_admin_update on public.profiles for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy organizations_read on public.organizations for select to authenticated using (public.is_platform_admin() or public.is_organization_member(id));
create policy organizations_admin_write on public.organizations for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy memberships_read on public.organization_members for select to authenticated using (public.is_platform_admin() or user_id = (select auth.uid()));
create policy memberships_admin_write on public.organization_members for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy clients_tenant_access on public.client_companies for all to authenticated using (public.is_platform_admin() or public.is_organization_member(organization_id)) with check (public.is_platform_admin() or public.is_organization_member(organization_id));
create policy jobs_tenant_access on public.jobs for all to authenticated using (public.is_platform_admin() or public.is_organization_member(organization_id)) with check (public.is_platform_admin() or public.is_organization_member(organization_id));
create policy candidates_tenant_access on public.candidates for all to authenticated using (public.is_platform_admin() or public.is_organization_member(organization_id)) with check (public.is_platform_admin() or public.is_organization_member(organization_id));
create policy applications_tenant_access on public.applications for all to authenticated using (public.is_platform_admin() or public.is_organization_member(organization_id)) with check (public.is_platform_admin() or public.is_organization_member(organization_id));
create policy activities_tenant_read on public.activities for select to authenticated using (public.is_platform_admin() or public.is_organization_member(organization_id));
create policy evaluations_tenant_read on public.ai_evaluations for select to authenticated using (public.is_platform_admin() or public.is_organization_member(organization_id));
create policy evaluations_tenant_insert on public.ai_evaluations for insert to authenticated with check (public.is_platform_admin() or public.is_organization_member(organization_id));

insert into storage.buckets(id, name, public) values ('candidate-resumes', 'candidate-resumes', false) on conflict (id) do nothing;
create policy resume_read on storage.objects for select to authenticated using (bucket_id = 'candidate-resumes' and (public.is_platform_admin() or public.is_organization_member(((storage.foldername(name))[1])::uuid)));
create policy resume_upload on storage.objects for insert to authenticated with check (bucket_id = 'candidate-resumes' and (public.is_platform_admin() or public.is_organization_member(((storage.foldername(name))[1])::uuid)));
create policy resume_update on storage.objects for update to authenticated using (bucket_id = 'candidate-resumes' and (public.is_platform_admin() or public.is_organization_member(((storage.foldername(name))[1])::uuid))) with check (bucket_id = 'candidate-resumes' and (public.is_platform_admin() or public.is_organization_member(((storage.foldername(name))[1])::uuid)));
create policy resume_delete on storage.objects for delete to authenticated using (bucket_id = 'candidate-resumes' and (public.is_platform_admin() or public.is_organization_member(((storage.foldername(name))[1])::uuid)));
