const fs=require('node:fs'),path=require('node:path');
const js=require('esbuild').buildSync({entryPoints:['src/main.tsx'],bundle:true,write:false,platform:'browser',jsx:'automatic',format:'iife',alias:{'@':path.resolve('src')},minify:true,loader:{'.css':'empty'},define:{'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_ANON_KEY':'""','process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
const html=fs.readFileSync('dist/index.html','utf8'),cssPath=html.match(/href="\/([^" ]+\.css)"/)[1],css=fs.readFileSync(path.join('dist',cssPath),'utf8');
const result=html.replace(/<script type="module"[^>]*src="[^"]+"[^>]*><\/script>/,'').replace(/<link rel="stylesheet"[^>]+>/,()=>'<style>'+css+'</style>').replace('</body>',()=>'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script></body>');
fs.writeFileSync('standalone-preview.html',result);console.log('Updated self-contained preview without database credentials.');
