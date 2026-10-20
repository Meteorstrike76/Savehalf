// Flatten the built ES modules for jsdom, which cannot execute module scripts.
// This retains the production code and lazy panel implementation under test.
const path=require('node:path');
module.exports=(root,script)=>require('esbuild').buildSync({entryPoints:[path.join(root,'dist',script)],bundle:true,write:false,platform:'browser',format:'iife',logLevel:'silent'}).outputFiles[0].text;
