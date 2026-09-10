import type { Application, Candidate } from "../types";

export function candidateApplicationContext(candidateId: string, applications: Application[], jobId = "all") {
  const relevant = applications.filter(item => item.candidate_id === candidateId);
  const active = relevant.filter(item => !["rejected", "hired"].includes(item.stage));
  // Never choose an arbitrary role when several applications are active.
  const application = jobId !== "all"
    ? relevant.find(item => item.job_id === jobId)
    : active.length === 1 ? active[0] : undefined;
  return { application, activeCount: active.length };
}

export function filterCandidateDirectory(candidates: Candidate[], applications: Application[], filters: {
  search: string; jobId: string; location: string; skills: string[];
}) {
  const query = filters.search.trim().toLocaleLowerCase();
  return candidates.filter(candidate => {
    const text = [candidate.full_name, candidate.professional_title, candidate.email, candidate.location, ...candidate.skills].join(" ").toLocaleLowerCase();
    return (!query || text.includes(query)) &&
      (filters.jobId === "all" || applications.some(item => item.candidate_id === candidate.id && item.job_id === filters.jobId)) &&
      (filters.location === "all" || candidate.location === filters.location) &&
      filters.skills.every(skill => candidate.skills.includes(skill));
  });
}
