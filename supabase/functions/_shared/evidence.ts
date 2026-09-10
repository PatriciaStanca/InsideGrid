// Conservative keyword support. Uncertain or negated statements require review.
export function affirmativeEvidence(text: string): string {
  return text.split(/(?<=[.!?])\s+|\n+/).filter(sentence =>
    !/\b(no|not|without|missing|unknown|undocumented|unverified|lack\w*|inte|ej|utan|sakna\w*|okänd\w*)\b/i.test(sentence),
  ).join(" ");
}

export function containsEvidenceTerm(text: string, term: string): boolean {
  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}+#])${escaped}($|[^\\p{L}\\p{N}+#])`, "iu").test(text);
}
