const CACHE='savehalf-checklist-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.add('/offline.html')));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('savehalf-checklist-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=='GET')return;
 // No API, auth callback, token URL, private response or account data is cached.
 if(url.pathname==='/offline.html'&&!url.search){event.respondWith(caches.match('/offline.html').then(old=>old||fetch(event.request)));return;}
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));return;}
 if(/^\/assets\/[\w-]+\.(?:js|css)$/.test(url.pathname)&&!url.search){event.respondWith(caches.open(CACHE).then(async cache=>{const old=await cache.match(event.request);if(old)return old;const response=await fetch(event.request);if(response.ok&&response.type==='basic'){await cache.put(event.request,response.clone());const keys=await cache.keys();const assets=keys.filter(k=>new URL(k.url).pathname.startsWith('/assets/'));for(const old of assets.slice(0,Math.max(0,assets.length-12)))await cache.delete(old);}return response;}));}
});
