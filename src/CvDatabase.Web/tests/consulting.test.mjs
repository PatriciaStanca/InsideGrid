import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/lib/consulting.ts',import.meta.url),'utf8');
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:module.exports});
const {compareConsultant,parseRequirements,profileDraft}=module.exports;
const person={full_name:'Test Person',professional_title:'Developer',location:'Gothenburg',summary:'Builds APIs.',skills:['C#','.NET'],experience:[],education:[]};
test('does not treat missing skills as failed requirements',()=>{const result=compareConsultant(person,['C#','Azure']);assert.equal(result[0].status,'supported');assert.equal(result[1].status,'unknown');});
test('does not match substrings or use names as skill evidence',()=>{const result=compareConsultant({...person,full_name:'Azure Test'},['C','NET','Azure']);assert.ok(result.every(item=>item.status==='unknown'));});
test('normalizes exact profile skills without changing the profile',()=>{assert.equal(compareConsultant(person,[' c# '])[0].status,'supported');assert.equal(person.skills[0],'C#');});
test('requirements stay explicit and bounded',()=>{assert.equal(parseRequirements('- C#\n\n• .NET\nC#').join('|'),'C#|.NET');assert.equal(parseRequirements(Array.from({length:50},(_,i)=>`skill ${i}`).join('\n')).length,40);});
test('source CV preserves facts and never claims translation',()=>{const draft=profileDraft(person,'sv');assert.ok(draft.includes('Builds APIs.'));assert.ok(draft.includes('Kompetenser'));assert.ok(!draft.includes('Azure'));});
const edgeSource=readFileSync(new URL('../../../supabase/functions/consulting-assistant/index.ts',import.meta.url),'utf8');
function edge({authenticated=true,mode='consulting',permission=true,key=true,candidate=true}={}) {
 let handler; let calls=0; const filters=[];
 const client={auth:{getUser:async()=>({data:{user:authenticated?{id:'user'}:null}})},rpc:async()=>({data:permission}),from(table){return {select(){return this;},eq(field,value){filters.push([table,field,value]);return this;},async single(){return {data:table==='organizations'?{id:'org',workspace_mode:mode}:candidate?person:null};}}}};
 vm.runInNewContext(ts.transpileModule(edgeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:{},require:()=>({createClient:()=>client}),Deno:{env:{get:name=>name==='GEMINI_API_KEY'?(key?'test-key':undefined):name==='GEMINI_MODEL'?'gemini-test':'test'},serve:fn=>{handler=fn;}},Response,AbortSignal,fetch:async(url,options)=>{calls++;assert.match(url,/generativelanguage.googleapis.com/);assert.equal(options.headers['x-goog-api-key'],'test-key');return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({requirements:['C#']})}]}}]}));}});
 return {run:async(input={action:'requirements',organizationId:'org',advertisement:'C# consultant'})=>handler(new Request('https://example.test',{method:'POST',body:JSON.stringify(input)})),calls:()=>calls,filters};
}
test('unauthenticated requests never call Gemini',async()=>{const server=edge({authenticated:false});assert.equal((await server.run()).status,401);assert.equal(server.calls(),0);});
test('Recruiting cannot use the consulting endpoint',async()=>{const server=edge({mode:'recruitment'});assert.equal((await server.run()).status,403);assert.equal(server.calls(),0);});
test('permission is checked before provider access',async()=>{const server=edge({permission:false});assert.equal((await server.run()).status,403);assert.equal(server.calls(),0);});
test('missing Gemini configuration fails honestly without fallback',async()=>{const server=edge({key:false});assert.equal((await server.run()).status,503);assert.equal(server.calls(),0);});
test('candidate lookup is scoped to the organization',async()=>{const server=edge({candidate:false});assert.equal((await server.run({action:'tailor',organizationId:'org',candidateId:'other',language:'sv',advertisement:'C#'})).status,404);assert.ok(server.filters.some(([table,key,value])=>table==='candidates'&&key==='organization_id'&&value==='org'));assert.equal(server.calls(),0);});
test('requirements call uses Gemini and validates structured output',async()=>{const server=edge();const result=await server.run();assert.equal(result.status,200);assert.deepEqual((await result.json()).requirements,['C#']);assert.equal(server.calls(),1);});
