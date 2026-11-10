const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('rollout workflow references public repository configuration without a JWT literal',()=>{
 const yaml=fs.readFileSync('.github/workflows/rollout-audit.yml','utf8');
 assert(yaml.includes('VITE_SUPABASE_ANON_KEY: ${{ vars.SAVEHALF_SUPABASE_ANON_KEY }}'));
 assert(!/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(yaml));
 assert(yaml.includes('Require public client configuration'));assert(yaml.includes('never service_role'));
});
