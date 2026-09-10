import { useMemo, useState } from 'react';
import { ArrowRight, Check, Download, FileText, LoaderCircle, Plus, Search } from 'lucide-react';
import type { Application, Candidate, Job } from '../types';
import { createApplication } from '../lib/api';
import { supabase } from '../lib/supabase';
import { compareConsultant, parseRequirements, profileDraft } from '../lib/consulting';
import './consulting.css';

type Props = { organizationId: string; candidates: Candidate[]; jobs: Job[]; applications: Application[]; demo: boolean; onOpenProfile: (id: string) => void; onApplicationAdded: (application: Application) => void };
export function ConsultingTools({ organizationId, candidates, jobs, applications, demo, onOpenProfile, onApplicationAdded }: Props) {
  const assignments = jobs.filter(job => job.job_type === 'client_assignment');
  const [jobId, setJobId] = useState(assignments[0]?.id ?? '');
  const job = assignments.find(item => item.id === jobId);
  const [requirementsText, setRequirementsText] = useState((job?.required_skills ?? []).join('\n'));
  const [advertisement, setAdvertisement] = useState(job?.description ?? '');
  const [search, setSearch] = useState('');
  const [includeExternal, setIncludeExternal] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [language, setLanguage] = useState<'en' | 'sv'>('en');
  const [draft, setDraft] = useState('');
  const [draftSource, setDraftSource] = useState('');
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requirements = useMemo(() => parseRequirements(requirementsText), [requirementsText]);
  const selected = candidates.find(item => item.id === selectedId);
  const rows = candidates.filter(candidate => (includeExternal || candidate.candidate_type !== 'external') && `${candidate.full_name} ${candidate.professional_title} ${candidate.skills.join(' ')}`.toLowerCase().includes(search.toLowerCase())).map(candidate => ({candidate, checks: compareConsultant(candidate, requirements)})).sort((a, b) => b.checks.filter(check => check.status === 'supported').length - a.checks.filter(check => check.status === 'supported').length || a.candidate.full_name.localeCompare(b.candidate.full_name));
  const existing = selected && job ? applications.find(item => item.candidate_id === selected.id && item.job_id === job.id) : undefined;
  function clearDraft() { setDraft(''); setDraftSource(''); setReviews({}); setNotice(''); setError(''); }
  function chooseAssignment(id: string) { setJobId(id); const next = assignments.find(item => item.id === id); setRequirementsText((next?.required_skills ?? []).join('\n')); setAdvertisement(next?.description ?? ''); clearDraft(); }
  async function requestAi(action: 'requirements' | 'tailor') {
    setBusy(action); setError('');
    try {
      if (demo) throw new Error('Gemini is available in a connected workspace. Demo uses the profile comparison and editable source CV below; no AI request is made.');
      if (!supabase) throw new Error('Connect the workspace before using Gemini.');
      const {data, error: failure} = await supabase.functions.invoke('consulting-assistant', {body: {action, organizationId, candidateId: selectedId || undefined, advertisement, language, requirements}});
      if (failure || data?.error) throw new Error(data?.error || 'AI drafting is unavailable. Please try again or contact your workspace administrator.');
      if (action === 'requirements') { setRequirementsText(data.requirements.join('\n')); clearDraft(); }
      else { setDraft(data.draft); setDraftSource(`Gemini · ${data.model} · ${language.toUpperCase()} · review required`); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The request failed.'); }
    finally { setBusy(''); }
  }
  async function addToAssignment() {
    if (!selected || !job || existing) return;
    setBusy('save'); setError('');
    try {
      const now = new Date().toISOString();
      const input = {organization_id: organizationId, candidate_id: selected.id, job_id: job.id};
      const application: Application = demo ? {...input, id: crypto.randomUUID(), stage: 'new', position: 0, created_at: now, stage_changed_at: now} : await createApplication(input);
      onApplicationAdded(application); setNotice(`${selected.full_name} added to ${job.title}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the application.'); }
    finally { setBusy(''); }
  }
  function downloadText(text: string, filename: string, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], {type})); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function downloadPdf() {
    if (!selected || !draft) return;
    setBusy('pdf'); setError('');
    try {
      const { jsPDF } = await import('jspdf'); const pdf = new jsPDF(); pdf.setFont('helvetica'); pdf.setFontSize(11);
      let y = 22;
      for (const paragraph of draft.split('\n')) {
        for (const line of pdf.splitTextToSize(paragraph, 170)) { if (y > 277) { pdf.addPage(); y = 22; } pdf.text(line, 20, y); y += 5.5; }
        y += 2;
      }
      pdf.save(`${selected.full_name.replace(/[^a-zA-Z0-9åäöÅÄÖ-]/g, '-')}-CV-${language}.pdf`);
    } catch { setError('PDF export failed. Download the text draft instead.'); }
    finally { setBusy(''); }
  }
  return <section className="consulting-tools">
    <header className="directory-heading"><div><h1>Match & tailor CV</h1></div><span className="consulting-mode">Consulting</span></header>
    <div className="consulting-summary"><span><strong>{candidates.filter(item => item.candidate_type !== 'external').length}</strong> {candidates.filter(item => item.candidate_type !== 'external').length === 1 ? "consultant" : "consultants"}</span><span><strong>{assignments.filter(item => item.status === 'open').length}</strong> {assignments.filter(item => item.status === 'open').length === 1 ? "open assignment" : "open assignments"}</span><span><strong>{applications.filter(item => item.stage === 'hired').length}</strong> placed</span></div>
    {error && <p role="alert" className="consulting-alert">{error}</p>}{notice && <p role="status" className="consulting-notice">{notice}</p>}
    <div className="consulting-layout">
      <aside className="consulting-brief">
        <h2>Assignment brief</h2>
        <label>Assignment<select value={jobId} disabled={!!busy} onChange={event => chooseAssignment(event.target.value)}><option value="">New brief</option>{assignments.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label>Assignment text<textarea rows={7} maxLength={20000} value={advertisement} disabled={!!busy} onChange={event => {setAdvertisement(event.target.value); clearDraft();}} placeholder="Paste the client brief or job advertisement…" /></label>
        <button className="secondary-button" disabled={!!busy || !advertisement.trim()} onClick={() => requestAi('requirements')}>{busy === 'requirements' ? <LoaderCircle size={16}/> : <FileText size={16}/>}Extract requirements with AI</button>
        <label>Requirements · one per line<textarea rows={6} value={requirementsText} disabled={!!busy} onChange={event => {setRequirementsText(event.target.value); clearDraft();}} placeholder="C#&#10;.NET&#10;Azure" /></label>
        <p className="consulting-help">The comparison uses exact skills from saved profiles. Missing evidence needs review.</p>
        <label className="consulting-check"><input type="checkbox" checked={includeExternal} onChange={event => setIncludeExternal(event.target.checked)} />Include external candidates</label>
      </aside>
      <div className="consulting-results">
        <header><h2>Consultant shortlist <span>{rows.length}</span></h2><label className="consulting-search"><Search size={16}/><input aria-label="Search consultants for assignment" placeholder="Search consultants" value={search} onChange={event => setSearch(event.target.value)}/></label></header>
        <div className="consulting-shortlist">{rows.map(({candidate, checks}) => <button key={candidate.id} disabled={!!busy} className={selectedId === candidate.id ? 'is-selected' : ''} aria-pressed={selectedId === candidate.id} onClick={() => {setSelectedId(candidate.id); clearDraft();}}><span className="consulting-avatar">{candidate.full_name.split(' ').map(word => word[0]).slice(0,2).join('')}</span><span className="consulting-person"><strong>{candidate.full_name}</strong><small>{candidate.professional_title}</small><small>{candidate.available_from ? `Available from ${candidate.available_from}` : 'Availability not recorded'}</small></span><span className="consulting-fit">{requirements.length ? `${checks.filter(check => check.status === 'supported').length}/${requirements.length} skills` : 'Add requirements'}</span><ArrowRight size={16}/></button>)}</div>
        {!rows.length && <p className="consulting-help">No consultants match this search. Add a consultant or include external candidates.</p>}
        {selected ? <div className="consulting-review">
          <header><h2>{selected.full_name}</h2><button className="text-button" onClick={() => onOpenProfile(selected.id)}>Open profile & CV <ArrowRight size={15}/></button></header>
          {requirements.length > 0 && <div className="consulting-evidence">{compareConsultant(selected, requirements).map((check, index) => <div key={check.requirement}><span className={check.status === 'supported' ? 'is-supported' : 'is-unknown'}>{check.status === 'supported' ? <Check size={15}/> : '?'}</span><div><strong>{check.requirement}</strong><p>{check.evidence}</p>{check.status === 'unknown' && <label>Review note<input value={reviews[String(index)] ?? ''} onChange={event => setReviews(current => ({...current, [index]:event.target.value}))} placeholder="Record source evidence or a follow-up question" /></label>}</div></div>)}</div>}
          <div className="consulting-actions"><button className="primary-button" disabled={!!busy || !job || !!existing || job.status === 'closed'} onClick={addToAssignment}><Plus size={16}/>{existing ? 'Already added to assignment' : 'Add to assignment'}</button><button className="secondary-button" onClick={() => downloadText(compareConsultant(selected, requirements).map((check,index) => `${check.requirement}\n${check.evidence}\nReview: ${reviews[String(index)] || 'Not reviewed'}\n`).join('\n'), 'consultant-review.txt')}>Download review</button></div>
          {!job && <p className="consulting-help">Save the brief under Assignments before adding consultants to its application flow.</p>}
          <div className="consulting-cv"><header><h2>Tailored CV</h2><label>Language<select value={language} disabled={!!busy} onChange={event => {setLanguage(event.target.value as 'en'|'sv'); setDraft('');setDraftSource('');}}><option value="en">English</option><option value="sv">Svenska</option></select></label></header>
            <div className="consulting-actions"><button className="primary-button" disabled={!!busy || !advertisement.trim()} onClick={() => requestAi('tailor')}>{busy === 'tailor' ? <LoaderCircle size={16}/> : <FileText size={16}/>}Create draft with AI</button><button className="secondary-button" disabled={!!busy} onClick={() => {setDraft(profileDraft(selected, language));setDraftSource('Source profile copy · original wording retained');}}>Use profile as draft</button></div>
            {draft && <><p className="consulting-help">{draftSource}. Check every statement before sharing. Download to keep this draft before leaving the page.</p><label>Editable CV draft<textarea className="consulting-draft" rows={18} value={draft} onChange={event => setDraft(event.target.value)}/></label><div className="consulting-actions"><button className="secondary-button" disabled={!!busy} onClick={downloadPdf}><Download size={16}/>Download PDF</button><button className="secondary-button" onClick={() => downloadText(draft, `consultant-cv-${language}.txt`)}>Download text</button></div></>}
          </div>
        </div> : <div className="consulting-empty"><FileText size={28}/><h2>Select a consultant</h2><p>Review profile evidence and prepare a CV for the assignment.</p></div>}
      </div>
    </div>
  </section>;
}
