// Prefeitura de Manari — ponte de atualização para o layout Social V3.3
(() => {
  if (window.__MANARI_SOCIAL_BOOTSTRAP__) return;
  window.__MANARI_SOCIAL_BOOTSTRAP__ = true;

  const VERSION = '3.3';

  function addCss(attr, href) {
    if (document.querySelector(`link[${attr}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${href}?v=${VERSION}`;
    link.setAttribute(attr, 'true');
    document.head.appendChild(link);
  }

  function loadCss() {
    addCss('data-manari-social-v2', 'social-layout.css');
    addCss('data-manari-responsive', 'responsive-overrides.css');
    addCss('data-manari-transparency', 'transparency-center.css');
    addCss('data-manari-portal-internal', 'portal-internal.css');
    addCss('data-manari-portal-auth', 'portal-auth.css');
  }

  function loadScriptOnce(attr, src, ready, next) {
    if (ready?.() || document.querySelector(`script[${attr}]`)) { next?.(); return; }
    const script = document.createElement('script');
    script.src = `${src}?v=${VERSION}`;
    script.async = false;
    script.setAttribute(attr, 'true');
    script.onload = () => next?.();
    document.body.appendChild(script);
  }

  function loadPortalAuth(next) {
    loadScriptOnce('data-manari-portal-auth','portal-auth.js',()=>window.ManariPortalAuth,next);
  }
  function loadPortalInternal(next) {
    loadScriptOnce('data-manari-portal-internal','portal-internal.js',()=>window.ManariPortalInternal,next);
  }
  function loadTransparency() {
    loadScriptOnce('data-manari-transparency','transparency-center.js',()=>window.ManariTransparency);
  }

  function loadFixes() {
    const done = () => loadTransparency();
    if (!document.querySelector('script[data-manari-social-fixes]')) {
      const fixes = document.createElement('script');
      fixes.src = `social-fixes.js?v=${VERSION}`;
      fixes.async = false;
      fixes.setAttribute('data-manari-social-fixes', 'true');
      fixes.onload = done;
      document.body.appendChild(fixes);
      return;
    }
    done();
  }

  function loadSocial() {
    if (window.__MANARI_SOCIAL_SCRIPT_LOADING__ || document.getElementById('manariSocialApp')) {
      loadFixes();
      return;
    }
    window.__MANARI_SOCIAL_SCRIPT_LOADING__ = true;
    const script = document.createElement('script');
    script.src = `social-layout.js?v=${VERSION}`;
    script.async = false;
    script.setAttribute('data-manari-social-v2', 'true');
    script.onload = () => {
      document.querySelectorAll('.manari-sidebar-handle,.manari-sidebar,.manari-sidebar-backdrop').forEach(el => el.remove());
      loadFixes();
    };
    script.onerror = () => { window.__MANARI_SOCIAL_SCRIPT_LOADING__ = false; };
    document.body.appendChild(script);
  }

  function boot() {
    loadCss();
    loadPortalInternal(() => loadPortalAuth(loadSocial));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();