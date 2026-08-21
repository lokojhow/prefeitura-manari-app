// Prefeitura de Manari — ponte de atualização para o layout Social V2
// Este arquivo já existe nas versões antigas do app; por isso ele força o carregamento
// da nova interface mesmo quando o HTML antigo ainda está em cache.
(() => {
  if (window.__MANARI_SOCIAL_BOOTSTRAP__) return;
  window.__MANARI_SOCIAL_BOOTSTRAP__ = true;

  const VERSION = '2.0.1';

  function loadCss() {
    if (document.querySelector('link[data-manari-social-v2]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `social-layout.css?v=${VERSION}`;
    link.setAttribute('data-manari-social-v2', 'true');
    document.head.appendChild(link);
  }

  function loadScript() {
    if (window.__MANARI_SOCIAL_SCRIPT_LOADING__ || document.getElementById('manariSocialApp')) return;
    window.__MANARI_SOCIAL_SCRIPT_LOADING__ = true;
    const script = document.createElement('script');
    script.src = `social-layout.js?v=${VERSION}`;
    script.async = false;
    script.setAttribute('data-manari-social-v2', 'true');
    script.onload = () => {
      document.querySelectorAll('.manari-sidebar-handle,.manari-sidebar,.manari-sidebar-backdrop').forEach(el => el.remove());
    };
    script.onerror = () => { window.__MANARI_SOCIAL_SCRIPT_LOADING__ = false; };
    document.body.appendChild(script);
  }

  function boot() {
    loadCss();
    loadScript();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
