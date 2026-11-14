const CACHE='tracking-diary-shell-v8';
const FILES=['./','./index.html','./style.css?v=8','./app.js?v=8','./model.js?v=5','./charts.js?v=8','./recorder.js?v=5','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tracking-diary-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin) return;
  const url=new URL(e.request.url);if(!FILES.some(f=>new URL(f,self.registration.scope).pathname===url.pathname))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok&&r.type!=='opaqueredirect'&&!r.redirected){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request)));
});
