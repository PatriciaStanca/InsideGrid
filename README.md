# InsideGrid ATS

InsideGrid is a focused, multi-tenant applicant tracking system for hiring teams and consulting firms. It connects organizations, jobs or assignments, candidates, and job-specific applications in one compact workflow.

## Assignment coverage

- Platform administrators can create administrator and customer accounts.
- Customers can sign in with Supabase Auth.
- Customers can create jobs or client assignments.
- Customers can create reusable candidate profiles, including LinkedIn URLs.
- Candidates are connected to jobs through normalized application records.
- A compact Kanban board shows candidates by stage.
- The board can be filtered by job and candidate name.
- Platform administrators can select a customer organization and manage its records.
- AI Insights compares verified profile information with job requirements without making automated hiring decisions.
- Every business record is isolated by organization using PostgreSQL Row Level Security.

## Product modes

The same data model supports three organization-level workspace modes:

- `recruitment`: recruit external candidates for internal roles.
- `consulting`: match employees, subcontractors, or external candidates with client assignments.
- `hybrid`: support both workflows.

Workspace mode changes labels and defaults; it is not an authentication role. The MVP authorization roles are `platform_admin` and `customer`.

## Architecture

```text
React 19 + Vite
        |
        | Supabase publishable key + user JWT
        v
Supabase Auth ---- PostgreSQL + RLS
        |                   |
        |                   +-- organizations / memberships
        |                   +-- jobs / candidates / applications
        |                   +-- activities / AI evaluations
        v
Edge Functions
  create-user          server-only privileged account creation
  evaluate-candidate   authenticated, tenant-scoped AI insights
```

The browser never receives a Supabase secret or service-role key. The `create-user` function verifies that the caller is a platform administrator before using privileged APIs.

## Run locally

```bash
cd src/CvDatabase.Web
npm install
cp .env.example .env.local
npm run dev
```

Until valid Supabase configuration is added, the login screen offers an interactive in-memory demo. Demo mode is for product review only; live delivery must use Supabase.

Required browser environment variables:

```env
VITE_SUPABASE_URL=https://uunaexgeunlvizbzgqrb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

The publishable key is expected in browser code and is not a secret. Authorization still depends on tested RLS policies. Never add a secret or service-role key to a `VITE_` variable.

## Configure the Supabase project

The target project reference is `uunaexgeunlvizbzgqrb`.

1. Install the Supabase CLI and authenticate locally.
2. Link this directory to the existing project.
3. Review the project region before storing candidate data.
4. Apply the versioned migration.
5. Deploy both Edge Functions.
6. Add `OPENAI_API_KEY` as an Edge Function secret if live model-backed insights are required.

```bash
supabase login
supabase link --project-ref uunaexgeunlvizbzgqrb
supabase db push
supabase functions deploy create-user
supabase functions deploy evaluate-candidate
supabase secrets set OPENAI_API_KEY=your_key
```

Supabase automatically provides its URL and platform keys to deployed functions. The source code uses the server-side function environment and never commits those values.

## Bootstrap the first platform administrator

The first administrator must exist before the in-app administrator flow can be used:

1. Create the user in Supabase Dashboard under Authentication > Users.
2. The migration trigger creates the corresponding `profiles` record.
3. Promote only that verified user in SQL Editor:

```sql
update public.profiles
set platform_role = 'platform_admin'
where email = 'verified-admin@example.com';
```

Use a dedicated demo administrator account for delivery, not a personal password. Rotate or remove it after the review period.

## AI Insights

The `evaluate-candidate` function:

- loads the application, candidate, and job through the caller's RLS-scoped client;
- uses only supplied profile and job facts;
- returns supported strengths, gaps or unknowns, and follow-up questions;
- stores the input snapshot, model identifier, actor, and result;
- never moves, rejects, or hires a candidate.

If `OPENAI_API_KEY` is absent, the function returns a transparent rule-based fallback instead of pretending that a model was called.

## Verification

```bash
cd src/CvDatabase.Web
npm run build
npm run test:e2e
npm audit
```

The browser suite covers the interactive ATS workflow on desktop and checks mobile viewport overflow. RLS must also be tested against the linked Supabase project with at least two customer organizations before production use.

## Important files

```text
src/CvDatabase.Web/src/main.tsx                 ATS interface and workflows
src/CvDatabase.Web/src/lib/api.ts               Supabase data access
src/CvDatabase.Web/src/lib/supabase.ts          safe browser client
src/CvDatabase.Web/src/data/demo.ts             isolated interactive demo data
supabase/migrations/202609070001_initial_ats.sql schema, RLS, audit trail, storage
supabase/functions/create-user/index.ts          privileged account creation
supabase/functions/evaluate-candidate/index.ts   AI decision support
docs/ats-product-research.md                     research and product decisions
```

## Delivery status

The application and Supabase implementation are complete locally. A successful local build or interactive demo does not prove that the remote project is configured. Live status requires verified migration output, deployed-function output, real admin/customer login, tenant-isolation checks, and a hosted URL.
