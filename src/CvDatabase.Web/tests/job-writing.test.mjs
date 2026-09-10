import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=readFileSync(new URL('../../../supabase/functions/generate-job-description/index.ts',import.meta.url),'utf8').replace(/^import .*\n/,'');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
function setup({user=true,allowed=true,finish='STOP',retrieved=true,parts=[{thought:true,text:'private reasoning'},{text:'Complete tailored advertisement.'}]}={}) {
 let handler;const calls=[];
 const client={auth:{getUser:async()=>({data:{user:user?{id:'test-user'}:null}})},from:()=>{const q={select:()=>q,eq:()=>q,single:async()=>({data:{id:'org',name:'QA Test Customer A'}})};return q;},rpc:async()=>({data:allowed})};
 const fetchMock=async(url,options)=>{calls.push(JSON.parse(options.body));return Response.json({candidates:[{finishReason:finish,content:{parts},urlContextMetadata:{urlMetadata:retrieved?[{retrievedUrl:'https://example.com/',urlRetrievalStatus:'URL_RETRIEVAL_STATUS_SUCCESS'}]:[]}}]});};
 new Function('createClient','Deno','fetch',js)(()=>client,{env:{get:()=> 'test-only'},serve:fn=>handler=fn},fetchMock);
 return {calls,run:(extra={})=>handler(new Request('https://test.local',{method:'POST',body:JSON.stringify({organizationId:'org',title:'Data Analyst',action:'draft',companyWebsite:'https://example.com/',companyName:'Example Studio',companyValues:'Curiosity',exampleAdvertisement:'Reference employer job',currentDraft:'Existing text',...extra})}))};
}
test('draft reads URL and carries company facts, reference ad and existing text separately',async()=>{const s=setup();const response=await s.run();assert.equal(response.status,200);const result=await response.json();assert.equal(result.description,'Complete tailored advertisement.');assert.equal(result.sources.length,1);assert.deepEqual(s.calls[0].tools,[{url_context:{}}]);const input=JSON.parse(s.calls[0].contents[0].parts[0].text);assert.equal(input.role.company,'Example Studio');assert.equal(input.confirmedCompanyValues,'Curiosity');assert.equal(input.referenceAdvertisement,'Reference employer job');assert.equal(input.currentDraft,'Existing text');});
test('incomplete generation never returns description',async()=>{for(const finish of ['MAX_TOKENS','SAFETY',undefined]){const s=setup({finish:finish??'UNKNOWN'});const r=await s.run();assert.equal(r.status,502);assert.equal((await r.json()).description,undefined);}});
test('unretrieved company URL is never claimed as a reviewed source',async()=>{const s=setup({retrieved:false});const r=await s.run();assert.equal(r.status,502);assert.match((await r.json()).error,/could not be verified/);});
test('pasted company context can be used without a website',async()=>{const s=setup({retrieved:false});assert.equal((await s.run({companyWebsite:''})).status,200);assert.equal(s.calls[0].tools,undefined);});
test('authentication and job permission precede provider requests',async()=>{for(const options of [{user:false},{allowed:false}]){const s=setup(options);assert.ok([401,403].includes((await s.run()).status));assert.equal(s.calls.length,0);}});
test('thought-only results cannot overwrite a draft',async()=>{const s=setup({parts:[{thought:true,text:'internal'}]});assert.equal((await s.run()).status,502);});
