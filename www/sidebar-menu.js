// Prefeitura de Manari — bootstrap V4.4 sem flash e com acesso administrativo robusto
(() => {
  if (window.__MANARI_SOCIAL_BOOTSTRAP__) return;
  window.__MANARI_SOCIAL_BOOTSTRAP__=true;
  const VERSION='4.4';
  const gate=document.createElement('style');gate.id='manari-v4-boot-gate';gate.textContent='body> *:not(script):not(style):not(link){visibility:hidden!important} #manariSocialApp{visibility:visible!important}';document.head.appendChild(gate);
  const reveal=()=>{document.getElementById('manari-v4-boot-gate')?.remove();document.getElementById('manari-preboot')?.remove();document.documentElement.classList.add('manari-v4-ready');};
  const safety=setTimeout(reveal,5000);
  function addCss(attr,href){if(document.querySelector(`link[${attr}]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=`${href}?v=${VERSION}`;l.setAttribute(attr,'true');document.head.appendChild(l);}
  function loadCss(){addCss('data-manari-social-v2','social-layout.css');addCss('data-manari-responsive','responsive-overrides.css');addCss('data-manari-transparency','transparency-center.css');addCss('data-manari-portal-internal','portal-internal.css');addCss('data-manari-portal-auth','portal-auth.css');addCss('data-manari-portal-cms','portal-cms.css');}
  function loadScriptOnce(attr,src,ready,next){if(ready?.()){next?.();return;}const existing=document.querySelector(`script[${attr}]`);if(existing){if(ready?.())next?.();else existing.addEventListener('load',()=>next?.(),{once:true});return;}const s=document.createElement('script');s.src=`${src}?v=${VERSION}`;s.async=false;s.setAttribute(attr,'true');s.onload=()=>next?.();s.onerror=()=>next?.();document.body.appendChild(s);}
  function ensureAdminOpen(){
    if(window.ManariPortalAuth?.open){window.ManariPortalAuth.open();return;}
    loadScriptOnce('data-manari-portal-auth','portal-auth.js',()=>window.ManariPortalAuth,()=>{if(window.ManariPortalAuth?.open)window.ManariPortalAuth.open();else alert('Não foi possível carregar a Área Administrativa. Atualize o aplicativo e tente novamente.');});
  }
  // Captura independente do layout: evita falhas de ordem de carregamento/eventos.
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#manariSocialApp [data-nav="admin"],#manariSocialApp .sm-admin-account,#manariSocialApp .sm-circle-btn[title="Conta"],#manariSocialApp .sm-circle-btn[title="Área do setor"]');
    if(!btn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();ensureAdminOpen();
  },true);
  const loadCMS=next=>loadScriptOnce('data-manari-portal-cms','portal-cms.js',()=>window.ManariSectorCMS,()=>loadScriptOnce('data-manari-portal-cms-bridge','portal-cms-bridge.js',()=>window.__MANARI_CMS_BRIDGE__,next));
  const loadAuth=next=>loadScriptOnce('data-manari-portal-auth','portal-auth.js',()=>window.ManariPortalAuth,next);
  const loadInternal=next=>loadScriptOnce('data-manari-portal-internal','portal-internal.js',()=>window.ManariPortalInternal,next);
  function loadTransparency(){loadScriptOnce('data-manari-transparency','transparency-center.js',()=>window.ManariTransparency);}
  function loadFixes(){const done=()=>{loadTransparency();clearTimeout(safety);requestAnimationFrame(()=>requestAnimationFrame(reveal));};if(!document.querySelector('script[data-manari-social-fixes]')){const f=document.createElement('script');f.src=`social-fixes.js?v=${VERSION}`;f.async=false;f.setAttribute('data-manari-social-fixes','true');f.onload=done;f.onerror=done;document.body.appendChild(f);return;}done();}
  function loadSocial(){if(document.getElementById('manariSocialApp')){loadFixes();return;}const old=document.querySelector('#app,.app-shell,.site-shell,main');if(old)old.setAttribute('aria-hidden','true');const s=document.createElement('script');s.src=`social-layout.js?v=${VERSION}`;s.async=false;s.setAttribute('data-manari-social-v2','true');s.onload=()=>{document.querySelectorAll('.manari-sidebar-handle,.manari-sidebar,.manari-sidebar-backdrop').forEach(el=>el.remove());loadFixes();};s.onerror=()=>{clearTimeout(safety);reveal();};document.body.appendChild(s);}
  function boot(){loadCss();loadInternal(()=>loadAuth(()=>loadCMS(loadSocial)));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();