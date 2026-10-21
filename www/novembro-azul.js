// Campanha visual do portal — preserva marcas e conteúdo das secretarias.
(()=>{
 if(window.__MANARI_OUTUBRO_ROSA__)return;window.__MANARI_OUTUBRO_ROSA__=true;
 document.body.classList.add('manari-outubro-rosa');
 const main=document.getElementById('mainView');if(!main)return;
 function mount(){
  if(document.getElementById('manariOutubroRosa'))return;
  const banner=document.createElement('aside');banner.id='manariOutubroRosa';banner.className='outubro-rosa-banner';banner.setAttribute('aria-label','Campanha Outubro Rosa');
  banner.innerHTML=`<svg class="outubro-rosa-ribbon" viewBox="0 0 64 80" fill="none" aria-hidden="true"><path d="M19 30C8 8 22 3 32 3s24 5 13 27L24 72 10 62 35 19c4-7-10-7-6 0l25 43-14 10Z" fill="currentColor"/><path d="m24 72 21-42" stroke="#fff" stroke-opacity=".35" stroke-width="2"/></svg><div><span class="outubro-rosa-eyebrow">PREFEITURA DE MANARI • JUNTOS PELA SAÚDE</span><h2>Outubro <strong>Rosa</strong></h2><p>Um toque de cuidado, uma vida de possibilidades.</p><span class="outubro-rosa-note">Mês de conscientização sobre o câncer de mama.</span></div>`;
  main.prepend(banner);
 }
 new MutationObserver(mount).observe(main,{childList:true});mount();
})();
