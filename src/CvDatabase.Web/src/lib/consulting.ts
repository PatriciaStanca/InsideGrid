import type { Candidate } from '../types';
export type CriterionReview = { requirement: string; evidence: string; status: 'supported' | 'unknown' };
export function compareConsultant(candidate: Candidate, requirements: string[]): CriterionReview[] {
  return requirements.map(requirement => {
    const skill = candidate.skills.find(item => item.trim().toLocaleLowerCase() === requirement.trim().toLocaleLowerCase());
    return { requirement, status: skill ? 'supported' : 'unknown', evidence: skill ? `Profile skill: ${skill}` : 'No exact profile skill found. Review the CV before deciding.' };
  });
}
export function parseRequirements(text: string): string[] {
  return [...new Set(text.split('\n').map(value => value.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean))].slice(0, 40);
}
export function profileDraft(candidate: Candidate, language: 'en' | 'sv'): string {
  const sv = language === 'sv';
  return [candidate.full_name, candidate.professional_title, candidate.location,
    `\n${sv ? 'Profil' : 'Profile'}\n${candidate.summary}`,
    `\n${sv ? 'Kompetenser' : 'Skills'}\n${candidate.skills.join(', ')}`,
    `\n${sv ? 'Erfarenhet' : 'Experience'}`,
    ...(candidate.experience ?? []).map(item => `${item.role} · ${item.company} · ${item.period}\n${item.summary}`),
    `\n${sv ? 'Utbildning' : 'Education'}`,
    ...(candidate.education ?? []).map(item => `${item.qualification} · ${item.school} · ${item.period}`),
  ].join('\n');
}
