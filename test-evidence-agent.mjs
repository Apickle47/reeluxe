import assert from 'node:assert/strict';
import {advise} from './server/ace-host.mjs';
const C=globalThis.AceSimCore,E=globalThis.AceEvidenceCards;
let count=0;
for(const topic of E.topics){
 let n=0;
 const result=await advise({mode:'findings',topic,message:'What would change this decision?',state:C.fresh()},{GEMINI_API_KEY:'mock'},async(url,o)=>{
  const b=JSON.parse(o.body);
  if(n++===0){assert.equal(b.toolConfig.functionCallingConfig.mode,'ANY');return Response.json({candidates:[{content:{role:'model',parts:[{functionCall:{name:'get_evidence',args:{topic},id:'evidence-1'},thoughtSignature:'keep'}]}}]});}
  assert.equal(b.contents[2].parts[0].functionResponse.response.source,E.get(topic).source);
  return Response.json({candidates:[{content:{parts:[{text:'Check the alternative explanation before spending.'}]}}]});
 });
 assert.deepEqual(result.evidenceUsed.map(x=>x.topic),[topic]);assert.equal(result.comparisons.length,0);count++;
}
await assert.rejects(()=>advise({mode:'findings',topic:'inspect',message:'Invent a number',state:C.fresh()},{GEMINI_API_KEY:'mock'},async()=>Response.json({candidates:[{content:{parts:[{text:'Invented ungrounded answer'}]}}]})),/Evidence not checked/);count++;
let n=0;
await assert.rejects(()=>advise({mode:'findings',topic:'inspect',message:'Use an unlisted source',state:C.fresh()},{GEMINI_API_KEY:'mock'},async()=>Response.json({candidates:[{content:{role:'model',parts:n++===0?[{functionCall:{name:'get_evidence',args:{topic:'secret'}}}]:[{text:'Pretend I checked it'}]}}]})),/Evidence not checked/);count++;
console.log(`${count} evidence-agent checks passed: all topics, real retrieval receipts, missing/invalid tool refusal (mocked Gemini).`);
