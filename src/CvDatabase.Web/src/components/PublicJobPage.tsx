import { useEffect, useRef, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { ApplicationConfirmation, DemoNotice } from "./ApplicationConfirmation";
import { supabase, supabaseProjectUrl } from "../lib/supabase";
import { extractPdfPages } from "../lib/pdf";

type PublicJob = { id: string; title: string; organization_name: string; department: string; location: string; employment_type: string; description: string };


export function PublicJobPage({ slug }: { slug: string }) {
  const [job, setJob] = useState<PublicJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const applicationDialog = useRef<HTMLDialogElement>(null);
  function openApplication() {
    if (reference) setConfirmationOpen(true);
    else applicationDialog.current?.showModal();
  }
  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase) throw new Error("Unable to connect. Please try again later.");
      const result = await supabase.rpc("get_public_job", { slug });
      if (result.error) throw new Error("Unable to load the job. Please try again later.");
      if (active) setJob(result.data?.[0] || null);
    })().catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const file = form.get("cv") as File;
      if (!file?.size || file.size > 10 * 1024 * 1024) throw new Error("Please choose a PDF no larger than 10 MB.");
      if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error("Please choose a PDF file.");
      let pages: { page: number; text: string }[] = [];
      try { pages = await extractPdfPages(file); } catch { /* Preserve scanned PDFs; the recruiter can review the original. */ }
      if (pages.length > 100 || JSON.stringify(pages).length > 500000) throw new Error("Please use a CV with fewer than 100 pages.");
      form.set("slug", slug);
      form.set("pages", JSON.stringify(pages));
      const response = await fetch(`${supabaseProjectUrl}/functions/v1/submit-application`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.received) throw new Error(result.error || "Your application could not be saved. Please try again.");
      setReference(result.reference);
      applicationDialog.current?.close();
      setConfirmationOpen(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to submit. Please try again."); }
    finally { setBusy(false); }
  }
  if (loading || !job) return <section className="public-role-state"><h1>{loading ? "Loading job…" : "Job unavailable"}</h1><p role={error ? "alert" : undefined}>{error || (!loading && "This job is no longer accepting applications.")}</p></section>;
  const companyName = job.organization_name === "QA Test Customer A" ? "Northstar Data Studio (demo company)" : job.organization_name;
  const descriptionSections = job.description.split(/\n\s*\n/).filter(paragraph => paragraph.trim() && !(slug === "qa-data-engineer" && /^(How to apply|Important:)/.test(paragraph)));
  return <div className="public-job-page">
    <div className="public-demo-wrap"><DemoNotice /></div>
    {confirmationOpen && <ApplicationConfirmation onClose={() => setConfirmationOpen(false)} />}
    <section className="job-intro"><button onClick={openApplication} className="primary-button">{reference ? "View confirmation" : "Try a sample application"} <ArrowRight size={16} /></button><p className="marketing-kicker">{companyName} · {job.department}</p><h1>{job.title}</h1><div className="job-meta"><span>{job.location}</span><span>{job.employment_type}</span></div></section>
    <div className="job-layout">
      <article className="job-description"><h2>About the role</h2>{descriptionSections.map((paragraph, index) => {
        const lines = paragraph.split("\n").filter(Boolean);
        if (lines.length === 1) return <p key={index}>{paragraph}</p>;
        return <section key={index}><h2>{lines[0]}</h2>{lines.slice(1).some(line => line.startsWith("•")) ? <ul>{lines.slice(1).map((line, i) => <li key={i}>{line.replace(/^•\s*/, "")}</li>)}</ul> : <p>{lines.slice(1).join(" ")}</p>}</section>;
      })}<h2>Your application</h2><p>Try the application process with a sample CV and test details. Your submission is saved in the demo workspace so you can see how applications are received.</p></article>
      {reference ? <section className="application-received" role="status"><h2>Application received</h2><p>Thank you! Your test application and CV have been saved.</p><small>Reference: {reference}</small><button className="secondary-button" onClick={() => setConfirmationOpen(true)}>View confirmation</button></section> : <aside className="public-apply-card"><p className="marketing-kicker">Ready to try it?</p><h2>Try a sample application</h2><p>Have a sample PDF CV ready. Add your contact details and, if you like, a short introduction.</p><button className="primary-button" onClick={openApplication}>Open application form <ArrowRight size={16} /></button></aside>}
    </div>
    <dialog ref={applicationDialog} className="public-application-dialog" aria-labelledby="public-apply-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <button className="confirmation-close" aria-label="Close application" disabled={busy} onClick={() => applicationDialog.current?.close()}><X size={20} /></button>
      <form id="apply" className="application-form" onSubmit={submit}>
        <p className="marketing-kicker">{job.title}</p><h2 id="public-apply-title">Sample application</h2><p>Fields marked with * are required.</p>
        <DemoNotice />
        <fieldset disabled={busy} className="public-form-fields">
          <div className="form-grid"><label>First name *<input name="first_name" autoComplete="given-name" maxLength={90} required /></label><label>Last name *<input name="last_name" autoComplete="family-name" maxLength={90} required /></label></div>
          <label>Email address *<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <label>Phone<input name="phone" type="tel" autoComplete="tel" maxLength={60} /></label>
          <label>CV *<input name="cv" className="file-input" type="file" accept=".pdf,application/pdf" required /><small>PDF · maximum 10 MB</small></label>
          <label>LinkedIn profile<input name="linkedin_url" type="url" maxLength={1500} placeholder="https://linkedin.com/in/..." /></label>
          <label>Portfolio or website<input name="website" type="url" maxLength={1500} placeholder="https://" /></label>
          <label>Short introduction (optional)<textarea name="motivation" rows={5} maxLength={10000} /></label>
          <label className="application-trap" aria-hidden="true">Leave this field empty<input name="company_website" tabIndex={-1} autoComplete="off" /></label>
          <details className="application-privacy"><summary>How your application is used</summary><p>Your contact details, profile links, message and CV are stored for this demo and made available to {companyName} and InsideGrid administrators. Your CV is not public. To request correction or deletion of this test application, contact <a href="https://patriciastanca.com" target="_blank" rel="noreferrer">Patricia Stanca</a> and include your application reference.</p></details>
          <label className="consent-field"><input name="consent" type="checkbox" required /><span>I have read the privacy information and agree to my application being stored for this demo. *</span></label>
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button wide" type="submit" disabled={busy}>{busy ? "Sending application…" : "Submit test application"}<ArrowRight size={16} /></button>
      </form>
    </dialog>
  </div>;
}
