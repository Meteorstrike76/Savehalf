const test=require('node:test'),assert=require('node:assert/strict'),React=require('react');
const {JSDOM}=require('jsdom');
const source=require('esbuild').buildSync({entryPoints:['src/components/AppErrorBoundary.tsx'],bundle:true,write:false,platform:'node',format:'cjs',external:['react'],jsx:'automatic'}).outputFiles[0].text;
const mod={exports:{}};new Function('require','module','exports',source)(require,mod,mod.exports);
const Boundary=mod.exports.default;
test('B10 catches render failure, offers recovery and preserves device data',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid'});
 global.window=dom.window;global.document=dom.window.document;global.navigator=dom.window.navigator;
 window.localStorage.setItem('savehalf-bookmarks-v4','preserved');
 const {createRoot}=require('react-dom/client');const {act}=React;
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const root=createRoot(document.getElementById('root')),old=console.error;console.error=()=>{};
 try {
  function Broken(){throw Error('fixture render failure');}
  await act(async()=>root.render(React.createElement(Boundary,null,React.createElement(Broken))));
  assert.match(document.querySelector('[role="alert"]').textContent,/could not open/);
  assert.equal(document.querySelector('button').textContent,'Reload SaveHalf');
  assert.equal(window.localStorage.getItem('savehalf-bookmarks-v4'),'preserved');
 }finally{await act(async()=>root.unmount());console.error=old;dom.window.close();}
});
