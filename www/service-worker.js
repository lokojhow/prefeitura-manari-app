const CACHE='manari-v1-3-1-portal-editavel';
const CORE=['./','index.html','styles.css','app.js','config.js','manifest.webmanifest','app-icon-192.png','app-icon-512.png','manari-educacao-conferencia.png'];
const SUPABASE_CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

async function prepareResponse(request,response){
  if(!response||!response.ok)return response;

  const url=new URL(request.url);
  if(url.pathname.endsWith('/config.js')){
    const original=await response.text();
    const loader=`if(!window.supabase){document.write('<script src="${SUPABASE_CDN}"><\\/script>');}\n`;
    return new Response(loader+original,{
      status:response.status,
      statusText:response.statusText,
      headers:{
        'Content-Type':'application/javascript; charset=utf-8',
        'Cache-Control':'no-cache'
      }
    });
  }

  return response;
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;

  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;

  if(e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request,{cache:'no-store'})
        .then(async r=>{
          const prepared=await prepareResponse(e.request,r);
          if(prepared&&prepared.ok){
            const copy=prepared.clone();
            caches.open(CACHE).then(c=>c.put('index.html',copy));
          }
          return prepared;
        })
        .catch(()=>caches.match('index.html'))
    );
    return;
  }

  e.respondWith(
    fetch(e.request,{cache:'no-store'})
      .then(async r=>{
        const prepared=await prepareResponse(e.request,r);
        if(prepared&&prepared.ok){
          const copy=prepared.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy));
        }
        return prepared;
      })
      .catch(()=>caches.match(e.request))
  );
});
