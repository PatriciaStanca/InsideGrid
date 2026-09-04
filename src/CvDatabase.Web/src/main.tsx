import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, Apple, Bell, BriefcaseBusiness, CalendarDays, Chrome, ClipboardList, FilePenLine, Languages, LayoutDashboard, LogOut, Mail, MapPin, MessageSquareText, Phone, Save, Search, Settings, ShieldCheck, Sparkles, UserRound, UserRoundCog, UsersRound, X } from "lucide-react";
import "./styles.css";

type ProjectExperience = {
  customer: string;
  role: string;
  description: string;
  technologies: string[];
  startDate: string;
  endDate?: string;
};

type CandidateProfile = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  availability: string;
  currentAssignment: string;
  availableFrom?: string;
  experienceYears: number;
  avatarDataUrl?: string;
  skills: string[];
  languages: string[];
  projects: ProjectExperience[];
  summary: string;
  notes: string;
  updatedAt: string;
};

type SkillDetail = {
  name: string;
  level: "Grund" | "Van" | "Stark" | "Expert";
  comment: string;
};

type CandidateMatch = {
  candidateId: string;
  name: string;
  title: string;
  availability: string;
  score: number;
  matchingSkills: string[];
  missingKeywords: string[];
  reasoning: string;
  strongSignals: string[];
  risks: string[];
  cvGaps: string[];
  suggestedCvVersion: string;
  recommendedActions: string[];
};

type JobAdvertisementAnalysis = {
  role: string;
  sourceName: string;
  sourceUrl: string;
  isLinkOnly: boolean;
  companyName: string;
  recruitingCompany: string;
  contactNames: string[];
  contactEmails: string[];
  mustRequirements: string[];
  shouldRequirements: string[];
  technologies: string[];
  industry: string;
  languages: string[];
  seniority: string;
  location: string;
  remotePossible: boolean;
  startDate?: string;
  assignmentType: string;
  keywords: string[];
};

type JobMatchResponse = {
  summary: string;
  analysis: JobAdvertisementAnalysis;
  candidates: CandidateMatch[];
};

type ApplicationRecord = {
  id: string;
  customer: string;
  role: string;
  advertisement: string;
  candidateIds: string[];
  candidateNames: string[];
  status: string;
  feedback: string;
  sourceUrl: string;
  createdBy: string;
  appliedAt: string;
  updatedAt: string;
};

type DuplicateCandidate = {
  applicationId: string;
  customer: string;
  role: string;
  status: string;
  similarity: number;
  reason: string;
};

type DuplicateCheckResponse = {
  isLikelyDuplicate: boolean;
  matches: DuplicateCandidate[];
};

type GapDecision = {
  status: "linked" | "missing";
  reference: string;
  comment?: string;
};

type KnowledgeDraft = {
  candidateId: string;
  gap: string;
  keyword: string;
  projectIndex: number;
  statement: string;
  reference: string;
};

type LoginResponse = {
  accessToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    isActive: boolean;
  };
};

type UiLanguage = "en" | "sv";
type AppView = "dashboard" | "candidates" | "applications" | "assignments" | "matchAssignment" | "settings" | "candidate";
type CandidateColumnKey = "name" | "email" | "phone" | "experience" | "skills" | "status" | "updated";

const candidateColumnDefaults: Record<CandidateColumnKey, number> = {
  name: 240,
  email: 230,
  phone: 170,
  experience: 270,
  skills: 330,
  status: 140,
  updated: 132
};

const candidateColumnMinWidths: Record<CandidateColumnKey, number> = {
  name: 170,
  email: 160,
  phone: 135,
  experience: 170,
  skills: 190,
  status: 105,
  updated: 105
};

const uiCopy = {
  en: {
    tagline: "AI, CVs and assignments",
    loginEyebrow: "Consultant intelligence platform",
    loginTitle: "Find the right consultant before you pitch.",
    loginText: "Match job ads against verified skills, create tailored CVs and keep every application under control.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    demo: "Demo account",
    secureLogin: "Secure sign in",
    verifiedData: "Verified profile data",
    tailoredCv: "Tailored CV exports",
    applicationTracking: "Application tracking",
    dashboard: "Home",
    applications: "Applications",
    candidates: "Candidates",
    assignments: "Assignments",
    matchAssignment: "Match Assignment",
    settings: "Settings",
    permissions: "Permissions",
    dashboardTitle: "Home",
    signedInAs: "Signed in as",
    searchPlaceholder: "Search consultants, skills, customers...",
    availability: "Availability",
    all: "All",
    available: "Available",
    busy: "Booked",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    consultants: "Consultants",
    active: "active",
    updatedLast30Days: "updated last 30 days",
    assignmentsKpi: "Assignments",
    needsMatching: "need matching",
    ongoing: "ongoing",
    waitingForFeedback: "waiting for feedback",
    aiMatches: "AI matches",
    created: "created",
    readyForReview: "ready for review",
    nextSteps: "Next steps",
    priority: "Priority",
    matchNewAd: "Match new job ad",
    matchNewAdText: "Analyze requirements and create a shortlist.",
    followUpApplications: "Follow up applications",
    followUpApplicationsText: "waiting for feedback.",
    reviewProfiles: "Review profiles",
    reviewProfilesText: "Check CV knowledge base and availability.",
    latestApplications: "Latest applications",
    noApplicationsSaved: "No applications saved yet.",
    defaultView: "Default",
    viewSettings: "View Settings",
    importExport: "Import/Export",
    addCandidate: "Add Candidate",
    searchCandidatesPlaceholder: "Search candidates, keywords, notes...",
    sortedByLastActivity: "Sorted by Last Activity Date",
    filters: "Filters",
    name: "Name",
    personalEmail: "Personal Email",
    personalPhone: "Personal Phone",
    experience: "Experience",
    skills: "Skills",
    status: "Status",
    lastUpdated: "Last updated",
    resizeColumn: "Resize column",
    yearsShort: "yrs",
    customer: "Customer",
    role: "Role",
    consultantsColumn: "Consultants",
    feedback: "Feedback",
    appliedAt: "Applied",
    updatedAt: "Updated",
    source: "Source",
    openAd: "Open ad",
    noApplicationsMatch: "No applications match the filters.",
    clearFilters: "Clear filters",
    allConsultants: "All consultants",
    allStatuses: "All statuses",
    allDates: "All dates",
    last7Days: "Last 7 days",
    last30Days: "Last 30 days",
    last90Days: "Last 90 days",
    searchApplicationsPlaceholder: "Search applications, customers, roles...",
    searchAssignmentsPlaceholder: "Search assignments, customers, requirements...",
    createdBy: "Created by",
    assignmentType: "Type",
    employee: "Employee",
    currentAssignment: "Current assignment",
    contractPeriod: "Contract period",
    contractPdf: "Contract PDF",
    uploadPdf: "Upload PDF",
    missingContract: "Missing contract",
    assignmentDatabase: "Assignment database",
    assignmentsDescription: "Employees, current assignments and contract documents for managers.",
    noAssignment: "No active assignment",
    noActiveAssignments: "No active assignments.",
    activeAssignment: "Active assignment"
  },
  sv: {
    tagline: "AI, CV och uppdrag",
    loginEyebrow: "Intelligensplattform för konsulter",
    loginTitle: "Hitta rätt konsult innan du pitchar.",
    loginText: "Matcha annonser mot verifierade kompetenser, skapa anpassade CV:n och håll koll på varje ansökan.",
    email: "E-post",
    password: "Lösenord",
    signIn: "Logga in",
    demo: "Testkonto",
    secureLogin: "Säker inloggning",
    verifiedData: "Verifierad profildata",
    tailoredCv: "Anpassade CV-exporter",
    applicationTracking: "Ansökningsspårning",
    dashboard: "Home",
    applications: "Ansökningar",
    candidates: "Kandidater",
    assignments: "Uppdrag",
    matchAssignment: "Match Assignment",
    settings: "Inställningar",
    permissions: "Behörigheter",
    dashboardTitle: "Home",
    signedInAs: "Inloggad som",
    searchPlaceholder: "Sök konsulter, kompetenser, kunder...",
    availability: "Tillgänglighet",
    all: "Alla",
    available: "Tillgänglig",
    busy: "Upptagen",
    openMenu: "Öppna meny",
    closeMenu: "Stäng meny",
    consultants: "Konsulter",
    active: "aktiva",
    updatedLast30Days: "uppdaterade senaste 30 dagar",
    assignmentsKpi: "Uppdrag",
    needsMatching: "behöver matchas",
    ongoing: "pågående",
    waitingForFeedback: "väntar på återkoppling",
    aiMatches: "AI-matchningar",
    created: "skapade",
    readyForReview: "redo att granskas",
    nextSteps: "Nästa steg",
    priority: "Prioriterat",
    matchNewAd: "Matcha ny annons",
    matchNewAdText: "Analysera krav och skapa shortlist.",
    followUpApplications: "Följ upp ansökningar",
    followUpApplicationsText: "väntar på återkoppling.",
    reviewProfiles: "Granska profiler",
    reviewProfilesText: "Kontrollera CV-kunskapsbas och tillgänglighet.",
    latestApplications: "Senaste ansökningar",
    noApplicationsSaved: "Inga ansökningar sparade ännu.",
    defaultView: "Standard",
    viewSettings: "Vyinställningar",
    importExport: "Import/export",
    addCandidate: "Lägg till kandidat",
    searchCandidatesPlaceholder: "Sök kandidater, nyckelord, anteckningar...",
    sortedByLastActivity: "Sorterat efter senaste aktivitet",
    filters: "Filter",
    name: "Namn",
    personalEmail: "E-post",
    personalPhone: "Telefon",
    experience: "Erfarenhet",
    skills: "Kompetenser",
    status: "Status",
    lastUpdated: "Senast uppdaterad",
    resizeColumn: "Ändra kolumnbredd",
    yearsShort: "år",
    customer: "Kund",
    role: "Roll",
    consultantsColumn: "Konsulter",
    feedback: "Återkoppling",
    appliedAt: "Ansökt",
    updatedAt: "Uppdaterad",
    source: "Källa",
    openAd: "Visa annons",
    noApplicationsMatch: "Inga ansökningar matchar filtren.",
    clearFilters: "Rensa filter",
    allConsultants: "Alla konsulter",
    allStatuses: "Alla statusar",
    allDates: "Alla datum",
    last7Days: "Senaste 7 dagarna",
    last30Days: "Senaste 30 dagarna",
    last90Days: "Senaste 90 dagarna",
    searchApplicationsPlaceholder: "Sök ansökningar, kunder, roller...",
    searchAssignmentsPlaceholder: "Sök uppdrag, kunder, krav...",
    createdBy: "Skapad av",
    assignmentType: "Typ",
    employee: "Anställd",
    currentAssignment: "Nuvarande uppdrag",
    contractPeriod: "Avtalsperiod",
    contractPdf: "Avtal PDF",
    uploadPdf: "Ladda upp PDF",
    missingContract: "Avtal saknas",
    assignmentDatabase: "Uppdragsdatabas",
    assignmentsDescription: "Anställda, aktuella uppdrag och avtalsdokument för managers.",
    noAssignment: "Inget aktivt uppdrag",
    noActiveAssignments: "Inga aktiva uppdrag.",
    activeAssignment: "Aktivt uppdrag"
  }
};

