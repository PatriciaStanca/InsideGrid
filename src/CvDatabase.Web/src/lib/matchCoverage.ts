export function requirementCoverage(results: readonly { status: string }[]) {
  const total = results.length;
  const supported = results.filter(item => item.status === 'supported').length;
  return { total, supported, percent: total ? Math.round(supported / total * 100) : null };
}
