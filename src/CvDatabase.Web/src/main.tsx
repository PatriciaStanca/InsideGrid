import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock3,
  ExternalLink,
  Filter,
  Grid2X2,
  LayoutDashboard,
  Linkedin,
  LoaderCircle,
  LogOut,
  Menu,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  UserRoundSearch,
  X,
} from "lucide-react";
import "./styles.css";
import { demoWorkspace } from "./data/demo";
import {
  createApplication,
  createCandidate,
  createJob,
  createUser,
  generateJobDescription,
  getSession,
  loadWorkspace,
  onAuthChange,
  requestAiEvaluation,
  researchJobWithAi,
  signIn,
  signOut,
  updateApplicationStage,
} from "./lib/api";
import { hasSupabaseConfig } from "./lib/supabase";
import type {
  AiEvaluation,
  AccountPermission,
  Application,
  ApplicationStage,
  Candidate,
  Job,
  Organization,
  WorkspaceData,
  WorkspaceMode,
} from "./types";

type View = "dashboard" | "pipeline" | "jobs" | "candidates" | "team";
type Modal = "job" | "candidate" | "user" | null;
const stages: {
  id: Exclude<ApplicationStage, "rejected">;
  label: string;
  tone: string;
}[] = [
  { id: "new", label: "New", tone: "slate" },
  { id: "review", label: "Review", tone: "amber" },
  { id: "interview", label: "Interview", tone: "violet" },
  { id: "offer", label: "Offer", tone: "blue" },
  { id: "hired", label: "Hired", tone: "green" },
];
const titleByView: Record<View, string> = {
  dashboard: "Overview",
  pipeline: "Candidate pipeline",
  jobs: "Jobs",
  candidates: "Talent",
  team: "Access & accounts",
};
const departmentOptions = [
  "Data & AI",
  "Engineering",
  "Product & Design",
  "Sales",
  "Marketing",
  "Finance",
  "People & HR",
  "Operations",
  "Customer Success",
  "Legal & Compliance",
];
const locationOptions = [
  "Remote · Sweden",
  "Remote · Europe",
  "Hybrid · Gothenburg",
  "Hybrid · Stockholm",
  "On-site · Gothenburg",
  "On-site · Stockholm",
];
const employmentTypeOptions = [
  "Full-time",
  "Part-time",
  "Fixed-term",
  "Consulting assignment",
  "Contract",
  "Internship",
];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const daysInStage = (value: string) =>
  Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000),
  );

function candidateMatch(candidate: Candidate, job: Job) {
  const target = `${job.title} ${job.department} ${job.description}`.toLowerCase();
  const matched = candidate.skills.filter((skill) => target.includes(skill.toLowerCase()));
  const relevantTitle = target.split(/\W+/).some((word) => word.length > 3 && candidate.professional_title.toLowerCase().includes(word));
  const score = Math.min(96, Math.round(38 + (matched.length / Math.max(candidate.skills.length, 1)) * 48 + (relevantTitle ? 10 : 0)));
  return { score, matched, gaps: candidate.skills.filter((skill) => !matched.includes(skill)).slice(0, 2) };
}

async function downloadCandidateCv(candidate: Candidate) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(22); pdf.text(candidate.full_name, 20, 25);
  pdf.setFontSize(12); pdf.setTextColor(45, 65, 58); pdf.text(candidate.professional_title || "Candidate profile", 20, 34);
  pdf.setDrawColor(215, 220, 217); pdf.line(20, 42, 190, 42);
  pdf.setFont("helvetica", "normal"); pdf.setTextColor(70, 76, 73); pdf.setFontSize(10);
  pdf.text([candidate.location, candidate.email, candidate.phone].filter(Boolean).join("  |  "), 20, 51);
  pdf.setFont("helvetica", "bold"); pdf.setTextColor(20, 25, 23); pdf.setFontSize(12); pdf.text("Profile", 20, 67);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.setTextColor(60, 66, 63); pdf.text(pdf.splitTextToSize(candidate.summary || "No profile summary provided.", 170), 20, 75);
  pdf.setFont("helvetica", "bold"); pdf.setTextColor(20, 25, 23); pdf.setFontSize(12); pdf.text("Skills", 20, 105);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text(candidate.skills.join("  ·  ") || "No skills provided", 20, 114);
  if (candidate.linkedin_url) { pdf.setTextColor(23, 107, 85); pdf.textWithLink("LinkedIn profile", 20, 132, { url: candidate.linkedin_url }); }
  pdf.save(`${candidate.full_name.replace(/\s+/g, "-").toLowerCase()}-cv.pdf`);
}

type PublicPage = "home" | "pricing" | "jobs" | "login";

function PublicSite({
  page,
  onNavigate,
  onDemo,
  onAuthenticated,
}: {
  page: PublicPage;
  onNavigate: (page: PublicPage) => void;
  onDemo: () => void;
  onAuthenticated: (userId: string) => Promise<void>;
}) {
  if (page === "login") {
    return (
      <>
        <button className="back-to-site" onClick={() => onNavigate("home")}>← Back to InsideGrid</button>
        <Login onDemo={onDemo} onAuthenticated={onAuthenticated} />
      </>
    );
  }
  return (
    <main className="marketing-site">
      <header className="marketing-nav">
        <button className="brand bare" onClick={() => onNavigate("home")}>
          <span className="brand-mark"><Grid2X2 size={18} /></span><span>InsideGrid</span>
        </button>
        <nav aria-label="Main navigation">
          <button onClick={() => onNavigate("home")}>Product</button>
          <button onClick={() => onNavigate("jobs")}>Open roles</button>
          <button onClick={() => onNavigate("pricing")}>Pricing</button>
          <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>How it works</button>
        </nav>
        <div className="marketing-actions">
          <button className="nav-login" onClick={() => onNavigate("login")}>Log in</button>
          <button className="primary-button" onClick={() => onNavigate("login")}>Get started <ArrowRight size={16} /></button>
        </div>
      </header>

      {page === "pricing" ? (
        <PricingPage onStart={() => onNavigate("login")} />
      ) : page === "jobs" ? (
        <PublicJobPage />
      ) : (
        <>
          <section className="marketing-hero">
            <div className="hero-copy">
              <p className="marketing-kicker">One place for working life</p>
              <h1>One workspace.<br />Better matches.</h1>
              <p className="hero-lead">Track applications, run recruitment and match consultants to assignments—with every profile and next step in view.</p>
              <div className="hero-cta">
                <button className="primary-button large-button" onClick={() => onNavigate("login")}>Choose your workspace <ArrowRight size={17} /></button>
                <button className="quiet-button" onClick={() => onNavigate("jobs")}><BriefcaseBusiness size={15} /> Browse open roles</button>
                <button className="quiet-button" onClick={onDemo}><Play size={15} fill="currentColor" /> View product demo</button>
              </div>
              <p className="trust-line"><Check size={15} /> Start free &nbsp; <Check size={15} /> No credit card &nbsp; <Check size={15} /> Built for GDPR-aware teams</p>
            </div>
            <div className="hero-media">
              <video autoPlay muted loop playsInline poster="/login.avif">
                <source src="/pexels-team-work.mp4" type="video/mp4" />
              </video>
              <div className="media-status"><span className="live-dot"></span><strong>4 candidates moving</strong><small>across 2 active pipelines</small></div>
              <div className="media-caption"><span>One shared view</span><strong>People and opportunities, clearly connected.</strong><a href="https://www.pexels.com/video/overhead-shot-of-a-person-using-a-laptop-6897959/" target="_blank" rel="noreferrer">Video: Mikhail Nilov / Pexels</a></div>
            </div>
          </section>

          <section className="capability-strip" aria-label="InsideGrid capabilities">
            <div><strong>01</strong><span>Build a reusable<br/>talent profile</span></div>
            <div><strong>02</strong><span>Create jobs with<br/>an editable AI draft</span></div>
            <div><strong>03</strong><span>Move people through<br/>a clear pipeline</span></div>
            <div><strong>04</strong><span>Match consultants<br/>to client work</span></div>
          </section>

          <section className="audience-section" id="how-it-works">
            <div className="section-intro"><p className="marketing-kicker">Start where you are</p><h2>What brings you to InsideGrid?</h2><p>Choose a workspace built around the work you actually need to do. You can add another mode later.</p></div>
            <div className="audience-grid">
              <AudienceCard number="01" icon={<UserRoundSearch />} title="I’m looking for work" text="Keep your profile, CV and applications in one place. Discover roles and consulting assignments that match your experience." bullets={["One reusable professional profile", "Application overview", "Relevant opportunities"]} action="Create candidate profile" onClick={() => onNavigate("login")} />
              <AudienceCard featured number="02" icon={<UserPlus />} title="I’m hiring" text="Run a focused recruitment process without spreadsheets. Create jobs, collect candidates and keep every next step visible." bullets={["First recruitment free", "Compact candidate pipeline", "Structured, human-led review"]} action="Start your first recruitment" onClick={() => onNavigate("login")} />
              <AudienceCard number="03" icon={<BriefcaseBusiness />} title="I place consultants" text="Build a searchable CV database, see availability and match your employed consultants to client assignments." bullets={["Two consultant profiles free", "CV and competence database", "Assignment pipeline"]} action="Set up consulting workspace" onClick={() => onNavigate("login")} />
            </div>
          </section>

          <section className="product-story">
            <div className="product-window" aria-label="InsideGrid pipeline preview">
              <div className="window-bar"><i></i><i></i><i></i><span>Candidate pipeline · Product Designer</span></div>
              <div className="mini-board">
                {["New", "Review", "Interview", "Offer"].map((stage, index) => <div className="mini-column" key={stage}><strong>{stage}<em>{index + 1}</em></strong>{[0,1,2-index].filter(n=>n>=0).map((_, n)=><span className="mini-person" key={n}><i></i><b>{["Maya Lindberg","Lina Berg","Sam Nilsson"][(index+n)%3]}</b><small>{index === 2 ? "Interview Thu" : "Updated today"}</small></span>)}</div>)}
              </div>
            </div>
            <div className="story-copy"><p className="marketing-kicker">Less admin, more context</p><h2>A shared view of every next step.</h2><p>InsideGrid connects the job or assignment to each person, conversation and decision. Your team always knows what happened and what comes next.</p><ul><li><Check /> Filter the pipeline by role or candidate</li><li><Check /> Keep profiles useful across opportunities</li><li><Check /> Use AI as writing and review support—not the decision-maker</li></ul><button className="text-link" onClick={onDemo}>Explore the interactive demo <ArrowRight size={16} /></button></div>
          </section>

          <section className="pricing-teaser"><div><p className="marketing-kicker">Simple from day one</p><h2>Try the real workflow before you pay.</h2><p>Your first recruitment is free. Candidates can start free, and consulting teams can manage their first two consultant profiles at no cost.</p></div><button className="light-button" onClick={() => onNavigate("pricing")}>Compare plans <ArrowRight size={16} /></button></section>
        </>
      )}
      <footer className="marketing-footer"><div className="brand"><span className="brand-mark"><Grid2X2 size={18}/></span>InsideGrid</div><p>One clear view of people, work and what comes next.</p><div><button onClick={() => onNavigate("pricing")}>Pricing</button><button onClick={() => onNavigate("login")}>Log in</button></div><small>© 2026 InsideGrid · Product demo</small></footer>
    </main>
  );
}

