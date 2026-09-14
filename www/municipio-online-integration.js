// Prefeitura de Manari — integração Município Online V5.8
(() => {
  if (window.ManariMunicipioOnline) return;
  const BASE='https://www.municipioonline.com.br/pe/prefeitura/manari';
  const groups=[
    {title:'Transparência e execução',items:[
      ['Portal completo do cidadão','/cidadao'],['Receitas','/cidadao/receita'],['Despesas','/cidadao/despesa'],['Execução orçamentária','/cidadao/transparencia'],['Servidores e remunerações','/cidadao/servidor'],['Relatório de Gestão Fiscal (RGF)','/cidadao/publicacoes/rgf'],['Emendas Parlamentares','/cidadao/publicacaoemenda'],['Autenticação de documentos','/cidadao/autenticacaodocumento'],['Ações Covid-19','/covid-19']
    ]},
    {title:'Contribuinte',items:[
      ['Serviços do contribuinte','/contribuinte'],['Nota Fiscal de Serviço','/contribuinte/notafiscal'],['Dívida Ativa','/contribuinte/dividaativa']
    ]},
    {title:'Áreas restritas',items:[
      ['Servidor — login e serviços','/servidor/login'],['Fornecedor — login e serviços','/fornecedor/login']
    ]}
  ];
  const css=`
  .moi-overlay{position:fixed;inset:0;z-index:2147483300;background:rgba(6,28,46,.7);display:none;font-family:inherit}.moi-overlay.open{display:block}.moi-shell{position:absolute;inset:0;background:#f7f8f5;display:grid;grid-template-rows:auto 1fr}.moi-head{display:grid;grid-template-columns:48px 1fr 48px;gap:10px;align-items:center;padding:12px max(12px,env(safe-area-inset-right)) 12px max(12px,env(safe-area-inset-left));padding-top:max(12px,env(safe-area-inset-top));background:#fff;border-bottom:1px solid #dce4df}.moi-head h1{font-size:22px;margin:0;color:#123e5b}.moi-head p{margin:2px 0 0;color:#687985;font-size:12px}.moi-back,.moi-close{width:44px;height:44px;border:0;border-radius:13px;background:#edf3ef;color:#123e5b;font-size:24px;font-weight:800}.moi-body{overflow:auto;padding:16px}.moi-intro{max-width:1100px;margin:0 auto 14px;background:#eaf6ef;border:1px solid #cfe5d8;border-radius:16px;padding:14px;color:#24523a}.moi-grid{max-width:1100px;margin:0 auto;display:grid;gap:14px}.moi-group{background:#fff;border:1px solid #e0e6e2;border-radius:18px;padding:15px}.moi-group h2{margin:0 0 10px;color:#123e5b;font-size:19px}.moi-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.moi-card{min-height:86px;text-align:left;border:1px solid #dfe7e2;border-radius:14px;background:#fff;padding:13px;color:#173f5c;font-weight:800;box-shadow:0 4px 13px rgba(9,52,76,.05)}.moi-card small{display:block;margin-top:5px;font-weight:500;color:#6b7b85}.moi-view{display:none;height:100%;grid-template-rows:auto 1fr;background:#fff}.moi-view.open{display:grid}.moi-framebar{display:flex;align-items:center;gap:9px;padding:9px 12px;border-bottom:1px solid #dfe6e2;background:#f7faf8}.moi-framebar button{border:0;border-radius:10px;background:#0b8748;color:#fff;padding:9px 12px;font-weight:800}.moi-framebar strong{color:#173f5c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.moi-frame{width:100%;height:100%;border:0;background:#fff}.moi-home.hidden{display:none}.moi-note{font-size:12px;color:#6a7b85;margin-top:8px}@media(max-width:780px){.moi-body{padding:10px}.moi-cards{grid-template-columns:1fr}.moi-group{padding:12px}.moi-head h1{font-size:19px}.moi-framebar{padding:8px}}
  `;
  function ensure(){
    if(document.querySelector('.moi-overlay'))return;
    const s=document.createElement('style');s.id='moi-style';s.textContent=css;document.head.appendChild(s);
    const o=document.createElement('div');o.className='moi-overlay';o.innerHTML='<div class="moi-shell"><header class="moi-head"><button class="moi-back" type="button" aria-label="Voltar">←</button><div><h1>Central integrada de serviços</h1><p>Conteúdo público da Prefeitura de Manari exibido dentro do aplicativo.</p></div><button class="moi-close" type="button" aria-label="Fechar">×</button></header><main class="moi-body"><div class="moi-home"></div><section class="moi-view"><div class="moi-framebar"><button type="button" class="moi-frame-back">← Central</button><strong></strong></div><iframe class="moi-frame" title="Serviço público da Prefeitura de Manari" referrerpolicy="no-referrer-when-downgrade"></iframe></section></main></div>';
    document.body.appendChild(o);
    o.querySelector('.moi-close').onclick=close;
    o.querySelector('.moi-back').onclick=()=>o.querySelector('.moi-view.open')?showHub():close();
    o.querySelector('.moi-frame-back').onclick=showHub;
    renderHub();
  }
  function renderHub(){ensure();const home=document.querySelector('.moi-home');home.innerHTML='<div class="moi-intro"><strong>Transparência e serviços em um só lugar.</strong><div class="moi-note">Os dados continuam sendo fornecidos pelo sistema Município Online usado pela Prefeitura, mas o cidadão permanece dentro do aplicativo de Manari.</div></div><div class="moi-grid">'+groups.map(g=>`<section class="moi-group"><h2>${g.title}</h2><div class="moi-cards">${g.items.map(([t,p])=>`<button class="moi-card" type="button" data-moi-path="${p}" data-moi-title="${t}">${t}<small>Abrir dentro do aplicativo</small></button>`).join('')}</div></section>`).join('')+'</div>';home.querySelectorAll('.moi-card').forEach(b=>b.onclick=()=>openPage(b.dataset.moiTitle,b.dataset.moiPath));}
  function openHub(){ensure();document.querySelector('.moi-overlay').classList.add('open');document.body.style.overflow='hidden';showHub()}
  function showHub(){const o=document.querySelector('.moi-overlay');if(!o)return;o.querySelector('.moi-home').classList.remove('hidden');o.querySelector('.moi-view').classList.remove('open');const f=o.querySelector('.moi-frame');f.src='about:blank'}
  function openPage(title,path){ensure();const o=document.querySelector('.moi-overlay');o.classList.add('open');document.body.style.overflow='hidden';o.querySelector('.moi-home').classList.add('hidden');o.querySelector('.moi-view').classList.add('open');o.querySelector('.moi-framebar strong').textContent=title;o.querySelector('.moi-frame').src=path.startsWith('http')?path:BASE+path}
  function close(){const o=document.querySelector('.moi-overlay');if(!o)return;o.classList.remove('open');o.querySelector('.moi-frame').src='about:blank';document.body.style.overflow=''}
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href*="municipioonline.com.br/pe/prefeitura/manari"]');
    if(a){e.preventDefault();e.stopImmediatePropagation();openPage((a.textContent||'Serviço da Prefeitura').trim(),a.href);return}
    const el=e.target.closest('[data-service-url],.popular-card,.program-band>div,.service-card,.sm-tp-card');if(!el)return;
    const t=(el.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if(t.includes('transparencia')){e.preventDefault();e.stopImmediatePropagation();openHub()}
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.moi-overlay.open'))close()});
  ensure();
  window.ManariMunicipioOnline={open:openHub,openPage,close};
})();