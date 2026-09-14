// Prefeitura de Manari — trava da imagem principal V5.7
(() => {
  if (window.__MANARI_HOME_IMAGE_LOCK__) return;
  window.__MANARI_HOME_IMAGE_LOCK__ = true;

  const CFG = window.MANARI_CONFIG || {};
  const LS = 'manari-portal-overrides-v55';
  let client = null;
  let currentUrl = '';
  let currentAlt = '';
  let applying = false;

  function homeImage() {
    return document.querySelector('section.hero.home-hero .hero-visual > img, .home-hero .hero-visual > img');
  }

  function setReady() {
    document.documentElement.classList.add('manari-home-image-ready');
  }

  function readLocal() {
    try {
      const rows = JSON.parse(localStorage.getItem(LS) || '[]');
      if (!Array.isArray(rows)) return;
      const row = rows
        .filter(x => x && x.active !== false && x.page_key === 'home' && x.content_type === 'image')
        .sort((a,b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0];
      if (row?.value) {
        currentUrl = row.value;
        currentAlt = row.alt_text || '';
      }
    } catch {}
  }

  async function getClient() {
    if (client) return client;
    for (let i = 0; i < 80; i++) {
      if (window.supabase?.createClient && CFG.supabaseUrl && CFG.supabaseAnonKey) {
        client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        return client;
      }
      await new Promise(r => setTimeout(r, 80));
    }
    return null;
  }

  function apply() {
    if (!currentUrl || applying) return null;
    const img = homeImage();
    if (!img) return null;
    applying = true;
    try {
      if (img.getAttribute('src') !== currentUrl && img.src !== currentUrl) img.src = currentUrl;
      if (currentAlt && img.alt !== currentAlt) img.alt = currentAlt;
      img.dataset.manariPortalOverride = 'home-main-image';
      return img;
    } finally {
      applying = false;
    }
  }

  async function preload(url) {
    if (!url) return;
    const probe = new Image();
    probe.decoding = 'async';
    probe.src = url;
    try {
      if (probe.decode) await Promise.race([
        probe.decode(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3500))
      ]);
      else await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), 3500);
        probe.onload = () => { clearTimeout(t); resolve(); };
        probe.onerror = () => { clearTimeout(t); reject(new Error('load')); };
      });
    } catch {}
  }

  async function refresh() {
    document.documentElement.classList.remove('manari-home-image-ready');
    readLocal();

    const c = await getClient();
    if (c) {
      const { data, error } = await c
        .from('portal_layout_overrides')
        .select('value,alt_text,updated_at')
        .eq('page_key', 'home')
        .eq('content_type', 'image')
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (!error && data?.[0]?.value) {
        currentUrl = data[0].value;
        currentAlt = data[0].alt_text || '';
      }
    }

    if (currentUrl) await preload(currentUrl);
    const img = apply();
    if (img && img.decode) {
      try { await Promise.race([img.decode(), new Promise(r => setTimeout(r, 1200))]); } catch {}
    }
    setReady();
  }

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const img = homeImage();
      if (currentUrl && img && img.src !== currentUrl) {
        document.documentElement.classList.remove('manari-home-image-ready');
        apply();
        requestAnimationFrame(setReady);
      }
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src']
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
  window.addEventListener('pageshow', refresh);

  readLocal();
  if (currentUrl) apply();
  const ready = refresh().finally(() => setReady());
  window.ManariHomeImageLock = { refresh, apply, ready };
})();