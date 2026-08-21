const CACHE='manari-v2-0-1-social-force';
const CORE=['./','index.html','styles.css','social-layout.css','app.js','config.js','laws.js','sidebar-menu.js','social-layout.js','manifest.webmanifest','app-icon-192.png','app-icon-512.png','manari-educacao-conferencia.png'];
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
      headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache'}
    });
  }

  if(request.mode==='navigate'){
    const type=response.headers.get('content-type')||'';
    if(type.includes('text/html')){
      let html=await response.text();
      if(!html.includes('social-layout.css')){
        const style='<link rel="stylesheet" href="social-layout.css?v=2.0.1">';
        html=html.includes('</head>')?html.replace('</head>',`${style}</head>`):`${style}${html}`;
      }
      const scripts=[];
      if(!html.includes('laws.js')) scripts.push('<script src="laws.js"></script>');
      if(!html.includes('sidebar-menu.js')) scripts.push('<script src="sidebar-menu.js?v=2.0.1"></script>');
      if(!html.includes('social-layout.js')) scripts.push('<script src="social-layout.js?v=2.0.1"></script>');
      if(scripts.length){
        const tags=scripts.join('');
        html=html.includes('</body>')?html.replace('</body>',`${tags}</body>`):`${html}${tags}`;
      }
      const headers=new Headers(response.headers);
      headers.set('Content-Type','text/html; charset=utf-8');
      headers.delete('Content-Length');
      headers.set('Cache-Control','no-cache, no-store, must-revalidate');
      return new Response(html,{status:response.status,statusText:response.statusText,headers});
    }
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
          if(prepared&&prepared.ok){const copy=prepared.clone();caches.open(CACHE).then(c=>c.put('index.html',copy));}
          return prepared;
        })
        .catch(async()=>prepareResponse(e.request,await caches.match('index.html')))
    );
    return;
  }

  e.respondWith(
    fetch(e.request,{cache:'no-store'})
      .then(async r=>{
        const prepared=await prepareResponse(e.request,r);
        if(prepared&&prepared.ok){const copy=prepared.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
        return prepared;
      })
      .catch(()=>caches.match(e.request))
  );
});
