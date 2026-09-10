import { MatchCoverage } from "./components/MatchCoverage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { affirmativeEvidence, containsEvidenceTerm } from "../../../supabase/functions/_shared/evidence";
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
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserPlus,
  Users,
  UserRoundSearch,
  X,
} from "lucide-react";
import { candidateApplicationContext, filterCandidateDirectory } from "./lib/candidateDirectory";
import "./fonts.css";
import "./tokens.css";
import "./styles.css";
import "./human-interface.css";
import "./dashboard.css";
import { PublicJobs } from "./components/PublicJobs";
import { HeroVideo } from "./components/HeroVideo";
import "./public-site.css";
import { ConsultingTools } from "./components/ConsultingTools";
import "./consistency.css";
import { demoWorkspace } from "./data/demo";
import {
  createApplication,
  createCandidate,
  createJob,
  setJobPublication,
  createUser,
  generateJobDescription,
  getSession,
  getCandidateCvUrl,
  loadWorkspace,
  onAuthChange,
  requestAiEvaluation,
  reviewAiEvaluation,
  researchJobWithAi,
  signIn,
  signOut,
  updateApplicationStage,
  updateCandidateNotes,
  uploadCandidateCv,
  uploadCandidatePhoto,
} from "./lib/api";
import { extractPdfPages } from "./lib/pdf";
import {
  CandidateAvatar,
  EmptyState,
  FormActions,
  InsightList,
  initials,
  ModalShell,
  PageHeader,
  RequirementEvidence,
  Toolbar,
} from "./components/ProductUi";
import { hasSupabaseConfig } from "./lib/supabase";
import type {
  AiEvaluation,
  Activity,
  AccountPermission,
  Application,
  ApplicationStage,
  Candidate,
  Job,
  Organization,
  Profile,
  WorkspaceData,
  WorkspaceMode,
} from "./types";

type View = "dashboard" | "pipeline" | "jobs" | "candidates" | "team" | "consulting";
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
const daysInStage = (value: string) =>
  Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000),
  );

function candidateMatch(candidate: Candidate, job: Job) {
  const profile = affirmativeEvidence(
    `${candidate.professional_title}\n${candidate.summary}\n${candidate.skills.join("\n")}\n${(candidate.experience || []).map((item) => `${item.role}\n${item.summary}`).join("\n")}\n${(candidate.cv_pages || []).map((page) => page.text).join("\n")}`,
  );
  const requirements = job.required_skills || [];
  const evaluateRequirement = (requirement: string) => {
    const words = requirement
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2);
    const hits = words.filter((word) => containsEvidenceTerm(profile, word)).length;
    const exact =
      containsEvidenceTerm(profile, requirement) ||
      candidate.skills.some((skill) =>
        requirement.trim().toLowerCase() === skill.trim().toLowerCase(),
      );
    const explicitlyNotMet = candidate.explicitly_not_met?.some(
      (item) => item.toLowerCase() === requirement.toLowerCase(),
    );
    const status = explicitlyNotMet
      ? ("not_met" as const)
      : exact
        ? ("supported" as const)
        : hits > 0
          ? ("partial" as const)
          : ("not_evidenced" as const);
    const evidence =
      status === "not_met"
        ? "The profile explicitly records that this requirement is not met."
        : status === "supported"
          ? candidate.skills.find((skill) =>
              requirement.toLowerCase().includes(skill.toLowerCase()),
            ) || candidate.summary
          : status === "partial"
            ? `Related wording appears in the profile (${hits} of ${words.length} key terms), but the full requirement is not established.`
            : "Not found in the CV or profile. Confirm with the candidate.";
    const evidenceKey = candidate.skills.find((skill) =>
      requirement.toLowerCase().includes(skill.toLowerCase()),
    );
    const provenance = evidenceKey
      ? candidate.skill_evidence?.[evidenceKey]
      : undefined;
    const cvPage = candidate.cv_pages?.find((page) =>
      containsEvidenceTerm(affirmativeEvidence(page.text), requirement),
    );
    return {
      requirement,
      status,
      evidence,
      source: candidate.cv_file_name && (provenance || cvPage)
        ? `${candidate.cv_file_name}${provenance ? ` · ${provenance.section}${provenance.page ? `, page ${provenance.page}` : ""}` : cvPage ? ` · extracted CV text, page ${cvPage.page}` : " · section/page not available"}`
        : "Saved profile; no CV page reference available",
    };
  };
  const requirementResults = requirements.map(evaluateRequirement);
  const preferredResults = (job.preferred_skills || []).map(
    evaluateRequirement,
  );
  const matched = requirementResults
    .filter((item) => item.status === "supported")
    .map((item) => item.requirement);
  return {
    matched,
    gaps: requirementResults
      .filter((item) => item.status !== "supported")
      .map((item) => item.requirement),
    requirementResults,
    preferredResults,
    calculation: requirementResults.length ? "Review the evidence for each requirement below. Confirm missing or partial evidence with the person." : "Add required criteria to the job or assignment before comparing profiles.",
  };
}

const matchScoreText = (match: ReturnType<typeof candidateMatch>) =>
  match.requirementResults.length
    ? `${match.matched.length} of ${match.requirementResults.length} required criteria supported`
    : "No required criteria defined";

async function downloadCandidateCv(candidate: Candidate) {
  if (candidate.cv_storage_path) {
    const url = await getCandidateCvUrl(
      candidate.cv_storage_path,
      candidate.cv_file_name,
    );
    window.location.assign(url);
    return;
  }
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(candidate.full_name, 20, 25);
  pdf.setFontSize(12);
  pdf.setTextColor(45, 65, 58);
  pdf.text(candidate.professional_title || "Candidate profile", 20, 34);
  pdf.setDrawColor(215, 220, 217);
  pdf.line(20, 42, 190, 42);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(70, 76, 73);
  pdf.setFontSize(10);
  pdf.text(
    [candidate.location, candidate.email, candidate.phone]
      .filter(Boolean)
      .join("  |  "),
    20,
    51,
  );
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(20, 25, 23);
  pdf.setFontSize(12);
  pdf.text("Profile", 20, 67);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(60, 66, 63);
  pdf.text(
    pdf.splitTextToSize(
      candidate.summary || "No profile summary provided.",
      170,
    ),
    20,
    75,
  );
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(20, 25, 23);
  pdf.setFontSize(12);
  pdf.text("Skills", 20, 105);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(candidate.skills.join("  ·  ") || "No skills provided", 20, 114);
  if (candidate.linkedin_url) {
    pdf.setTextColor(23, 107, 85);
    pdf.textWithLink("LinkedIn profile", 20, 132, {
      url: candidate.linkedin_url,
    });
  }
  pdf.save(`${candidate.full_name.replace(/\s+/g, "-").toLowerCase()}-cv.pdf`);
}

