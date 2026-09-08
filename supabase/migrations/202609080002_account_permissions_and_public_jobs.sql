alter table public.organization_members
  add column if not exists permissions text[] not null default array['manage_jobs','manage_candidates'];

alter table public.jobs
  add column if not exists public_slug text,
  add column if not exists published boolean not null default false;

create unique index if not exists jobs_public_slug_unique on public.jobs(public_slug) where public_slug is not null;

create or replace function public.has_org_permission(target_organization_id uuid, requested text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_platform_admin() or exists(
    select 1 from public.organization_members
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
      and (role = 'owner' or requested = any(permissions))
  );
$$;

drop policy if exists jobs_tenant_access on public.jobs;
create policy jobs_tenant_read on public.jobs for select to authenticated
  using (public.is_platform_admin() or public.is_organization_member(organization_id));
create policy jobs_permission_write on public.jobs for all to authenticated
  using (public.has_org_permission(organization_id, 'manage_jobs'))
  with check (public.has_org_permission(organization_id, 'manage_jobs'));

drop policy if exists candidates_tenant_access on public.candidates;
create policy candidates_tenant_read on public.candidates for select to authenticated
  using (
    public.is_platform_admin() or
    (candidate_type = 'employee' and public.has_org_permission(organization_id, 'manage_consultants')) or
    (candidate_type <> 'employee' and public.has_org_permission(organization_id, 'manage_candidates'))
  );
create policy candidates_permission_write on public.candidates for all to authenticated
  using (
    public.is_platform_admin() or
    (candidate_type = 'employee' and public.has_org_permission(organization_id, 'manage_consultants')) or
    (candidate_type <> 'employee' and public.has_org_permission(organization_id, 'manage_candidates'))
  )
  with check (
    public.is_platform_admin() or
    (candidate_type = 'employee' and public.has_org_permission(organization_id, 'manage_consultants')) or
    (candidate_type <> 'employee' and public.has_org_permission(organization_id, 'manage_candidates'))
  );

drop policy if exists applications_tenant_access on public.applications;
create policy applications_tenant_read on public.applications for select to authenticated
  using (
    public.is_platform_admin() or public.has_org_permission(organization_id, 'manage_jobs') or
    public.has_org_permission(organization_id, 'manage_candidates') or public.has_org_permission(organization_id, 'manage_consultants')
  );
create policy applications_permission_write on public.applications for all to authenticated
  using (
    public.is_platform_admin() or public.has_org_permission(organization_id, 'manage_jobs') or
    public.has_org_permission(organization_id, 'manage_candidates') or public.has_org_permission(organization_id, 'manage_consultants')
  )
  with check (
    public.is_platform_admin() or public.has_org_permission(organization_id, 'manage_jobs') or
    public.has_org_permission(organization_id, 'manage_candidates') or public.has_org_permission(organization_id, 'manage_consultants')
  );

create or replace function public.get_public_job(slug text)
returns table(id uuid, organization_id uuid, organization_name text, title text, department text, location text, description text, employment_type text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.organization_id, o.name, j.title, j.department, j.location, j.description, j.employment_type
  from public.jobs j join public.organizations o on o.id = j.organization_id
  where j.public_slug = slug and j.published = true and j.status = 'open'
  limit 1;
$$;

grant execute on function public.get_public_job(text) to anon, authenticated;