function AudienceCard({ number, icon, title, text, bullets, action, featured, onClick }: { number:string; icon:React.ReactNode; title:string; text:string; bullets:string[]; action:string; featured?:boolean; onClick:()=>void }) {
  return <article className={`audience-card ${featured ? "featured" : ""}`}><div className="card-index"><span>{icon}</span><small>{number}</small></div><h3>{title}</h3><p>{text}</p><ul>{bullets.map(item=><li key={item}><Check size={15}/>{item}</li>)}</ul><button onClick={onClick}>{action}<ArrowRight size={16}/></button></article>;
}

function PricingPage({ onStart }: { onStart: () => void }) {
  const plans = [
    { audience:"For candidates", name:"Profile", price:"Free", note:"to get started", description:"For people exploring jobs or consulting assignments.", items:["Professional profile and CV", "Track up to 5 applications", "Opportunity recommendations", "Export your profile"], action:"Create free profile" },
    { audience:"For hiring teams", name:"First hire", price:"Free", note:"for one active recruitment", description:"A complete first pipeline for a small team making a thoughtful hire.", items:["1 active job and recruitment", "Unlimited candidates for that role", "Kanban pipeline and filters", "AI-assisted job draft"], action:"Start first recruitment", featured:true },
    { audience:"For consulting firms", name:"Consulting", price:"Free", note:"for up to 2 consultants", description:"For small consulting teams building their shared competence base.", items:["2 consultant profiles", "CV and competence database", "Assignment pipeline", "Availability overview"], action:"Add your consultants" },
  ];
  return <section className="pricing-page"><div className="pricing-heading"><p className="marketing-kicker">Plans that grow with the work</p><h1>Start free. Upgrade when InsideGrid earns its place.</h1><p>No complicated packages at the beginning. Choose the workspace that fits you today.</p></div><div className="pricing-grid">{plans.map(plan=><article className={`price-card ${plan.featured ? "featured" : ""}`} key={plan.name}>{plan.featured && <span className="popular-label">Best place to start</span>}<small>{plan.audience}</small><h2>{plan.name}</h2><div className="price"><strong>{plan.price}</strong><span>{plan.note}</span></div><p>{plan.description}</p><ul>{plan.items.map(item=><li key={item}><Check size={16}/>{item}</li>)}</ul><button className={plan.featured ? "primary-button" : "secondary-button"} onClick={onStart}>{plan.action}<ArrowRight size={16}/></button></article>)}</div><div className="paid-note"><Clock3/><div><strong>What happens after the free level?</strong><p>Paid plans for additional recruitments, applications or consultant profiles will be introduced after the pilot. Early users will see the price before choosing to upgrade—nothing changes automatically.</p></div></div></section>;
}

function PublicJobPage() {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return <section className="application-success"><span><Check size={24}/></span><p className="marketing-kicker">Application received</p><h1>Thank you for applying.</h1><p>This demo application has not stored any personal data. In a connected customer workspace, the candidate would now appear in the New column.</p><button className="secondary-button" onClick={() => setSubmitted(false)}>Back to role</button></section>;
  return <div className="public-job-page">
    <section className="job-intro">
      <a href="#apply" className="primary-button">Apply for this role <ArrowRight size={16}/></a>
      <p className="marketing-kicker">Northstar Talent · Data & AI</p>
      <h1>Data Engineer</h1>
      <div className="job-meta"><span>Remote · Sweden</span><span>Full-time</span><span>Applications reviewed weekly</span></div>
    </section>
    <div className="job-layout">
      <article className="job-description">
        <h2>About the role</h2><p>Join a small data team building reliable products that help colleagues make better decisions. You will work across ingestion, modelling and delivery, with room to improve both the platform and the way the team works.</p>
        <h2>What you will do</h2><ul><li>Build and maintain dependable data pipelines.</li><li>Model trusted datasets for analytics and reporting.</li><li>Work with product and business teams to turn questions into useful data products.</li><li>Improve testing, documentation and observability.</li></ul>
        <h2>What we are looking for</h2><ul><li>Practical experience with SQL and Python.</li><li>Experience with cloud data platforms and ETL or ELT workflows.</li><li>A collaborative approach and clear communication.</li><li>Care for quality, maintainability and responsible data use.</li></ul>
        <h2>Our process</h2><ol><li>Introductory conversation</li><li>Practical, role-relevant discussion</li><li>Meet the team</li><li>Decision and feedback</li></ol>
        <aside><ShieldCheck size={18}/><p>Every application is reviewed by a person. AI may help structure information, but it does not make hiring decisions.</p></aside>
      </article>
      <form id="apply" className="application-form" onSubmit={(event)=>{event.preventDefault();setSubmitted(true);window.scrollTo({top:0,behavior:"smooth"});}}>
        <p className="marketing-kicker">Apply for this job</p><h2>Tell us about yourself</h2><p>Fields marked with * are required.</p>
        <div className="form-grid"><label>First name *<input required /></label><label>Last name *<input required /></label></div>
        <label>Email address *<input type="email" required /></label><label>Phone<input type="tel" /></label>
        <label>Resume or CV *<input className="file-input" type="file" accept=".pdf,.doc,.docx,.txt" required /><small>PDF, DOC, DOCX or TXT · maximum 10 MB</small></label>
        <label>LinkedIn profile<input type="url" placeholder="https://linkedin.com/in/..." /></label>
        <label>Portfolio or website<input type="url" placeholder="https://" /></label>
        <label>Why does this role interest you?<textarea rows={5}></textarea></label>
        <label className="consent-field"><input type="checkbox" required/><span>I have read the privacy information and consent to my application being processed for this recruitment. *</span></label>
        <button className="primary-button wide" type="submit">Submit application <ArrowRight size={16}/></button>
      </form>
    </div>
  </div>;
}

