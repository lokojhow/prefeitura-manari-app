// Prefeitura de Manari — menu lateral vertical de Secretarias V5.1
(() => {
  if (window.__MANARI_VERTICAL_SECRETARIAS__) return;
  window.__MANARI_VERTICAL_SECRETARIAS__ = true;

  const STRIP = '.secretaria-strip';
  const CHIP = '.secretaria-chip[data-dept]';
  let lastStrip = null;
  let sourceContainer = null;

  function ensureStyle(){
    if(document.getElementById('manari-secretarias-vertical-style')) return;
    const s=document.createElement('style');
    s.id='manari-secretarias-vertical-style';
    s.textContent=`
      :root{--manari-sector-rail:148px}
      body.manari-sector-rail-active{padding-left:var(--manari-sector-rail)!important;box-sizing:border-box!important}
      #manariSecretariasRail{position:fixed;left:0;top:74px;bottom:12px;width:var(--manari-sector-rail);z-index:2147481000;background:rgba(255,255,255,.98);border:1px solid #e2e8e3;border-left:0;border-radius:0 18px 18px 0;box-shadow:8px 0 24px rgba(14,59,37,.10);display:flex;flex-direction:column;overflow:hidden}
      #manariSecretariasRail .msr-head{padding:13px 10px 10px;border-bottom:1px solid #e6ece8;color:#153f2b;font:800 13px/1.2 inherit;text-align:center}
      #manariSecretariasRail .secretaria-strip{display:flex!important;flex-direction:column!important;gap:7px!important;overflow-y:auto!important;overflow-x:hidden!important;scroll-behavior:auto!important;padding:9px!important;width:auto!important;max-width:none!important;min-width:0!important;white-space:normal!important;scroll-snap-type:none!important;overscroll-behavior:contain}
      #manariSecretariasRail .secretaria-chip{flex:0 0 auto!important;width:100%!important;min-width:0!important;max-width:none!important;box-sizing:border-box!important;margin:0!important;white-space:normal!important;scroll-snap-align:none!important;justify-content:flex-start!important;text-align:left!important;border-radius:12px!important;padding:9px 8px!important;min-height:52px!important}
      #manariSecretariasRail .secretaria-chip *{white-space:normal!important}
      .manari-sector-source-hidden{display:none!important}
      @media(max-width:700px){
        :root{--manari-sector-rail:96px}
        #manariSecretariasRail{top:66px;bottom:8px;border-radius:0 14px 14px 0}
        #manariSecretariasRail .msr-head{font-size:11px;padding:10px 5px 7px}
        #manariSecretariasRail .secretaria-strip{gap:6px!important;padding:6px!important}
        #manariSecretariasRail .secretaria-chip{padding:7px 5px!important;min-height:48px!important;font-size:10.5px!important;line-height:1.15!important;justify-content:center!important;text-align:center!important;flex-direction:column!important}
        #manariSecretariasRail .secretaria-chip img,#manariSecretariasRail .secretaria-chip svg,#manariSecretariasRail .secretaria-chip .icon{max-width:24px!important;max-height:24px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function rail(){
    let r=document.getElementById('manariSecretariasRail');
    if(!r){
      r=document.createElement('aside');
      r.id='manariSecretariasRail';
      r.setAttribute('aria-label','Secretarias e áreas');
      r.innerHTML='<div class="msr-head">Secretarias e áreas</div>';
      document.body.appendChild(r);
    }
    return r;
  }

  function hideOldContainer(strip){
    const p=strip.parentElement;
    if(!p || p.id==='manariSecretariasRail') return;
    sourceContainer=p;
    // A faixa antiga fica vazia no conteúdo principal; escondemos apenas o bloco que a continha
    // quando ele aparenta ser o bloco exclusivo de navegação das secretarias.
    const text=(p.textContent||'').toLowerCase();
    if(text.includes('secretarias') || p.children.length<=4) p.classList.add('manari-sector-source-hidden');
  }

  function install(){
    ensureStyle();
    const candidates=[...document.querySelectorAll(STRIP)].filter(x=>!x.closest('#manariSecretariasRail'));
    const strip=candidates[0] || document.querySelector('#manariSecretariasRail '+STRIP);
    if(!strip) return false;
    if(strip.closest('#manariSecretariasRail')){document.body.classList.add('manari-sector-rail-active');lastStrip=strip;return true;}

    hideOldContainer(strip);
    const r=rail();
    r.appendChild(strip);
    strip.scrollLeft=0;
    document.body.classList.add('manari-sector-rail-active');
    lastStrip=strip;
    return true;
  }

  // Não há mais navegação horizontal nem rotina que tente recentralizar a faixa.
  // O item selecionado apenas é mantido visível verticalmente, sem alterar a posição da página.
  document.addEventListener('click',e=>{
    const chip=e.target.closest?.('#manariSecretariasRail '+CHIP);
    if(!chip) return;
    requestAnimationFrame(()=>chip.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'}));
  },true);

  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued) return;queued=true;
    requestAnimationFrame(()=>{queued=false;install();});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener('pageshow',install);
  window.addEventListener('resize',()=>{if(lastStrip)lastStrip.scrollLeft=0;});
  install();
  setTimeout(install,500);
  setTimeout(install,1500);
})();