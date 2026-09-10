# InsideGrid

Mini-ATS for recruitment and consulting teams. Built with React, TypeScript and Supabase, extending an earlier CV and competence platform. The current runtime uses Supabase; the earlier .NET prototype is preserved in Git history rather than the delivery tree.

Live: https://patriciastanca.com/insidegrid

## Run

Requires Node.js 22+.

```sh
cd src/CvDatabase.Web
npm ci
cp .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for your Supabase project. Never put a service-role key or model API key in browser variables. The isolated interactive demo is available without an account; real authentication and persistence require Supabase.

## Features

- Platform admin creates admin/customer accounts and works in customer workspaces.
- Customer login, jobs, reusable candidate profiles, LinkedIn links and private PDF CVs.
- Job-specific applications in a compact kanban, filtered by job and candidate name.
- Published/draft jobs, searchable public job cards and an application dialog.
- Applications are linked to the organization owning the published job.
- Dashboard, notes, activity and per-requirement evidence.
- Consulting workspace with assignments, availability and editable CV drafts.
- AI-assisted company research and job drafting using Gemini and supplied reference advertisements.

## Matching and AI

The green percentage is **documented requirement coverage**: fully supported required criteria divided by all required criteria. Partial or missing evidence receives no credit. No criteria means no percentage. It is not a prediction of job performance or an automated hiring decision. Preferred criteria are presented separately.

`evaluate-candidate` reviews supplied profile/CV information and job requirements. Recruitment uses OpenAI when configured; consulting uses Gemini. A rules-only fallback is labelled as such when no provider key is available. Generated results require human review.

`generate-job-description` uses Gemini for company research and editable advertisement drafts. `consulting-assistant` supports requirement extraction and CV drafting. Model credentials remain in Supabase secrets.

## Supabase setup

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy create-user
supabase functions deploy evaluate-candidate
supabase functions deploy generate-job-description
supabase functions deploy consulting-assistant
supabase functions deploy submit-application
```

Configure `GEMINI_API_KEY`, `GEMINI_MODEL`, and optionally `OPENAI_API_KEY` / `OPENAI_MODEL` in Supabase secrets. Create the first verified administrator in Supabase Auth, then set that profile's `platform_role` to `platform_admin`. Subsequent accounts can be created in the app. Do not commit account passwords.

Migrations contain organization-scoped RLS, account permissions, CV storage, evidence records and public publication/application functions. Public endpoints expose published jobs; CV files and candidate contact details remain private.

## Tests

```sh
cd src/CvDatabase.Web
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser smoke suite uses fictional demo data. Optional live login checks use `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_CUSTOMER_EMAIL`, `E2E_CUSTOMER_PASSWORD`; never hardcode these. Unit tests cover evidence, coverage, filtering, provider/authentication boundaries and application validation. These tests are not a complete independent security audit.

## Deployment

`netlify.toml` builds and serves `src/CvDatabase.Web/dist`. Configure the two public Vite variables in the deployment environment. Supabase migrations and functions are deployed separately. The GitHub workflow verifies tests/build; it does not deploy the retired Azure backend.

## Assumptions

Each customer has a separate workspace. Administrators provision accounts. Candidate profiles can be reused for multiple jobs, with a separate stage per application. The sample job and application flow are clearly marked as demonstration data. AI supports review and writing; people decide what to publish and whom to recruit.

Asset credits and licenses: [docs/asset-licences.md](docs/asset-licences.md).
