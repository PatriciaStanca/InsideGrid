import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../../../supabase/functions/_shared/evidence.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {affirmativeEvidence, containsEvidenceTerm} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('negated Azure statement is not evidence, while Python and SQL remain supported', () => {
  const text = affirmativeEvidence('Builds data pipelines with Python and SQL. Azure experience has not been documented.');
  assert.equal(containsEvidenceTerm(text,'Azure'),false);
  assert.equal(containsEvidenceTerm(text,'Python'),true);
  assert.equal(containsEvidenceTerm(text,'SQL'),true);
});
test('skill matching does not confuse Java with JavaScript or SQL with NoSQL', () => {
  assert.equal(containsEvidenceTerm('JavaScript and NoSQL','Java'),false);
  assert.equal(containsEvidenceTerm('JavaScript and NoSQL','SQL'),false);
});
test('punctuation in technical skills is treated literally', () => {
  assert.equal(containsEvidenceTerm('Skills: C++, C#, .NET','C++'),true);
  assert.equal(containsEvidenceTerm('Skills: C++, C#, .NET','C#'),true);
  assert.equal(containsEvidenceTerm('Skills: C++, C#, .NET','.NET'),true);
});
test('uncertain Swedish and English statements require review', () => {
  for (const sentence of ['Saknar Azure-erfarenhet.','Azure är inte dokumenterat.','Azure experience is unknown.']) {
    assert.equal(containsEvidenceTerm(affirmativeEvidence(sentence),'Azure'),false);
  }
});