const tokenStorageKey = "cvdatabase.accessToken";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

function extractFirstUrl(text: string) {
  return text.match(/https?:\/\/[^\s]+/i)?.[0] ?? "";
}

function initials(name: string) {
  return name
    .split(" ", 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "IG";
}

function fileSafeName(value: string) {
  return value
    .trim()
    .replaceAll(" ", "-")
    .replace(/[^a-zA-Z0-9ÅÄÖåäö_-]/g, "");
}

function filenameFromDisposition(header: string | null) {
  return header?.match(/filename="?([^"]+)"?/i)?.[1];
}

function projectPeriod(project: ProjectExperience) {
  const start = project.startDate?.slice(0, 4) ?? "";
  const end = project.endDate?.slice(0, 4) ?? "pågående";
  return start ? `${start} - ${end}` : end;
}

function extractSkillDetails(notes: string): Record<string, SkillDetail> {
  const match = notes.match(/\[SkillDetails\](.+?)\[\/SkillDetails\]/s);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[1]) as SkillDetail[];
    return Object.fromEntries(parsed.map((item) => [item.name.toLowerCase(), item]));
  } catch {
    return {};
  }
}

function notesWithoutSkillDetails(notes: string) {
  return notes.replace(/\n?\[SkillDetails\].+?\[\/SkillDetails\]/s, "").trim();
}

function buildSkillDetailsNote(skills: SkillDetail[]) {
  return `[SkillDetails]${JSON.stringify(skills)}[/SkillDetails]`;
}

function getSkillDetail(skill: string, candidate: CandidateProfile): SkillDetail {
  return extractSkillDetails(candidate.notes)[skill.toLowerCase()] ?? {
    name: skill,
    level: "Van",
    comment: ""
  };
}

function skillEvidence(skill: string, candidate: CandidateProfile) {
  const normalized = skill.toLowerCase();
  const projects = candidate.projects.filter((project) =>
    project.technologies.some((technology) => technology.toLowerCase() === normalized)
    || project.description.toLowerCase().includes(normalized));
  const lastUsed = projects
    .map((project) => project.endDate ?? project.startDate)
    .sort()
    .at(-1);

  return {
    projectCount: projects.length,
    lastUsed: lastUsed?.slice(0, 4) ?? "ej angivet"
  };
}

function extractGapKeyword(text: string) {
  const explicit = text.match(/Saknar explicit\s+([^.,]+)|Annonsen nämner\s+([^,]+)/i);
  return (explicit?.[1] ?? explicit?.[2] ?? text)
    .replace("men det finns inte tydligt verifierat i kandidatens CV", "")
    .replace("i profilen", "")
    .trim()
    .toLowerCase();
}

function normalizeGapTerm(term: string) {
  return term
    .replace("ingestion", "dataintegration")
    .replace("modeling", "datamodellering")
    .replace("modelling", "datamodellering")
    .replace("transformation", "etl")
    .replace("orchestration", "etl")
    .replace("warehouse", "data warehouse")
    .replace("warehouses", "data warehouse")
    .replace("pipeline", "etl")
    .replace("pipelines", "etl");
}

function isLooseMatch(value: string, term: string) {
  const source = value.toLowerCase();
  const target = term.toLowerCase();
  return source.includes(target) || target.split(/\s+/).some((part) => part.length > 3 && source.includes(part));
}

function buildReviewContext(candidate: CandidateProfile, decisions: Record<string, GapDecision>) {
  return Object.entries(decisions)
    .filter(([key]) => key.startsWith(`${candidate.id}:`))
    .map(([key, decision]) => {
      const keyword = key.split(":").slice(1).join(":");
      if (decision.status === "linked") {
        return `- ${keyword}: använd endast verifierad referens "${decision.reference}".${decision.comment ? ` Kommentar: ${decision.comment}` : ""}`;
      }
      if (decision.status === "missing") {
        return `- ${keyword}: saknas eller är inte verifierat. Lägg inte till detta i CV:t.${decision.comment ? ` Kommentar: ${decision.comment}` : ""}`;
      }
      return `- ${keyword}: använd endast verifierad referens "${decision.reference}".${decision.comment ? ` Kommentar: ${decision.comment}` : ""}`;
    })
    .join("\n");
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(tokenStorageKey);
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

function GapReview({
  candidateId,
  text,
  decision,
  references,
  onDecision,
  onOpenKnowledge
}: {
  candidateId: string;
  text: string;
  decision?: GapDecision;
  references: string[];
  onDecision: (candidateId: string, gap: string, decision: GapDecision) => void;
  onOpenKnowledge: (candidateId: string, gap: string, reference?: string) => void;
}) {
  const keyword = extractGapKeyword(text);
  const bestReference = references[0];
  const currentReference = decision?.reference ?? bestReference ?? "";

  function updateDecision(update: Partial<GapDecision>) {
    onDecision(candidateId, text, {
      status: update.status ?? decision?.status ?? "linked",
      reference: update.reference ?? currentReference,
      comment: update.comment ?? decision?.comment
    });
  }

  return (
    <div className="gap-review">
      <span>{text}</span>
      {decision && (
        <small className={`gap-status ${decision.status}`}>
          {decision.status === "linked" ? `Kopplad: ${decision.reference || "profil"}` : "Ska inte läggas till"}
        </small>
      )}
      <div className="gap-actions">
        <button type="button" onClick={() => onOpenKnowledge(candidateId, text, currentReference || bestReference)}>
          Koppla till CV
        </button>
        <button type="button" onClick={() => onOpenKnowledge(candidateId, text, currentReference || bestReference)}>
          Lägg till i profil
        </button>
        <button type="button" onClick={() => updateDecision({ status: "missing", reference: keyword })}>
          Saknas
        </button>
      </div>
    </div>
  );
}

function KnowledgeModal({
  candidate,
  draft,
  onChange,
  onClose,
  onSave,
  isBusy
}: {
  candidate: CandidateProfile;
  draft: KnowledgeDraft;
  onChange: (draft: KnowledgeDraft) => void;
  onClose: () => void;
  onSave: () => void;
  isBusy: boolean;
}) {
  const selectedProject = candidate.projects[draft.projectIndex];

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="knowledge-modal" role="dialog" aria-modal="true" aria-labelledby="knowledge-title">
        <div className="modal-header">
          <div>
            <strong id="knowledge-title">Koppla gap till CV och profil</strong>
            <p>{candidate.name} · {draft.keyword}</p>
          </div>
          <button type="button" onClick={onClose}>Stäng</button>
        </div>

        <label>
          Välj projekt att koppla till
          <select
            value={draft.projectIndex}
            onChange={(event) => {
              const projectIndex = Number(event.target.value);
              const project = candidate.projects[projectIndex];
              onChange({
                ...draft,
                projectIndex,
                reference: project ? `Projekt: ${project.customer} - ${project.role}` : draft.reference
              });
            }}
          >
            {candidate.projects.map((project, index) => (
              <option value={index} key={`${project.customer}-${project.role}-${project.startDate}`}>
                {project.customer} - {project.role}
              </option>
            ))}
          </select>
        </label>

        {selectedProject && (
          <div className="project-context">
            <strong>{selectedProject.customer}</strong>
            <span>{selectedProject.role}</span>
            <p>{selectedProject.description}</p>
            <div className="mini-tags">
              {selectedProject.technologies.map((technology) => <span key={technology}>{technology}</span>)}
            </div>
          </div>
        )}

        <label>
          Verifierad formulering att lägga till
          <textarea
            value={draft.statement}
            onChange={(event) => onChange({ ...draft, statement: event.target.value })}
            placeholder={`T.ex. Byggde ${draft.keyword} för dataintegration och kvalitetssäkrade flöden i projektet.`}
          />
        </label>

        <label>
          Referens i CV
          <input
            value={draft.reference}
            onChange={(event) => onChange({ ...draft, reference: event.target.value })}
            placeholder="Projekt eller profilsektion som ska bära formuleringen"
          />
        </label>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Avbryt</button>
          <button className="primary" type="button" disabled={isBusy || !draft.statement.trim()} onClick={onSave}>
            Spara i profil och CV-underlag
          </button>
        </div>
      </section>
    </div>
  );
}

