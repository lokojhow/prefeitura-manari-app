// Prefeitura de Manari — correções funcionais leves do layout social V2
(() => {
  if (window.__MANARI_SOCIAL_FIXES__) return;
  window.__MANARI_SOCIAL_FIXES__ = true;

  const DEPTS = [
    ['todos','Todas as áreas','🏛️'],['administracao','Administração','🏢'],['saude','Saúde','❤️'],['educacao','Educação','🎓'],
    ['infraestrutura','Infraestrutura e Obras','🚧'],['assistencia','Assistência Social','🤝'],['agricultura','Agricultura','🌾'],
    ['esportes','Esporte e Lazer','⚽'],['transportes','Transportes','🚌'],['financas','Finanças','💰'],['controle_interno','Controle Interno','📊']
  ];

  const css = `
    .sm-dept-modal{position:fixed;inset:0;z-index:1450;background:rgba(3,25,18,.58);display:none;align-items:flex-end;justify-content:center}
    .sm-dept-modal.open{display:flex}.sm-dept-panel{width:min(680px,100%);max-height:90vh;overflow:auto;background:#f8f9f8;border-radius:24px 24px 0 0;padding:18px}
    .sm-dept-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.sm-dept-head h2{margin:0;color:#0b2f50}.sm-dept-close{width:38px;height:38px;border-radius:50%;border:1px solid #dde5df;background:#fff;font-size:22px}
    .sm-dept-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sm-dept-item{border:1px solid #e3e8e5;border-radius:14px;background:#fff;padding:13px;text-align:left;display:flex;align-items:center;gap:10px;color:#1d2f3f;font-weight:800}.sm-dept-item i{font-style:normal;font-size:22px}
    .sm-post-actions button:nth-child(2){display:none!important}.sm-post-actions button{font-size:12px!important}.sm-post-actions .save{display:none!important}
    @media(max-width:520px){.sm-dept-grid{grid-template-columns:1fr}}
  `;

  function style(){if(document.getElementById('manariSocialFixesStyle')) return;const s=document.createElement('style');s.id='manariSocialFixesStyle';s.textContent=css;document.head.appendChild(s)}
  function toast(msg){let t=document.querySelector('.sm-toast');if(!t){t=document.createElement('div');t.className='sm-toast';document.body.appendChild(t)}t.textContent=msg;t.classList.add('show');clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.remove('show'),1900)}
  function ensureDeptModal(){let modal=document.querySelector('.sm-dept-modal');if(modal)return modal;modal=document.createElement('div');modal.className='sm-dept-modal';modal.innerHTML=`<section class="sm-dept-panel" role="dialog" aria-modal="true"><div class="sm-dept-head"><h2>Secretarias e Áreas</h2><button type="button" class="sm-dept-close" aria-label="Fechar">×</button></div><div class="sm-dept-grid">${DEPTS.map(([id,label,icon])=>`<button type="button" class="sm-dept-item" data-fix-dept="${id}"><i>${icon}</i><span>${label}</span></button>`).join('')}</div></section>`;document.body.appendChild(modal);return modal}
  function openDepartments(){ensureDeptModal().classList.add('open');document.body.style.overflow='hidden'}
  function closeDepartments(){document.querySelector('.sm-dept-modal')?.classList.remove('open');document.body.style.overflow=''}
  function chooseDept(id){closeDepartments();const story=document.querySelector(`.sm-story[data-dept="${CSS.escape(id)}"]`);if(story){story.click();return}if(id==='todos'){document.querySelector('.sm-bottom-btn[data-nav="home"]')?.click();return}toast('Área disponível pelo menu de serviços.')}
  function openSearch(){const input=document.querySelector('.sm-search input');if(!input)return;window.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>input.focus(),180)}

  function patchOnce(){
    const root=document.getElementById('manariSocialApp'); if(!root) return false;
    style();
    const bottom=Array.from(root.querySelectorAll('.sm-bottom-btn')).find(b=>/buscar/i.test(b.textContent||'')); if(bottom) bottom.dataset.nav='search';
    const dept=Array.from(root.querySelectorAll('.sm-side-btn')).find(b=>/secretarias e áreas/i.test(b.textContent||'')); if(dept) dept.dataset.nav='departments';
    root.querySelectorAll('.sm-post-actions').forEach(actions=>{const buttons=actions.querySelectorAll('button');if(buttons[0]&&buttons[0].textContent!=='♡ Curtir')buttons[0].textContent='♡ Curtir';if(buttons[2]&&buttons[2].textContent!=='↗ Compartilhar')buttons[2].textContent='↗ Compartilhar'});
    return true;
  }

  document.addEventListener('click',e=>{
    const search=e.target.closest('[data-nav="search"]');if(search){e.preventDefault();e.stopPropagation();openSearch();return}
    const departments=e.target.closest('[data-nav="departments"]');if(departments){e.preventDefault();e.stopPropagation();openDepartments();return}
    if(e.target.closest('.sm-dept-close')||e.target.classList.contains('sm-dept-modal')){closeDepartments();return}
    const dept=e.target.closest('[data-fix-dept]');if(dept){chooseDept(dept.dataset.fixDept);return}
    const bell=e.target.closest('.sm-circle-btn[title="Notificações"]');if(bell){e.preventDefault();if(!('Notification' in window)){toast('Notificações não disponíveis neste dispositivo.');return}if(Notification.permission==='granted'){toast('Notificações já estão autorizadas.');return}Notification.requestPermission().then(p=>toast(p==='granted'?'Notificações autorizadas.':'Permissão de notificações não concedida.'))}
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDepartments()});

  let tries=0;
  const timer=setInterval(()=>{tries++;if(patchOnce()||tries>=20)clearInterval(timer)},200);
  setTimeout(patchOnce,1500);
  setTimeout(patchOnce,3500);
})();
