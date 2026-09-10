import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = readFileSync(new URL('../../../supabase/functions/submit-application/index.ts', import.meta.url), 'utf8').replace(/^import .*\n/, '');
const js = ts.transpileModule(source, {compilerOptions: {module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
function setup({job=true, failSave=false, limited=false}={}) {
  let handler; const writes=[]; const removals=[];
  const admin={
    rpc: async (name,args) => name === 'reserve_application_attempt' ? {data:!limited} : (writes.push(args), failSave ? {error:{message:'database unavailable'}} : {data:'application-reference'}),
    from: () => {const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:job ? {id:'job-a',organization_id:'customer-a'} : null})}; return query;},
    storage:{from:()=>({upload:async(path)=>{writes.push({path});return {};},remove:async(paths)=>{removals.push(...paths);return {};}})}
  };
  new Function('createClient','Deno',js)(()=>admin,{env:{get:()=> 'test-only'},serve:fn=>{handler=fn;}});
  return {handler,writes,removals};
}
function request(overrides={}) {
  const form=new FormData();
  for(const [key,value] of Object.entries({slug:'qa-data-engineer',first_name:'Public',last_name:'Test',email:'public@example.com',consent:'on',cv:new File(['%PDF-1.7 sample'],'sample.pdf',{type:'application/pdf'}),...overrides})) form.set(key,value);
  return new Request('https://example.test/submit',{method:'POST',body:form});
}
test('public application uses organization from published job, never form input',async()=>{
  const s=setup(); const response=await s.handler(request({organization_id:'foreign-customer'}));
  assert.equal(response.status,200); assert.equal((await response.json()).received,true);
  assert.match(s.writes[0].path,/^customer-a\//); assert.equal(s.writes[1].person.email,'public@example.com');
  assert.equal(s.removals.length,0);
});
test('invalid PDF and missing consent produce no storage or candidate writes',async()=>{
  for(const changes of [{cv:new File(['fake'],'fake.pdf')},{consent:''},{email:'invalid'}]) {
    const s=setup(); assert.equal((await s.handler(request(changes))).status,400); assert.equal(s.writes.length,0);
  }
});
test('unpublished role and rate limiting reject submission',async()=>{
  for(const [config,status] of [[{job:false},404],[{limited:true},429]]) {
    const s=setup(config); assert.equal((await s.handler(request())).status,status); assert.equal(s.writes.length,0);
  }
});
test('failed database save removes uploaded CV and never reports success',async()=>{
  const s=setup({failSave:true});const response=await s.handler(request());
  assert.equal(response.status,400);assert.equal(s.removals.length,1);assert.equal(s.removals[0],s.writes[0].path);
});
