import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { PublicJobPage } from "./PublicJobPage";
type Listing = { id: string; public_slug: string; organization_name: string; title: string; department: string; location: string; employment_type: string };
export function PublicJobs() {
  const [selected, setSelected] = useState<string | null>(() => new URLSearchParams(window.location.search).get("job"));
  const [jobs, setJobs] = useState<Listing[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!supabase) { setError("Unable to connect to the job list."); setLoading(false); return; }
      const result = await supabase.rpc("list_public_jobs");
      if (!active) return;
      setError(result.error ? "Unable to load jobs. Please try again." : "");
      setJobs(result.error ? [] : result.data || []); setLoading(false);
    }
    void refresh(); window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, [selected]);
  if (selected) return <><div className="public-job-navigation"><button className="text-link" onClick={() => { setSelected(null); window.scrollTo(0, 0); }}>← All jobs</button></div><PublicJobPage key={selected} slug={selected} /></>;
  const filtered = jobs.filter(job => `${job.title} ${job.organization_name} ${job.department} ${job.location}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="public-job-catalog"><p className="marketing-kicker">Explore opportunities</p><h1>Open jobs</h1><p>Browse published demo jobs and try the application process using test details.</p>
    <label>Search jobs<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Job title, company or location" /></label>
    {loading ? <p role="status">Loading jobs…</p> : error ? <p role="alert">{error}</p> : <><p role="status">{filtered.length} {filtered.length === 1 ? "job" : "jobs"}</p><div className="public-job-list">{filtered.map(job => {
      const category = `${job.title} ${job.department}`.toLowerCase();
      const photo = /engineer|developer|data|technology/.test(category) ? "technology" : /design|product|market|analyst/.test(category) ? "planning" : "team";
      return <article className="public-job-card" key={job.id}>
        <button className="public-job-card-link" onClick={() => { setSelected(job.public_slug); window.scrollTo(0, 0); }} aria-label={`View ${job.title} and apply`}>
          <div className="public-job-card-image"><img src={`/media/jobs/${photo}.jpg`} alt="" width="960" height="640" loading="lazy" /><span>{job.department || "Opportunity"}</span></div>
          <div className="public-job-card-copy"><p className="public-job-company">{job.organization_name === "QA Test Customer A" ? "Northstar Data Studio (demo company)" : job.organization_name}</p><h2>{job.title}</h2><p className="public-job-location">{job.location || "Location to be confirmed"}</p><p className="public-job-type">{job.employment_type}</p><span className="public-job-card-action">View job and apply <span aria-hidden="true">↗</span></span></div>
        </button>
      </article>;
    })}</div>{!filtered.length && <p>{jobs.length ? "No jobs match your search." : "No jobs are published yet. Please check back later."}</p>}</>}
  <p className="job-photo-credit">Illustrative workplace photography from <a href="https://www.pexels.com/" target="_blank" rel="noreferrer">Pexels</a>.</p></section>;
}
