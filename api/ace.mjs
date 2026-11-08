import ace from '../server/ace-host.mjs';

export default {async fetch(request){
 const origin=request.headers.get('origin');
 const allowed=new Set(['https://reeluxe.vip','https://www.reeluxe.vip']);
 for(const host of [process.env.VERCEL_URL,process.env.VERCEL_PROJECT_PRODUCTION_URL]){
  if(host)allowed.add('https://'+host);
 }
 if(process.env.VERCEL_ENV!=='production'&&process.env.ALLOWED_ORIGIN)allowed.add(process.env.ALLOWED_ORIGIN);
 if(!allowed.has(origin))return Response.json({error:'Origin denied'},{status:403});
 const headers=new Headers(request.headers);
 // Vercel supplies the forwarding header; never trust a client Cloudflare header.
 headers.set('CF-Connecting-IP',request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'shared');
 return ace.fetch(new Request(request,{headers}),{
  GEMINI_API_KEY:process.env.GEMINI_API_KEY,
  GEMINI_MODEL:process.env.GEMINI_MODEL||'gemini-3.5-flash-lite',
  ALLOWED_ORIGIN:origin,
  REQUIRE_RATE_LIMIT:'false'
 });
}};
