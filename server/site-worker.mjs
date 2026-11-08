import ace from './ace-host.mjs';
export default {async fetch(request,env,ctx){
 const url=new URL(request.url);
 if(url.pathname==='/api/ace')return ace.fetch(request,env);
 if(url.pathname==='/api/health')return Response.json({service:'Ace',configured:!!env.GEMINI_API_KEY,model:env.GEMINI_MODEL||'gemini-3.5-flash-lite'});
 return env.ASSETS.fetch(request);
}};