function App() {
  const [language, setLanguage] = useState<UiLanguage>("en");
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [loginEmail, setLoginEmail] = useState("manager@cvdatabase.local");
  const [loginPassword, setLoginPassword] = useState("Manager123!");
  const [loginError, setLoginError] = useState("");
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState("");
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobAdvertisement, setJobAdvertisement] = useState("");
  const [match, setMatch] = useState<JobMatchResponse | null>(null);
  const [generatedCv, setGeneratedCv] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResponse | null>(null);
  const [applicationCustomer, setApplicationCustomer] = useState("");
  const [applicationRole, setApplicationRole] = useState("");
  const [applicationCandidateIds, setApplicationCandidateIds] = useState<string[]>([]);
  const [gapDecisions, setGapDecisions] = useState<Record<string, GapDecision>>({});
  const [knowledgeDraft, setKnowledgeDraft] = useState<KnowledgeDraft | null>(null);
  const [highlightedApplicationId, setHighlightedApplicationId] = useState<string | null>(null);
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("");
  const [applicationConsultantFilter, setApplicationConsultantFilter] = useState("");
  const [applicationDateFilter, setApplicationDateFilter] = useState("all");
  const [openedApplication, setOpenedApplication] = useState<ApplicationRecord | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openedCandidate, setOpenedCandidate] = useState<CandidateProfile | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<CandidateProfile | null>(null);
  const [cvImportText, setCvImportText] = useState("");
  const [profileCandidateId, setProfileCandidateId] = useState<string | null>(null);
  const [assistantQuestion, setAssistantQuestion] = useState("Vem kan hjälpa mig med Microsoft Fabric och Power BI?");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [candidateColumnWidths, setCandidateColumnWidths] = useState(candidateColumnDefaults);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [assignmentContractFiles, setAssignmentContractFiles] = useState<Record<string, string>>({});
  const copy = uiCopy[language];

  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams({ q: query, availability });
    api<CandidateProfile[]>(`/api/candidates?${params}`).then(setCandidates).catch(console.error);
  }, [query, availability, session]);

  useEffect(() => {
    if (!session) return;
    loadApplications();
  }, [session]);

  const selected = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0],
    [candidates, selectedId]
  );

  const profileCandidate = useMemo(
    () => candidates.find((candidate) => candidate.id === profileCandidateId) ?? selected,
    [candidates, profileCandidateId, selected]
  );

  const assignedCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.currentAssignment.trim().length > 0),
    [candidates]
  );

  const candidateGridTemplate = useMemo(
    () => `38px ${candidateColumnWidths.name}px ${candidateColumnWidths.email}px ${candidateColumnWidths.phone}px ${candidateColumnWidths.experience}px ${candidateColumnWidths.skills}px ${candidateColumnWidths.status}px ${candidateColumnWidths.updated}px`,
    [candidateColumnWidths]
  );

  function startCandidateColumnResize(column: CandidateColumnKey, event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = candidateColumnWidths[column];

    function handleMouseMove(moveEvent: MouseEvent) {
      const nextWidth = Math.max(candidateColumnMinWidths[column], startWidth + moveEvent.clientX - startX);
      setCandidateColumnWidths((current) => ({ ...current, [column]: nextWidth }));
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }

  const applicationCandidateOptions = useMemo(() => {
    if (!match) {
      return candidates.map((candidate) => ({ candidate, score: undefined as number | undefined }));
    }

    const ranked = match.candidates
      .map((matchCandidate) => {
        const candidate = candidates.find((item) => item.id === matchCandidate.candidateId);
        return candidate ? { candidate, score: matchCandidate.score } : null;
      })
      .filter((item): item is { candidate: CandidateProfile; score: number } => item !== null);

    const rest = candidates
      .filter((candidate) => !ranked.some((item) => item.candidate.id === candidate.id))
      .map((candidate) => ({ candidate, score: undefined as number | undefined }));

    return [...ranked, ...rest];
  }, [candidates, match]);

  const applicationStatuses = useMemo(
    () => [...new Set(applications.map((application) => application.status).filter(Boolean))],
    [applications]
  );

  const applicationConsultants = useMemo(
    () => [...new Set(applications.flatMap((application) => application.candidateNames).filter(Boolean))].sort(),
    [applications]
  );

  const filteredApplications = useMemo(() => {
    const now = Date.now();
    const maxAgeDays = applicationDateFilter === "all" ? null : Number(applicationDateFilter);

    return applications.filter((application) => {
      const matchesStatus = !applicationStatusFilter || application.status === applicationStatusFilter;
      const matchesConsultant = !applicationConsultantFilter || application.candidateNames.includes(applicationConsultantFilter);
      const ageDays = (now - new Date(application.appliedAt).getTime()) / 86_400_000;
      const matchesDate = maxAgeDays === null || ageDays <= maxAgeDays;
      return matchesStatus && matchesConsultant && matchesDate;
    });
  }, [applications, applicationConsultantFilter, applicationDateFilter, applicationStatusFilter]);

  const applicationStatusCounts = useMemo(
    () => applicationStatuses.map((status) => ({
      status,
      count: applications.filter((application) => application.status === status).length
    })),
    [applications, applicationStatuses]
  );

  const profileApplications = useMemo(() => {
    if (!profileCandidate) return [];
    return applications.filter((application) =>
      application.candidateIds.includes(profileCandidate.id)
      || application.candidateNames.includes(profileCandidate.name));
  }, [applications, profileCandidate]);

  const assistantResults = useMemo(() => {
    const terms = assistantQuestion
      .toLowerCase()
      .replace(/[^a-zåäö0-9#+.\s-]/gi, " ")
      .split(/\s+/)
      .filter((term) => term.length > 2);

    return candidates
      .map((candidate) => {
        const evidence = [
          ...candidate.skills,
          candidate.title,
          candidate.summary,
          candidate.notes,
          ...candidate.projects.flatMap((project) => [project.customer, project.role, project.description, ...project.technologies])
        ];
        const matchedTerms = [...new Set(terms.filter((term) => evidence.some((item) => item.toLowerCase().includes(term))))];
        const skillHits = candidate.skills.filter((skill) => matchedTerms.some((term) => skill.toLowerCase().includes(term)));
        return {
          candidate,
          score: matchedTerms.length * 18 + skillHits.length * 8 + (candidate.availability === "Tillgänglig" ? 8 : 0),
          matchedTerms,
          skillHits
        };
      })
      .filter((item) => item.score > 0 || assistantQuestion.trim().length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [assistantQuestion, candidates]);

  function openCandidatePage(candidate: CandidateProfile) {
    setSelectedId(candidate.id);
    setProfileCandidateId(candidate.id);
    setOpenedCandidate(null);
    setActiveView("candidate");
  }

  async function runMatch() {
    setIsBusy(true);
    try {
      const [result, duplicate] = await Promise.all([
        api<JobMatchResponse>("/api/ai/match", {
          method: "POST",
          body: JSON.stringify({ jobAdvertisement, language: "sv", maxCandidates: 5 })
        }),
        api<DuplicateCheckResponse>("/api/applications/check-duplicate", {
          method: "POST",
          body: JSON.stringify({ advertisement: jobAdvertisement })
        })
      ]);
      setMatch(result);
      setGapDecisions({});
      setDuplicateCheck(duplicate);
      if (!applicationRole && result.analysis.role !== "Okänd roll") {
        setApplicationRole(result.analysis.role);
      }
      if (!applicationCustomer) {
        setApplicationCustomer(result.analysis.recruitingCompany || result.analysis.companyName || result.analysis.sourceName);
      }
      const recommendedIds = result.candidates
        .filter((candidate) => candidate.score >= 50 && candidate.availability === "Tillgänglig")
        .map((candidate) => candidate.candidateId);
      setApplicationCandidateIds(recommendedIds.length > 0 ? recommendedIds : selected ? [selected.id] : []);
    } finally {
      setIsBusy(false);
    }
  }

  async function loadApplications() {
    const result = await api<ApplicationRecord[]>("/api/applications");
    setApplications(result);
  }

  async function saveApplication() {
    if (!jobAdvertisement) return;
    const selectedCandidates = candidates.filter((candidate) => applicationCandidateIds.includes(candidate.id));
    setIsBusy(true);
    try {
      await api<ApplicationRecord>("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          customer: applicationCustomer,
          role: applicationRole || match?.analysis.role || "Okänd roll",
          advertisement: jobAdvertisement,
          candidateIds: selectedCandidates.map((candidate) => candidate.id),
          candidateNames: selectedCandidates.map((candidate) => candidate.name),
          sourceUrl: match?.analysis.sourceUrl || extractFirstUrl(jobAdvertisement),
          status: "Ansökan skapad"
        })
      });
      await loadApplications();
      setActiveView("applications");
    } finally {
      setIsBusy(false);
    }
  }

  async function updateApplication(application: ApplicationRecord, status: string, feedback: string) {
    const updated = await api<ApplicationRecord>(`/api/applications/${application.id}`, {
      method: "PUT",
      body: JSON.stringify({ status, feedback })
    });
    setApplications((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  function openApplication(applicationId: string) {
    setActiveView("applications");
    setHighlightedApplicationId(applicationId);
    window.setTimeout(() => {
      document.getElementById(`application-${applicationId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    window.setTimeout(() => setHighlightedApplicationId(null), 4200);
  }

  async function generateCv(language: "sv" | "en") {
    if (!selected) return;
    setIsBusy(true);
    try {
      const reviewContext = buildReviewContext(selected, gapDecisions);
      const result = await api<{ markdown: string }>("/api/ai/generate-cv", {
        method: "POST",
        body: JSON.stringify({
          candidateId: selected.id,
          jobAdvertisement: reviewContext ? `${jobAdvertisement}\n\nInterna CV-granskningsnoteringar:\n${reviewContext}` : jobAdvertisement,
          language
        })
      });
      setGeneratedCv(result.markdown);
    } finally {
      setIsBusy(false);
    }
  }

  function setGapDecision(candidateId: string, gap: string, decision: GapDecision) {
    setGapDecisions((current) => ({
      ...current,
      [`${candidateId}:${extractGapKeyword(gap)}`]: decision
    }));
  }

  function toggleApplicationCandidate(candidateId: string) {
    setApplicationCandidateIds((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId]);
  }

  function openKnowledgeDraft(candidateId: string, gap: string, reference = "") {
    const candidate = candidates.find((item) => item.id === candidateId);
    const keyword = extractGapKeyword(gap);
    if (!candidate) return;

    const projectIndex = Math.max(0, candidate.projects.findIndex((project) => {
      const projectText = `${project.customer} ${project.role} ${project.description} ${project.technologies.join(" ")}`;
      return isLooseMatch(projectText, normalizeGapTerm(keyword)) || isLooseMatch(projectText, keyword);
    }));
    const project = candidate.projects[projectIndex];

    setKnowledgeDraft({
      candidateId,
      gap,
      keyword,
      projectIndex,
      reference: reference || (project ? `Projekt: ${project.customer} - ${project.role}` : "Profilnotering"),
      statement: ""
    });
  }

  function candidatePayload(candidate: CandidateProfile) {
    return {
      name: candidate.name,
      title: candidate.title,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      availability: candidate.availability,
      currentAssignment: candidate.currentAssignment,
      availableFrom: candidate.availableFrom,
      experienceYears: candidate.experienceYears,
      avatarDataUrl: candidate.avatarDataUrl ?? "",
      skills: candidate.skills,
      languages: candidate.languages,
      projects: candidate.projects,
      summary: candidate.summary,
      notes: candidate.notes
    };
  }

  async function saveCandidateProfile(candidate: CandidateProfile) {
    const updated = await api<CandidateProfile>(`/api/candidates/${candidate.id}`, {
      method: "PUT",
      body: JSON.stringify(candidatePayload(candidate))
    });
    setCandidates((current) => current.map((item) => item.id === updated.id ? updated : item));
    setOpenedCandidate((current) => current?.id === updated.id ? updated : current);
    setEditingCandidate((current) => current?.id === updated.id ? updated : current);
    return updated;
  }

  async function saveKnowledgeDraft() {
    if (!knowledgeDraft) return;
    const candidate = candidates.find((item) => item.id === knowledgeDraft.candidateId);
    if (!candidate) return;
    const project = candidate.projects[knowledgeDraft.projectIndex];
    const statement = knowledgeDraft.statement.trim();
    if (!statement) return;

    setIsBusy(true);
    try {
      const updatedProjects = candidate.projects.map((item, index) => {
        if (index !== knowledgeDraft.projectIndex) return item;
        const suffix = item.description.endsWith(".") ? "" : ".";
        return {
          ...item,
          description: `${item.description}${suffix} ${statement}`
        };
      });
      const knowledgeNote = `[Kunskapsbas] ${knowledgeDraft.keyword}: ${statement} (${knowledgeDraft.reference})`;
      const updated = await saveCandidateProfile({
        ...candidate,
        projects: updatedProjects,
        notes: [candidate.notes, knowledgeNote].filter(Boolean).join("\n")
      });

      setGapDecision(candidate.id, knowledgeDraft.gap, {
        status: "linked",
        reference: knowledgeDraft.reference || (project ? `Projekt: ${project.customer} - ${project.role}` : "Profilnotering"),
        comment: statement
      });
      setKnowledgeDraft(null);
    } finally {
      setIsBusy(false);
    }
  }

  function findProfileReferences(candidateId: string, gap: string) {
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) return [];
    const keyword = extractGapKeyword(gap);
    const terms = [keyword, normalizeGapTerm(keyword)].filter(Boolean);
    const refs: string[] = [];

    for (const skill of candidate.skills) {
      if (terms.some((term) => isLooseMatch(skill, term))) {
        refs.push(`Kompetens: ${skill}`);
      }
    }

    for (const project of candidate.projects) {
      const projectText = `${project.customer} ${project.role} ${project.description} ${project.technologies.join(" ")}`;
      if (terms.some((term) => isLooseMatch(projectText, term))) {
        refs.push(`Projekt: ${project.customer} - ${project.role}`);
      }
    }

    return [...new Set(refs)].slice(0, 4);
  }

  async function downloadBlob(response: Response, fallbackName: string) {
    if (!response.ok) {
      throw new Error(await response.text());
    }

    const blob = await response.blob();
    const filename = fallbackName || filenameFromDisposition(response.headers.get("Content-Disposition")) || "cv.pdf";
    const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadPdf(candidate = selected, language: "sv" | "en" = "sv") {
    if (!candidate) return;
    const token = localStorage.getItem(tokenStorageKey);
    const response = await fetch(apiUrl(`/api/candidates/${candidate.id}/cv.pdf?language=${language}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    await downloadBlob(response, `${fileSafeName(candidate.name)}-cv-${language}.pdf`);
  }

  async function downloadTailoredPdf(candidate = selected, language: "sv" | "en" = "sv") {
    if (!candidate) return;
    setIsBusy(true);
    try {
      const reviewContext = buildReviewContext(candidate, gapDecisions);
      const response = await fetch(apiUrl("/api/ai/generate-cv.pdf"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(localStorage.getItem(tokenStorageKey) ? { Authorization: `Bearer ${localStorage.getItem(tokenStorageKey)}` } : {})
        },
        body: JSON.stringify({
          candidateId: candidate.id,
          jobAdvertisement: reviewContext ? `${jobAdvertisement}\n\nInterna CV-granskningsnoteringar:\n${reviewContext}` : jobAdvertisement,
          language
        })
      });
      await downloadBlob(response, `${fileSafeName(candidate.name)}-anpassat-cv-${language}.pdf`);
    } finally {
      setIsBusy(false);
    }
  }

  function updateEditingProject(index: number, update: Partial<ProjectExperience>) {
    setEditingCandidate((current) => {
      if (!current) return current;
      return {
        ...current,
        projects: current.projects.map((project, projectIndex) => projectIndex === index ? { ...project, ...update } : project)
      };
    });
  }

  function updateEditingSkill(index: number, name: string) {
    setEditingCandidate((current) => {
      if (!current) return current;
      return {
        ...current,
        skills: current.skills.map((skill, skillIndex) => skillIndex === index ? name : skill).filter(Boolean)
      };
    });
  }

  function updateEditingSkillDetail(skill: string, update: Partial<SkillDetail>) {
    setEditingCandidate((current) => {
      if (!current) return current;
      const existingDetails = extractSkillDetails(current.notes);
      const currentDetail = existingDetails[skill.toLowerCase()] ?? getSkillDetail(skill, current);
      const nextDetail: SkillDetail = {
        ...currentDetail,
        ...update,
        name: update.name ?? currentDetail.name
      };
      const nextDetails = current.skills.map((item) =>
        item.toLowerCase() === skill.toLowerCase()
          ? nextDetail
          : existingDetails[item.toLowerCase()] ?? getSkillDetail(item, current));
      return {
        ...current,
        notes: [notesWithoutSkillDetails(current.notes), buildSkillDetailsNote(nextDetails)].filter(Boolean).join("\n")
      };
    });
  }

  function addEditingSkill() {
    setEditingCandidate((current) => current ? { ...current, skills: [...current.skills, "Ny kompetens"] } : current);
  }

  function removeEditingSkill(index: number) {
    setEditingCandidate((current) => current ? { ...current, skills: current.skills.filter((_, skillIndex) => skillIndex !== index) } : current);
  }

  function readProfileImage(file: File, candidate: CandidateProfile) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditingCandidate({ ...candidate, avatarDataUrl: String(reader.result) });
    };
    reader.readAsDataURL(file);
  }

  function importCvFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setCvImportText(String(reader.result ?? "").slice(0, 5000));
    };
    reader.readAsText(file);
  }

  function applyCvImport() {
    if (!editingCandidate || !cvImportText.trim()) return;
    const imported = cvImportText.toLowerCase();
    const knownTerms = [
      "SQL", "Power BI", "Python", "Azure", "Azure Fabric", "Data Warehouse", "ETL", "CRM", "ERP",
      "React", "TypeScript", ".NET", "C#", "API", "Snowflake", "Fivetran", "Kravinsamling",
      "Datamodellering", "Datavisualisering", "Machine Learning", "AI"
    ];
    const importedSkills = knownTerms.filter((term) => imported.includes(term.toLowerCase()));
    const nextSummary = cvImportText
      .split(/\n+/)
      .map((line) => line.trim())
      .find((line) => line.length > 80 && line.length < 420) ?? editingCandidate.summary;

    setEditingCandidate({
      ...editingCandidate,
      summary: nextSummary,
      skills: [...new Set([...editingCandidate.skills, ...importedSkills])],
      notes: [editingCandidate.notes, `[CV-import] ${new Date().toLocaleDateString("sv-SE")}: ${fileSafeName("importerat-cv")} analyserades i profilen.`].filter(Boolean).join("\n")
    });
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    try {
      const result = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      localStorage.setItem(tokenStorageKey, result.accessToken);
      setSession(result);
    } catch {
      setLoginError("Fel e-post eller lösenord.");
    }
  }

  function logout() {
    localStorage.removeItem(tokenStorageKey);
    setSession(null);
    setCandidates([]);
    setMatch(null);
    setGeneratedCv("");
  }

  if (!session) {
    return (
      <main className="login-screen">
        <header className="login-page-header">
          <strong>InsideGrid</strong>
          <div>
            <label className="language-select">
              <Languages size={15} />
              <select value={language} onChange={(event) => setLanguage(event.target.value as UiLanguage)}>
                <option value="en">EN</option>
                <option value="sv">SV</option>
              </select>
            </label>
          </div>
        </header>

        <div className="login-shell">
          <form className="login-panel" onSubmit={login}>
            <div className="login-form-heading">
              <h2>{language === "en" ? "Sign in to your account" : "Logga in på ditt konto"}</h2>
              <p>{language === "en" ? "Continue to your consultant workspace." : "Fortsätt till din konsultvy."}</p>
            </div>

            <label>
              {copy.email}
              <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" />
            </label>
            <label>
              {copy.password}
              <input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" />
            </label>
            {loginError && <p className="error-text">{loginError}</p>}
            <button className="primary" type="submit">{copy.signIn}</button>
            <div className="login-divider">
              <span />
              <em>or</em>
              <span />
            </div>
            <div className="social-login-row" aria-label="External sign in options">
              <button type="button">
                <Apple size={18} />
                Apple
              </button>
              <button type="button">
                <Chrome size={18} />
                Google
              </button>
            </div>
            <div className="login-signup-prompt">
              <span>{language === "en" ? "Don't have an account?" : "Har du inget konto?"}</span>
              <button type="button">{language === "en" ? "Sign up" : "Skapa konto"}</button>
            </div>
          </form>

          <section className="login-visual" aria-label="InsideGrid video preview">
            <video src="/login-video.mp4" autoPlay muted loop playsInline poster="/login.avif" />
            <div className="login-copy">
              <h1>{copy.loginTitle}</h1>
              <div className="login-proof-grid">
                <span><ShieldCheck size={17} />{copy.verifiedData}</span>
                <span><Sparkles size={17} />{copy.tailoredCv}</span>
                <span><ClipboardList size={17} />{copy.applicationTracking}</span>
              </div>
            </div>
          </section>
        </div>

        <footer className="login-page-footer">
          <span>© 2026 InsideGrid</span>
          <div>
            <button type="button">{language === "en" ? "Terms & Conditions" : "Villkor"}</button>
            <button type="button">{language === "en" ? "Privacy Policy" : "Integritetspolicy"}</button>
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <header className="toolbar">
        <div className="app-header-brand">
          <strong>InsideGrid</strong>
        </div>
        <label className="toolbar-search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} />
        </label>
        <div className="toolbar-actions">
          <label className="language-select">
            <Languages size={15} />
            <select value={language} onChange={(event) => setLanguage(event.target.value as UiLanguage)}>
              <option value="en">EN</option>
              <option value="sv">SV</option>
            </select>
          </label>
          <button className="topbar-icon" title="Notiser" type="button">
            <Bell size={19} />
          </button>
          <div className="user-menu-wrap">
            <button className="avatar-button" type="button" onClick={() => setUserMenuOpen((current) => !current)}>
              <span>{initials(session.user.displayName)}</span>
            </button>
            {userMenuOpen && (
              <div className="user-menu">
                <div className="user-menu-header">
                  <span>{initials(session.user.displayName)}</span>
                  <div>
                    <strong>{session.user.displayName}</strong>
                    <small>{session.user.email} · {session.user.role}</small>
                  </div>
                </div>
                <button type="button" onClick={() => {
                  setProfileOpen(true);
                  setUserMenuOpen(false);
                }}>
                  <UserRound size={16} />
                  Mina sidor
                </button>
                <button type="button">
                  <Settings size={16} />
                  Profilinställningar
                </button>
                <button type="button" onClick={logout}>
                  <LogOut size={16} />
                  Logga ut
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <button className="sidebar-toggle" type="button" onClick={() => setSidebarCollapsed((current) => !current)}>
          <span>{sidebarCollapsed ? "›" : "‹"}</span>
          <em>{sidebarCollapsed ? copy.openMenu : copy.closeMenu}</em>
        </button>
        <div className={`nav-item ${activeView === "dashboard" ? "active" : ""}`} title={copy.dashboard} onClick={() => setActiveView("dashboard")}>
          <LayoutDashboard size={18} />
          <span>{copy.dashboard}</span>
        </div>
        <div className={`nav-item ${activeView === "candidates" ? "active" : ""}`} title={copy.candidates} onClick={() => setActiveView("candidates")}>
          <UsersRound size={18} />
          <span>{copy.candidates}</span>
        </div>
        <div className={`nav-item ${activeView === "applications" ? "active" : ""}`} title={copy.applications} onClick={() => setActiveView("applications")}>
          <ClipboardList size={18} />
          <span>{copy.applications}</span>
        </div>
        <div className={`nav-item ${activeView === "assignments" ? "active" : ""}`} title={copy.assignments} onClick={() => setActiveView("assignments")}>
          <BriefcaseBusiness size={18} />
          <span>{copy.assignments}</span>
        </div>
        <div className={`nav-item ${activeView === "matchAssignment" ? "active" : ""}`} title={copy.matchAssignment} onClick={() => setActiveView("matchAssignment")}>
          <Sparkles size={18} />
          <span>{copy.matchAssignment}</span>
        </div>
        <div className={`nav-item ${activeView === "settings" ? "active" : ""}`} title={copy.settings} onClick={() => setActiveView("settings")}>
          <UserRoundCog size={18} />
          <span>{copy.settings}</span>
        </div>
        <button className="security-note" type="button" title="Rollstyrd åtkomst är aktiv i API:t. Byt demo-auth mot Entra ID/JWT i produktion.">
          <Settings size={17} />
        </button>
      </aside>

      <section className="workspace">
        {activeView === "dashboard" ? (
          <section className="candidate-directory-page">
            <section className="candidate-directory-shell">
              <div className="candidate-directory-main">
                <div className="candidate-directory-topline">
                  <div>
                    <span>{copy.dashboard}</span>
                    <strong>{copy.dashboard}</strong>
                  </div>
                </div>
                <section className="manager-dashboard">
              <div className="manager-metrics home-kpis">
                <article className="kpi-card candidates">
                  <UsersRound size={18} />
                  <span>{copy.consultants}</span>
                  <strong>{candidates.length} {copy.active}</strong>
                  <small>{candidates.filter((candidate) => new Date(candidate.updatedAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000).length} {copy.updatedLast30Days}</small>
                </article>
                <article className="kpi-card assignments">
                  <BriefcaseBusiness size={18} />
                  <span>{copy.assignmentsKpi}</span>
                  <strong>{applications.filter((application) => ["Ansökan skapad", "CV skickat", "Intervju"].includes(application.status)).length} {copy.active}</strong>
                  <small>{applications.filter((application) => application.status === "Utkast").length || (jobAdvertisement && !match ? 1 : 0)} {copy.needsMatching}</small>
                </article>
                <article className="kpi-card applications">
                  <ClipboardList size={18} />
                  <span>{copy.applications}</span>
                  <strong>{applications.filter((application) => ["Ansökan skapad", "CV skickat", "Intervju", "Återkoppling"].includes(application.status)).length} {copy.ongoing}</strong>
                  <small>{applications.filter((application) => application.status === "CV skickat").length} {copy.waitingForFeedback}</small>
                </article>
                <article className="kpi-card ai">
                  <Sparkles size={18} />
                  <span>{copy.aiMatches}</span>
                  <strong>{match ? match.candidates.length : 0} {copy.created}</strong>
                  <small>{match ? match.candidates.filter((candidate) => candidate.score >= 70).length : 0} {copy.readyForReview}</small>
                </article>
              </div>

              <div className="manager-panels">
                <section>
                  <div className="section-heading">
                    <strong>{copy.nextSteps}</strong>
                    <span>{copy.priority}</span>
                  </div>
                  <div className="manager-task-list">
                    <button type="button" onClick={() => setActiveView("matchAssignment")}>
                      <strong>{copy.matchNewAd}</strong>
                      <span>{copy.matchNewAdText}</span>
                    </button>
                    <button type="button" onClick={() => setActiveView("applications")}>
                      <strong>{copy.followUpApplications}</strong>
                      <span>{applications.filter((application) => application.status === "CV skickat").length} {copy.followUpApplicationsText}</span>
                    </button>
                    <button type="button" onClick={() => setActiveView("candidates")}>
                      <strong>{copy.reviewProfiles}</strong>
                      <span>{copy.reviewProfilesText}</span>
                    </button>
                  </div>
                </section>
                <section>
                  <div className="section-heading">
                    <strong>{copy.latestApplications}</strong>
                    <span>{applications.length}</span>
                  </div>
                  <div className="manager-application-list">
                    {applications.slice(0, 4).map((application) => (
                      <button type="button" key={application.id} onClick={() => openApplication(application.id)}>
                        <strong>{application.customer}</strong>
                        <span>{application.role} · {application.status}</span>
                      </button>
                    ))}
                    {applications.length === 0 && <p>{copy.noApplicationsSaved}</p>}
                  </div>
                </section>
              </div>
                </section>
              </div>
            </section>
          </section>
        ) : activeView === "candidates" ? (
          <section className="candidate-directory-page">
            <section className="candidate-directory-shell">
              <div className="candidate-directory-main">
                <div className="candidate-directory-topline">
                  <div>
                    <span>{copy.dashboard}</span>
                    <strong>{copy.candidates}</strong>
                  </div>
                  <div className="candidate-directory-actions">
                    <button type="button">{copy.defaultView}</button>
                    <button type="button">{copy.viewSettings}</button>
                    <button type="button">{copy.importExport}</button>
                    <button className="primary" type="button" onClick={() => selected && setEditingCandidate(selected)}>
                      + {copy.addCandidate}
                    </button>
                  </div>
                </div>

                <div className="candidate-directory-filters">
                  <label>
                    <Search size={15} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={copy.searchCandidatesPlaceholder}
                    />
                  </label>
                  <button type="button">{copy.sortedByLastActivity}</button>
                  <button type="button">{copy.filters}</button>
                </div>

                <div className="candidate-directory-table" role="table" aria-label={copy.candidates}>
                  <div className="candidate-directory-row head" role="row" style={{ gridTemplateColumns: candidateGridTemplate }}>
                    <span><input type="checkbox" aria-label="Select all candidates" /></span>
                    <span>{copy.name}<button className="column-resize-handle" type="button" aria-label={`${copy.resizeColumn}: ${copy.name}`} onMouseDown={(event) => startCandidateColumnResize("name", event)} /></span>
                    <span>{copy.personalEmail}<button className="column-resize-handle" type="button" aria-label={`${copy.resizeColumn}: ${copy.personalEmail}`} onMouseDown={(event) => startCandidateColumnResize("email", event)} /></span>
                    <span>{copy.personalPhone}<button className="column-resize-handle" type="button" aria-label={`${copy.resizeColumn}: ${copy.personalPhone}`} onMouseDown={(event) => startCandidateColumnResize("phone", event)} /></span>
                    <span>{copy.experience}<button className="column-resize-handle" type="button" aria-label={`${copy.resizeColumn}: ${copy.experience}`} onMouseDown={(event) => startCandidateColumnResize("experience", event)} /></span>
                    <span>{copy.skills}<button className="column-resize-handle" type="button" aria-label={`${copy.resizeColumn}: ${copy.skills}`} onMouseDown={(event) => startCandidateColumnResize("skills", event)} /></span>
                    <span>{copy.status}<button className="column-resize-handle" type="button" aria-label={`${copy.resizeColumn}: ${copy.status}`} onMouseDown={(event) => startCandidateColumnResize("status", event)} /></span>
                    <span>{copy.lastUpdated}<button className="column-resize-handle" type="button" aria-label={`${copy.resizeColumn}: ${copy.lastUpdated}`} onMouseDown={(event) => startCandidateColumnResize("updated", event)} /></span>
                  </div>
                  {candidates.map((candidate, index) => (
                    <button
                      className={`candidate-directory-row ${candidate.id === selected?.id ? "selected" : ""}`}
                      type="button"
                      role="row"
                      key={candidate.id}
                      style={{ gridTemplateColumns: candidateGridTemplate }}
                      onClick={() => {
                        setSelectedId(candidate.id);
                        setOpenedCandidate(candidate);
                      }}
                    >
                      <span><input type="checkbox" aria-label={`Select ${candidate.name}`} onClick={(event) => event.stopPropagation()} /></span>
                      <span className="directory-person">
                        <span className="candidate-avatar small">
                          {candidate.avatarDataUrl ? <img src={candidate.avatarDataUrl} alt="" /> : initials(candidate.name)}
                        </span>
                        <strong>{candidate.name}</strong>
                        <em>{index % 2 === 0 ? "in" : ""}</em>
                      </span>
                      <span><em>{candidate.email}</em></span>
                      <span><em>{candidate.phone}</em></span>
                      <span>{candidate.title} ({candidate.experienceYears} {copy.yearsShort})</span>
                      <span className="directory-skills">
                        {candidate.skills.slice(0, 3).map((skill) => <b key={skill}>{skill}</b>)}
                        {candidate.skills.length > 3 && <small>+{candidate.skills.length - 3}</small>}
                      </span>
                      <span>
                        <i className={candidate.availability === "Tillgänglig" ? "status-free" : "status-busy"}>
                          {candidate.availability === "Tillgänglig" ? copy.available : copy.busy}
                        </i>
                      </span>
                      <span>{new Date(candidate.updatedAt).toLocaleDateString("sv-SE")}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </section>
        ) : activeView === "assignments" ? (
          <section className="candidate-directory-page">
            <section className="candidate-directory-shell">
              <div className="candidate-directory-main">
                <div className="candidate-directory-topline">
                  <div>
                    <span>{copy.dashboard}</span>
                    <strong>{copy.assignmentDatabase}</strong>
                  </div>
                  <div className="candidate-directory-actions">
                    <button type="button">{copy.defaultView}</button>
                    <button type="button">{copy.viewSettings}</button>
                    <button type="button">{copy.importExport}</button>
                    <button className="primary" type="button" onClick={() => setActiveView("matchAssignment")}>
                      + {copy.matchAssignment}
                    </button>
                  </div>
                </div>

                <div className="candidate-directory-filters">
                  <label>
                    <Search size={15} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={copy.searchAssignmentsPlaceholder}
                    />
                  </label>
                  <button type="button">{copy.sortedByLastActivity}</button>
                  <button type="button">{copy.filters}</button>
                </div>

                <div className="candidate-directory-table" role="table" aria-label={copy.assignments}>
                  <div className="candidate-directory-row assignment-directory-row head" role="row">
                    <span><input type="checkbox" aria-label="Select all assignments" /></span>
                    <span>{copy.employee}</span>
                    <span>{copy.currentAssignment}</span>
                    <span>{copy.customer}</span>
                    <span>{copy.status}</span>
                    <span>{copy.contractPeriod}</span>
                    <span>{copy.contractPdf}</span>
                    <span>{copy.updatedAt}</span>
                  </div>
                  {assignedCandidates.map((candidate) => {
                    const currentProject = candidate.projects[0];
                    const contractFile = assignmentContractFiles[candidate.id];
                    return (
                    <button
                      className="candidate-directory-row assignment-directory-row"
                      type="button"
                      role="row"
                      key={candidate.id}
                      onClick={() => openCandidatePage(candidate)}
                    >
                      <span><input type="checkbox" aria-label={`Select ${candidate.name}`} onClick={(event) => event.stopPropagation()} /></span>
                      <span className="directory-person">
                        <span className="candidate-avatar small">
                          {candidate.avatarDataUrl ? <img src={candidate.avatarDataUrl} alt="" /> : initials(candidate.name)}
                        </span>
                        <strong>{candidate.name}</strong>
                      </span>
                      <span>{candidate.currentAssignment || copy.noAssignment}</span>
                      <span>{currentProject?.customer ?? candidate.location}</span>
                      <span>
                        <i className="status-active">{copy.activeAssignment}</i>
                      </span>
                      <span>{currentProject ? projectPeriod(currentProject) : `${copy.available} ${candidate.availableFrom ?? ""}`}</span>
                      <span className="contract-cell" onClick={(event) => event.stopPropagation()}>
                        <em>{contractFile ?? copy.missingContract}</em>
                        <label>
                          {copy.uploadPdf}
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                setAssignmentContractFiles((current) => ({ ...current, [candidate.id]: file.name }));
                              }
                            }}
                          />
                        </label>
                      </span>
                      <span>{new Date(candidate.updatedAt).toLocaleDateString("sv-SE")}</span>
                    </button>
                    );
                  })}
                  {assignedCandidates.length === 0 && (
                    <div className="empty-state">{copy.noActiveAssignments}</div>
                  )}
                </div>
              </div>
            </section>
          </section>
        ) : activeView === "matchAssignment" ? (
          <section className="candidate-directory-page">
            <section className="candidate-directory-shell">
              <div className="candidate-directory-main">
                <div className="candidate-directory-topline">
                  <div>
                    <span>{copy.dashboard}</span>
                    <strong>{copy.matchAssignment}</strong>
                  </div>
                </div>
                <section className="main-grid workspace-canvas ai-only-canvas">
              <div className="ai-panel">
                <div className="panel-title">
                  <Sparkles size={20} />
                  <h2>AI-matcha annons</h2>
                </div>
                <div className="ai-action-strip">
                  <button type="button" onClick={() => document.querySelector<HTMLTextAreaElement>(".ai-panel textarea")?.focus()}>
                    Klistra annons
                  </button>
                  <button type="button" disabled={!jobAdvertisement || isBusy} onClick={runMatch}>
                    Skapa shortlist
                  </button>
                  <button type="button" disabled={!selected || !jobAdvertisement || isBusy} onClick={() => downloadTailoredPdf(selected, "sv")}>
                    Anpassa CV
                  </button>
                </div>
                <textarea
                  value={jobAdvertisement}
                  onChange={(event) => {
                    setJobAdvertisement(event.target.value);
                    setDuplicateCheck(null);
                  }}
                  placeholder="Klistra in en uppdragsannons eller länk här..."
                />
                {extractFirstUrl(jobAdvertisement) && (
                  <div className="link-detected">
                    Länk upptäckt. InsideGrid använder sökord och plats från länken direkt. Klistra även in annonstexten om du vill fånga exakt kundnamn och krav.
                  </div>
                )}
                <div className="application-capture">
                  <label>
                    Kund
                    <input value={applicationCustomer} onChange={(event) => setApplicationCustomer(event.target.value)} placeholder="T.ex. kundnamn eller bolag" />
                  </label>
                  <label>
                    Roll
                    <input value={applicationRole} onChange={(event) => setApplicationRole(event.target.value)} placeholder="Fylls efter matchning om möjligt" />
                  </label>
                </div>
                <div className="consultant-picker">
                  <div>
                    <strong>Konsulter i ansökan</strong>
                    <span>Välj en eller flera som ska sparas på ansökan.</span>
                  </div>
                  <div className="consultant-options">
                    {applicationCandidateOptions.map(({ candidate, score }) => (
                      <label className="consultant-option" key={candidate.id}>
                        <input
                          type="checkbox"
                          checked={applicationCandidateIds.includes(candidate.id)}
                          onChange={() => toggleApplicationCandidate(candidate.id)}
                        />
                        <span>
                          <strong>{candidate.name}</strong>
                          <small>{candidate.title} · {candidate.availability}{score !== undefined ? ` · ${score}/100` : ""}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="button-row">
                  <button className="primary" disabled={!jobAdvertisement || isBusy} onClick={runMatch}>
                    Matcha
                  </button>
                  <button disabled={!jobAdvertisement || isBusy} onClick={saveApplication}>
                    <Save size={16} />
                    Spara ansökan
                  </button>
                  <button disabled={!selected || !jobAdvertisement || isBusy} onClick={() => downloadTailoredPdf(selected, "sv")}>CV svenska PDF</button>
                  <button disabled={!selected || !jobAdvertisement || isBusy} onClick={() => downloadTailoredPdf(selected, "en")}>CV engelska PDF</button>
                </div>
                {selected && Object.keys(gapDecisions).some((key) => key.startsWith(`${selected.id}:`)) && (
                  <div className="review-context">
                    <strong>Granskningsval till nästa CV</strong>
                    <pre>{buildReviewContext(selected, gapDecisions)}</pre>
                  </div>
                )}

                {duplicateCheck && duplicateCheck.matches.length > 0 && (
                  <div className={`duplicate-alert ${duplicateCheck.isLikelyDuplicate ? "high" : ""}`}>
                    <AlertTriangle size={18} />
                    <div>
                      <strong>{duplicateCheck.isLikelyDuplicate ? "Troligen redan sökt" : "Liknar tidigare ansökan"}</strong>
                      {duplicateCheck.matches.map((item) => (
                        <p key={item.applicationId}>
                          {item.similarity}% · {item.customer} · {item.role} · {item.status}. {item.reason}
                          <button className="inline-link" type="button" onClick={() => openApplication(item.applicationId)}>
                            Visa ansökan
                          </button>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {match && (
                  <div className="match-results">
                    <p>{match.summary}</p>
                    <div className="analysis-grid">
                      <div>
                        <strong>Källa</strong>
                        <span>{match.analysis.sourceName || "Text"}</span>
                      </div>
                      <div>
                        <strong>Bolag</strong>
                        <span>{match.analysis.companyName || "Ej identifierat"}</span>
                      </div>
                      <div>
                        <strong>Rekryterande</strong>
                        <span>{match.analysis.recruitingCompany || match.analysis.companyName || "Ej identifierat"}</span>
                      </div>
                      <div>
                        <strong>Roll</strong>
                        <span>{match.analysis.role}</span>
                      </div>
                      <div>
                        <strong>Typ</strong>
                        <span>{match.analysis.assignmentType}</span>
                      </div>
                      <div>
                        <strong>Plats</strong>
                        <span>{match.analysis.location}{match.analysis.remotePossible ? " · remote möjligt" : ""}</span>
                      </div>
                      <div>
                        <strong>Senioritet</strong>
                        <span>{match.analysis.seniority}</span>
                      </div>
                    </div>
                    <div className="analysis-section">
                      <strong>Identifierade kompetenser</strong>
                      <div className="mini-tags">
                        {(match.analysis.technologies.length ? match.analysis.technologies : match.analysis.keywords.slice(0, 10)).map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    </div>
                    {(match.analysis.contactNames.length > 0 || match.analysis.contactEmails.length > 0) && (
                      <div className="analysis-section">
                        <strong>Kontaktinfo</strong>
                        <div className="mini-tags">
                          {[...match.analysis.contactNames, ...match.analysis.contactEmails].map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {match.candidates.map((candidate) => (
                      <div className={`match-card ${candidate.score < 50 ? "weak" : ""}`} key={candidate.candidateId}>
                        <div className="match-header">
                          <div>
                            <strong>{candidate.name}</strong>
                            <small>{candidate.title}</small>
                          </div>
                          <span>{candidate.score}/100 · {candidate.availability}</span>
                        </div>
                        <p>{candidate.reasoning}</p>
                        <div className="match-detail-grid">
                          <div>
                            <strong>Stark match</strong>
                            <ul>
                              {candidate.strongSignals.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                          </div>
                          <div>
                            <strong>Risk</strong>
                            <ul>
                              {candidate.risks.map((item) => {
                                const isMissingRisk = item.toLowerCase().startsWith("saknar explicit");
                                return (
                                  <li key={item}>
                                    {isMissingRisk
                                      ? (
                                        <GapReview
                                          candidateId={candidate.candidateId}
                                          text={item}
                                          decision={gapDecisions[`${candidate.candidateId}:${extractGapKeyword(item)}`]}
                                          references={findProfileReferences(candidate.candidateId, item)}
                                          onDecision={setGapDecision}
                                          onOpenKnowledge={openKnowledgeDraft}
                                        />
                                      )
                                      : item}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                          <div>
                            <strong>CV-gap</strong>
                            <ul>
                              {candidate.cvGaps.length
                                ? candidate.cvGaps.map((item) => (
                                  <li key={item}>
                                    <GapReview
                                      candidateId={candidate.candidateId}
                                      text={item}
                                      decision={gapDecisions[`${candidate.candidateId}:${extractGapKeyword(item)}`]}
                                      references={findProfileReferences(candidate.candidateId, item)}
                                      onDecision={setGapDecision}
                                      onOpenKnowledge={openKnowledgeDraft}
                                    />
                                  </li>
                                ))
                                : <li>Inga tydliga CV-gap hittades.</li>}
                            </ul>
                          </div>
                          <div>
                            <strong>{candidate.suggestedCvVersion}</strong>
                            <ul>
                              {candidate.recommendedActions.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {generatedCv && (
                  <pre className="cv-preview">{generatedCv}</pre>
                )}
              </div>
                </section>
              </div>
            </section>
          </section>
        ) : activeView === "applications" ? (
          <section className="candidate-directory-page">
            <section className="candidate-directory-shell">
              <div className="candidate-directory-main">
                <div className="candidate-directory-topline">
                  <div>
                    <span>{copy.dashboard}</span>
                    <strong>{copy.applications}</strong>
                  </div>
                  <div className="candidate-directory-actions">
                    <button type="button">{copy.defaultView}</button>
                    <button type="button">{copy.viewSettings}</button>
                    <button type="button">{copy.importExport}</button>
                  </div>
                </div>

                <div className="candidate-directory-filters">
                  <label>
                    <Search size={15} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={copy.searchApplicationsPlaceholder}
                    />
                  </label>
                  <select value={applicationConsultantFilter} onChange={(event) => setApplicationConsultantFilter(event.target.value)}>
                    <option value="">{copy.allConsultants}</option>
                    {applicationConsultants.map((name) => <option value={name} key={name}>{name}</option>)}
                  </select>
                  <select value={applicationStatusFilter} onChange={(event) => setApplicationStatusFilter(event.target.value)}>
                    <option value="">{copy.allStatuses}</option>
                    {applicationStatuses.map((status) => <option value={status} key={status}>{status}</option>)}
                  </select>
                  <select value={applicationDateFilter} onChange={(event) => setApplicationDateFilter(event.target.value)}>
                    <option value="all">{copy.allDates}</option>
                    <option value="7">{copy.last7Days}</option>
                    <option value="30">{copy.last30Days}</option>
                    <option value="90">{copy.last90Days}</option>
                  </select>
                  <button type="button" onClick={() => {
                    setApplicationStatusFilter("");
                    setApplicationConsultantFilter("");
                    setApplicationDateFilter("all");
                  }}>
                    {copy.clearFilters}
                  </button>
                  <button type="button">{copy.sortedByLastActivity}</button>
                  <button type="button">{copy.filters}</button>
                </div>

                <div className="candidate-directory-table" role="table" aria-label={copy.applications}>
                  <div className="candidate-directory-row application-directory-row head" role="row">
                    <span><input type="checkbox" aria-label="Select all applications" /></span>
                    <span>{copy.customer}</span>
                    <span>{copy.role}</span>
                    <span>{copy.consultantsColumn}</span>
                    <span>{copy.status}</span>
                    <span>{copy.feedback}</span>
                    <span>{copy.appliedAt}</span>
                    <span>{copy.updatedAt}</span>
                  </div>
                  {filteredApplications.map((application) => (
                    <button
                      className={`candidate-directory-row application-directory-row ${highlightedApplicationId === application.id ? "selected" : ""}`}
                      type="button"
                      role="row"
                      id={`application-${application.id}`}
                      key={application.id}
                      onClick={() => setOpenedApplication(application)}
                    >
                      <span><input type="checkbox" aria-label={`Select ${application.customer}`} onClick={(event) => event.stopPropagation()} /></span>
                      <span><strong>{application.customer}</strong></span>
                      <span>{application.role}</span>
                      <span className="directory-skills">
                        {application.candidateNames.slice(0, 2).map((name) => <b key={name}>{name}</b>)}
                        {application.candidateNames.length > 2 && <small>+{application.candidateNames.length - 2}</small>}
                      </span>
                      <span><i className={application.status === "Vunnen" ? "status-free" : "status-busy"}>{application.status}</i></span>
                      <span>{application.feedback || "-"}</span>
                      <span>{new Date(application.appliedAt).toLocaleDateString("sv-SE")}</span>
                      <span>{new Date(application.updatedAt).toLocaleDateString("sv-SE")}</span>
                    </button>
                  ))}
                  {filteredApplications.length === 0 && (
                    <div className="empty-state">{copy.noApplicationsMatch}</div>
                  )}
                </div>
              </div>
            </section>
            {openedApplication && (
              <div className="modal-backdrop" role="presentation">
                <section className="knowledge-modal application-modal" role="dialog" aria-modal="true" aria-labelledby="application-title">
                  <div className="modal-header">
                    <div>
                      <strong id="application-title">{openedApplication.customer}</strong>
                      <p>{openedApplication.role} · {openedApplication.status}</p>
                    </div>
                    <button type="button" onClick={() => setOpenedApplication(null)}>Stäng</button>
                  </div>
                  {openedApplication.candidateNames.length > 0 && (
                    <div className="application-consultants">
                      {openedApplication.candidateNames.map((name) => <em key={name}>{name}</em>)}
                    </div>
                  )}
                  <pre className="application-ad-full">{openedApplication.advertisement}</pre>
                </section>
              </div>
            )}
          </section>
        ) : activeView === "settings" ? (
          <section className="candidate-directory-page">
            <section className="candidate-directory-shell">
              <div className="candidate-directory-main">
                <div className="candidate-directory-topline">
                  <div>
                    <span>{copy.dashboard}</span>
                    <strong>{copy.settings}</strong>
                  </div>
                </div>
                <section className="simple-workspace">
                  <div>
                    <span>{copy.settings}</span>
                    <h2>Behörigheter, roller och produktinställningar.</h2>
                    <p>Här flyttar vi senare adminflöden: roller, AI-rättigheter, exportlogg, språk och säkerhet.</p>
                  </div>
                  <div className="settings-list">
                    <article>
                      <strong>Roller</strong>
                      <p>Manager, Admin och konsultbehörigheter.</p>
                    </article>
                    <article>
                      <strong>AI-kontroll</strong>
                      <p>Styr vem som får analysera annonser och generera CV.</p>
                    </article>
                    <article>
                      <strong>Audit log</strong>
                      <p>Spåra exporter, CV-generering och ansökningshistorik.</p>
                    </article>
                  </div>
                </section>
              </div>
            </section>
          </section>
        ) : profileCandidate ? (
          <section className="profile-page">
            <div className="profile-record-card">
              <div className="profile-record-hero">
                <div className="employee-identity">
                  {profileCandidate.avatarDataUrl
                    ? <img className="employee-avatar image" src={profileCandidate.avatarDataUrl} alt="" />
                    : <span className="employee-avatar">{initials(profileCandidate.name)}</span>}
                  <div>
                    <strong>{profileCandidate.name}</strong>
                    <p>{profileCandidate.title} · {profileCandidate.location}</p>
                  </div>
                </div>
                <div className="record-actions">
                  <button type="button" onClick={() => setActiveView("dashboard")}>Till dashboard</button>
                  <button type="button" onClick={() => {
                    setEditingCandidate(profileCandidate);
                    setCvImportText("");
                  }}>
                    Redigera
                  </button>
                </div>
              </div>

              <div className="record-tabs" aria-label="Profilsektioner">
                <span>Översikt</span>
                <span>Projekt</span>
                <span>Ansökningar</span>
                <span>CV-anpassning</span>
                <span>Referenser</span>
              </div>

              <div className="record-details">
                <div>
                  <span>E-post</span>
                  <strong>{profileCandidate.email}</strong>
                </div>
                <div>
                  <span>Telefon</span>
                  <strong>{profileCandidate.phone}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{profileCandidate.availability}</strong>
                </div>
                <div>
                  <span>Tillgänglig från</span>
                  <strong>{profileCandidate.availableFrom ?? "Ej angivet"}</strong>
                </div>
                <div>
                  <span>Erfarenhet</span>
                  <strong>{profileCandidate.experienceYears} år</strong>
                </div>
                <div>
                  <span>Senast uppdaterad</span>
                  <strong>{new Date(profileCandidate.updatedAt).toLocaleDateString("sv-SE")}</strong>
                </div>
              </div>
            </div>

            <div className="profile-page-grid">
              <div className="profile-page-main">
                <section className="record-section">
                  <div className="section-heading">
                    <h2>Profil och kompetens</h2>
                    <button type="button" onClick={() => {
                      setEditingCandidate(profileCandidate);
                      setCvImportText("");
                    }}>
                      Redigera profil
                    </button>
                  </div>
                  <p>{profileCandidate.summary}</p>
                  <div className="skill-evidence-grid">
                    {profileCandidate.skills.map((skill) => {
                      const detail = getSkillDetail(skill, profileCandidate);
                      const evidence = skillEvidence(skill, profileCandidate);
                      return (
                        <article key={skill}>
                          <div>
                            <strong>{skill}</strong>
                            <em>{detail.level}</em>
                          </div>
                          <span>{evidence.projectCount} projekt · senast {evidence.lastUsed}</span>
                          {detail.comment && <p>{detail.comment}</p>}
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className="record-section">
                  <div className="section-heading">
                    <h2>Projektöversikt</h2>
                    <small>{profileCandidate.projects.length} verifierade projekt</small>
                  </div>
                  <div className="project-table">
                    <div className="project-table-head">
                      <span>Uppdragsgivare</span>
                      <span>Roll</span>
                      <span>Period</span>
                      <span>Teknik</span>
                    </div>
                    {profileCandidate.projects.map((project) => (
                      <article key={`${project.customer}-${project.role}-${project.startDate}`}>
                        <strong>{project.customer}</strong>
                        <span>{project.role}</span>
                        <span>{projectPeriod(project)}</span>
                        <div className="mini-tags">
                          {project.technologies.slice(0, 5).map((technology) => <span key={technology}>{technology}</span>)}
                        </div>
                        <p>{project.description}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="record-section">
                  <div className="section-heading">
                    <h2>Ansökningar för personen</h2>
                    <small>{profileApplications.length} sparade ansökningar</small>
                  </div>
                  <div className="profile-applications">
                    {profileApplications.map((application) => (
                      <article key={application.id}>
                        <div>
                          <strong>{application.customer}</strong>
                          <span>{application.role}</span>
                        </div>
                        <em>{application.status}</em>
                        <small>{new Date(application.appliedAt).toLocaleDateString("sv-SE")}</small>
                        <button type="button" onClick={() => setOpenedApplication(application)}>Visa annons</button>
                      </article>
                    ))}
                    {profileApplications.length === 0 && <p>Inga ansökningar är kopplade till personen ännu.</p>}
                  </div>
                </section>
              </div>

              <aside className="profile-copilot">
                <div className="copilot-card">
                  <Sparkles size={20} />
                  <strong>InsideGrid AI</strong>
                  <p>Klistra in en annons på dashboarden och skapa CV som bara använder verifierad profil, projekt och kompetenser.</p>
                </div>
                <button className="primary" type="button" onClick={() => downloadPdf(profileCandidate)}>
                  Hämta standard-CV
                </button>
                <button type="button" disabled={!jobAdvertisement || isBusy} onClick={() => downloadTailoredPdf(profileCandidate, "sv")}>
                  Skapa anpassat CV
                </button>
                <button type="button" onClick={() => {
                  setSelectedId(profileCandidate.id);
                  setActiveView("matchAssignment");
                  window.setTimeout(() => document.querySelector<HTMLTextAreaElement>(".ai-panel textarea")?.focus(), 80);
                }}>
                  Gå till annonsmatchning
                </button>
                <div className="reference-card">
                  <strong>Referenser i profilen</strong>
                  <p>{profileCandidate.notes || "Inga interna noteringar ännu."}</p>
                </div>
              </aside>
            </div>
            {openedApplication && (
              <div className="modal-backdrop" role="presentation">
                <section className="knowledge-modal application-modal" role="dialog" aria-modal="true" aria-labelledby="profile-application-title">
                  <div className="modal-header">
                    <div>
                      <strong id="profile-application-title">{openedApplication.customer}</strong>
                      <p>{openedApplication.role} · {openedApplication.status}</p>
                    </div>
                    <button type="button" onClick={() => setOpenedApplication(null)}>Stäng</button>
                  </div>
                  {openedApplication.candidateNames.length > 0 && (
                    <div className="application-consultants">
                      {openedApplication.candidateNames.map((name) => <em key={name}>{name}</em>)}
                    </div>
                  )}
                  <pre className="application-ad-full">{openedApplication.advertisement}</pre>
                </section>
              </div>
            )}
          </section>
        ) : (
          <section className="empty-state">Välj en konsult för att öppna profilsidan.</section>
        )}
      </section>
      <footer className="workspace-footer">
        <span>© 2026 InsideGrid</span>
        <div>
          <button type="button">Terms & Conditions</button>
          <button type="button">Privacy Policy</button>
        </div>
      </footer>
      <button
        className={`floating-assistant-button ${assistantOpen ? "active" : ""}`}
        type="button"
        aria-label="Öppna AI-assistent"
        onClick={() => setAssistantOpen((current) => !current)}
      >
        <Sparkles size={21} />
      </button>
      {assistantOpen && (
        <aside className="assistant-drawer" aria-label="AI Assistant">
          <div className="assistant-drawer-header">
            <div>
              <span>InsideGrid Copilot</span>
              <strong>AI Assistant</strong>
            </div>
            <button type="button" aria-label="Stäng AI-assistent" onClick={() => setAssistantOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="assistant-drawer-body">
            <p>Fråga om konsulter, uppdrag, CV-data och nästa steg. Assistenten använder kontexten från din nuvarande vy.</p>
            <label>
              Fråga
              <textarea
                value={assistantQuestion}
                onChange={(event) => setAssistantQuestion(event.target.value)}
                placeholder="T.ex. vilka konsulter är lediga och kan Microsoft Fabric?"
              />
            </label>
            <div className="assistant-prompts compact">
              {[
                "Vad behöver jag prioritera idag?",
                "Vilka uppdrag saknar kandidater?",
                "Vilka konsulter är tillgängliga?",
                "Skapa en shortlist med 3 kandidater"
              ].map((prompt) => (
                <button type="button" key={prompt} onClick={() => setAssistantQuestion(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}
      {knowledgeDraft && (
        <KnowledgeModal
          candidate={candidates.find((candidate) => candidate.id === knowledgeDraft.candidateId)!}
          draft={knowledgeDraft}
          onChange={setKnowledgeDraft}
          onClose={() => setKnowledgeDraft(null)}
          onSave={saveKnowledgeDraft}
          isBusy={isBusy}
        />
      )}
      {openedCandidate && (
        <div className="modal-backdrop" role="presentation">
          <section className="employee-modal" role="dialog" aria-modal="true" aria-labelledby="employee-title">
            <div className="employee-hero">
              <div className="employee-identity">
                {openedCandidate.avatarDataUrl
                  ? <img className="employee-avatar image" src={openedCandidate.avatarDataUrl} alt="" />
                  : <span className="employee-avatar">{initials(openedCandidate.name)}</span>}
                <div>
                  <strong id="employee-title">{openedCandidate.name}</strong>
                  <p>{openedCandidate.title}</p>
                </div>
              </div>
              <div className="employee-hero-actions">
                <button type="button" onClick={() => {
                  setEditingCandidate(openedCandidate);
                  setCvImportText("");
                }}>
                  Redigera
                </button>
                <button type="button" onClick={() => openCandidatePage(openedCandidate)}>
                  Öppna profilsida
                </button>
                <button type="button" onClick={() => setOpenedCandidate(null)}>Stäng</button>
              </div>
            </div>

            <div className="employee-stats">
              <div>
                <span>Status</span>
                <strong>{openedCandidate.availability}</strong>
              </div>
              <div>
                <span>Erfarenhet</span>
                <strong>{openedCandidate.experienceYears} år</strong>
              </div>
              <div>
                <span>Projekt</span>
                <strong>{openedCandidate.projects.length}</strong>
              </div>
              <div>
                <span>Språk</span>
                <strong>{openedCandidate.languages.join(", ")}</strong>
              </div>
            </div>

            <div className="employee-layout">
              <aside className="employee-side">
                <div className="employee-contact">
                  <span><Mail size={15} />{openedCandidate.email}</span>
                  <span><Phone size={15} />{openedCandidate.phone}</span>
                  <span><MapPin size={15} />{openedCandidate.location}</span>
                  <span><CalendarDays size={15} />Tillgänglig från {openedCandidate.availableFrom ?? "ej angivet"}</span>
                </div>
                <div className="employee-actions">
                  <button className="primary" type="button" onClick={() => downloadPdf(openedCandidate)}>
                    <FilePenLine size={16} />
                    Hämta standard-CV
                  </button>
                  <button type="button" disabled={!jobAdvertisement || isBusy} onClick={() => downloadTailoredPdf(openedCandidate, "sv")}>
                    <Sparkles size={16} />
                    Skapa anpassat CV
                  </button>
                  <button type="button" onClick={() => {
                    setSelectedId(openedCandidate.id);
                    setOpenedCandidate(null);
                    document.querySelector<HTMLTextAreaElement>(".ai-panel textarea")?.focus();
                  }}>
                    <Sparkles size={16} />
                    Matcha mot annons
                  </button>
                </div>
              </aside>

              <div className="employee-main">
                <section>
                  <h3>Profil</h3>
                  <p>{openedCandidate.summary}</p>
                </section>
                <section>
                  <h3>Kompetenser</h3>
                  <div className="skill-evidence-grid compact">
                    {openedCandidate.skills.map((skill) => {
                      const detail = getSkillDetail(skill, openedCandidate);
                      const evidence = skillEvidence(skill, openedCandidate);
                      return (
                        <article key={skill}>
                          <div>
                            <strong>{skill}</strong>
                            <em>{detail.level}</em>
                          </div>
                          <span>{evidence.projectCount} projekt · senast {evidence.lastUsed}</span>
                        </article>
                      );
                    })}
                  </div>
                </section>
                <section>
                  <h3>Projekt</h3>
                  <div className="employee-projects">
                    {openedCandidate.projects.map((project) => (
                      <article key={`${project.customer}-${project.role}-${project.startDate}`}>
                        <div>
                          <strong>{project.customer}</strong>
                          <span><BriefcaseBusiness size={14} />{project.role}</span>
                        </div>
                        <div className="project-meta">
                          <span>Uppdragsgivare/bolag: {project.customer}</span>
                          <span>Period: {projectPeriod(project)}</span>
                        </div>
                        <p>{project.description}</p>
                        <strong className="tech-heading">Teknik i projektet</strong>
                        <div className="mini-tags">
                          {project.technologies.map((technology) => <span key={technology}>{technology}</span>)}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      )}
      {editingCandidate && (
        <div className="modal-backdrop" role="presentation">
          <section className="edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title">
            <div className="modal-header">
              <div>
                <strong id="edit-title">Redigera profil</strong>
                <p>{editingCandidate.name} · ändringar sparas i kandidatdatat</p>
              </div>
              <button type="button" onClick={() => setEditingCandidate(null)}>Stäng</button>
            </div>

            <div className="edit-grid">
              <label>
                Namn
                <input value={editingCandidate.name} onChange={(event) => setEditingCandidate({ ...editingCandidate, name: event.target.value })} />
              </label>
              <label>
                Titel
                <input value={editingCandidate.title} onChange={(event) => setEditingCandidate({ ...editingCandidate, title: event.target.value })} />
              </label>
              <label>
                E-post
                <input value={editingCandidate.email} onChange={(event) => setEditingCandidate({ ...editingCandidate, email: event.target.value })} />
              </label>
              <label>
                Telefon
                <input value={editingCandidate.phone} onChange={(event) => setEditingCandidate({ ...editingCandidate, phone: event.target.value })} />
              </label>
              <label>
                Plats
                <input value={editingCandidate.location} onChange={(event) => setEditingCandidate({ ...editingCandidate, location: event.target.value })} />
              </label>
              <label>
                Tillgänglighet
                <select value={editingCandidate.availability} onChange={(event) => setEditingCandidate({ ...editingCandidate, availability: event.target.value })}>
                  <option>Tillgänglig</option>
                  <option>Upptagen</option>
                </select>
              </label>
              <label>
                Tillgänglig från
                <input type="date" value={editingCandidate.availableFrom ?? ""} onChange={(event) => setEditingCandidate({ ...editingCandidate, availableFrom: event.target.value })} />
              </label>
              <label>
                Erfarenhet år
                <input type="number" min="0" value={editingCandidate.experienceYears} onChange={(event) => setEditingCandidate({ ...editingCandidate, experienceYears: Number(event.target.value) })} />
              </label>
            </div>

            <div className="edit-upload-row">
              <label>
                Profilbild
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) readProfileImage(file, editingCandidate);
                }} />
              </label>
              <label>
                Ladda upp CV-text
                <input type="file" accept=".txt,.md,.csv,.pdf,.docx" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) importCvFile(file);
                }} />
              </label>
            </div>

            {cvImportText && (
              <div className="cv-import-box">
                <strong>CV-import</strong>
                <p>Texten används som underlag för att föreslå profiltext och kompetenser. Granska innan du sparar.</p>
                <textarea value={cvImportText} onChange={(event) => setCvImportText(event.target.value)} />
                <button type="button" onClick={applyCvImport}>Fyll profil från CV-text</button>
              </div>
            )}

            <label>
              Profiltext
              <textarea value={editingCandidate.summary} onChange={(event) => setEditingCandidate({ ...editingCandidate, summary: event.target.value })} />
            </label>
            <div className="edit-skills">
              <div className="section-heading">
                <strong>Kompetenser</strong>
                <button type="button" onClick={addEditingSkill}>Lägg till kompetens</button>
              </div>
              {editingCandidate.skills.map((skill, index) => {
                const detail = getSkillDetail(skill, editingCandidate);
                const evidence = skillEvidence(skill, editingCandidate);
                return (
                  <article key={`${skill}-${index}`}>
                    <label>
                      Kompetens
                      <input value={skill} onChange={(event) => updateEditingSkill(index, event.target.value)} />
                    </label>
                    <label>
                      Nivå
                      <select value={detail.level} onChange={(event) => updateEditingSkillDetail(skill, { level: event.target.value as SkillDetail["level"] })}>
                        <option>Grund</option>
                        <option>Van</option>
                        <option>Stark</option>
                        <option>Expert</option>
                      </select>
                    </label>
                    <label>
                      Kommentar
                      <input
                        value={detail.comment}
                        onChange={(event) => updateEditingSkillDetail(skill, { comment: event.target.value })}
                        placeholder={`T.ex. använd i ${evidence.projectCount} projekt`}
                      />
                    </label>
                    <span>{evidence.projectCount} projekt · senast {evidence.lastUsed}</span>
                    <button type="button" onClick={() => removeEditingSkill(index)}>Ta bort</button>
                  </article>
                );
              })}
            </div>

            <div className="edit-projects">
              <strong>Projekt</strong>
              {editingCandidate.projects.map((project, index) => (
                <article key={`${project.customer}-${project.role}-${index}`}>
                  <div className="edit-grid">
                    <label>
                      Uppdragsgivare/bolag
                      <input value={project.customer} onChange={(event) => updateEditingProject(index, { customer: event.target.value })} />
                    </label>
                    <label>
                      Roll
                      <input value={project.role} onChange={(event) => updateEditingProject(index, { role: event.target.value })} />
                    </label>
                    <label>
                      Start
                      <input type="date" value={project.startDate ?? ""} onChange={(event) => updateEditingProject(index, { startDate: event.target.value })} />
                    </label>
                    <label>
                      Slut
                      <input type="date" value={project.endDate ?? ""} onChange={(event) => updateEditingProject(index, { endDate: event.target.value || undefined })} />
                    </label>
                  </div>
                  <label>
                    Beskrivning
                    <textarea value={project.description} onChange={(event) => updateEditingProject(index, { description: event.target.value })} />
                  </label>
                  <label>
                    Teknik i projektet
                    <input
                      value={project.technologies.join(", ")}
                      onChange={(event) => updateEditingProject(index, {
                        technologies: event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                      })}
                    />
                  </label>
                </article>
              ))}
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setEditingCandidate(null)}>Avbryt</button>
              <button className="primary" type="button" disabled={isBusy} onClick={async () => {
                setIsBusy(true);
                try {
                  await saveCandidateProfile(editingCandidate);
                  setEditingCandidate(null);
                } finally {
                  setIsBusy(false);
                }
              }}>
                Spara ändringar
              </button>
            </div>
          </section>
        </div>
      )}
      {profileOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
            <div className="modal-header">
              <div className="profile-heading">
                <span>{initials(session.user.displayName)}</span>
                <div>
                  <strong id="profile-title">Mina sidor</strong>
                  <p>{session.user.displayName} · {session.user.role}</p>
                </div>
              </div>
              <button type="button" onClick={() => setProfileOpen(false)}>Stäng</button>
            </div>
            <div className="profile-grid">
              <label>
                Namn
                <input value={session.user.displayName} readOnly />
              </label>
              <label>
                E-post
                <input value={session.user.email} readOnly />
              </label>
              <label>
                Roll
                <input value={session.user.role} readOnly />
              </label>
              <label>
                Standardspråk för CV
                <select defaultValue="sv">
                  <option value="sv">Svenska</option>
                  <option value="en">Engelska</option>
                </select>
              </label>
            </div>
            <div className="profile-note">
              Här kan vi senare koppla riktiga användarinställningar, profilbild, notifieringar och egna CV-preferenser.
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