async function viewCandidateCv(candidate: Candidate) {
  if (candidate.cv_storage_path) {
    const url = await getCandidateCvUrl(candidate.cv_storage_path);
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(candidate.full_name, 20, 25);
  pdf.setFontSize(12);
  pdf.setTextColor(45, 65, 58);
  pdf.text(candidate.professional_title || "Candidate profile", 20, 34);
  pdf.setDrawColor(215, 220, 217);
  pdf.line(20, 42, 190, 42);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(55, 63, 59);
  pdf.setFontSize(10);
  pdf.text(
    pdf.splitTextToSize(
      candidate.summary || "No profile summary provided.",
      170,
    ),
    20,
    55,
  );
  pdf.setFont("helvetica", "bold");
  pdf.text("Skills", 20, 90);
  pdf.setFont("helvetica", "normal");
  pdf.text(candidate.skills.join("  ·  "), 20, 99);
  window.open(pdf.output("bloburl"), "_blank", "noopener,noreferrer");
}

type PublicPage = "home" | "pricing" | "jobs" | "login";

function PublicSite({
  page,
  onNavigate,
  onDemo,
  onDemoApplications,
  onWorkspace,
  onAuthenticated,
}: {
  page: PublicPage;
  onNavigate: (page: PublicPage) => void;
  onDemo: () => void;
  onDemoApplications: () => void;
  onWorkspace?: () => void;
  onAuthenticated: (userId: string) => Promise<void>;
}) {
  if (page === "login") return <Login onDemo={onDemo} onAuthenticated={onAuthenticated} onHome={() => onNavigate("home")} />;
  return (
    <main className="marketing-site">
      <header className="marketing-nav">
        <button className="brand bare" onClick={() => onNavigate("home")}>
          <span className="brand-mark">
            <Grid2X2 size={18} />
          </span>
          <span>InsideGrid</span>
        </button>
        <nav aria-label="Main navigation">
          <button onClick={() => onNavigate("home")}>Product</button>
          <button onClick={() => onNavigate("jobs")}>Browse jobs</button>
          <button onClick={() => onNavigate("pricing")}>Pricing</button>
          <button
            onClick={() =>
              { onNavigate("home"); setTimeout(() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }), 0); }
            }
          >
            How it works
          </button>
        </nav>
        <div className="marketing-actions">
          <button className="nav-login" onClick={() => onWorkspace ? onWorkspace() : onNavigate("login")}>
            {onWorkspace ? "Go to workspace" : "Sign in"}
          </button>
          <button
            className="primary-button"
            onClick={onDemo}
          >
            Explore the demo <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {page === "pricing" ? (
        <PricingPage onStart={onDemo} onSample={() => onNavigate("jobs")} />
      ) : page === "jobs" ? (
        <PublicJobs />
      ) : (
        <>
          <section className="marketing-hero">
            <div className="hero-copy">
              <p className="marketing-kicker">Applicant tracking system</p>
              <h1>
                Keep every hiring step
                <br />
                <span>in one place.</span>
              </h1>
              <p className="hero-lead">
                Manage jobs, review candidate experience and track each application from first contact to offer.
              </p>
              <div className="hero-cta">
                <button
                  className="primary-button large-button"
                  onClick={onDemo}
                >
                  Explore the demo
                </button>
                <button className="secondary-button large-button" onClick={() => onWorkspace ? onWorkspace() : onNavigate("login")}>
                  {onWorkspace ? "Go to workspace" : "Sign in"}
                </button>
              </div>
              <p className="trust-line">
                <Check size={15} /> No account needed &nbsp; <Check size={15} /> No
                credit card
              </p>
              <button
                className="hero-tertiary"
                onClick={() => onNavigate("jobs")}
              >
                Browse jobs <ArrowRight size={14} />
              </button>
            </div>
            <HeroVideo />
          </section>

          <section
            className="capability-strip"
            aria-label="InsideGrid capabilities"
          >
            <div>
              <strong>01</strong>
              <span>
                Build a reusable
                <br />
                talent profile
              </span>
            </div>
            <div>
              <strong>02</strong>
              <span>
                Create jobs with
                <br />
                an editable AI draft
              </span>
            </div>
            <div>
              <strong>03</strong>
              <span>
                Move people through
                <br />a clear pipeline
              </span>
            </div>
            <div>
              <strong>04</strong>
              <span>
                Match consultants
                <br />
                to client work
              </span>
            </div>
          </section>

          <section className="audience-section" id="how-it-works">
            <div className="section-intro">
              <p className="marketing-kicker">Start where you are</p>
              <h2>What brings you to InsideGrid?</h2>
              <p>
                Explore the recruitment and consulting demos, or try applying to a sample job.
              </p>
            </div>
            <div className="audience-grid">
              <AudienceCard
                number="01"
                icon={<UserRoundSearch />}
                title="I’m looking for work"
                text="Try a sample job application. Upload a sample CV and see how your application reaches the hiring workspace."
                bullets={[
                  "Sample job description",
                  "CV upload and profile links",
                  "Application confirmation",
                ]}
                action="Browse jobs"
                onClick={() => onNavigate("jobs")}
              />
              <AudienceCard
                featured
                number="02"
                icon={<UserPlus />}
                title="I’m hiring"
                text="Run a focused recruitment process without spreadsheets. Create jobs, collect candidates and keep every next step visible."
                bullets={[
                  "Jobs and candidate profiles",
                  "Compact candidate pipeline",
                  "Structured, human-led review",
                ]}
                action="Explore the demo"
                onClick={onDemo}
              />
              <AudienceCard
                number="03"
                icon={<BriefcaseBusiness />}
                title="I manage a consulting team"
                text="Build a searchable CV database, see availability and match your employed consultants to client assignments."
                bullets={[
                  "Consultant profiles and availability",
                  "CV and skills directory",
                  "Assignment pipeline",
                ]}
                action="Explore the demo"
                onClick={onDemo}
              />
            </div>
          </section>

          <section className="product-story">
            <button className="product-screenshot" onClick={onDemoApplications} aria-label="Open the InsideGrid applications demo">
              <img src="/media/insidegrid-applications.png" alt="InsideGrid's actual Applications view with demo candidates, job filters and stages from New to Hired" width="1640" height="800" loading="lazy" />
              <span>InsideGrid demo · Open applications <ArrowRight size={16} /></span>
            </button>
            <div className="story-copy">
              <p className="marketing-kicker">Less admin, more context</p>
              <h2>A shared view of every next step.</h2>
              <p>
                InsideGrid connects the job or assignment to each person,
                conversation and decision. Your team always knows what happened
                and what comes next.
              </p>
              <ul>
                <li>
                  <Check /> Filter applications by job or candidate
                </li>
                <li>
                  <Check /> Keep profiles useful across opportunities
                </li>
                <li>
                  <Check /> Use AI as writing and review support—not the
                  decision-maker
                </li>
              </ul>
              <button className="text-link" onClick={onDemo}>
                Explore the interactive demo <ArrowRight size={16} />
              </button>
            </div>
          </section>

          <section className="pricing-teaser">
            <div>
              <p className="marketing-kicker">Simple from day one</p>
              <h2>Start with the free pilot.</h2>
              <p>
                Explore with sample data now. Pilot workspaces are created by an administrator; paid plans are not available yet.
              </p>
            </div>
            <button
              className="light-button"
              onClick={() => onNavigate("pricing")}
            >
              View pilot details <ArrowRight size={16} />
            </button>
          </section>
        </>
      )}
      <footer className="marketing-footer">
        <div className="brand">
          <span className="brand-mark">
            <Grid2X2 size={18} />
          </span>
          InsideGrid
        </div>
        <p>One clear view of people, work and what comes next.</p>
        <div>
          <button onClick={() => onNavigate("pricing")}>Pricing</button>
          <button onClick={() => onWorkspace ? onWorkspace() : onNavigate("login")}>{onWorkspace ? "Go to workspace" : "Sign in"}</button>
        </div>
        <small>© 2026 InsideGrid · Product demo</small>
      </footer>
    </main>
  );
}

function AudienceCard({
  number,
  icon,
  title,
  text,
  bullets,
  action,
  featured,
  onClick,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  bullets: string[];
  action: string;
  featured?: boolean;
  onClick: () => void;
}) {
  return (
    <article className={`audience-card ${featured ? "featured" : ""}`}>
      <div className="card-index">
        <span>{icon}</span>
        <small>{number}</small>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <ul>
        {bullets.map((item) => (
          <li key={item}>
            <Check size={15} />
            {item}
          </li>
        ))}
      </ul>
      <button onClick={onClick}>
        {action}
        <ArrowRight size={16} />
      </button>
    </article>
  );
}

