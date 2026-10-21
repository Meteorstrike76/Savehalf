const path=require('node:path');const esbuild=require('../../node_modules/esbuild');
const {routeQuestion}=requireFromSource();
function requireFromSource(){const result=esbuild.buildSync({entryPoints:[path.resolve(__dirname,'../../src/lib/agents/v2.ts')],bundle:true,platform:'node',format:'cjs',write:false});const mod={exports:{}};new Function('module','exports','require',result.outputFiles[0].text)(mod,mod.exports,require);return mod.exports;}
module.exports=class{ id(){return 'savehalf-fixture-router';}async callApi(prompt){const route=routeQuestion(prompt,['Coles','Woolworths','Aldi']);return {output:JSON.stringify(route)};}};
