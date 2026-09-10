import { requirementCoverage } from '../lib/matchCoverage';
import type { RequirementResult } from './ProductUi';

export function MatchCoverage({ results }: { results: RequirementResult[] }) {
  const { total, supported, percent } = requirementCoverage(results);
  if (percent === null) return <p className="muted-copy">Add required criteria to see the comparison.</p>;
  return <div className="match-coverage">
    <div className="match-coverage-heading"><strong>{percent}%</strong><span>of required criteria supported</span></div>
    <meter min={0} max={total} value={supported} aria-label={`${supported} of ${total} required criteria supported`} />
    <p>{supported} of {total} required criteria have supporting evidence in the saved CV or profile. Partial and missing evidence are excluded. Review the reasons below.</p>
    <small>This measures documented requirements, not the likelihood of success in the role.</small>
  </div>;
}