function PricingPage({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  const plans = [
    { audience: "For applicants", name: "Sample application", price: "Free", note: "to explore", description: "See how a job application works using test details.", items: ["Sample job description", "PDF CV upload", "Profile links and introduction", "Submission confirmation"], action: "Browse jobs" },
    { audience: "For hiring teams", name: "Recruitment pilot", price: "Free", note: "during the pilot", description: "Manage recruitment in a workspace provided by an administrator.", items: ["Jobs and candidate profiles", "Application tracking and filters", "CV review and notes", "Editable AI job drafts"], action: "Explore the demo", featured: true },
    { audience: "For consulting teams", name: "Consulting pilot", price: "Free", note: "during the pilot", description: "Organise consultants and review their experience against assignment requirements.", items: ["Consultant profiles", "CV and skills directory", "Client assignments", "Availability information"], action: "Explore the demo" },
  ];
  return (
    <section className="pricing-page">
      <div className="pricing-heading">
        <p className="marketing-kicker">Pilot access</p>
        <h1>Start with the free pilot.</h1>
        <p>
          Explore the demo without an account. To use a pilot workspace, sign in with the account created by your administrator.
        </p>
      </div>
      <div className="pricing-grid">
        {plans.map((plan) => (
          <article
            className={`price-card ${plan.featured ? "featured" : ""}`}
            key={plan.name}
          >
            {plan.featured && (
              <span className="popular-label">Best place to start</span>
            )}
            <small>{plan.audience}</small>
            <h2>{plan.name}</h2>
            <div className="price">
              <strong>{plan.price}</strong>
              <span>{plan.note}</span>
            </div>
            <p>{plan.description}</p>
            <ul>
              {plan.items.map((item) => (
                <li key={item}>
                  <Check size={16} />
                  {item}
                </li>
              ))}
            </ul>
            <button
              className={plan.featured ? "primary-button" : "secondary-button"}
              onClick={plan.name === "Sample application" ? onSample : onStart}
            >
              {plan.action}
              <ArrowRight size={16} />
            </button>
          </article>
        ))}
      </div>
      <div className="paid-note">
        <Clock3 />
        <div>
          <strong>What happens after the pilot?</strong>
          <p>
            Paid plans are not available yet. Pricing and limits will be shared before the pilot ends. There is no automatic upgrade or payment in this app.
          </p>
        </div>
      </div>
    </section>
  );
}

function Login({
  onDemo,
  onHome,
  onAuthenticated,
}: {
  onDemo: () => void;
  onHome: () => void;
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
    <main className="signin-page">
      <header className="signin-header">
        <button className="brand bare" onClick={onHome}><span className="brand-mark"><Grid2X2 size={18} /></span><span>InsideGrid</span></button>
        <button className="signin-back" onClick={onHome}>← Back to website</button>
      </header>
      <div className="signin-layout">
        <section className="signin-visual" aria-label="InsideGrid workspace">
          <img src="/media/team-poster.jpg" alt="" />
          <div className="signin-visual-copy">
            <span>THE INSIDEGRID WORKSPACE</span>
            <h2>Your recruitment,<br />in one place.</h2>
            <p>Keep jobs, candidate profiles and next steps together.</p>
            <div className="signin-workflow"><span>Jobs</span><ArrowRight size={14} /><span>Candidates</span><ArrowRight size={14} /><span>Next steps</span></div>
          </div>
          <a className="signin-photo-credit" href="https://www.pexels.com/video/people-working-in-the-office-8467625/" target="_blank" rel="noreferrer">cottonbro studio / Pexels</a>
        </section>
        <section className="signin-form-side">
          <form className="signin-form" onSubmit={submit}>
            <span className="signin-eyebrow">YOUR WORKSPACE</span>
            <h1>Welcome back.</h1>
            <p className="signin-intro">Sign in to pick up where your team left off.</p>
            <label htmlFor="signin-email">Email address</label>
            <input id="signin-email" name="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" required />
            <label htmlFor="signin-password">Password</label>
            <input id="signin-password" name="password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" required />
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary-button wide signin-submit" type="submit" disabled={busy || !hasSupabaseConfig}>{busy ? <><LoaderCircle className="spin" size={17} /> Signing in…</> : <>Sign in <ArrowRight size={17} /></>}</button>
            {!hasSupabaseConfig && <p className="config-note">Sign-in is currently unavailable.</p>}
            <p className="signin-access-note">Use the account provided by your workspace administrator.</p>
            <div className="signin-demo"><span>Just exploring?</span><button type="button" onClick={onDemo}>Try the interactive demo <ArrowRight size={15} /></button></div>
            <p className="signin-security"><ShieldCheck size={16} /> Your workspace is private to your team.</p>
          </form>
        </section>
      </div>
    </main>
  );
}

function App() {
  const [publicPage, setPublicPage] = useState<PublicPage>(() => new URLSearchParams(window.location.search).has("job") ? "jobs" : "home");
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [jobFilter, setJobFilter] = useState("all");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [workspaceError, setWorkspaceError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const demoModeRef = useRef(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!mobileNav) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const sidebar = document.querySelector<HTMLElement>(".product-sidebar");
    const timer = window.setTimeout(() => sidebar?.querySelector<HTMLElement>(".sidebar-close")?.focus(), 0);
    const trapNavigationFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !sidebar) return;
      const items = Array.from(sidebar.querySelectorAll<HTMLElement>("button, select, summary, a[href]")).filter(item => item.getClientRects().length > 0 && !item.hasAttribute("disabled"));
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trapNavigationFocus);
    return () => { window.clearTimeout(timer); document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", trapNavigationFocus); previous?.focus(); };
  }, [mobileNav]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view, demoMode, showWorkspace, publicPage]);
  useEffect(() => {
    const closeOverlay = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileNav(false);
      setModal(null);
      setSelectedApplicationId(null);
      setSelectedJobId(null);
      setSelectedCandidateId(null);
    };
    window.addEventListener("keydown", closeOverlay);
    return () => window.removeEventListener("keydown", closeOverlay);
  }, []);
  useEffect(() => {
    const open = Boolean(
      modal || selectedApplicationId || selectedJobId || selectedCandidateId,
    );
    if (!open) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const timer = window.setTimeout(() => {
      const surface = document.querySelector<HTMLElement>(".modal,.drawer");
      surface?.setAttribute("role", "dialog");
      surface?.setAttribute("aria-modal", "true");
      surface
        ?.querySelector<HTMLElement>(
          "button,input,select,textarea,a[href],summary,[tabindex='0']",
        )
        ?.focus();
    }, 0);
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const surface = document.querySelector<HTMLElement>(".modal,.drawer");
      if (!surface) return;
      const items = [
        ...surface.querySelectorAll<HTMLElement>(
          "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex='0']",
        ),
      ].filter((item) => item.offsetParent !== null);
      if (!items.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modal, selectedApplicationId, selectedJobId, selectedCandidateId]);
  useEffect(() => {
    if (!hasSupabaseConfig) return;
    let alive = true;
    getSession()
      .then(async (session) => {
        if (session && alive) await authenticate(session.user.id, false);
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
  async function authenticate(userId: string, openWorkspace = true) {
    setLoading(true);
    setWorkspaceError("");
    try {
      const next = await loadWorkspace(userId);
      setWorkspace(next);
      setView("dashboard");
      setShowWorkspace(openWorkspace);
      setSelectedOrganizationId(next.organizations[0]?.id ?? "");
      setDemoMode(false);
      demoModeRef.current = false;
    } catch (reason) {
      setWorkspaceError(reason instanceof Error ? reason.message : "Unable to load your workspace.");
      throw reason;
    } finally {
      setLoading(false);
    }
  }
  function enterDemo() {
    const clone = structuredClone(demoWorkspace);
    setWorkspace(clone);
    setView("dashboard");
    setShowWorkspace(true);
    setSelectedOrganizationId(clone.organizations[0].id);
    setDemoMode(true);
    demoModeRef.current = true;
  }
  async function exit() {
    if (!demoMode && hasSupabaseConfig) await signOut();
    setWorkspace(null);
    setShowWorkspace(false);
    setPublicPage("home");
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
  if (!workspace || !showWorkspace)
    return (
      <>
      {workspaceError && <div className="form-error" role="alert">{workspaceError}</div>}
      <PublicSite
        page={publicPage}
        onNavigate={setPublicPage}
        onDemo={enterDemo}
        onDemoApplications={() => { enterDemo(); setView("pipeline"); }}
        onWorkspace={workspace ? () => { setView("dashboard"); setShowWorkspace(true); } : undefined}
        onAuthenticated={authenticate}
      />
      </>
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
  const memberPermissions =
    currentWorkspace.memberships.find(
      (item) =>
        item.organization_id === organization.id &&
        item.user_id === currentWorkspace.profile.id,
    )?.permissions ?? [];
  const can = (permission: AccountPermission) =>
    isAdmin || memberPermissions.includes(permission);
  const navigate = (next: View) => {
    setView(next);
    setMobileNav(false);
  };
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
      update("activities", [
        {
          id: crypto.randomUUID(),
          organization_id: application.organization_id,
          actor_id: currentWorkspace.profile.id,
          entity_type: "application",
          entity_id: application.id,
          action: "application.stage_changed",
          metadata: {
            from: application.stage,
            to: stage,
            ...(demoMode ? { demo: true } : {}),
          },
          created_at: new Date().toISOString(),
        },
        ...currentWorkspace.activities,
      ]);
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
  async function addCandidateNote(candidate: Candidate, note: string) {
    const notes = [...(candidate.notes || []), note];
    const previous = currentWorkspace.candidates;
    update(
      "candidates",
      previous.map((item) =>
        item.id === candidate.id ? { ...item, notes } : item,
      ),
    );
    try {
      if (!demoMode) {
        const saved = await updateCandidateNotes(candidate.id, notes);
        update(
          "candidates",
          currentWorkspace.candidates.map((item) =>
            item.id === saved.id ? { ...item, ...saved } : item,
          ),
        );
      }
      setToast("Note added.");
      return true;
    } catch (reason) {
      update("candidates", previous);
      setToast(
        reason instanceof Error
          ? reason.message
          : "The note could not be saved.",
      );
      return false;
    }
  }
  async function addEvaluationReview(
    evaluation: AiEvaluation,
    comment: string,
  ) {
    const next = {
      ...evaluation,
      reviewed_comment: comment,
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentWorkspace.profile.id,
    };
    const previous = currentWorkspace.evaluations;
    update(
      "evaluations",
      previous.map((item) => (item.id === evaluation.id ? next : item)),
    );
    try {
      if (!demoMode) {
        const saved = await reviewAiEvaluation(evaluation.id, comment);
        update(
          "evaluations",
          previous.map((item) => (item.id === saved.id ? saved : item)),
        );
      }
      setToast("Evaluation review saved.");
    } catch (reason) {
      update("evaluations", previous);
      setToast(
        reason instanceof Error
          ? reason.message
          : "The review could not be saved.",
      );
    }
  }
  return (
    <div className="app-shell candidate-app">
      <aside className={`product-sidebar${mobileNav ? " is-open" : ""}`} aria-label="Workspace navigation">
        <button className="brand bare" onClick={() => { setPublicPage("home"); setShowWorkspace(false); setMobileNav(false); setModal(null); setSelectedApplicationId(null); setSelectedJobId(null); setSelectedCandidateId(null); }} aria-label="InsideGrid home">
          <span className="brand-mark"><Grid2X2 size={19} /></span><span>InsideGrid</span>
        </button>
        <button className="sidebar-close" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X size={20} /></button>
        <nav aria-label="Main navigation">
          <button className="product-nav-link" aria-current={view === "dashboard" ? "page" : undefined} onClick={() => navigate("dashboard")}><LayoutDashboard size={18} /> Dashboard</button>
          {(can("manage_candidates") || can("manage_consultants") || can("manage_jobs")) && <button className="product-nav-link" aria-current={view === "candidates" ? "page" : undefined} onClick={() => navigate("candidates")}><Users size={18} />{showConsulting && !showRecruitment ? "Consultants" : "Candidates"}</button>}
          {can("manage_jobs") && <button className="product-nav-link" aria-current={view === "jobs" ? "page" : undefined} onClick={() => navigate("jobs")}><BriefcaseBusiness size={18} />{showConsulting && !showRecruitment ? "Assignments" : "Jobs"}</button>}
          {(can("manage_jobs") || can("manage_candidates") || can("manage_consultants")) && <button className="product-nav-link" aria-current={view === "pipeline" ? "page" : undefined} onClick={() => navigate("pipeline")}><Grid2X2 size={18} /> Applications</button>}
          {showConsulting && (can("manage_consultants") || can("manage_jobs")) && <button className="product-nav-link" aria-current={view === "consulting" ? "page" : undefined} onClick={() => navigate("consulting")}><SlidersHorizontal size={18} />Match & tailor CV</button>}
          {isAdmin && <button className="product-nav-link" aria-current={view === "team" ? "page" : undefined} onClick={() => navigate("team")}><ShieldCheck size={18} /> Access & accounts</button>}
        </nav>
        <div className="product-account">
          {demoMode && <span className="product-demo-label">Demo</span>}
          {isAdmin && workspace.organizations.length > 1 ? <label className="product-organization"><span className="sr-only">Workspace</span><select aria-label="Workspace" value={organization.id} onChange={event => {
            setSelectedOrganizationId(event.target.value); setView("candidates"); setMobileNav(false); setJobFilter("all"); setCandidateSearch(""); setSelectedApplicationId(null); setSelectedJobId(null); setSelectedCandidateId(null);
          }}>{workspace.organizations.map(item => <option key={item.id} value={item.id}>{item.workspace_mode === "consulting" ? "Consulting" : item.workspace_mode === "recruitment" ? "Recruitment" : item.name}{workspace.organizations.filter(other => other.workspace_mode === item.workspace_mode).length > 1 ? ` · ${item.name}` : ""}</option>)}</select></label> : <span className="product-organization-name">{organization.workspace_mode === "consulting" ? "Consulting" : organization.workspace_mode === "recruitment" ? "Recruitment" : organization.name}</span>}
          <details className="product-account-menu">
            <summary aria-label="Account and workspace options"><span className="avatar">{initials(workspace.profile.full_name)}</span><ChevronDown size={14} /></summary>
            <div className="product-menu-panel">
              <strong>{workspace.profile.full_name}</strong>
              {can("manage_jobs") && <button onClick={event => { navigate("jobs"); event.currentTarget.closest("details")?.removeAttribute("open"); }}><BriefcaseBusiness size={16} /> {showConsulting && !showRecruitment ? "Manage assignments" : "Manage jobs"}</button>}
              {(can("manage_jobs") || can("manage_candidates")) && <button onClick={event => { navigate("pipeline"); event.currentTarget.closest("details")?.removeAttribute("open"); }}><Grid2X2 size={16} /> Applications</button>}
              {isAdmin && <button onClick={event => { navigate("team"); event.currentTarget.closest("details")?.removeAttribute("open"); }}><ShieldCheck size={16} /> Access & accounts</button>}
              <button onClick={exit}><LogOut size={16} />{demoMode ? "Exit demo" : "Sign out"}</button>
            </div>
          </details>
        </div>
      </aside>
      <div className="mobile-workbench-header"><button aria-label="Open navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(true)}><Menu size={21} /></button><span>InsideGrid</span></div>
      {mobileNav && <button className="sidebar-scrim" aria-label="Close navigation overlay" onClick={() => setMobileNav(false)} />}
      <main className="workbench-main">
        <div className="workbench-content">
          {view === "dashboard" && (
            <Dashboard
              organization={organization}
              jobs={jobs}
              candidates={candidates}
              applications={applications}
              activities={workspace.activities.filter(
                (item) => item.organization_id === organization.id,
              )}
              canCreateJob={can("manage_jobs")}
              onNavigate={setView}
              onAddJob={() => setModal("job")}
              onOpenApplication={setSelectedApplicationId}
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
              onPublish={async (job, publish) => {
                const saved = demoMode ? { ...job, published: publish, public_slug: job.public_slug || `demo-${job.id}` } : await setJobPublication(job.id, publish);
                setWorkspace(current => current ? { ...current, jobs: current.jobs.map(item => item.id === saved.id ? saved : item) } : current);
                setToast(demoMode ? "Demo status updated locally. No public job was created." : publish ? "Published. The job is now on the public job page." : "Unpublished. The job is no longer accepting public applications.");
              }}
              demo={demoMode}
            />
          )}
          {view === "consulting" && showConsulting && (can("manage_consultants") || can("manage_jobs")) && <ConsultingTools
            key={organization.id} organizationId={organization.id} candidates={candidates} jobs={jobs} applications={applications} demo={demoMode}
            onOpenProfile={setSelectedCandidateId}
            onApplicationAdded={application => setWorkspace(current => current ? {...current, applications: [...current.applications.filter(item => item.id !== application.id), application]} : current)}
          />}
          {view === "candidates" && (
            <Candidates
              consulting={showConsulting && !showRecruitment}
              key={organization.id}
              candidates={candidates}
              applications={applications}
              jobs={jobs}
              onAdd={can("manage_candidates") || can("manage_consultants") ? () => setModal("candidate") : undefined}
              onManageJobs={can("manage_jobs") ? () => navigate("jobs") : undefined}
              onSelect={setSelectedCandidateId}
            />
          )}
          {view === "team" && isAdmin && (
            <Team
              organizations={workspace.organizations}
              profile={workspace.profile}
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
            setJobFilter(job.id);
            setCandidateSearch("");
            setView("pipeline");
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
          onAddNote={addCandidateNote}
          onReviewEvaluation={addEvaluationReview}
        />
      )}
      {selectedJobId &&
        workspace.jobs.find((item) => item.id === selectedJobId) && (
          <JobDrawer
            job={workspace.jobs.find((item) => item.id === selectedJobId)!}
            candidates={workspace.candidates}
            applications={workspace.applications}
            onClose={() => setSelectedJobId(null)}
            onOpenCandidate={(id) => {
              setSelectedJobId(null);
              setSelectedCandidateId(id);
            }}
          />
        )}
      {selectedCandidateId &&
        workspace.candidates.find(
          (item) => item.id === selectedCandidateId,
        ) && (
          <CandidateProfileDrawer
            candidate={
              workspace.candidates.find(
                (item) => item.id === selectedCandidateId,
              )!
            }
            jobs={jobs}
            applications={applications}
            onAddNote={can("manage_candidates") || can("manage_consultants") ? addCandidateNote : undefined}
            onOpenApplication={id => { setSelectedCandidateId(null); setSelectedApplicationId(id); }}
            onClose={() => setSelectedCandidateId(null)}
          />
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
        Your account is active but has not been connected to a workspace
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
  activities,
  canCreateJob,
  onNavigate,
  onAddJob,
  onOpenApplication,
}: {
  organization: Organization;
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  activities: Activity[];
  canCreateJob: boolean;
  onNavigate: (view: View) => void;
  onAddJob: () => void;
  onOpenApplication: (id: string) => void;
}) {
  const active = applications.filter(
    (item) => !["hired", "rejected"].includes(item.stage),
  );
  const recent = [...activities]
    .filter((item) => item.entity_type === "application")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);
  const followUps = active.filter((item) => daysInStage(item.stage_changed_at) >= 3 || item.stage === "interview");
  return (
    <div className="dashboard-page">
      <PageHeader
        title="Dashboard"
        overview
        description={
          <>
            {organization.name} has {active.length} active candidate processes
            across {jobs.filter((item) => item.status === "open").length} open{" "}
            {organization.workspace_mode === "consulting"
              ? "assignments"
              : "jobs"}
            .
          </>
        }
        actions={
          <div className="page-actions">
            <button
              className="primary-button"
              onClick={() => onNavigate("pipeline")}
            >
              View applications <ArrowRight size={17} />
            </button>
          </div>
        }
      />
      {!jobs.length && (
        <section className="overview-empty">
          <BriefcaseBusiness />
          <div>
            <h3>Create your first role</h3>
            <p>Add the role requirements before inviting candidates.</p>
          </div>
          {canCreateJob && (
            <button className="primary-button" onClick={onAddJob}>
              Create job
            </button>
          )}
        </section>
      )}
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
          value={new Set(active.map((item) => item.candidate_id)).size}
          note={`${active.length} active candidate processes`}
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
      <section className="pipeline-pulse" aria-label="Current hiring funnel">
        <header>
          <span>Applications by stage</span>
          <button onClick={() => onNavigate("pipeline")}>
            View applications <ArrowRight size={14} />
          </button>
        </header>
        <div>
          {stages.map((stage) => {
            const count = active.filter(
              (item) => item.stage === stage.id,
            ).length;
            return (
              <button key={stage.id} onClick={() => onNavigate("pipeline")}>
                <span>
                  <i className={`stage-dot ${stage.tone}`}></i>
                  {stage.label}
                </span>
                <strong>{count}</strong>
                <em
                  style={{
                    width: `${(count / Math.max(active.length, 1)) * 100}%`,
                  }}
                ></em>
              </button>
            );
          })}
        </div>
      </section>
      <section className="dashboard-grid">
        <article className="panel activity-panel">
          <header>
            <div>
              <h3>Recent activity</h3>
            </div>
            <button
              className="text-button"
              onClick={() => onNavigate("pipeline")}
            >
              View all <ArrowRight size={15} />
            </button>
          </header>
          <div className="activity-list">
            {recent.map((activity) => {
              const application = applications.find(
                (item) => item.id === activity.entity_id,
              );
              if (!application) return null;
              const candidate = candidates.find(
                (item) => item.id === application.candidate_id,
              );
              const job = jobs.find((item) => item.id === application.job_id);
              return candidate && job ? (
                <button
                  className="activity-row"
                  key={activity.id}
                  onClick={() => onOpenApplication(application.id)}
                >
                  <CandidateAvatar candidate={candidate} />
                  <div>
                    <strong>{candidate.full_name}</strong>
                    <p>{job.title}</p>
                  </div>
                  <span className={`stage-badge ${application.stage}`}>
                    {activity.action === "application.stage_changed"
                      ? `${String(activity.metadata.from || "Previous")} → ${String(activity.metadata.to || application.stage)}`
                      : "Added to pipeline"}
                  </span>
                  <small>
                    {daysInStage(activity.created_at)}d ago
                    {activity.metadata.demo ? " · Demo event" : ""}
                  </small>
                </button>
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
          <header className="focus-heading">
            <div>
              <h3>Next actions</h3>
            </div>
            <strong className="action-count">{followUps.length}</strong>
          </header>
          <div className="action-list">
            {followUps.map((item) => {
              const candidate = candidates.find((person) => person.id === item.candidate_id);
              const job = jobs.find((role) => role.id === item.job_id);
              if (!candidate || !job) return null;
              const waiting = daysInStage(item.stage_changed_at) >= 3;
              return (
                <button key={item.id} onClick={() => onOpenApplication(item.id)}>
                  <span className="action-copy">
                    <b>{candidate.full_name}</b>
                    <em>{job.title}</em>
                    <small className={waiting ? "action-urgent" : "action-upcoming"}>
                      {waiting ? `Review required · waiting ${daysInStage(item.stage_changed_at)} days` : candidate.next_step || "Plan the next interview"}
                    </small>
                    <small>Owner · {candidate.recruiter || "Unassigned"}</small>
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              );
            })}
            {!followUps.length && <p className="actions-empty">No applications need follow-up right now.</p>}
          </div>
          <button
            className="secondary-button"
            onClick={() => onNavigate("pipeline")}
          >
            View all applications
          </button>
        </article>
      </section>
    </div>
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [mobileStage, setMobileStage] = useState<ApplicationStage>("new");
  const visible = applications.filter((application) => {
    const candidate = candidates.find(
      (item) => item.id === application.candidate_id,
    );
    return (
      application.stage !== "rejected" &&
      (!overdueOnly || daysInStage(application.stage_changed_at) >= 3) &&
      (jobFilter === "all" || application.job_id === jobFilter) &&
      candidate?.full_name.toLowerCase().includes(search.trim().toLowerCase())
    );
  });
  const pipelineTitle =
    jobFilter === "all"
      ? "All active applications"
      : jobs.find((job) => job.id === jobFilter)?.title || "Applications";
  return (
    <div className="applications-workspace">
      <PageHeader
        title="Applications"
        description={`${visible.length} applications · ${jobFilter === "all" ? `${jobs.filter(job => job.status === "open").length} open jobs` : pipelineTitle}`}
      />
      <Toolbar>
        <label>
          <span className="sr-only">Filter by job</span>
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
          <span className="sr-only">Search candidates</span>
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search candidates…"
          />
        </label>
        <button
          className="secondary-button filter-toggle"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <Filter size={16} /> Filters{overdueOnly ? " (1)" : ""}
        </button>
        {(jobFilter !== "all" || search || overdueOnly) && (
          <button
            className="clear-filter"
            onClick={() => {
              onJobFilter("all");
              onSearch("");
              setOverdueOnly(false);
            }}
          >
            Clear filters
          </button>
        )}
      </Toolbar>
      {filtersOpen && (
        <section className="filter-panel">
          <label>
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(event) => setOverdueOnly(event.target.checked)}
            />{" "}
            Waiting 3+ days
          </label>
        </section>
      )}
      {(jobFilter !== "all" || overdueOnly) && (
        <div className="active-filters">
          {jobFilter !== "all" && (
            <button onClick={() => onJobFilter("all")}>
              Role: {jobs.find((job) => job.id === jobFilter)?.title} ×
            </button>
          )}
          {overdueOnly && (
            <button onClick={() => setOverdueOnly(false)}>
              Waiting 3+ days ×
            </button>
          )}
        </div>
      )}
      {!visible.length && (
        <section className="filter-empty">
          <strong>No candidates match these filters.</strong>
          <p>Clear the filters to return to the full pipeline.</p>
          <button
            className="secondary-button"
            onClick={() => {
              onJobFilter("all");
              onSearch("");
              setOverdueOnly(false);
            }}
          >
            Clear filters
          </button>
        </section>
      )}
      <label className="mobile-stage-picker">
        <span>Application stage</span>
        <select
          value={mobileStage}
          onChange={(event) =>
            setMobileStage(event.target.value as ApplicationStage)
          }
        >
          {stages.map((stage) => (
            <option value={stage.id} key={stage.id}>
              {stage.label} (
              {visible.filter((item) => item.stage === stage.id).length})
            </option>
          ))}
        </select>
      </label>
      <section
        className="kanban"
        tabIndex={0}
        aria-label="Candidate pipeline board. Scroll horizontally to reach more stages."
      >
        {stages.map((stage) => {
          const items = visible.filter((item) => item.stage === stage.id);
          return (
            <div
              className={`kanban-column stage-${stage.id} ${mobileStage !== stage.id ? "mobile-hidden" : ""}`}
              key={stage.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const id = event.dataTransfer.getData("application/id");
                const application = applications.find((item) => item.id === id);
                if (application) onMove(application, stage.id);
              }}
            >
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
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect(application.id);
                        }
                      }}
                      draggable
                      onDragStart={(event) =>
                        event.dataTransfer.setData(
                          "application/id",
                          application.id,
                        )
                      }
                    >
                      <div className="candidate-card-head">
                        <CandidateAvatar candidate={candidate} />
                        <div>
                          <strong>{candidate.full_name}</strong>
                          <small>{candidate.professional_title}</small>
                        </div>
                        <span className="match-chip">
                          {matchScoreText(candidateMatch(candidate, job))}
                        </span>
                      </div>
                      {jobFilter === "all" && (
                        <p className="job-context">
                          <BriefcaseBusiness size={14} /> {job.title}
                        </p>
                      )}
                      <div className="skill-row">
                        {candidate.skills.slice(0, 2).map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                        {candidate.skills.length > 2 && (
                          <span>+{candidate.skills.length - 2}</span>
                        )}
                      </div>
                      <footer>
                        <small
                          className={
                            daysInStage(application.stage_changed_at) >= 3
                              ? "overdue"
                              : ""
                          }
                        >
                          {daysInStage(application.stage_changed_at) >= 3 && (
                            <Clock3 size={13} />
                          )}{" "}
                          {candidate.next_step ||
                            `${daysInStage(application.stage_changed_at)} days in stage`}
                        </small>
                        <details
                          className="card-actions"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <summary aria-label={`Actions for ${candidate.full_name}`}><MoreHorizontal size={18} /></summary>
                          <div>
                            {stages
                              .filter((item) => item.id !== application.stage)
                              .map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => onMove(application, item.id)}
                                >
                                  Move to {item.label}
                                </button>
                              ))}
                            <button
                              onClick={() => onMove(application, "rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        </details>
                      </footer>
                    </article>
                  ) : null;
                })}
                {!items.length && (
                  <div className="column-empty">
                    No candidates in {stage.label.toLowerCase()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Jobs({
  jobs,
  applications,
  organization,
  onAdd,
  onOpenPipeline,
  onOpenJob,
  onPublish,
  demo,
}: {
  onPublish: (job: Job, publish: boolean) => Promise<void>;
  demo: boolean;
  jobs: Job[];
  applications: Application[];
  organization: Organization;
  onAdd: () => void;
  onOpenPipeline: (id: string) => void;
  onOpenJob: (id: string) => void;
}) {
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publicationError, setPublicationError] = useState("");
  async function publishJob(job: Job) {
    if (publishing) return;
    setPublishing(job.id); setPublicationError("");
    try { await onPublish(job, !job.published); }
    catch (error) { setPublicationError(error instanceof Error ? error.message : "Unable to update publication status."); }
    finally { setPublishing(null); }
  }
  return (
    <div className="jobs-workspace">
      <PageHeader
        title={
          organization.workspace_mode === "consulting"
            ? "Client assignments"
            : "Jobs"
        }
        description={`${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} · ${jobs.filter(job => job.published).length} published`}
        actions={
          <button className="primary-button" onClick={onAdd}>
            <Plus size={17} /> Create{" "}
            {organization.workspace_mode === "consulting"
              ? "assignment"
              : "job"}
          </button>
        }
      />
      {publicationError && <p className="form-error" role="alert">{publicationError}</p>}
      <section className="job-grid">
        <div className="job-list-head">
          <span>Role</span>
          <span>Team and location</span>
          <span>Applications</span>
          <span>Action</span>
        </div>
        {jobs.map((job) => (
          <article
            className="job-card"
            key={job.id}
            onClick={() => onOpenJob(job.id)}
            tabIndex={0}
            aria-label={`View ${job.title}`}
            onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onOpenJob(job.id); } }}
          >
            <header>
              <span className="job-icon">
                <BriefcaseBusiness />
              </span>
              <span className={`job-publication-status ${job.published ? "published" : "draft"}`}>{job.published ? "Published" : "Draft"}</span>
            </header>
            <h3>{job.title}</h3>
            <div className="job-publication-actions" onClick={event => event.stopPropagation()}>
              <button className={job.published ? "secondary-button" : "primary-button"} disabled={!!publishing} onClick={() => void publishJob(job)}>{publishing === job.id ? "Saving…" : job.published ? "Unpublish" : "Publish"}</button>
              {job.published && job.public_slug && !demo && <a className="text-link" href={`https://insidegrid-patricia.netlify.app/?job=${encodeURIComponent(job.public_slug)}`} target="_blank" rel="noreferrer">View public job ↗</a>}
            </div>
            <p>
              {job.department || "General"} ·{" "}
              {job.location || "Location flexible"} ·{" "}
              {job.hiring_manager || "Owner not assigned"}
            </p>
            <div className="job-stats">
              <span>
                <strong>
                  {applications.filter((item) => item.job_id === job.id).length}
                </strong>{" "}
                {applications.filter(item => item.job_id === job.id).length === 1 ? "application" : "applications"}
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
                {applications.filter(item => item.job_id === job.id && item.stage === "interview").length === 1 ? "interview" : "interviews"}
              </span>
            </div>
            <div className="job-stage-strip" aria-label="Application distribution">
              {stages.map(stage => {
                const count = applications.filter(item => item.job_id === job.id && item.stage === stage.id).length;
                return count > 0 ? <span key={stage.id} className={`stage-${stage.id}`} style={{ flex: count }} title={`${stage.label}: ${count}`} /> : null;
              })}
            </div>
            <button
              className="secondary-button wide"
              onClick={(event) => {
                event.stopPropagation();
                onOpenPipeline(job.id);
              }}
            >
              View applications <ArrowRight size={16} />
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
          <span>Create a draft job</span>
        </button>
      </section>
    </div>
  );
}

function Candidates({ candidates, applications, jobs, onAdd, onSelect, onManageJobs, consulting = false }: {
  consulting?: boolean;
  candidates: Candidate[];
  applications: Application[];
  jobs: Job[];
  onAdd?: () => void;
  onSelect: (id: string) => void;
  onManageJobs?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [skillFilters, setSkillFilters] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState("name");
  const locations = [...new Set(candidates.map(item => item.location).filter(Boolean))].sort();
  const skills = [...new Set(candidates.flatMap(item => item.skills))].sort();
  const filtered = filterCandidateDirectory(candidates, applications, {
    search, jobId: jobFilter, location: locationFilter, skills: skillFilters,
  }).sort((a, b) => sort === "newest"
    ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    : a.full_name.localeCompare(b.full_name));
  const filterCount = Number(locationFilter !== "all") + skillFilters.length;
  const hasFilters = Boolean(search || jobFilter !== "all" || filterCount);
  function clearFilters() {
    setSearch(""); setJobFilter("all"); setLocationFilter("all"); setSkillFilters([]);
  }
  return (
    <section className="candidate-page" aria-labelledby="candidates-title">
      <header className="directory-heading">
        <div><h1 id="candidates-title">{consulting ? "Consultants" : "Candidates"}</h1><span className="directory-count" aria-live="polite">{filtered.length}</span></div>
        {onAdd && <button className="primary-button" onClick={onAdd}><Plus size={17} /> {consulting ? "Add consultant" : "Add candidate"}</button>}
      </header>
      <div className="directory-tools">
        <label className="directory-search"><Search size={18} /><input aria-label={consulting ? "Search consultants" : "Search candidates"} placeholder={consulting ? "Search consultants…" : "Search candidates…"} value={search} onChange={event => setSearch(event.target.value)} />{search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={16} /></button>}</label>
        <label className="directory-select"><span className="sr-only">{consulting ? "Filter by assignment" : "Filter by job"}</span><BriefcaseBusiness size={16} /><select value={jobFilter} onChange={event => setJobFilter(event.target.value)}><option value="all">{consulting ? "All assignments" : "All jobs"}</option>{jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
        <button className={`secondary-button${filtersOpen ? " is-active" : ""}`} aria-expanded={filtersOpen} aria-controls="directory-filters" onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={16} /> Filters{filterCount ? ` (${filterCount})` : ""}</button>
        <label className="directory-sort"><span className="sr-only">{consulting ? "Sort consultants" : "Sort candidates"}</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="name">Name A–Z</option><option value="newest">Newest first</option></select></label>
        {onManageJobs && <button className="directory-manage" onClick={onManageJobs}>{consulting ? "Manage assignments" : "Manage jobs"} <ArrowRight size={14} /></button>}
      </div>
      {hasFilters && <div className="directory-active-filters"><span>{filtered.length} of {candidates.length} {consulting ? "consultants" : "candidates"}</span>{jobFilter !== "all" && <button onClick={() => setJobFilter("all")}>{jobs.find(job => job.id === jobFilter)?.title}<X size={13} /></button>}{locationFilter !== "all" && <button onClick={() => setLocationFilter("all")}>{locationFilter}<X size={13} /></button>}{skillFilters.map(skill => <button key={skill} onClick={() => setSkillFilters(current => current.filter(value => value !== skill))}>{skill}<X size={13} /></button>)}<button onClick={clearFilters}>Clear all</button></div>}
      <div className={`directory-layout${filtersOpen ? " with-filters" : ""}`}>
        {filtersOpen && <aside className="directory-filters" id="directory-filters" aria-label={consulting ? "Consultant filters" : "Candidate filters"}>
          <header><h2>Filters</h2><button aria-label="Close filters" onClick={() => setFiltersOpen(false)}><X size={18} /></button></header>
          <label htmlFor="directory-location">Location</label><select id="directory-location" value={locationFilter} onChange={event => setLocationFilter(event.target.value)}><option value="all">All locations</option>{locations.map(location => <option key={location}>{location}</option>)}</select>
          <fieldset><legend>Skills</legend>{skills.map(skill => <label key={skill}><input type="checkbox" checked={skillFilters.includes(skill)} onChange={() => setSkillFilters(current => current.includes(skill) ? current.filter(value => value !== skill) : [...current, skill])} /><span>{skill}</span></label>)}</fieldset>
        </aside>}
        <div className="directory-results">
          {filtered.length > 0 ? <table className="directory-table"><thead><tr><th scope="col">{consulting ? "Consultant" : "Candidate"}</th><th scope="col" className="directory-location">Location</th><th scope="col" className="directory-skills">Skills</th><th scope="col">{consulting ? "Assignment" : "Job"}</th><th scope="col">Stage</th><th scope="col" className="directory-match">{jobFilter === "all" ? "Added" : "Requirements"}</th><th scope="col"><span className="sr-only">Open profile</span></th></tr></thead><tbody>
            {filtered.map(candidate => {
              const context = candidateApplicationContext(candidate.id, applications, jobFilter);
              const application = context.application;
              const role = application ? jobs.find(job => job.id === application.job_id) : undefined;
              const evidence = jobFilter !== "all" && role ? candidateMatch(candidate, role) : null;
              const supported = evidence?.requirementResults.filter(item => item.status === "supported").length ?? 0;
              const total = evidence?.requirementResults.length ?? 0;
              return <tr key={candidate.id}>
                <td><button className="directory-person" onClick={() => onSelect(candidate.id)}><CandidateAvatar candidate={candidate} /><span><strong>{candidate.full_name}</strong><small>{candidate.professional_title || "Role not specified"}</small></span></button></td>
                <td className="directory-location">{candidate.location || "Not specified"}</td>
                <td className="directory-skills"><div>{candidate.skills.slice(0, 2).map(skill => <span key={skill}>{skill}</span>)}{candidate.skills.length > 2 && <small>+{candidate.skills.length - 2}</small>}</div></td>
                <td data-label="Role" className="directory-role">{context.activeCount > 1 && jobFilter === "all" ? `${context.activeCount} active applications` : role?.title || "Talent pool"}</td>
                <td data-label="Stage">{application ? <span className={`directory-stage stage-${application.stage}`}>{stages.find(stage => stage.id === application.stage)?.label || (application.stage === "rejected" ? "Rejected" : application.stage)}</span> : <span className="directory-muted">{context.activeCount > 1 ? "Multiple stages" : "—"}</span>}</td>
                <td className="directory-match">{jobFilter === "all" ? <time dateTime={candidate.created_at}>{new Date(candidate.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time> : total ? <button className="directory-evidence" onClick={() => onSelect(candidate.id)}>{supported}/{total} supported</button> : <span className="directory-muted">No criteria</span>}</td>
                <td className="directory-open"><button aria-label={`Open ${candidate.full_name}`} onClick={() => onSelect(candidate.id)}><ArrowRight size={18} /></button></td>
              </tr>;
            })}
          </tbody></table> : <div className="directory-empty"><UserRoundSearch size={30} /><h2>{candidates.length ? (consulting ? "No matching consultants" : "No matching candidates") : (consulting ? "No consultants yet" : "No candidates yet")}</h2><p>{candidates.length ? "Try another search or clear your filters." : (consulting ? "Add a consultant to start your directory." : "Add a candidate to start your directory.")}</p>{hasFilters ? <button className="secondary-button" onClick={clearFilters}>Clear filters</button> : onAdd && <button className="primary-button" onClick={onAdd}><Plus size={16} /> {consulting ? "Add consultant" : "Add candidate"}</button>}</div>}
          <footer className="directory-footer">{filtered.length} {consulting ? (filtered.length === 1 ? "consultant" : "consultants") : (filtered.length === 1 ? "candidate" : "candidates")}{hasFilters ? ` · ${candidates.length} total` : ""}</footer>
        </div>
      </div>
    </section>
  );
}

function Team({
  organizations,
  profile,
  onAdd,
}: {
  organizations: Organization[];
  profile: Profile;
  onAdd: () => void;
}) {
  return (
    <>
      <PageHeader
        title="Access & accounts"
        description="Create accounts and manage customer workspaces."
        actions={
          <button className="primary-button" onClick={onAdd}>
            <UserPlus size={17} /> Create account
          </button>
        }
      />
      <section className="admin-callout">
        <ShieldCheck />
        <div>
          <strong>Manage customer access</strong>
          <p>
            Select a customer workspace to manage jobs and candidates on their
            behalf.
          </p>
        </div>
      </section>
      <section className="access-overview">
        <div>
          <span>Customers</span>
          <strong>{organizations.length}</strong>
          <small>active workspaces</small>
        </div>
        <div>
          <span>Your role</span>
          <strong>Administrator</strong>
          <small>{profile.full_name}</small>
        </div>
        <div>
          <span>Access status</span>
          <strong>Active</strong>
          <small>accounts can be managed</small>
        </div>
      </section>
      <section className="admin-account-list">
        <h3>Your account</h3>
        <article>
          <span className="avatar">{initials(profile.full_name)}</span>
          <span>
            <strong>{profile.full_name}</strong>
            <small>{profile.email}</small>
          </span>
          <span className="status-pill open">
            Platform administrator · Active
          </span>
        </article>
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
      companyName: String(values.get("companyName") ?? "").trim(),
      companyValues: String(values.get("companyValues") ?? "").trim(),
      exampleAdvertisement: String(values.get("exampleAdvertisement") ?? "").trim(),
      currentDraft: description,
      researchNotes: [...researchMessages.map(
        (message) => `${message.role}: ${message.text}`,
      ), ...(researchInput.trim() ? [`user: ${researchInput.trim()}`] : [])],
    };
    setAiBusy(true);
    setAiError("");
    try {
      const draft = demoMode
        ? `We are looking for a ${title} to join our ${context.department || "growing"} team${context.location ? ` in ${context.location}` : ""}. In this role, you will take ownership of meaningful work, collaborate closely with colleagues and help turn business needs into practical results.\n\nWhat you will do\n• Lead and deliver work within your area of expertise\n• Work across teams to solve problems and improve how we operate\n• Communicate progress, decisions and recommendations clearly\n\nWhat we are looking for\n• Relevant experience for the ${title} role\n• A thoughtful, collaborative approach and strong communication skills\n• The ability to work independently and follow through on commitments\n\n${context.employmentType ? `Employment type: ${context.employmentType}. ` : ""}We welcome different backgrounds and encourage you to apply if the role feels relevant to your experience.`
        : await generateJobDescription(context);
      setDescription(typeof draft === "string" ? draft : draft.description);
      setResearchSources(typeof draft === "string" ? [] : draft.sources);
      requestAnimationFrame(() => form.querySelector<HTMLTextAreaElement>('textarea[name="description"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
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
    if (!title) {
      setAiError(
        "Add a job title before starting research.",
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
              "This is a sample response. Live company research and tailored AI drafts require signing in to a connected workspace.",
            sources: [],
          }
        : await researchJobWithAi({
            organizationId: organization.id,
            title,
            department: String(values.get("department")),
            location: String(values.get("location")),
            employmentType: String(values.get("employmentType")),
            workspaceMode: organization.workspace_mode,
            companyWebsite,
            companyName: String(values.get("companyName") ?? ""),
            companyValues: String(values.get("companyValues") ?? ""),
            exampleAdvertisement: String(values.get("exampleAdvertisement") ?? ""),
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
      responsibilities: String(form.get("responsibilities"))
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
      required_skills: String(form.get("requiredSkills"))
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
      preferred_skills: String(form.get("preferredSkills"))
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
      hiring_manager: String(form.get("hiringManager")),
      closing_date: String(form.get("closingDate")) || undefined,
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
    } catch (reason) {
      setAiError(
        reason instanceof Error
          ? reason.message
          : "The job could not be created.",
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
                  Add your company and a reference advertisement to create a tailored draft.
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
          {(
            <div className="research-body" hidden={!researchOpen}>
              <label>
                Company website
                <input
                  name="companyWebsite"
                  type="url"
                  placeholder="https://yourcompany.com"
                  maxLength={2000}
                />
                <small>
                  AI reads this page when available. Only successfully retrieved pages appear under Sources reviewed.
                </small>
              </label>
              <label>Company name<input name="companyName" placeholder="The company this advertisement is for" maxLength={200} /><small>Overrides the workspace name in the advertisement.</small></label>
              <label>Company values and facts<textarea name="companyValues" rows={3} maxLength={8000} placeholder="Your values, mission, ways of working and confirmed benefits" /></label>
              <label>Example advertisement<textarea name="exampleAdvertisement" rows={6} maxLength={25000} placeholder="Paste a job advertisement to adapt. Its employer, benefits and application links will not be copied into your company's draft." /></label>
              <button type="button" className="primary-button" disabled={aiBusy || researchBusy} onClick={() => void draftDescription()}>{aiBusy ? "Creating draft…" : "Create tailored draft"}</button>
              <small>The draft appears in Description below. Review and edit it before saving the job.</small>
              <div className="research-chat" aria-live="polite">
                {!researchMessages.length && (
                  <p className="research-intro">
                    Use the fields above to create an advertisement, or ask a question here to refine it first.
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
                    {message.role === "assistant" && <button type="button" className="secondary-button" disabled={aiBusy || researchBusy} onClick={() => setDescription(message.text)}>Use reply as draft</button>}
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
                  disabled={researchBusy || aiBusy || !researchInput.trim()}
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
            disabled={aiBusy || researchBusy}
          >
            {aiBusy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <span className="ai-text-mark" aria-hidden="true">
                AI
              </span>
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
            readOnly={aiBusy}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Write the responsibilities, outcomes and requirements — or let AI prepare a first draft…"
          />
          <small>
            You remain in control. Review and edit the text before publishing.
          </small>
        </label>
        <div className="form-grid">
          <label>
            Hiring manager
            <input name="hiringManager" placeholder="Name or team" />
          </label>
          <label>
            Closing date
            <input name="closingDate" type="date" />
          </label>
        </div>
        <label>
          Responsibilities
          <textarea
            name="responsibilities"
            rows={4}
            placeholder="One responsibility per line"
          />
        </label>
        <label>
          Required skills
          <textarea
            name="requiredSkills"
            rows={4}
            required
            placeholder="One required criterion per line"
          />
        </label>
        <label>
          Nice to have
          <textarea
            name="preferredSkills"
            rows={3}
            placeholder="One preferred criterion per line"
          />
        </label>
        <FormActions
          busy={busy}
          onClose={onClose}
          label="Create and view applications"
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
  const [error, setError] = useState("");
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
      setError("");
      const cv = form.get("cv");
      if (cv instanceof File && cv.size > 0) {
        if (cv.type !== "application/pdf")
          throw new Error("CV must be a PDF file.");
        if (cv.size > 10 * 1024 * 1024)
          throw new Error("CV must be 10 MB or smaller.");
      }
      const photo = form.get("photo");
      if (photo instanceof File && photo.size > 0) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type))
          throw new Error("Photo must be JPG, PNG, or WebP.");
        if (photo.size > 5 * 1024 * 1024)
          throw new Error("Photo must be 5 MB or smaller.");
      }
      let candidate: Candidate = demoMode
        ? {
            ...input,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          }
        : await createCandidate(input);
      if (cv instanceof File && cv.size > 0) {
        let extractedPages: Array<{ page: number; text: string }>;
        try {
          extractedPages = await extractPdfPages(cv);
        } catch {
          throw new Error(
            "The PDF could not be read. Upload a valid, non-encrypted PDF.",
          );
        }
        if (demoMode)
          candidate = {
            ...candidate,
            cv_file_name: cv.name,
            cv_uploaded_at: new Date().toISOString(),
            cv_source: "demo_profile",
            cv_pages: extractedPages,
          };
        else {
          const document = await uploadCandidateCv(
            candidate,
            cv,
            extractedPages,
          );
          candidate = {
            ...candidate,
            cv_file_name: document.file_name,
            cv_uploaded_at: document.uploaded_at,
            cv_source: "uploaded",
            cv_storage_path: document.storage_path,
            cv_pages: document.extracted_pages,
          };
        }
      }
      if (photo instanceof File && photo.size > 0) {
        if (demoMode)
          candidate = {
            ...candidate,
            photo_file_name: photo.name,
            photo_url: URL.createObjectURL(photo),
          };
        else {
          const uploaded = await uploadCandidatePhoto(candidate, photo);
          candidate = {
            ...candidate,
            photo_file_name: photo.name,
            photo_path: uploaded.path,
            photo_url: uploaded.url,
          };
        }
      }
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
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The candidate could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ModalShell
      title={organization.workspace_mode === "consulting" ? "Add consultant" : "Add candidate"}
      subtitle="Create a reusable profile and optionally add an application."
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
          CV (PDF, max 10 MB)
          <input name="cv" type="file" accept="application/pdf,.pdf" />
          <small>
            Stored privately and available only to authorized workspace members.
          </small>
        </label>
        <label>
          Profile photo (optional)
          <input
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
          <small>
            JPG, PNG or WebP, max 5 MB. Initials are used when no photo is
            available.
          </small>
        </label>
        <label>
          Add an application
          <select name="job">
            <option value="">Talent pool only</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </label>
        {error && <div className="form-error">{error}</div>}
        <FormActions busy={busy} onClose={onClose} label={organization.workspace_mode === "consulting" ? "Add consultant" : "Add candidate"} />
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
  const [error, setError] = useState("");
  const [role, setRole] = useState<"customer" | "platform_admin">("customer");
  const [choice, setChoice] = useState(organizations[0]?.id ?? "new");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The account could not be created.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ModalShell
      title="Create account"
      subtitle="Create an administrator account or give someone access to a customer workspace."
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
                    <option value="consulting">Manage a consulting team</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>
              </div>
            )}
            <fieldset className="permission-fieldset">
              <legend>Account permissions</legend>
              <p>
                Choose only what this person needs. Workspace type and
                permissions are managed separately.
              </p>
              <label>
                <input
                  type="checkbox"
                  name="permissions"
                  value="manage_jobs"
                  defaultChecked
                />{" "}
                <span>
                  <strong>Jobs and assignments</strong>
                  <small>Create and manage opportunities and pipelines.</small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  name="permissions"
                  value="manage_candidates"
                  defaultChecked
                />{" "}
                <span>
                  <strong>Candidates</strong>
                  <small>View and manage external candidate profiles.</small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  name="permissions"
                  value="manage_consultants"
                />{" "}
                <span>
                  <strong>Consultants</strong>
                  <small>
                    View employee CVs, availability and assignment matching.
                  </small>
                </span>
              </label>
              <label>
                <input
                  type="checkbox"
                  name="permissions"
                  value="manage_accounts"
                />{" "}
                <span>
                  <strong>Account administration</strong>
                  <small>Manage members inside this customer workspace.</small>
                </span>
              </label>
            </fieldset>
          </>
        )}
        {error && <div className="form-error" role="alert">{error}</div>}
        <FormActions busy={busy} onClose={onClose} label="Create account" />
      </form>
    </ModalShell>
  );
}
function JobDrawer({
  job,
  candidates,
  applications,
  onClose,
  onOpenCandidate,
}: {
  job: Job;
  candidates: Candidate[];
  applications: Application[];
  onClose: () => void;
  onOpenCandidate: (id: string) => void;
}) {
  const jobApplications = applications.filter((item) => item.job_id === job.id);
  const SectionList = ({
    title,
    items,
    tone,
  }: {
    title: string;
    items?: string[];
    tone?: string;
  }) => (
    <section className={`requirement-section ${tone || ""}`}>
      <h3>{title}</h3>
      {items?.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>
              <Check size={15} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-copy">Not specified.</p>
      )}
    </section>
  );
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="drawer record-drawer wide-drawer job-detail"
        aria-label={job.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="job-detail-icon"><BriefcaseBusiness size={24} /></span>
            <span className={`status-pill ${job.status}`}>{job.status}</span>
            <h2>{job.title}</h2>
            <p>
              {job.department} · {job.location} · {job.employment_type}
            </p>
          </div>
          <button className="icon-button" aria-label="Close job details" onClick={onClose}>
            <X />
          </button>
        </header>
        <section className="job-facts">
          <span>
            <small>Hiring manager</small>
            <strong>{job.hiring_manager || "Not assigned"}</strong>
          </span>
          <span>
            <small>Published</small>
            <strong>{new Date(job.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</strong>
          </span>
          <span>
            <small>Closing date</small>
            <strong>{job.closing_date || "Open until filled"}</strong>
          </span>
          <span>
            <small>Workplace</small>
            <strong>{job.location}</strong>
          </span>
        </section>
        <section>
          <h3>About the opportunity</h3>
          <p className="preserve-lines">
            {job.description || "No job description has been added."}
          </p>
        </section>
        <SectionList title="Responsibilities" items={job.responsibilities} />
        <div className="job-criteria-grid">
        <SectionList
          title="Required"
          items={job.required_skills}
          tone="required"
        />
        <SectionList title="Nice to have" items={job.preferred_skills} />
        </div>
        <section>
          <div className="drawer-section-heading">
            <h3>Candidate matches</h3>
            <small>Open a candidate to inspect every requirement</small>
          </div>
          <div className="ranked-list">
            {jobApplications.map((application) => {
              const candidate = candidates.find(
                (item) => item.id === application.candidate_id,
              );
              if (!candidate) return null;
              const match = candidateMatch(candidate, job);
              return (
                <button
                  key={application.id}
                  onClick={() => onOpenCandidate(candidate.id)}
                >
                  <span className="avatar soft">
                    {initials(candidate.full_name)}
                  </span>
                  <span>
                    <strong>{candidate.full_name}</strong>
                    <small>
                      {match.matched.length} of{" "}
                      {match.requirementResults.length} required criteria
                      supported
                    </small>
                  </span>
                  <b>
                    {match.requirementResults.length ? "Review evidence" : "Add criteria"}
                  </b>
                  <ArrowRight size={15} />
                </button>
              );
            })}
            {!jobApplications.length && (
              <p className="muted-copy">
                No candidates have been added to this job yet.
              </p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

function CandidateProfileDrawer({
  candidate,
  jobs,
  applications,
  onClose,
  onAddNote,
  onOpenApplication,
}: {
  candidate: Candidate;
  jobs: Job[];
  applications: Application[];
  onClose: () => void;
  onAddNote?: (candidate: Candidate, note: string) => Promise<boolean>;
  onOpenApplication: (id: string) => void;
}) {
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const candidateApplications = applications.filter(
    (item) => item.candidate_id === candidate.id,
  ).sort((a, b) => new Date(b.stage_changed_at).getTime() - new Date(a.stage_changed_at).getTime());
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside
        className="drawer record-drawer wide-drawer profile-detail"
        aria-label={candidate.full_name}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div className="candidate-card-head">
            <span className="avatar large">
              {initials(candidate.full_name)}
            </span>
            <div>
              <h2>{candidate.full_name}</h2>
              <p>
                {candidate.professional_title} · {candidate.location}
              </p>
            </div>
          </div>
          <button className="icon-button" aria-label="Close profile" onClick={onClose}>
            <X />
          </button>
        </header>
        <section className="profile-actions">
          {candidate.cv_file_name ? (
            <>
              <button
                className="primary-button"
                onClick={() => viewCandidateCv(candidate)}
              >
                View CV
              </button>
              <button
                className="secondary-button"
                onClick={() => downloadCandidateCv(candidate)}
              >
                Download PDF
              </button>
              <span className="cv-file-meta">
                <strong>{candidate.cv_file_name}</strong>
                <small>
                  {candidate.cv_source === "demo_profile"
                    ? "Demo PDF generated from profile data"
                    : "Uploaded CV"}{" "}
                  ·{" "}
                  {candidate.cv_uploaded_at
                    ? new Date(candidate.cv_uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : "Date not available"}
                </small>
              </span>
            </>
          ) : (
            <span className="missing-document">
              <strong>No CV uploaded</strong>
              <small>Add a CV to enable preview and evidence extraction.</small>
            </span>
          )}
          {candidate.linkedin_url && (
            <a
              className="secondary-button"
              href={candidate.linkedin_url}
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn <ExternalLink size={14} />
            </a>
          )}
        </section>
        <section className="candidate-workflow">
          <span>
            <small>Recruiter</small>
            <strong>{candidate.recruiter || "Not assigned"}</strong>
          </span>
          <span>
            <small>Latest activity</small>
            <strong>
              {candidateApplications.length
                ? `${daysInStage(candidateApplications[0].stage_changed_at)} days ago`
                : "No process activity"}
            </strong>
          </span>
          <span>
            <small>Next step</small>
            <strong>{candidate.next_step || "Not planned"}</strong>
          </span>
        </section>
        <section>
          <div className="drawer-section-heading">
            <h3>Profile summary</h3>
            <small>Source: saved profile</small>
          </div>
          <p>
            {candidate.summary ||
              "No source material is available for a summary."}
          </p>
          <div className="skill-row roomy">
            {candidate.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </section>
        {!!candidate.experience?.length && (
          <section>
            <h3>Experience</h3>
            <div className="profile-timeline">
              {candidate.experience.map((item) => (
                <article key={`${item.company}-${item.role}`}>
                  <span>{item.period}</span>
                  <div>
                    <strong>{item.role}</strong>
                    <small>{item.company}</small>
                    <p>{item.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {!!candidate.education?.length && (
          <section>
            <h3>Education</h3>
            <div className="profile-timeline compact">
              {candidate.education.map((item) => (
                <article key={item.qualification}>
                  <span>{item.period}</span>
                  <div>
                    <strong>{item.qualification}</strong>
                    <small>{item.school}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        <section>
          <div className="drawer-section-heading">
            <h3>Requirement match</h3>
            <small>Evidence from the supplied CV and profile</small>
          </div>
          {!candidateApplications.length && <p className="muted-copy">No applications linked to this candidate.</p>}
          <div className="match-list">
            {candidateApplications.map((application) => {
              const job = jobs.find((item) => item.id === application.job_id);
              if (!job) return null;
              const match = candidateMatch(candidate, job);
              return (
                <article className="explainable-match" key={application.id}>
                  <div>
                    <button className="profile-application-link" onClick={() => onOpenApplication(application.id)}>{job.title}<ArrowRight size={16} /></button>
                    <span className={`stage-badge ${application.stage}`}>
                      {application.stage}
                    </span>
                  </div>
                  <MatchCoverage results={match.requirementResults} />
                  <p className="calculation-note">{match.calculation}</p>
                  <RequirementEvidence
                    title="Required criteria"
                    results={match.requirementResults}
                  />
                  <RequirementEvidence
                    title="Nice to have"
                    results={match.preferredResults}
                  />
                  {match.gaps.length > 0 && (
                    <p>
                      <strong>Follow up:</strong> Ask for examples of{" "}
                      {match.gaps.join(", ")}.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
        <section>
          <div className="drawer-section-heading">
            <h3>Notes</h3>

          </div>
          <div className="notes-list">
            {candidate.notes?.map((note, index) => <p key={index}>{note}</p>)}
            {!candidate.notes?.length && <p className="muted-copy">No notes yet.</p>}
          </div>
          {onAddNote && <form className="profile-note-form" onSubmit={async event => {
            event.preventDefault();
            if (!noteText.trim() || savingNote) return;
            setSavingNote(true);
            try { if (await onAddNote(candidate, noteText.trim())) setNoteText(""); }
            finally { setSavingNote(false); }
          }}><label htmlFor="profile-note">Add a note</label><textarea id="profile-note" value={noteText} onChange={event => setNoteText(event.target.value)} rows={3} placeholder="Write a note about this candidate…" /><button className="secondary-button" disabled={savingNote || !noteText.trim()}>{savingNote ? "Saving…" : "Save note"}</button></form>}
        </section>
        <section className="contact-summary">
          <span>
            <small>Email</small>
            <a href={`mailto:${candidate.email}`}>{candidate.email}</a>
          </span>
          <span>
            <small>Phone</small>
            {candidate.phone || "Not provided"}
          </span>
          <span>
            <small>Available from</small>
            {candidate.available_from || "Not specified"}
          </span>
        </section>
      </aside>
    </div>
  );
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
  onAddNote,
  onReviewEvaluation,
}: {
  candidate: Candidate;
  job: Job;
  application: Application;
  evaluation?: AiEvaluation;
  organization: Organization;
  onClose: () => void;
  onMove: (application: Application, stage: ApplicationStage) => void;
  onEvaluate: (application: Application) => Promise<void>;
  onAddNote: (candidate: Candidate, note: string) => Promise<boolean>;
  onReviewEvaluation: (
    evaluation: AiEvaluation,
    comment: string,
  ) => Promise<void>;
}) {
  const [evaluating, setEvaluating] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [reviewText, setReviewText] = useState(
    evaluation?.reviewed_comment || "",
  );
  const match = candidateMatch(candidate, job);
  const evaluationStale = Boolean(
    evaluation &&
      ((candidate.cv_uploaded_at &&
        candidate.cv_uploaded_at > evaluation.created_at) ||
        (job.updated_at && job.updated_at > evaluation.created_at)),
  );
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
            <CandidateAvatar candidate={candidate} large />
            <div>
              <h2>{candidate.full_name}</h2>
              <p>{candidate.professional_title}</p>
            </div>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </header>
        <section className="profile-actions">
          {candidate.cv_file_name ? (
            <>
              <button
                className="primary-button"
                onClick={() => viewCandidateCv(candidate)}
              >
                View CV
              </button>
              <button
                className="secondary-button"
                onClick={() => downloadCandidateCv(candidate)}
              >
                Download PDF
              </button>
              <span className="cv-file-meta">
                <strong>{candidate.cv_file_name}</strong>
                <small>
                  {candidate.cv_source === "demo_profile"
                    ? "Demo PDF generated from profile data"
                    : "Uploaded CV"}{" "}
                  ·{" "}
                  {candidate.cv_uploaded_at
                    ? new Date(candidate.cv_uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : "Date not available"}
                </small>
              </span>
            </>
          ) : (
            <span className="missing-document">
              <strong>No CV uploaded</strong>
              <small>Add a CV to enable preview and evidence extraction.</small>
            </span>
          )}
          {candidate.linkedin_url && (
            <a
              className="secondary-button"
              href={candidate.linkedin_url}
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn <ExternalLink size={14} />
            </a>
          )}
        </section>
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
          <div className="drawer-section-heading">
            <h3>Profile summary</h3>
            <small>Source: saved profile</small>
          </div>
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
        <section className="candidate-workflow">
          <span>
            <small>Recruiter</small>
            <strong>{candidate.recruiter || "Not assigned"}</strong>
          </span>
          <span>
            <small>Latest activity</small>
            <strong>
              {daysInStage(application.stage_changed_at)} days ago
            </strong>
          </span>
          <span>
            <small>Next step</small>
            <strong>{candidate.next_step || "Not planned"}</strong>
          </span>
        </section>
        <section className="inline-match">
          <div className="drawer-section-heading">
            <div>
              <h3>Requirement match</h3>
              <MatchCoverage results={match.requirementResults} />
              <small>{match.calculation}</small>
            </div>
          </div>
          <RequirementEvidence
            title="Required criteria"
            results={match.requirementResults}
          />
          <RequirementEvidence
            title="Nice to have"
            results={match.preferredResults}
          />
          {!!match.gaps.length && (
            <p>
              <strong>Follow up:</strong> Ask for concrete examples of{" "}
              {match.gaps.join(", ")}.
            </p>
          )}
        </section>
        <section className="candidate-notes">
          <div className="drawer-section-heading">
            <h3>Notes & interview feedback</h3>
            <small>Visible to authorized workspace members</small>
          </div>
          <div className="notes-list">
            {candidate.notes?.map((note) => (
              <p key={note}>{note}</p>
            ))}
            {!candidate.notes?.length && (
              <p className="muted-copy">No notes yet.</p>
            )}
          </div>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const note = noteText.trim();
              if (!note) return;
              if (await onAddNote(candidate, note)) setNoteText("");
            }}
          >
            <label>
              <span className="sr-only">Add note</span>
              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                placeholder="Add an interview note…"
                rows={2}
              />
            </label>
            <button
              className="secondary-button"
              type="submit"
              disabled={!noteText.trim()}
            >
              Add note
            </button>
          </form>
        </section>
        <section className="ai-panel">
          <div className="ai-heading">
            <span className="ai-text-mark large" aria-hidden="true">
              AI
            </span>
            <div>
              <span className="eyebrow dark">AI INSIGHTS</span>
              <h3>Evidence for human review</h3>
            </div>
          </div>
          {evaluation ? (
            <div className="evaluation">
              <div
                className={`evaluation-provenance ${evaluationStale ? "stale" : ""}`}
              >
                <strong>
                  {evaluationStale
                    ? "Outdated evaluation"
                    : "Current evaluation"}
                </strong>
                <small>
                  Generated {new Date(evaluation.created_at).toLocaleString()} ·
                  Model: {evaluation.model || "not recorded"} · CV:{" "}
                  {candidate.cv_file_name || "profile data only"}
                </small>
              </div>
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
              <form
                className="evaluation-review"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!reviewText.trim()) return;
                  await onReviewEvaluation(evaluation, reviewText.trim());
                }}
              >
                <label>
                  Recruiter review
                  <textarea
                    rows={2}
                    value={reviewText}
                    onChange={(event) => setReviewText(event.target.value)}
                    placeholder="Confirm, correct, or qualify this AI evidence…"
                  />
                </label>
                {evaluation.reviewed_at && (
                  <small>
                    Last reviewed{" "}
                    {new Date(evaluation.reviewed_at).toLocaleString()}
                  </small>
                )}
                <button
                  className="secondary-button"
                  type="submit"
                  disabled={!reviewText.trim()}
                >
                  Save review
                </button>
              </form>
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
                  <span className="ai-text-mark" aria-hidden="true">
                    AI
                  </span>
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
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
