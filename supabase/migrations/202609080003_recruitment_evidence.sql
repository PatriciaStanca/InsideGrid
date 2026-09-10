-- Structured recruitment evidence and private CV provenance.
alter table public.jobs
  add column if not exists responsibilities text[] not null default '{}',
  add column if not exists required_skills text[] not null default '{}',
  add column if not exists preferred_skills text[] not null default '{}',
  add column if not exists hiring_manager text not null default '',
  add column if not exists closing_date date;

alter table public.candidates
  add column if not exists experience jsonb not null default '[]',
  add column if not exists education jsonb not null default '[]',
  add column if not exists recruiter text not null default '',
  add column if not exists next_step text not null default '',
  add column if not exists notes text[] not null default '{}',
  add column if not exists photo_path text,
  add column if not exists photo_file_name text;

create table if not exists public.candidate_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type = 'application/pdf'),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  extracted_pages jsonb not null default '[]' check (jsonb_typeof(extracted_pages) = 'array'),
  extraction_status text not null default 'pending' check (extraction_status in ('pending','complete','failed')),
  extraction_error text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  superseded_at timestamptz
);

alter table public.candidate_documents
  add constraint candidate_documents_candidate_same_organization
  foreign key (organization_id, candidate_id)
  references public.candidates(organization_id, id);

create index if not exists candidate_documents_latest_idx
  on public.candidate_documents(candidate_id, uploaded_at desc)
  where superseded_at is null;

alter table public.ai_evaluations
  add column if not exists candidate_document_id uuid references public.candidate_documents(id),
  add column if not exists job_updated_at timestamptz,
  add column if not exists reviewed_comment text not null default '',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id);

update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf']
where id = 'candidate-resumes';

alter table public.candidate_documents enable row level security;
revoke all on public.candidate_documents from anon, authenticated;
grant select, insert, update on public.candidate_documents to authenticated;
grant update on public.ai_evaluations to authenticated;

create policy candidate_documents_read on public.candidate_documents
for select to authenticated
using (public.is_platform_admin() or public.is_organization_member(organization_id));

create policy candidate_documents_insert on public.candidate_documents
for insert to authenticated
with check (
  (public.is_platform_admin() or public.has_org_permission(organization_id, 'manage_candidates'))
  and split_part(storage_path, '/', 1) = organization_id::text
  and split_part(storage_path, '/', 2) = candidate_id::text
);

create policy candidate_documents_update on public.candidate_documents
for update to authenticated
using (public.is_platform_admin() or public.has_org_permission(organization_id, 'manage_candidates'))
with check (public.is_platform_admin() or public.has_org_permission(organization_id, 'manage_candidates'));

create policy evaluations_recruiter_review on public.ai_evaluations
for update to authenticated
using (
  public.is_platform_admin()
  or public.has_org_permission(organization_id, 'manage_candidates')
)
with check (
  public.is_platform_admin()
  or public.has_org_permission(organization_id, 'manage_candidates')
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('candidate-photos','candidate-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy candidate_photo_read on storage.objects for select to authenticated
using (bucket_id='candidate-photos' and (public.is_platform_admin() or public.is_organization_member(((storage.foldername(name))[1])::uuid)));
create policy candidate_photo_insert on storage.objects for insert to authenticated
with check (bucket_id='candidate-photos' and (public.is_platform_admin() or public.has_org_permission(((storage.foldername(name))[1])::uuid,'manage_candidates')));
create policy candidate_photo_update on storage.objects for update to authenticated
using (bucket_id='candidate-photos' and (public.is_platform_admin() or public.has_org_permission(((storage.foldername(name))[1])::uuid,'manage_candidates')))
with check (bucket_id='candidate-photos' and (public.is_platform_admin() or public.has_org_permission(((storage.foldername(name))[1])::uuid,'manage_candidates')));
create policy candidate_photo_delete on storage.objects for delete to authenticated
using (bucket_id='candidate-photos' and (public.is_platform_admin() or public.has_org_permission(((storage.foldername(name))[1])::uuid,'manage_candidates')));
