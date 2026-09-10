-- Public forms write through the Edge Function only. Tenant tables stay private.
alter table public.applications add column if not exists privacy_accepted_at timestamptz;

create or replace function public.get_public_job(slug text)
returns table(id uuid, organization_id uuid, organization_name text, title text, department text, location text, description text, employment_type text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.organization_id, o.name, j.title, j.department, j.location, j.description, j.employment_type
  from public.jobs j join public.organizations o on o.id = j.organization_id
  where j.public_slug = slug and j.published = true and j.status = 'open'
    and (j.closing_date is null or j.closing_date >= current_date)
  limit 1;
$$;

create table public.application_rate_limits (
  key text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
alter table public.application_rate_limits enable row level security;
revoke all on public.application_rate_limits from anon, authenticated;

create function public.reserve_application_attempt(rate_key text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare attempt_count integer;
begin
  delete from public.application_rate_limits where window_start < now() - interval '1 day';
  insert into public.application_rate_limits as limits(key, window_start, attempts)
  values (rate_key, now(), 1)
  on conflict(key) do update set
    attempts = case when limits.window_start < now() - interval '15 minutes' then 1 else limits.attempts + 1 end,
    window_start = case when limits.window_start < now() - interval '15 minutes' then now() else limits.window_start end
  returning attempts into attempt_count;
  return attempt_count <= 8;
end;
$$;
revoke all on function public.reserve_application_attempt(text) from public, anon, authenticated;
grant execute on function public.reserve_application_attempt(text) to service_role;

create function public.submit_public_application(slug text, person jsonb, document jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target public.jobs; candidate_uuid uuid; application_uuid uuid;
begin
  select * into target from public.jobs
    where public_slug = slug and published = true and status = 'open'
      and (closing_date is null or closing_date >= current_date) for share;
  if not found then raise exception 'This role is not accepting applications.'; end if;
  candidate_uuid := (person->>'id')::uuid;
  if document->>'storage_path' not like target.organization_id::text || '/' || candidate_uuid::text || '/%' then
    raise exception 'Invalid document location.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target.id::text || lower(person->>'email'), 0));
  if exists(select 1 from public.applications a join public.candidates c on c.id = a.candidate_id
    where a.job_id = target.id and lower(c.email) = lower(person->>'email')
      and a.created_at > now() - interval '15 minutes') then
    raise exception 'An application with this email was already received recently. Please wait before trying again.';
  end if;
  insert into public.candidates(id, organization_id, full_name, professional_title, email, phone, linkedin_url, summary, notes)
  values (candidate_uuid, target.organization_id, person->>'full_name', target.title,
    lower(person->>'email'), person->>'phone', person->>'linkedin_url', person->>'motivation',
    case when coalesce(person->>'website','') <> '' then array['Applicant website: ' || (person->>'website')] else '{}' end);
  insert into public.applications(organization_id, job_id, candidate_id, stage, privacy_accepted_at)
  values(target.organization_id, target.id, candidate_uuid, 'new', now()) returning id into application_uuid;
  insert into public.candidate_documents(organization_id,candidate_id,storage_path,file_name,mime_type,size_bytes,extracted_pages,extraction_status)
  values(target.organization_id,candidate_uuid,document->>'storage_path',document->>'file_name','application/pdf',
    (document->>'size_bytes')::bigint,coalesce(document->'pages','[]'::jsonb),
    case when jsonb_array_length(coalesce(document->'pages','[]'::jsonb)) > 0 then 'complete' else 'pending' end);
  return application_uuid;
end;
$$;
revoke all on function public.submit_public_application(text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.submit_public_application(text,jsonb,jsonb) to service_role;
