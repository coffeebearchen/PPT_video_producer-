import fs from 'node:fs';
import { checkSpecCoverage } from '../lib/spec-check.mjs';
let ok=0;
for(let i=1;i<=10;i++){const n=String(i).padStart(2,'0');const s=JSON.parse(fs.readFileSync(`data/v2-specs/${n}.json`));const c=checkSpecCoverage(s);if(c.ok)ok++;console.log(n,c.ok,c.errors.map(e=>e.message).join(' | '));}
console.log('ok',ok,'/10');
