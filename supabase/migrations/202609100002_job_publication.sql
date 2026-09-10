-- Public catalog exposes advertisement content only; tenant tables remain private.
create or replace function public.list_public_jobs()
returns table(id uuid, public_slug text, organization_name text, title text, department text, location text, employment_type text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.public_slug, o.name, j.title, j.department, j.location, j.employment_type
  from public.jobs j join public.organizations o on o.id = j.organization_id
  where j.published and j.public_slug is not null and j.status = 'open'
    and (j.closing_date is null or j.closing_date >= current_date)
  order by j.created_at desc, j.id;
$$;
revoke all on function public.list_public_jobs() from public;
grant execute on function public.list_public_jobs() to anon, authenticated;

create or replace function public.set_job_publication(job_id uuid, publish boolean)
returns setof public.jobs language plpgsql security definer set search_path = '' as $$
declare target public.jobs;
begin
  select * into target from public.jobs where id = job_id for update;
  if not found or auth.uid() is null or not public.has_org_permission(target.organization_id, 'manage_jobs') then
    raise exception 'Job not found or permission denied.';
  end if;
  if publish and (coalesce(trim(target.title), '') = '' or coalesce(trim(target.description), '') = '') then
    raise exception 'Add a title and description before publishing.';
  end if;
  if publish and (target.status <> 'open' or target.closing_date < current_date) then
    raise exception 'Only open jobs with a current closing date can be published.';
  end if;
  return query update public.jobs set published = publish,
    public_slug = case when publish then coalesce(public_slug, 'job-' || id::text) else public_slug end
    where id = target.id returning *;
end;
$$;
revoke all on function public.set_job_publication(uuid, boolean) from public, anon;
grant execute on function public.set_job_publication(uuid, boolean) to authenticated;
