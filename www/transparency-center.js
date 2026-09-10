// Prefeitura de Manari — Central da Transparência interna V3
(() => {
  if (window.ManariTransparency) return;
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const item=(title,module,note='Consulta e documentos publicados pelo setor responsável.')=>({title,module,note});
  const categories = [
    {title:'Execução financeira',icon:'💰',items:[item('Receitas','receitas'),item('Despesas','despesas'),item('Empenhos','empenhos'),item('Pagamentos','pagamentos'),item('Transferências','transferencias')]},
    {title:'Pessoal',icon:'👥',items:[item('Servidores e Remunerações','servidores_remuneracoes'),item('Folha de Pagamento','folha_pagamento'),item('Diárias','diarias'),item('Contracheque / Olerite','contracheque','Área privada: cada servidor acessa somente os próprios contracheques.')]},
    {title:'Compras públicas',icon:'🧾',items:[item('Licitações','licitacoes'),item('Contratos','contratos'),item('Dispensas e Inexigibilidades','dispensas_inexigibilidades'),item('Fornecedores','fornecedores')]},
    {title:'Planejamento e contas',icon:'📊',items:[item('PPA','ppa'),item('LDO','ldo'),item('LOA','loa'),item('RREO','rreo'),item('RGF','rgf'),item('Prestação de Contas','prestacao_contas')]},
    {title:'Recursos e investimentos',icon:'🏗️',items:[item('Convênios','convenios'),item('Emendas Parlamentares','emendas'),item('Obras Públicas','obras_publicas'),item('Patrimônio','patrimonio'),item('Frota','frota')]},
    {title:'Atos oficiais',icon:'⚖️',items:[item('Leis Municipais','leis'),item('Decretos','decretos'),item('Portarias','portarias'),item('Diário Oficial','diario_oficial'),item('Editais','editais'),item('Concursos e Seleções','concursos_selecoes')]},
    {title:'Controle e cidadão',icon:'🛡️',items:[item('LAI / e-SIC','esic'),item('Ouvidoria','ouvidoria'),item('Carta de Serviços','carta_servicos'),item('LGPD','lgpd'),item('Controle Interno','controle_interno'),item('Auditorias','auditorias'),item('Dados Abertos','dados_abertos')]}
  ];
  function build(){
    const main=document.querySelector('#manariSocialApp .sm-main');
    if(!main || main.querySelector('.sm-transparency-view')) return;
    const view=document.createElement('section');view.className='sm-transparency-view';view.setAttribute('aria-label','Central da Transparência');main.appendChild(view);
  }
  function render(q=''){
    build(); const view=document.querySelector('.sm-transparency-view'); if(!view)return;
    const nq=norm(q); let visibleCount=0;
    const sections=categories.map(c=>{
      const cards=c.items.map(i=>{
        const hay=norm(`${c.title} ${i.title} ${i.note}`); const hidden=nq&&!hay.includes(nq)?' sm-tp-hidden':''; if(!hidden)visibleCount++;
        return `<button class="sm-tp-card${hidden}" data-tp-title="${esc(i.title)}" data-tp-module="${esc(i.module)}" type="button"><div class="sm-tp-card-top"><b>${esc(i.title)}</b><span class="sm-tp-status">Dentro do app</span></div><small>${esc(i.note)}</small><span class="sm-tp-source">Prefeitura Municipal de Manari</span></button>`;
      }).join('');
      const visible=c.items.some(i=>!nq||norm(`${c.title} ${i.title} ${i.note}`).includes(nq));
      return `<section class="sm-tp-category${visible?'':' sm-tp-hidden'}"><div class="sm-tp-category-head"><span class="sm-tp-category-icon">${c.icon}</span><h2>${esc(c.title)}</h2></div><div class="sm-tp-grid">${cards}</div></section>`;
    }).join('');
    view.innerHTML=`<div class="sm-transparency-head"><button class="sm-transparency-back" type="button" aria-label="Voltar">←</button><div class="sm-transparency-title"><h1>Central da Transparência</h1><p>Todas as consultas são abertas dentro do aplicativo. Os setores responsáveis alimentam os módulos com documentos e dados oficiais.</p></div></div><div class="sm-transparency-search"><input type="search" value="${esc(q)}" placeholder="Buscar receitas, contratos, servidores, leis..." aria-label="Buscar na Central da Transparência"><span>⌕</span></div><div class="sm-tp-summary"><span class="sm-tp-chip ok">${categories.reduce((n,c)=>n+c.items.length,0)} módulos internos</span></div>${sections}<div class="sm-tp-empty" style="display:${visibleCount?'none':'block'}">Nenhum item encontrado para esta busca.</div><div class="sm-tp-note"><strong>Portal integrado:</strong> quando um setor ainda não publicou documentos, o módulo permanece disponível e informa que está aguardando alimentação. O cidadão não é enviado para outro portal.</div>`;
  }
  function open(){
    document.querySelectorAll('#manariSocialApp [data-nav="transparencia"]').forEach(el=>el.dataset.nav='transparencia-central');
    document.querySelector('#manariSocialApp .sm-content')?.classList.add('sm-tp-hidden');
    render(''); document.querySelector('.sm-transparency-view')?.classList.add('open');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function close(){document.querySelector('.sm-transparency-view')?.classList.remove('open');document.querySelector('#manariSocialApp .sm-content')?.classList.remove('sm-tp-hidden');window.scrollTo({top:0,behavior:'smooth'});}
  function adaptNav(){document.querySelectorAll('#manariSocialApp [data-nav="transparencia"]').forEach(el=>el.dataset.nav='transparencia-central');}
  const observer=new MutationObserver(adaptNav);
  function boot(){
    build();adaptNav();observer.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      const nav=e.target.closest('#manariSocialApp [data-nav="transparencia-central"]');if(nav){e.preventDefault();e.stopImmediatePropagation();open();return;}
      if(e.target.closest('.sm-transparency-back')){close();return;}
      const card=e.target.closest('.sm-tp-card[data-tp-module]');if(card){e.preventDefault();e.stopImmediatePropagation();window.ManariPortalInternal?.open(card.dataset.tpTitle,card.dataset.tpModule);}
    },true);
    document.addEventListener('input',e=>{if(e.target.matches('.sm-transparency-search input'))render(e.target.value)},true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.sm-transparency-view.open'))close()});
  }
  window.ManariTransparency={open,close,render};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();