// Campanha visual do portal — preserva marcas e conteúdo das secretarias.
(()=>{
 if(window.__MANARI_NOVEMBRO_AZUL__)return;window.__MANARI_NOVEMBRO_AZUL__=true;
 document.body.classList.add('manari-novembro-azul');
 const main=document.getElementById('mainView');if(!main)return;
 function mount(){
  if(document.getElementById('manariNovembroAzul'))return;
  const banner=document.createElement('aside');banner.id='manariNovembroAzul';banner.className='novembro-azul-banner';banner.setAttribute('aria-label','Campanha Novembro Azul');
  banner.innerHTML=`<svg class="novembro-azul-ribbon" viewBox="0 0 64 80" fill="none" aria-hidden="true"><path d="M19 30C8 8 22 3 32 3s24 5 13 27L24 72 10 62 35 19c4-7-10-7-6 0l25 43-14 10Z" fill="currentColor"/><path d="m24 72 21-42" stroke="#fff" stroke-opacity=".35" stroke-width="2"/></svg><div><span class="novembro-azul-eyebrow">PREFEITURA DE MANARI • JUNTOS PELA SAÚDE</span><h2>Novembro <strong>Azul</strong></h2><p>Cuidar da saúde também é atitude de homem.</p><span class="novembro-azul-note">Mês de conscientização sobre a saúde do homem.</span></div>`;
  main.prepend(banner);
 }
 new MutationObserver(mount).observe(main,{childList:true});mount();
})();
