import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
let failed=0;const files=(await readdir('tests')).filter(p=>p.endsWith('-ui.cjs')).sort();
for(const name of files){const result=spawnSync(process.execPath,['tests/'+name],{encoding:'utf8',timeout:30000});if(result.status!==0){failed++;console.error(`FAIL ${name}\n${result.stdout||''}${result.stderr||''}${result.error?.message||''}`);}else console.log(`PASS ${name}`);}
console.log(`${files.length-failed}/${files.length} UI regression scripts passed`);if(failed)process.exitCode=1;
