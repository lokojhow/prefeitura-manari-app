// Prefeitura de Manari — integração autenticação -> CMS V4
(() => {
  if (window.__MANARI_CMS_BRIDGE__) return;
  window.__MANARI_CMS_BRIDGE__ = true;

  function enhance(){
    document.querySelectorAll('.mpa-body [data-open-module]').forEach(btn=>{
      btn.textContent='Abrir sistema de gestão do setor';
      btn.setAttribute('data-open-cms','true');
    });
    const adminCard=[...document.querySelectorAll('.mpa-body .mpa-card')].find(x=>x.textContent.includes('Administrador Geral'));
    if(adminCard && !adminCard.querySelector('[data-open-cms-admin]')){
      const actions=adminCard.querySelector('.mpa-actions')||adminCard;
      const b=document.createElement('button');b.type='button';b.className='mpa-btn';b.dataset.openCmsAdmin='true';b.textContent='Abrir sistema de gestão completo';actions.prepend(b);
    }
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-open-cms],[data-open-cms-admin]');
    if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    window.ManariPortalAuth?.close?.();
    window.ManariSectorCMS?.open();
  },true);

  const observer=new MutationObserver(enhance);
  function boot(){enhance();observer.observe(document.documentElement,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();