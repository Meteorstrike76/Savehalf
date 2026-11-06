const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
test('native CI harness extracts one isolated function and all nine assertions',()=>{
 const sql=execFileSync('python3',['tools/review/b04-native-sql.py'],{encoding:'utf8'});
 assert(sql.includes('function review_native.pack_measure('));assert(!sql.includes('function public.pack_measure('));
 assert.equal((sql.match(/::jsonb\)/g)||[]).length,9);assert(sql.includes('actual is not distinct from c.expected'));
 assert(sql.includes('assert failures = 0'));assert(sql.includes("current_setting('server_version_num')"));assert(sql.trim().endsWith('rollback;'));
});
test('native CI cannot be manually dispatched or use production credentials',()=>{
 const yaml=fs.readFileSync('.github/workflows/b04-native-postgres.yml','utf8');
 assert(yaml.includes('image: postgres:17'));assert(!yaml.includes('workflow_dispatch'));
 assert(!/secrets\.|SUPABASE_|supabase\.co|db push|apply_migration/.test(yaml));
 assert(yaml.indexOf('docker network disconnect')<yaml.indexOf('docker exec'));
 assert(yaml.includes('zero attached networks'));assert(yaml.includes('--host=/var/run/postgresql'));
});
