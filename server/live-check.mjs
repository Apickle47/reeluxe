// Run using a hidden-stdin credential launcher. Never logs the credential.
import {advise} from './ace-host.mjs';
let key='';for await(const chunk of process.stdin)key+=chunk;
try{
  const result=await advise({message:'Compare upgrading machine 1 with keeping my cash. Check both in the simulator and explain upfront cost and nightly profit.',state:globalThis.AceSimCore.fresh()},{GEMINI_API_KEY:key.trim()},async(url,options)=>{
    const response=await fetch(url,options);
    if(!response.ok){const data=await response.clone().json().catch(()=>({}));console.log(JSON.stringify({http_status:response.status,status:data.error?.status,message:String(data.error?.message||'').replaceAll(key.trim(),'[redacted]'),reasons:(data.error?.details||[]).map(d=>d.reason).filter(Boolean)}));}
    return response;
  });
  console.log(JSON.stringify(result));
}catch{console.log(JSON.stringify({success:false,error:'Live Gemini response unavailable'}));process.exitCode=1;}
