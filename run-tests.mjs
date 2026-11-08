import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const name of readdirSync('.').filter(n=>/^test-.*\.(mjs|cjs)$/.test(n))){
 const r=spawnSync(process.execPath,[name],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status||1);
}
