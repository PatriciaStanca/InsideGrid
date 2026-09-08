# From InsideGrid to a Customer-Ready Mini ATS

**Product and technical recommendation, September 7, 2026**

## Recommendation in brief

InsideGrid should not be split into two separate applications. Instead, we should build one shared platform in which the same four elements are always connected:

**Organization → job or assignment → application → candidate**

During onboarding, the customer selects the workflow that best matches their business:

1. **We recruit employees** - internal vacancies and external candidates.
2. **We match consultants with client assignments** - internal or external consultants, clients, and assignments.
3. **We do both** - a hybrid workspace.

This choice should adapt the terminology, dashboard, default stages, and available shortcuts. It should **not** be an authentication role. Users sign in in the same way regardless of the organization's business model.

This creates a clear MVP for the coding assignment while preserving InsideGrid's strongest idea: finding the right expertise for the right need.

## What an ATS actually needs to do

An ATS does more than store candidates. It tracks each candidate's process for a specific job. The same person can be considered for several jobs and be at a different stage in each process. `Candidate` and `application` must therefore be separate entities.

[Workable's product documentation](https://help.workable.com/hc/en-us/articles/115012857047-Candidate-profile-in-pipeline-view-overview) demonstrates this model: each job has its own pipeline, while each candidate has one consolidated profile containing their resume, contact details, social profiles, activities, and evaluations. [Greenhouse's Visual Candidate Pipeline](https://support.greenhouse.io/hc/en-us/articles/4874727408795-Visual-Candidate-Pipeline) organizes stages into columns and highlights time in stage, recent activity, and candidate name as important operational signals.

For a company recruiting its own employees, the core workflow is:

`New job → candidate added → review → interview → offer → hired or rejected`

For a consulting or recruitment agency, a client relationship must also be represented. [Bullhorn's staffing workflow](https://www.bullhorn.com/small-agency-software/ats-recruitment-crm/) connects the client, job order, candidate database, shortlist or submission, interview, offer, and placement. InsideGrid fits naturally into this model because candidate expertise, availability, and matching are already central concepts.

## One product, two workflows

### Recruitment workspace

- A job represents an internal vacancy.
- Candidates are external applicants.
- The final successful stage is `Hired`.
- The dashboard shows open jobs, candidates awaiting action, and processes that have stalled.

### Consulting workspace

- Jobs are presented as `Assignments`.
- An assignment can be connected to a client company.
- Candidates can be categorized as employees, subcontractors, or external candidates.
- The final successful stage is `Placed` or `Filled`.
- The dashboard shows open assignments, available consultants, and matches requiring attention.

### Why this question should not appear at every login

This choice describes the organization's business model, not the identity of the user. It belongs in onboarding or organization settings. The login page should remain simple: email, password, and clear access to the demo. Users in a hybrid organization can switch workspaces after signing in.

## The smallest data model that will last

| Table | Responsibility | Important fields |
|---|---|---|
| `organizations` | The customer's isolated workspace | `id`, `name`, `workspace_mode` |
| `profiles` | Application data for a Supabase user | `id -> auth.users`, `name`, `platform_role` |
| `organization_members` | Who can access an organization | `organization_id`, `user_id`, `role` |
| `client_companies` | Assignment client in consulting mode | `organization_id`, `name`, `contact` |
| `jobs` | Vacancy or assignment | `organization_id`, `client_company_id?`, `type`, `title`, `description`, `status` |
| `candidates` | The person's consolidated profile | `organization_id`, name, contact details, LinkedIn, skills, summary |
| `applications` | The candidate's process for one job | `organization_id`, `job_id`, `candidate_id`, `stage`, `position`, `updated_at` |
| `activities` | Traceable history | actor, event, object, timestamp |
| `ai_evaluations` | Versioned AI decision support | candidate, job, input, result, model, creator, timestamp |

The critical difference from InsideGrid today is `applications`: the current application model stores candidate IDs and names as lists. An ATS instead needs one record per candidate-job relationship because that relationship is what moves across the Kanban board.

Every business entity should contain `organization_id`. This makes customer isolation explicit, testable, and difficult to bypass accidentally.

## Roles and administrator behavior

The two roles from the coding assignment should be implemented exactly:

- `platform_admin`: can create administrator and customer accounts, select an organization, and work on behalf of that customer.
- `customer`: can only work in organizations where the user is a member.

When a platform administrator works on behalf of a customer, the selected organization should be clearly displayed at the top of the interface. Every change should record the real administrator in the activity log. We therefore do not need risky user impersonation to satisfy the requirement.

## Supabase architecture

For delivery within one week, the recommended solution is:

- Keep the React/Vite interface from InsideGrid and divide it into smaller components.
- Replace the custom local JWT login with Supabase Auth.
- Replace the current in-memory/EF storage with Supabase PostgreSQL for this product version.
- Later, use Supabase Storage for resumes in a private bucket.
- Use an authenticated Edge Function to create user accounts and run the AI evaluation.

[Supabase Auth](https://supabase.com/docs/guides/auth) combines the user's JWT with database Row Level Security. According to the [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security), grants and policies must be configured for every exposed table, and both allow and deny cases should be tested. Customer isolation must never exist only as a filter in React.

Administrator account creation must run in server-side code. Supabase explicitly states that [`auth.admin.createUser`](https://supabase.com/docs/reference/javascript/auth-admin-createuser) must only be called from a server. A secret or service-role key bypasses RLS and must never be sent to the browser. Public application data for each user should be stored in a separate `profiles` table, following [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data).

Resumes can later be stored in a private bucket protected by RLS, which is supported by [Supabase Storage](https://supabase.com/docs/guides/storage). The project's actual region should be checked before candidate data is stored. Supabase notes that a general European region may include jurisdictions outside the EU; selecting a specific EU region provides clearer data locality according to its [region documentation](https://supabase.com/docs/guides/platform/regions).

## The Kanban board to demonstrate

Recommended MVP columns:

`New` → `Review` → `Interview` → `Offer` → `Hired/Placed`

`Rejected` should be a separate outcome rather than a normal forward-moving column. Each card should show:

- candidate name and professional title,
- the related job when all jobs are displayed,
- a small number of skill tags,
- latest activity or number of days in the stage,
- AI evaluation only when one exists.

Above the board:

- job filter,
- candidate-name search,
- `Add candidate` button,
- `Create job` button,
- clear organization selector for platform administrators.

Drag and drop is valuable if time allows, but an accessible stage-change menu is a fully functional fallback. Every stage change should be persisted immediately and create an activity record.

## The AI feature: small but credible

The MVP feature should be called **AI insights**, not "AI decision." It should:

1. take the job requirements and the candidate's verified profile or resume,
2. return evidence-backed strengths, missing or unclear requirements, and suggested follow-up questions,
3. clearly distinguish verified information from inferences,
4. save the input and model version used,
5. require a human to make every recruitment decision.

We should not build automatic rejection, automatic stage changes, or an opaque "hire score." The [European Commission's AI Act Service Desk](https://ai-act-service-desk.ec.europa.eu/en/employment-0) describes AI systems that match, rank, and filter candidates in recruitment as a high-risk use case. The feature will be both more responsible and more impressive if the demo demonstrates transparency, human oversight, and traceability.

## Data protection requirements that directly affect the product

[The Swedish Authority for Privacy Protection's guidance on recruitment systems](https://www.imy.se/verksamhet/dataskydd/dataskydd-pa-olika-omraden/arbetsliv/rekryteringssystem-och-kompetensdatabaser/) means that the product should include the following from the start:

- only necessary candidate fields,
- factual and structured data instead of extensive free-text notes where possible,
- `retention_until` or an equivalent field for deletion schedules,
- support for deletion or anonymization,
- separate documentation of any permission to retain the profile for future recruitment,
- information explaining why the data is processed,
- no processing of sensitive personal data in the MVP.

This is not legal advice, but these are product requirements that reduce risk for an initial customer.

## What we can reuse from InsideGrid

### Keep and adapt

- visual direction, login layout, and primary navigation,
- candidate profiles, skills, projects, and availability,
- job analysis and the principle of verified evidence,
- search, filters, and dashboard components,
- the existing English copy structure.

### Replace or remodel

- custom JWT/Auth → Supabase Auth,
- Employee/Manager/Admin roles → `customer`/`platform_admin` for the MVP,
- candidate lists inside `ApplicationEntity` → one normalized application per job and candidate,
- global data → organization-owned data protected by RLS,
- the large `main.tsx` → pages, components, hooks, and a data-access layer,
- local demo accounts → securely created Supabase accounts.

The current InsideGrid application is therefore a relevant product and UI foundation, but it is not yet the completed ATS solution.

## One-week priority order

### Must work

1. Supabase Auth and two roles.
2. Administrator creates administrator and customer accounts through a server function.
3. Customer isolation with tested RLS.
4. Create and list jobs.
5. Create and list candidates, including a LinkedIn URL.
6. Connect a candidate to a job.
7. Compact Kanban board with persistent stage changes.
8. Filter by job and candidate name.
9. Administrator selects a customer organization and performs the same actions on its behalf.
10. Public demo, private repository, administrator login, and five-minute demo video.

### Strong bonus features

- AI insights for a selected candidate and job,
- activity log,
- time in stage,
- responsive design and thoughtful empty states,
- realistic seeded demo data.

### Not in the first release

- publishing jobs to external job boards,
- candidate portal and public application form,
- email, SMS, and calendar integrations,
- resume parsing with perfect extraction,
- offers, contracts, invoicing, or a full CRM sales pipeline,
- customer-configurable pipelines,
- fully automated AI decisions.

## Recommended demo flow

1. Sign in as an administrator and create a customer account.
2. Select the customer's organization and create a job.
3. Sign in as the customer and create a candidate with a LinkedIn URL.
4. Connect the candidate to the job.
5. Show the candidate on the Kanban board, filter the board, and change the stage.
6. Open AI insights and demonstrate strengths, evidence, gaps, and human oversight.
7. Finish with the architecture: Supabase Auth, RLS, private Storage, and the next planned development steps.

## Decisions before implementation

- Confirm the Supabase project's region and verify that no secrets have been committed to source control.
- Keep the product name `InsideGrid` if this is intended as the next stage of the existing product. The repository and application use this name; `InstaGrid` appears to be a spoken-name variation.
- Create a separate working branch or coding-assignment version before the larger redesign.
- Decide whether the consulting workspace should appear in the first demo or only be supported by the data model. The recommendation is to demonstrate the recruitment workspace first and present the consulting workspace as a considered extension.

## Conclusion

The strongest solution is a genuine mini ATS for the coding assignment's primary workflow, built on InsideGrid's expertise and matching concept. The customer should experience a focused and straightforward recruitment product. Underneath, the model should already be capable of supporting the consulting agency's three-way relationship between clients, assignments, and candidates. This demonstrates both the ability to deliver now and the product thinking required to expand later.
# Public product site and freemium direction (September 2026)

InsideGrid now presents one product with three clear entry paths rather than three disconnected products:

1. Candidates maintain a reusable profile and track jobs or assignments.
2. Hiring teams create roles and move candidates through a compact pipeline.
3. Consulting firms maintain employee CVs, availability and assignment pipelines.

The shared domain model remains `organization -> job or assignment -> application -> candidate`. Workspace mode changes language and defaults; it does not weaken account roles or tenant isolation.

## Patterns reviewed

- [Tellent Recruitee](https://recruitee.com/) foregrounds the complete recruiting journey, candidate experience, collaboration and a configurable pipeline.
- [Tellent Recruitee pricing](https://recruitee.com/pricing) packages active jobs, careers pages, candidate management and collaboration into progressively larger plans.
- [Teamtailor pricing](https://www.teamtailor.com/en-us/pricing/) emphasizes an all-in-one candidate-first ATS, unlimited users and job postings rather than a crowded feature-by-feature landing page.
- [Brainville pricing](https://www.brainville.com/PublicPage/Pricing/) separates free marketplace access from paid buyer, sales and data-export value.
- [Brainville resource planning](https://www.brainville.com/PublicPage/ResourcePlanning?lang=en) connects consultant profiles, availability and potential assignments, which supports InsideGrid's consulting-workspace direction.

## Pilot pricing assumptions

- Candidate: free profile and up to five tracked applications.
- Hiring team: the first active recruitment is free, including its candidate pipeline.
- Consulting company: the first two consultant profiles are free.
- Paid prices are intentionally not invented before customer validation. The public page explains that upgrades will be introduced after the pilot and will never happen automatically.

## Design direction

The public site uses editorial typography, generous whitespace, real workplace footage and a restrained green/yellow identity. The product preview is built from the actual pipeline language rather than decorative AI imagery. External workplace media must come from Pexels; future feature recordings should be captured from InsideGrid itself.
