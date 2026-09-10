import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('../src/lib/candidateDirectory.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { candidateApplicationContext, filterCandidateDirectory } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const candidates = [
  { id: 'a', full_name: 'Alice North', professional_title: 'Data Engineer', email: 'alice@example.test', location: 'Gothenburg', skills: ['SQL', 'Python'] },
  { id: 'b', full_name: 'Bruno West', professional_title: 'Designer', email: 'bruno@example.test', location: 'Stockholm', skills: ['Figma'] },
];
const applications = [
  { id: 'a1', candidate_id: 'a', job_id: 'one', stage: 'review' },
  { id: 'a2', candidate_id: 'a', job_id: 'two', stage: 'interview' },
  { id: 'a3', candidate_id: 'a', job_id: 'three', stage: 'rejected' },
  { id: 'b1', candidate_id: 'b', job_id: 'one', stage: 'hired' },
];
const defaults = { search: '', jobId: 'all', location: 'all', skills: [] };

test('selected role uses its own stage, not the first active application', () => {
  assert.equal(candidateApplicationContext('a', applications, 'two').application.stage, 'interview');
});
test('multiple active roles never choose an arbitrary match', () => {
  const result = candidateApplicationContext('a', applications);
  assert.equal(result.activeCount, 2);
  assert.equal(result.application, undefined);
});
test('selected completed role remains inspectable', () => {
  assert.equal(candidateApplicationContext('a', applications, 'three').application.stage, 'rejected');
  assert.equal(candidateApplicationContext('b', applications, 'one').application.stage, 'hired');
});
test('unmatched role cannot leak another application', () => {
  assert.equal(candidateApplicationContext('a', applications, 'missing').application, undefined);
});
test('no active application does not imply availability', () => {
  assert.deepEqual(candidateApplicationContext('b', applications), { application: undefined, activeCount: 0 });
});
test('search trims input and finds email and skills without case sensitivity', () => {
  for (const search of [' ALICE@EXAMPLE.TEST ', 'python']) {
    assert.deepEqual(filterCandidateDirectory(candidates, applications, { ...defaults, search }).map(item => item.id), ['a']);
  }
});
test('combined filters intersect rather than widening the result', () => {
  assert.equal(filterCandidateDirectory(candidates, applications, { ...defaults, jobId: 'two', location: 'Gothenburg', skills: ['SQL', 'Python'] }).length, 1);
  assert.equal(filterCandidateDirectory(candidates, applications, { ...defaults, jobId: 'two', location: 'Stockholm' }).length, 0);
  assert.equal(filterCandidateDirectory(candidates, applications, { ...defaults, skills: ['SQL', 'Figma'] }).length, 0);
});
test('cleared filters restore the full directory without mutating inputs', () => {
  const before = JSON.stringify(candidates);
  assert.deepEqual(filterCandidateDirectory(candidates, applications, defaults), candidates);
  assert.equal(JSON.stringify(candidates), before);
});