function Login({
  onDemo,
  onAuthenticated,
}: {
  onDemo: () => void;
  onAuthenticated: (userId: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await signIn(email, password);
      if (!session) throw new Error("No active session was returned.");
      await onAuthenticated(session.user.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <a className="brand brand-light" href="#">
          <span className="brand-mark">
            <Grid2X2 size={18} />
          </span>
          <span>InsideGrid</span>
        </a>
        <div className="auth-story-copy">
          <span className="eyebrow">Hiring and consulting, in one place</span>
          <h1>Keep every person and next step in view.</h1>
          <p>
            Manage recruitment pipelines or match consultants to client
            assignments, with the context your team needs to make thoughtful
            decisions.
          </p>
          <div className="mode-preview-grid">
            <article>
              <span>
                <UserPlus size={18} />
              </span>
              <div>
                <strong>Recruit employees</strong>
                <small>Jobs, candidates, interviews and offers.</small>
              </div>
            </article>
            <article>
              <span>
                <BriefcaseBusiness size={18} />
              </span>
              <div>
                <strong>Place consultants</strong>
                <small>Assignments, availability and fit.</small>
              </div>
            </article>
          </div>
        </div>
        <p className="auth-note">
          <ShieldCheck size={16} /> Each customer workspace keeps its data
          separate.
        </p>
      </section>
      <section className="auth-form-side">
        <form className="auth-card" onSubmit={submit}>
          <div className="mobile-brand">
            <span className="brand-mark">
              <Grid2X2 size={18} />
            </span>{" "}
            InsideGrid
          </div>
          <span className="eyebrow dark">InsideGrid workspace</span>
          <h2>Welcome back</h2>
          <p>Sign in with the account created for your team.</p>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <button
            className="primary-button wide"
            type="submit"
            disabled={busy || !hasSupabaseConfig}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <>
                Sign in <ArrowRight size={17} />
              </>
            )}
          </button>
          {!hasSupabaseConfig && (
            <p className="config-note">
              Live sign-in will be available when the Supabase key is connected.
            </p>
          )}
          <div className="auth-divider">
            <span>Want to look around first?</span>
          </div>
          <button
            className="secondary-button wide"
            type="button"
            onClick={onDemo}
          >
            Explore interactive demo
          </button>
          <small className="privacy-note">
            Candidate decisions always stay with people. AI only helps surface
            evidence.
          </small>
        </form>
      </section>
    </main>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: React.PropsWithChildren<{
  title: string;
  subtitle: string;
  onClose: () => void;
}>) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow dark">INSIDEGRID</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function App() {
  const [publicPage, setPublicPage] = useState<PublicPage>("home");
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [modal, setModal] = useState<Modal>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState("all");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [demoMode, setDemoMode] = useState(false);
  const demoModeRef = useRef(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!hasSupabaseConfig) return;
    let alive = true;
    getSession()
      .then(async (session) => {
        if (session && alive) await authenticate(session.user.id);
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    const subscription = onAuthChange((session) => {
      if (!session && !demoModeRef.current) setWorkspace(null);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  async function authenticate(userId: string) {
    setLoading(true);
    try {
      const next = await loadWorkspace(userId);
      setWorkspace(next);
      setSelectedOrganizationId(next.organizations[0]?.id ?? "");
      setDemoMode(false);
      demoModeRef.current = false;
    } finally {
      setLoading(false);
    }
  }
  function enterDemo() {
    const clone = structuredClone(demoWorkspace);
    setWorkspace(clone);
    setSelectedOrganizationId(clone.organizations[0].id);
    setDemoMode(true);
    demoModeRef.current = true;
  }
  async function exit() {
    if (!demoMode && hasSupabaseConfig) await signOut();
    setWorkspace(null);
    setDemoMode(false);
    demoModeRef.current = false;
  }
  if (loading)
    return (
      <div className="app-loader">
        <span className="brand-mark">
          <Grid2X2 size={20} />
        </span>
        <LoaderCircle className="spin" /> Loading your workspace…
      </div>
    );
  if (!workspace)
    return (
      <PublicSite
        page={publicPage}
        onNavigate={setPublicPage}
        onDemo={enterDemo}
        onAuthenticated={authenticate}
      />
    );
  const currentWorkspace = workspace;
  const isAdmin = currentWorkspace.profile.platform_role === "platform_admin";
  const organization =
    currentWorkspace.organizations.find(
      (item) => item.id === selectedOrganizationId,
    ) ?? currentWorkspace.organizations[0];
  if (!organization)
    return (
      <EmptyWorkspace profileName={workspace.profile.full_name} onExit={exit} />
    );
  const memberPermissions = currentWorkspace.memberships.find(
    (item) => item.organization_id === organization.id && item.user_id === currentWorkspace.profile.id,
  )?.permissions ?? [];
  const can = (permission: AccountPermission) => isAdmin || memberPermissions.includes(permission);
  const showRecruitment = organization.workspace_mode !== "consulting";
  const showConsulting = organization.workspace_mode !== "recruitment";
  const jobs = workspace.jobs.filter(
    (item) => item.organization_id === organization.id,
  );
  const candidates = workspace.candidates.filter(
    (item) => item.organization_id === organization.id,
  );
  const applications = workspace.applications.filter(
    (item) => item.organization_id === organization.id,
  );
  const selectedApplication = workspace.applications.find(
    (item) => item.id === selectedApplicationId,
  );
  const selectedCandidate = selectedApplication
    ? workspace.candidates.find(
        (item) => item.id === selectedApplication.candidate_id,
      )
    : undefined;
  const selectedJob = selectedApplication
    ? workspace.jobs.find((item) => item.id === selectedApplication.job_id)
    : undefined;
  const selectedEvaluation = selectedApplication
    ? workspace.evaluations.find(
        (item) => item.application_id === selectedApplication.id,
      )
    : undefined;
  function update<K extends keyof WorkspaceData>(
    key: K,
    value: WorkspaceData[K],
  ) {
    setWorkspace((current) =>
      current ? { ...current, [key]: value } : current,
    );
  }
  async function moveApplication(
    application: Application,
    stage: ApplicationStage,
  ) {
    const previous = currentWorkspace.applications;
    const optimistic = previous.map((item) =>
      item.id === application.id
        ? { ...item, stage, stage_changed_at: new Date().toISOString() }
        : item,
    );
    update("applications", optimistic);
    try {
      if (!demoMode) {
        const saved = await updateApplicationStage(application.id, stage);
        update(
          "applications",
          optimistic.map((item) => (item.id === saved.id ? saved : item)),
        );
      }
      setToast(
        `Candidate moved to ${stage === "hired" && organization.workspace_mode === "consulting" ? "placed" : stage}.`,
      );
    } catch (reason) {
      update("applications", previous);
      setToast(
        reason instanceof Error
          ? reason.message
          : "The stage could not be updated.",
      );
    }
  }
  async function runEvaluation(application: Application) {
    try {
      let evaluation: AiEvaluation;
      if (demoMode) {
        const candidate = currentWorkspace.candidates.find(
          (item) => item.id === application.candidate_id,
        )!;
        const job = currentWorkspace.jobs.find(
          (item) => item.id === application.job_id,
        )!;
        evaluation = {
          id: crypto.randomUUID(),
          application_id: application.id,
          summary: `${candidate.full_name} shows relevant evidence for ${job.title}. Review the stated gaps before deciding on the next stage.`,
          strengths: candidate.skills
            .slice(0, 2)
            .map((skill) => `${skill} is explicitly supported by the profile.`),
          gaps: [
            "The profile does not confirm the scale or recency of every required skill.",
          ],
          follow_up_questions: [
            "Which recent project best demonstrates the most important requirement?",
          ],
          created_at: new Date().toISOString(),
        };
      } else evaluation = await requestAiEvaluation(application.id);
      update("evaluations", [
        evaluation,
        ...currentWorkspace.evaluations.filter(
          (item) => item.application_id !== application.id,
        ),
      ]);
      setToast("AI insights are ready for human review.");
    } catch (reason) {
      setToast(
        reason instanceof Error
          ? reason.message
          : "AI insights could not be created.",
      );
    }
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="sidebar-top">
          <button className="brand bare" onClick={() => setView("dashboard")}>
            <span className="brand-mark">
              <Grid2X2 size={18} />
            </span>
            <span>InsideGrid</span>
          </button>
          <button className="mobile-close" onClick={() => setMobileNav(false)}>
            <X />
          </button>
        </div>
        <nav>
          <NavItem
            icon={<LayoutDashboard />}
            label="Overview"
            active={view === "dashboard"}
            onClick={() => setView("dashboard")}
          />
          {(can("manage_jobs") || can("manage_candidates")) && <NavItem icon={<Grid2X2 />} label={showConsulting && !showRecruitment ? "Assignment pipeline" : "Candidate pipeline"} active={view === "pipeline"} onClick={() => setView("pipeline")} badge={applications.filter((item) => !["rejected", "hired"].includes(item.stage)).length} />}
          {can("manage_jobs") && <NavItem icon={<BriefcaseBusiness />} label={showConsulting && !showRecruitment ? "Assignments" : "Jobs"} active={view === "jobs"} onClick={() => setView("jobs")} />}
          {can("manage_candidates") && showRecruitment && <NavItem icon={<Users />} label="Candidates" active={view === "candidates"} onClick={() => setView("candidates")} />}
          {can("manage_consultants") && showConsulting && <NavItem icon={<Users />} label="Consultants" active={view === "candidates"} onClick={() => setView("candidates")} />}
          {isAdmin && (
            <>
              <span className="nav-section">ADMIN</span>
              <NavItem
                icon={<ShieldCheck />}
                label="Access & accounts"
                active={view === "team"}
                onClick={() => setView("team")}
              />
            </>
          )}
        </nav>
        <div className="sidebar-foot">
          {demoMode && <span className="demo-pill">Interactive demo</span>}
          <button className="profile-chip" onClick={exit}>
            <span className="avatar">
              {initials(workspace.profile.full_name)}
            </span>
            <span>
              <strong>{workspace.profile.full_name}</strong>
              <small>{isAdmin ? "Platform administrator" : "Customer"}</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button className="menu-button" onClick={() => setMobileNav(true)}>
              <Menu />
            </button>
            <div>
              <span>{organization.name}</span>
              <h1>{titleByView[view]}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            {isAdmin && workspace.organizations.length > 1 && (
              <label className="organization-picker">
                <Building2 size={16} />
                <select
                  value={organization.id}
                  onChange={(event) => {
                    setSelectedOrganizationId(event.target.value);
                    setJobFilter("all");
                  }}
                >
                  {workspace.organizations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </label>
            )}
            {(can("manage_candidates") || can("manage_consultants")) && <button
              className="primary-button"
              onClick={() => setModal("candidate")}
            >
              <Plus size={17} /> Add {showConsulting && !showRecruitment ? "consultant" : "candidate"}
            </button>}
          </div>
        </header>
        <div className="content">
          {view === "dashboard" && (
            <Dashboard
              organization={organization}
              jobs={jobs}
              candidates={candidates}
              applications={applications}
              canCreateJob={can("manage_jobs")}
              onNavigate={setView}
              onAddJob={() => setModal("job")}
            />
          )}
          {view === "pipeline" && (
            <Pipeline
              jobs={jobs}
              candidates={candidates}
              applications={applications}
              jobFilter={jobFilter}
              onJobFilter={setJobFilter}
              search={candidateSearch}
              onSearch={setCandidateSearch}
              onMove={moveApplication}
              onSelect={setSelectedApplicationId}
              organization={organization}
            />
          )}
          {view === "jobs" && (
            <Jobs
              jobs={jobs}
              applications={applications}
              organization={organization}
              onAdd={() => setModal("job")}
              onOpenPipeline={(id) => {
                setJobFilter(id);
                setView("pipeline");
              }}
              onOpenJob={setSelectedJobId}
            />
          )}
          {view === "candidates" && (
            <Candidates
              candidates={candidates}
              applications={applications}
              jobs={jobs}
              onAdd={() => setModal("candidate")}
              onSelect={setSelectedCandidateId}
            />
          )}
          {view === "team" && isAdmin && (
            <Team
              organizations={workspace.organizations}
              onAdd={() => setModal("user")}
            />
          )}
        </div>
      </main>
      {modal === "job" && (
        <JobModal
          organization={organization}
          demoMode={demoMode}
          onClose={() => setModal(null)}
          onCreated={(job) => {
            update("jobs", [job, ...workspace.jobs]);
            setModal(null);
            setToast("Job created.");
          }}
        />
      )}
      {modal === "candidate" && (
        <CandidateModal
          organization={organization}
          jobs={jobs.filter((item) => item.status === "open")}
          demoMode={demoMode}
          onClose={() => setModal(null)}
          onCreated={(candidate, application) => {
            update("candidates", [candidate, ...workspace.candidates]);
            if (application)
              update("applications", [application, ...workspace.applications]);
            setModal(null);
            setToast(
              application
                ? "Candidate added to the pipeline."
                : "Candidate profile created.",
            );
          }}
        />
      )}
      {modal === "user" && (
        <UserModal
          organizations={workspace.organizations}
          demoMode={demoMode}
          onClose={() => setModal(null)}
          onCreated={(created) => {
            if (created)
              update("organizations", [...workspace.organizations, created]);
            setModal(null);
            setToast("Account created securely.");
          }}
        />
      )}
      {selectedApplication && selectedCandidate && selectedJob && (
        <CandidateDrawer
          candidate={selectedCandidate}
          job={selectedJob}
          application={selectedApplication}
          evaluation={selectedEvaluation}
          organization={organization}
          onClose={() => setSelectedApplicationId(null)}
          onMove={moveApplication}
          onEvaluate={runEvaluation}
        />
      )}
      {selectedJobId && workspace.jobs.find((item) => item.id === selectedJobId) && (
        <JobDrawer job={workspace.jobs.find((item) => item.id === selectedJobId)!} candidates={workspace.candidates} applications={workspace.applications} onClose={() => setSelectedJobId(null)} onOpenCandidate={(id) => { setSelectedJobId(null); setSelectedCandidateId(id); }} />
      )}
      {selectedCandidateId && workspace.candidates.find((item) => item.id === selectedCandidateId) && (
        <CandidateProfileDrawer candidate={workspace.candidates.find((item) => item.id === selectedCandidateId)!} jobs={workspace.jobs} applications={workspace.applications} onClose={() => setSelectedCandidateId(null)} />
      )}
      {toast && (
        <div className="toast">
          <Check size={17} /> {toast}
        </div>
      )}
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <span>{icon}</span>
      {label}
      {badge !== undefined && <small>{badge}</small>}
    </button>
  );
}
function EmptyWorkspace({
  profileName,
  onExit,
}: {
  profileName: string;
  onExit: () => void;
}) {
  return (
    <main className="empty-workspace">
      <span className="brand-mark">
        <Grid2X2 />
      </span>
      <h1>Welcome, {profileName}</h1>
      <p>
        Your account is active but has not been connected to an organization
        yet.
      </p>
      <button className="secondary-button" onClick={onExit}>
        Sign out
      </button>
    </main>
  );
}

function Dashboard({
  organization,
  jobs,
  candidates,
  applications,
  canCreateJob,
  onNavigate,
  onAddJob,
}: {
  organization: Organization;
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  canCreateJob: boolean;
  onNavigate: (view: View) => void;
  onAddJob: () => void;
}) {
  const active = applications.filter(
    (item) => !["hired", "rejected"].includes(item.stage),
  );
  const recent = [...active]
    .sort((a, b) => b.stage_changed_at.localeCompare(a.stage_changed_at))
    .slice(0, 5);
  return (
    <>
      <section className="hero-panel">
        <div>
          <span className="eyebrow dark">
            {organization.workspace_mode === "consulting"
              ? "Consulting workspace"
              : "Recruitment workspace"}
          </span>
          <h2>Recruitment overview</h2>
          <p>
            {organization.name} has {active.length} active candidate processes
            across {jobs.filter((item) => item.status === "open").length} open{" "}
            {organization.workspace_mode === "consulting"
              ? "assignments"
              : "jobs"}
            .
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="primary-button"
            onClick={() => onNavigate("pipeline")}
          >
            Open pipeline <ArrowRight size={17} />
          </button>
          {canCreateJob && <button className="secondary-button" onClick={onAddJob}>
            <Plus size={17} /> Create{" "}
            {organization.workspace_mode === "consulting"
              ? "assignment"
              : "job"}
          </button>}
        </div>
      </section>
      <section className="metric-grid">
        <Metric
          icon={<BriefcaseBusiness />}
          label={`Open ${organization.workspace_mode === "consulting" ? "assignments" : "jobs"}`}
          value={jobs.filter((item) => item.status === "open").length}
          note="Accepting candidates"
          tone="navy"
        />
        <Metric
          icon={<Users />}
          label="Active candidates"
          value={active.length}
          note={`${candidates.length} profiles in talent pool`}
          tone="blue"
        />
        <Metric
          icon={<BarChart3 />}
          label="Needs attention"
          value={
            active.filter((item) => daysInStage(item.stage_changed_at) >= 3)
              .length
          }
          note="3+ days without movement"
          tone="amber"
        />
        <Metric
          icon={<Check />}
          label={
            organization.workspace_mode === "consulting" ? "Placed" : "Hired"
          }
          value={applications.filter((item) => item.stage === "hired").length}
          note="Successful outcomes"
          tone="green"
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel activity-panel">
          <header>
            <div>
              <span className="eyebrow dark">LIVE PIPELINE</span>
              <h3>Recent candidate movement</h3>
            </div>
            <button
              className="text-button"
              onClick={() => onNavigate("pipeline")}
            >
              View all <ArrowRight size={15} />
            </button>
          </header>
          <div className="activity-list">
            {recent.map((application) => {
              const candidate = candidates.find(
                (item) => item.id === application.candidate_id,
              );
              const job = jobs.find((item) => item.id === application.job_id);
              return candidate && job ? (
                <div className="activity-row" key={application.id}>
                  <span className="avatar soft">
                    {initials(candidate.full_name)}
                  </span>
                  <div>
                    <strong>{candidate.full_name}</strong>
                    <p>{job.title}</p>
                  </div>
                  <span className={`stage-badge ${application.stage}`}>
                    {application.stage}
                  </span>
                  <small>
                    {daysInStage(application.stage_changed_at)}d in stage
                  </small>
                </div>
              ) : null;
            })}
            {!recent.length && (
              <EmptyState
                title="No active candidates yet"
                text="Add a candidate to an open job to start the pipeline."
              />
            )}
          </div>
        </article>
        <article className="panel focus-panel">
          <span className="eyebrow dark">NEXT ACTIONS</span>
          <h3>Keep the process moving</h3>
          <div className="action-list">
            <button onClick={() => onNavigate("pipeline")}><span><b>{active.filter((item) => daysInStage(item.stage_changed_at) >= 3).length}</b><small>Candidates waiting 3+ days</small></span><ArrowRight size={15}/></button>
            <button onClick={() => onNavigate("pipeline")}><span><b>{active.filter((item) => item.stage === "interview").length}</b><small>Interview-stage candidates</small></span><ArrowRight size={15}/></button>
            <button onClick={() => onNavigate("jobs")}><span><b>{jobs.filter((item) => item.status === "open").length}</b><small>Open roles accepting candidates</small></span><ArrowRight size={15}/></button>
          </div>
          <button
            className="secondary-button"
            onClick={() => onNavigate("pipeline")}
          >
            Open candidate pipeline
          </button>
        </article>
      </section>
    </>
  );
}
function Metric({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note: string;
  tone: string;
}) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
    </article>
  );
}

function Pipeline({
  jobs,
  candidates,
  applications,
  jobFilter,
  onJobFilter,
  search,
  onSearch,
  onMove,
  onSelect,
  organization,
}: {
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  jobFilter: string;
  onJobFilter: (value: string) => void;
  search: string;
  onSearch: (value: string) => void;
  onMove: (application: Application, stage: ApplicationStage) => void;
  onSelect: (id: string) => void;
  organization: Organization;
}) {
  const visible = applications.filter((application) => {
    const candidate = candidates.find(
      (item) => item.id === application.candidate_id,
    );
    return (
      application.stage !== "rejected" &&
      (jobFilter === "all" || application.job_id === jobFilter) &&
      candidate?.full_name.toLowerCase().includes(search.trim().toLowerCase())
    );
  });
  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow dark">LIVE WORKFLOW</span>
          <h2>Move every candidate forward with context.</h2>
          <p>
            Filter by job or candidate, then open a card to review details and
            AI insights.
          </p>
        </div>
        <span className="record-count">{visible.length} active records</span>
      </section>
      <section className="filter-bar">
        <label>
          <Filter size={16} />
          <select
            value={jobFilter}
            onChange={(event) => onJobFilter(event.target.value)}
          >
            <option value="all">
              All{" "}
              {organization.workspace_mode === "consulting"
                ? "assignments"
                : "jobs"}
            </option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>
        <label className="search-field">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search candidate name…"
          />
        </label>
      </section>
      <section className="kanban">
        {stages.map((stage) => {
          const items = visible.filter((item) => item.stage === stage.id);
          return (
            <div className="kanban-column" key={stage.id}>
              <header>
                <div>
                  <span className={`stage-dot ${stage.tone}`} />
                  <strong>
                    {stage.id === "hired" &&
                    organization.workspace_mode === "consulting"
                      ? "Placed"
                      : stage.label}
                  </strong>
                </div>
                <span>{items.length}</span>
              </header>
              <div className="kanban-stack">
                {items.map((application) => {
                  const candidate = candidates.find(
                    (item) => item.id === application.candidate_id,
                  );
                  const job = jobs.find(
                    (item) => item.id === application.job_id,
                  );
                  return candidate && job ? (
                    <article
                      className="candidate-card"
                      key={application.id}
                      onClick={() => onSelect(application.id)}
                      tabIndex={0}
                    >
                      <div className="candidate-card-head">
                        <span className="avatar soft">
                          {initials(candidate.full_name)}
                        </span>
                        <div>
                          <strong>{candidate.full_name}</strong>
                          <small>{candidate.professional_title}</small>
                        </div>
                        <span className="match-chip">{candidateMatch(candidate, job).score}% match</span>
                      </div>
                      <p className="job-context">
                        <BriefcaseBusiness size={14} /> {job.title}
                      </p>
                      <div className="skill-row">
                        {candidate.skills.slice(0, 2).map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                        {candidate.skills.length > 2 && (
                          <span>+{candidate.skills.length - 2}</span>
                        )}
                      </div>
                      <footer>
                        <small>
                          {daysInStage(application.stage_changed_at)} days in
                          stage
                        </small>
                        <select
                          value={application.stage}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            onMove(
                              application,
                              event.target.value as ApplicationStage,
                            )
                          }
                        >
                          {stages.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                          <option value="rejected">Rejected</option>
                        </select>
                      </footer>
                    </article>
                  ) : null;
                })}
                {!items.length && (
                  <div className="column-empty">No candidates</div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}

function Jobs({
  jobs,
  applications,
  organization,
  onAdd,
  onOpenPipeline,
  onOpenJob,
}: {
  jobs: Job[];
  applications: Application[];
  organization: Organization;
  onAdd: () => void;
  onOpenPipeline: (id: string) => void;
  onOpenJob: (id: string) => void;
}) {
  return (
    <>
      <section className="page-heading split">
        <div>
          <span className="eyebrow dark">OPPORTUNITIES</span>
          <h2>
            {organization.workspace_mode === "consulting"
              ? "Client assignments"
              : "Open roles"}
          </h2>
          <p>
            Create the need first, then build a focused candidate pipeline
            around it.
          </p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={17} /> Create{" "}
          {organization.workspace_mode === "consulting" ? "assignment" : "job"}
        </button>
      </section>
      <section className="job-grid">
        {jobs.map((job) => (
          <article className="job-card" key={job.id} onClick={() => onOpenJob(job.id)}>
            <header>
              <span className="job-icon">
                <BriefcaseBusiness />
              </span>
              <span className={`status-pill ${job.status}`}>{job.status}</span>
            </header>
            <h3>{job.title}</h3>
            <p>
              {job.department || "General"} ·{" "}
              {job.location || "Location flexible"}
            </p>
            <div className="job-stats">
              <span>
                <strong>
                  {applications.filter((item) => item.job_id === job.id).length}
                </strong>{" "}
                candidates
              </span>
              <span>
                <strong>
                  {
                    applications.filter(
                      (item) =>
                        item.job_id === job.id && item.stage === "interview",
                    ).length
                  }
                </strong>{" "}
                interviews
              </span>
            </div>
            <button
              className="secondary-button wide"
              onClick={(event) => { event.stopPropagation(); onOpenPipeline(job.id); }}
            >
              Open pipeline <ArrowRight size={16} />
            </button>
          </article>
        ))}
        <button className="create-card" onClick={onAdd}>
          <Plus />
          <strong>
            Create{" "}
            {organization.workspace_mode === "consulting"
              ? "assignment"
              : "job"}
          </strong>
          <span>Start a new pipeline</span>
        </button>
      </section>
    </>
  );
}

function Candidates({
  candidates,
  applications,
  jobs,
  onAdd,
  onSelect,
}: {
  candidates: Candidate[];
  applications: Application[];
  jobs: Job[];
  onAdd: () => void;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      candidates.filter((item) =>
        `${item.full_name} ${item.professional_title} ${item.skills.join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [candidates, search],
  );
  return (
    <>
      <section className="page-heading split">
        <div>
          <span className="eyebrow dark">TALENT DATABASE</span>
          <h2>People, skills, and possibilities.</h2>
          <p>
            One profile can be considered for multiple roles without duplicating
            candidate data.
          </p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={17} /> Add candidate
        </button>
      </section>
      <section className="filter-bar">
        <label className="search-field grow">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, title, or skill…"
          />
        </label>
      </section>
      <section className="table-panel">
        <div className="talent-row talent-head">
          <span>Candidate</span>
          <span>Skills</span>
          <span>Active processes</span>
          <span>Contact</span>
        </div>
        {filtered.map((candidate) => {
          const active = applications.filter(
            (item) =>
              item.candidate_id === candidate.id &&
              !["rejected", "hired"].includes(item.stage),
          );
          return (
            <button className="talent-row talent-row-button" key={candidate.id} onClick={() => onSelect(candidate.id)}>
              <span className="person-cell">
                <span className="avatar soft">
                  {initials(candidate.full_name)}
                </span>
                <span>
                  <strong>{candidate.full_name}</strong>
                  <small>
                    {candidate.professional_title} · {candidate.location}
                  </small>
                </span>
              </span>
              <span className="skill-row">
                {candidate.skills.slice(0, 3).map((skill) => (
                  <i key={skill}>{skill}</i>
                ))}
              </span>
              <span>
                {active.length
                  ? active
                      .map(
                        (item) =>
                          jobs.find((job) => job.id === item.job_id)?.title,
                      )
                      .filter(Boolean)
                      .join(", ")
                  : "Talent pool"}
              </span>
              <span className="contact-links">
                <a href={`mailto:${candidate.email}`}>{candidate.email}</a>
                {candidate.linkedin_url && (
                  <a
                    href={candidate.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Linkedin size={15} /> Profile
                  </a>
                )}
              </span>
            </button>
          );
        })}
        {!filtered.length && (
          <EmptyState
            title="No matching candidates"
            text="Try a different name, title, or skill."
          />
        )}
      </section>
    </>
  );
}
function Team({
  organizations,
  onAdd,
}: {
  organizations: Organization[];
  onAdd: () => void;
}) {
  return (
    <>
      <section className="page-heading split">
        <div>
          <span className="eyebrow dark">PLATFORM ADMINISTRATION</span>
          <h2>Create secure customer access.</h2>
          <p>
            Accounts are created server-side and connected to an isolated
            organization workspace.
          </p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <UserPlus size={17} /> Create account
        </button>
      </section>
      <section className="admin-callout">
        <ShieldCheck />
        <div>
          <strong>Administrator actions stay traceable</strong>
          <p>
            Select a customer workspace to manage jobs and candidates on their
            behalf.
          </p>
        </div>
      </section>
      <section className="organization-grid">
        {organizations.map((item) => (
          <article key={item.id}>
            <span className="organization-icon">
              <Building2 />
            </span>
            <div>
              <strong>{item.name}</strong>
              <p>{item.workspace_mode} workspace</p>
            </div>
            <span className="status-pill open">Active</span>
          </article>
        ))}
      </section>
    </>
  );
}

function JobModal({
  organization,
  demoMode,
  onClose,
  onCreated,
}: {
  organization: Organization;
  demoMode: boolean;
  onClose: () => void;
  onCreated: (job: Job) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [description, setDescription] = useState("");
  const [researchOpen, setResearchOpen] = useState(false);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchInput, setResearchInput] = useState("");
  const [researchMessages, setResearchMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [researchSources, setResearchSources] = useState<
    { title: string; url: string }[]
  >([]);
  const formRef = useRef<HTMLFormElement>(null);
  async function draftDescription() {
    const form = formRef.current;
    if (!form) return;
    const values = new FormData(form);
    const title = String(values.get("title")).trim();
    if (!title) {
      setAiError("Add a job title first so the draft can be specific.");
      return;
    }
    const context = {
      organizationId: organization.id,
      title,
      department: String(values.get("department")).trim(),
      location: String(values.get("location")).trim(),
      employmentType: String(values.get("employmentType")).trim(),
      workspaceMode: organization.workspace_mode,
      companyWebsite: String(values.get("companyWebsite") ?? "").trim(),
      researchNotes: researchMessages.map(
        (message) => `${message.role}: ${message.text}`,
      ),
    };
    setAiBusy(true);
    setAiError("");
    try {
      const draft = demoMode
        ? `We are looking for a ${title} to join our ${context.department || "growing"} team${context.location ? ` in ${context.location}` : ""}. In this role, you will take ownership of meaningful work, collaborate closely with colleagues and help turn business needs into practical results.\n\nWhat you will do\n• Lead and deliver work within your area of expertise\n• Work across teams to solve problems and improve how we operate\n• Communicate progress, decisions and recommendations clearly\n\nWhat we are looking for\n• Relevant experience for the ${title} role\n• A thoughtful, collaborative approach and strong communication skills\n• The ability to work independently and follow through on commitments\n\n${context.employmentType ? `Employment type: ${context.employmentType}. ` : ""}We welcome different backgrounds and encourage you to apply if the role feels relevant to your experience.`
        : await generateJobDescription(context);
      setDescription(draft);
    } catch (reason) {
      setAiError(
        reason instanceof Error
          ? reason.message
          : "The draft could not be generated.",
      );
    } finally {
      setAiBusy(false);
    }
  }
  async function sendResearchMessage() {
    const form = formRef.current;
    const message = researchInput.trim();
    if (!form || !message) return;
    const values = new FormData(form);
    const title = String(values.get("title")).trim();
    const companyWebsite = String(values.get("companyWebsite")).trim();
    if (!title || !companyWebsite) {
      setAiError(
        "Add a job title and company website before starting research.",
      );
      return;
    }
    const userMessage = { role: "user" as const, text: message };
    setResearchMessages((current) => [...current, userMessage]);
    setResearchInput("");
    setResearchBusy(true);
    setAiError("");
    try {
      const result = demoMode
        ? {
            reply:
              "This is the demo preview. In a connected workspace I would now review the company website and compare current, similar job ads. I have noted your priority and will use it in the editable draft.",
            sources: [
              {
                title: "Company website supplied for research",
                url: companyWebsite,
              },
            ],
          }
        : await researchJobWithAi({
            organizationId: organization.id,
            title,
            department: String(values.get("department")),
            location: String(values.get("location")),
            employmentType: String(values.get("employmentType")),
            workspaceMode: organization.workspace_mode,
            companyWebsite,
            researchNotes: researchMessages.map(
              (item) => `${item.role}: ${item.text}`,
            ),
            message,
          });
      setResearchMessages((current) => [
        ...current,
        { role: "assistant", text: result.reply },
      ]);
      setResearchSources(result.sources);
    } catch (reason) {
      setAiError(
        reason instanceof Error
          ? reason.message
          : "The research could not be completed.",
      );
    } finally {
      setResearchBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const input = {
      organization_id: organization.id,
      title: String(form.get("title")),
      department: String(form.get("department")),
      location: String(form.get("location")),
      description: String(form.get("description")),
      employment_type: String(form.get("employmentType")),
      job_type:
        organization.workspace_mode === "consulting"
          ? ("client_assignment" as const)
          : ("internal_role" as const),
      status: "open" as const,
    };
    try {
      onCreated(
        demoMode
          ? {
              ...input,
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
            }
          : await createJob(input),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ModalShell
      title={`Create ${organization.workspace_mode === "consulting" ? "assignment" : "job"}`}
      subtitle="Define the opportunity candidates will be evaluated against."
      onClose={onClose}
    >
      <form className="modal-form" ref={formRef} onSubmit={submit}>
        <label>
          Title
          <input
            name="title"
            required
            placeholder="e.g. Senior Data Engineer"
          />
        </label>
        <div className="form-grid">
          <label>
            Department
            <select name="department" defaultValue="" required>
              <option value="" disabled>
                Select department
              </option>
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </label>
          <label>
            Location
            <select name="location" defaultValue="" required>
              <option value="" disabled>
                Select location
              </option>
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Employment type
          <select name="employmentType" defaultValue="" required>
            <option value="" disabled>
              Select employment type
            </option>
            {employmentTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <section className="research-option">
          <div className="research-option-heading">
            <div>
              <span className="research-icon">
                <Search size={17} />
              </span>
              <div>
                <strong>Research with AI</strong>
                <small>
                  Discuss company context and role priorities before drafting.
                </small>
              </div>
            </div>
            <button
              className="secondary-button"
              type="button"
              aria-expanded={researchOpen}
              onClick={() => setResearchOpen((current) => !current)}
            >
              {researchOpen ? "Close research" : "Add research"}
            </button>
          </div>
          {researchOpen && (
            <div className="research-body">
              <label>
                Company website
                <input
                  name="companyWebsite"
                  type="url"
                  placeholder="https://yourcompany.com"
                  required={researchOpen}
                />
                <small>
                  AI will only use public information and will show its sources.
                </small>
              </label>
              <div className="research-chat" aria-live="polite">
                {!researchMessages.length && (
                  <p className="research-intro">
                    Tell AI what matters for this role. For example: “Focus on
                    our culture and compare the skills requested by similar
                    companies.”
                  </p>
                )}
                {researchMessages.map((message, index) => (
                  <div
                    className={`research-message ${message.role}`}
                    key={`${message.role}-${index}`}
                  >
                    <strong>
                      {message.role === "assistant" ? "InsideGrid AI" : "You"}
                    </strong>
                    <p>{message.text}</p>
                  </div>
                ))}
              </div>
              {!!researchSources.length && (
                <div className="research-sources">
                  <strong>Sources reviewed</strong>
                  {researchSources.map((source) => (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      key={source.url}
                    >
                      {source.title} <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              )}
              <div className="research-composer">
                <textarea
                  value={researchInput}
                  onChange={(event) => setResearchInput(event.target.value)}
                  rows={2}
                  aria-label="Message AI research assistant"
                  placeholder="What should the research focus on?"
                />
                <button
                  className="primary-button"
                  type="button"
                  onClick={sendResearchMessage}
                  disabled={researchBusy || !researchInput.trim()}
                >
                  {researchBusy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                  Send
                </button>
              </div>
              {demoMode && (
                <small className="demo-disclosure">
                  Demo preview — AI drafting starts in a connected Supabase
                  workspace.
                </small>
              )}
            </div>
          )}
        </section>
        <div className="description-heading">
          <div>
            <strong>Description</strong>
            <small>
              Start with an AI draft, then edit it in your own words.
            </small>
          </div>
          <button
            className="ai-draft-button"
            type="button"
            onClick={draftDescription}
            disabled={aiBusy}
          >
            {aiBusy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Sparkles size={15} />
            )}
            {aiBusy
              ? "Writing draft…"
              : description
                ? "Rewrite draft"
                : "Generate draft"}
          </button>
        </div>
        {aiError && <div className="form-error ai-error">{aiError}</div>}
        <label className="description-field">
          <textarea
            name="description"
            aria-label="Description"
            rows={10}
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Write the responsibilities, outcomes and requirements — or let AI prepare a first draft…"
          />
          <small>
            You remain in control. Review and edit the text before publishing.
          </small>
        </label>
        <FormActions
          busy={busy}
          onClose={onClose}
          label="Create and open pipeline"
        />
      </form>
    </ModalShell>
  );
}

function CandidateModal({
  organization,
  jobs,
  demoMode,
  onClose,
  onCreated,
}: {
  organization: Organization;
  jobs: Job[];
  demoMode: boolean;
  onClose: () => void;
  onCreated: (candidate: Candidate, application?: Application) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const input = {
      organization_id: organization.id,
      full_name: String(form.get("name")),
      professional_title: String(form.get("title")),
      email: String(form.get("email")),
      phone: String(form.get("phone")),
      location: String(form.get("location")),
      linkedin_url: String(form.get("linkedin")),
      summary: String(form.get("summary")),
      skills: String(form.get("skills"))
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      candidate_type: String(
        form.get("candidateType"),
      ) as Candidate["candidate_type"],
      available_from: String(form.get("availableFrom")) || null,
    };
    try {
      const candidate = demoMode
        ? {
            ...input,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          }
        : await createCandidate(input);
      const jobId = String(form.get("job"));
      let application: Application | undefined;
      if (jobId)
        application = demoMode
          ? {
              id: crypto.randomUUID(),
              organization_id: organization.id,
              job_id: jobId,
              candidate_id: candidate.id,
              stage: "new",
              position: 0,
              stage_changed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            }
          : await createApplication({
              organization_id: organization.id,
              job_id: jobId,
              candidate_id: candidate.id,
            });
      onCreated(candidate, application);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ModalShell
      title="Add candidate"
      subtitle="Create one reusable profile and optionally add it to a live pipeline."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Full name
            <input name="name" required />
          </label>
          <label>
            Professional title
            <input name="title" required />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Phone
            <input name="phone" />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Location
            <input name="location" />
          </label>
          <label>
            LinkedIn URL
            <input
              name="linkedin"
              type="url"
              placeholder="https://linkedin.com/in/…"
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Talent type
            <select name="candidateType">
              <option value="external">External candidate</option>
              <option value="employee">Employee / consultant</option>
              <option value="subcontractor">Subcontractor</option>
            </select>
          </label>
          <label>
            Available from
            <input name="availableFrom" type="date" />
          </label>
        </div>
        <label>
          Skills
          <input name="skills" required placeholder="SQL, Python, Azure" />
          <small>Separate skills with commas.</small>
        </label>
        <label>
          Profile summary
          <textarea name="summary" rows={4} />
        </label>
        <label>
          Add to pipeline
          <select name="job">
            <option value="">Talent pool only</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </label>
        <FormActions busy={busy} onClose={onClose} label="Add candidate" />
      </form>
    </ModalShell>
  );
}

function UserModal({
  organizations,
  demoMode,
  onClose,
  onCreated,
}: {
  organizations: Organization[];
  demoMode: boolean;
  onClose: () => void;
  onCreated: (organization?: Organization) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<"customer" | "platform_admin">("customer");
  const [choice, setChoice] = useState(organizations[0]?.id ?? "new");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      if (demoMode) {
        onCreated(
          choice === "new" && role === "customer"
            ? {
                id: crypto.randomUUID(),
                name: String(form.get("organizationName")),
                workspace_mode: String(
                  form.get("workspaceMode"),
                ) as WorkspaceMode,
              }
            : undefined,
        );
        return;
      }
      const result = await createUser({
        email: String(form.get("email")),
        password: String(form.get("password")),
        fullName: String(form.get("fullName")),
        role,
        organizationId:
          role === "customer" && choice !== "new" ? choice : undefined,
        organizationName:
          role === "customer" && choice === "new"
            ? String(form.get("organizationName"))
            : undefined,
        workspaceMode: String(form.get("workspaceMode")) as WorkspaceMode,
        permissions: form.getAll("permissions").map(String),
      });
      onCreated(result.organization);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ModalShell
      title="Create account"
      subtitle="Provision an administrator or a customer workspace account."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Full name
            <input name="fullName" required />
          </label>
          <label>
            Role
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as typeof role)}
            >
              <option value="customer">Customer</option>
              <option value="platform_admin">Platform administrator</option>
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Temporary password
            <input name="password" type="password" minLength={10} required />
          </label>
        </div>
        {role === "customer" && (
          <>
            <label>
              Organization
              <select
                value={choice}
                onChange={(event) => setChoice(event.target.value)}
              >
                <option value="new">Create new organization</option>
                {organizations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {choice === "new" && (
              <div className="form-grid">
                <label>
                  Organization name
                  <input name="organizationName" required />
                </label>
                <label>
                  Workspace type
                  <select name="workspaceMode">
                    <option value="recruitment">Recruit employees</option>
                    <option value="consulting">Place consultants</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>
              </div>
            )}
            <fieldset className="permission-fieldset">
              <legend>Account permissions</legend>
              <p>Choose only what this person needs. Workspace type and permissions are managed separately.</p>
              <label><input type="checkbox" name="permissions" value="manage_jobs" defaultChecked /> <span><strong>Jobs and assignments</strong><small>Create and manage opportunities and pipelines.</small></span></label>
              <label><input type="checkbox" name="permissions" value="manage_candidates" defaultChecked /> <span><strong>Candidates</strong><small>View and manage external candidate profiles.</small></span></label>
              <label><input type="checkbox" name="permissions" value="manage_consultants" /> <span><strong>Consultants</strong><small>View employee CVs, availability and assignment matching.</small></span></label>
              <label><input type="checkbox" name="permissions" value="manage_accounts" /> <span><strong>Account administration</strong><small>Manage members inside this customer workspace.</small></span></label>
            </fieldset>
          </>
        )}
        <FormActions
          busy={busy}
          onClose={onClose}
          label="Create secure account"
        />
      </form>
    </ModalShell>
  );
}
function FormActions({
  busy,
  onClose,
  label,
}: {
  busy: boolean;
  onClose: () => void;
  label: string;
}) {
  return (
    <div className="form-actions">
      <button className="secondary-button" type="button" onClick={onClose}>
        Cancel
      </button>
      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <Check size={17} />
        )}{" "}
        {label}
      </button>
    </div>
  );
}

function JobDrawer({ job, candidates, applications, onClose, onOpenCandidate }: { job: Job; candidates: Candidate[]; applications: Application[]; onClose: () => void; onOpenCandidate: (id: string) => void }) {
  const jobApplications = applications.filter((item) => item.job_id === job.id);
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer record-drawer" onMouseDown={(event)=>event.stopPropagation()}><header><div><span className="eyebrow dark">{job.status.toUpperCase()} ROLE</span><h2>{job.title}</h2><p>{job.department} · {job.location} · {job.employment_type}</p></div><button className="icon-button" onClick={onClose}><X/></button></header><section className="job-drawer-summary"><div><strong>{jobApplications.length}</strong><small>Candidates</small></div><div><strong>{jobApplications.filter(item=>item.stage==="interview").length}</strong><small>Interviews</small></div><div><strong>{jobApplications.filter(item=>item.stage==="offer").length}</strong><small>Offers</small></div></section><section><h3>About the opportunity</h3><p className="preserve-lines">{job.description || "No job description has been added."}</p></section><section><div className="drawer-section-heading"><h3>Candidate matches</h3><small>Based on stated profile evidence</small></div><div className="ranked-list">{jobApplications.map(application=>{const candidate=candidates.find(item=>item.id===application.candidate_id);if(!candidate)return null;const match=candidateMatch(candidate,job);return <button key={application.id} onClick={()=>onOpenCandidate(candidate.id)}><span className="avatar soft">{initials(candidate.full_name)}</span><span><strong>{candidate.full_name}</strong><small>{match.matched.length ? `Evidence: ${match.matched.join(", ")}` : "Review profile evidence"}</small></span><b>{match.score}%</b><ArrowRight size={15}/></button>})}{!jobApplications.length&&<p className="muted-copy">No candidates have been added to this role yet.</p>}</div></section></aside></div>;
}

function CandidateProfileDrawer({ candidate, jobs, applications, onClose }: { candidate: Candidate; jobs: Job[]; applications: Application[]; onClose: () => void }) {
  const candidateApplications = applications.filter(item=>item.candidate_id===candidate.id);
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer record-drawer" onMouseDown={(event)=>event.stopPropagation()}><header><div className="candidate-card-head"><span className="avatar large">{initials(candidate.full_name)}</span><div><h2>{candidate.full_name}</h2><p>{candidate.professional_title} · {candidate.location}</p></div></div><button className="icon-button" onClick={onClose}><X/></button></header><section className="profile-actions"><button className="primary-button" onClick={()=>downloadCandidateCv(candidate)}>Download CV as PDF</button>{candidate.linkedin_url&&<a className="secondary-button" href={candidate.linkedin_url} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={14}/></a>}</section><section><h3>Professional profile</h3><p>{candidate.summary || "No profile summary has been added."}</p><div className="skill-row roomy">{candidate.skills.map(skill=><span key={skill}>{skill}</span>)}</div></section><section><div className="drawer-section-heading"><h3>Match by opportunity</h3><small>Evidence, not an automated decision</small></div><div className="match-list">{candidateApplications.map(application=>{const job=jobs.find(item=>item.id===application.job_id);if(!job)return null;const match=candidateMatch(candidate,job);return <article key={application.id}><div><strong>{job.title}</strong><span className={`stage-badge ${application.stage}`}>{application.stage}</span></div><div className="match-meter"><i style={{width:`${match.score}%`}}></i></div><b>{match.score}% profile match</b><p>{match.matched.length ? `Supported by: ${match.matched.join(", ")}.` : "No direct skill keywords found; review manually."}</p>{match.gaps.length>0&&<small>Additional experience to explore: {match.gaps.join(", ")}.</small>}</article>})}{!candidateApplications.length&&<p className="muted-copy">This person is currently in the talent pool and has not been connected to an opportunity.</p>}</div></section><section className="contact-summary"><span><small>Email</small><a href={`mailto:${candidate.email}`}>{candidate.email}</a></span><span><small>Phone</small>{candidate.phone||"Not provided"}</span><span><small>Available from</small>{candidate.available_from||"Not specified"}</span></section></aside></div>;
}

function CandidateDrawer({
  candidate,
  job,
  application,
  evaluation,
  organization,
  onClose,
  onMove,
  onEvaluate,
}: {
  candidate: Candidate;
  job: Job;
  application: Application;
  evaluation?: AiEvaluation;
  organization: Organization;
  onClose: () => void;
  onMove: (application: Application, stage: ApplicationStage) => void;
  onEvaluate: (application: Application) => Promise<void>;
}) {
  const [evaluating, setEvaluating] = useState(false);
  async function evaluate() {
    setEvaluating(true);
    try {
      await onEvaluate(application);
    } finally {
      setEvaluating(false);
    }
  }
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="drawer"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div className="candidate-card-head">
            <span className="avatar large">
              {initials(candidate.full_name)}
            </span>
            <div>
              <h2>{candidate.full_name}</h2>
              <p>{candidate.professional_title}</p>
            </div>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </header>
        <section className="drawer-stage">
          <span>Stage for {job.title}</span>
          <select
            value={application.stage}
            onChange={(event) =>
              onMove(application, event.target.value as ApplicationStage)
            }
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.id === "hired" &&
                organization.workspace_mode === "consulting"
                  ? "Placed"
                  : stage.label}
              </option>
            ))}
            <option value="rejected">Rejected</option>
          </select>
        </section>
        <section>
          <h3>Profile</h3>
          <p>{candidate.summary || "No profile summary has been added yet."}</p>
          <div className="detail-grid">
            <span>
              <small>Email</small>
              <a href={`mailto:${candidate.email}`}>{candidate.email}</a>
            </span>
            <span>
              <small>Location</small>
              {candidate.location || "Not provided"}
            </span>
            {candidate.linkedin_url && (
              <span>
                <small>Professional profile</small>
                <a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  LinkedIn <ExternalLink size={13} />
                </a>
              </span>
            )}
            <span>
              <small>Talent type</small>
              {candidate.candidate_type}
            </span>
          </div>
          <div className="skill-row roomy">
            {candidate.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </section>
        <section className="ai-panel">
          <div className="ai-heading">
            <span className="spark-icon small">
              <Sparkles />
            </span>
            <div>
              <span className="eyebrow dark">AI INSIGHTS</span>
              <h3>Evidence for human review</h3>
            </div>
          </div>
          {evaluation ? (
            <div className="evaluation">
              <p>{evaluation.summary}</p>
              <InsightList
                title="Supported strengths"
                items={evaluation.strengths}
                tone="positive"
              />
              <InsightList
                title="Gaps or unknowns"
                items={evaluation.gaps}
                tone="warning"
              />
              <InsightList
                title="Follow-up questions"
                items={evaluation.follow_up_questions}
                tone="neutral"
              />
              <small>
                Decision support only. A person must review and decide.
              </small>
            </div>
          ) : (
            <>
              <p>
                Compare the verified profile with this job and surface evidence,
                unknowns, and useful interview questions.
              </p>
              <button
                className="primary-button"
                onClick={evaluate}
                disabled={evaluating}
              >
                {evaluating ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Sparkles size={17} />
                )}{" "}
                Generate AI insights
              </button>
            </>
          )}
        </section>
      </aside>
    </div>
  );
}
function InsightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div className={`insight-list ${tone}`}>
      <strong>{title}</strong>
      {items.map((item) => (
        <p key={item}>
          <span />
          {item}
        </p>
      ))}
    </div>
  );
}
function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <CircleUserRound />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
