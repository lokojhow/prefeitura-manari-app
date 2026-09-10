// Prefeitura de Manari — Central da Transparência integrada ao layout Social V2
(() => {
  if (window.ManariTransparency) return;
  const CFG = window.MANARI_CONFIG || {};
  let serviceCache = null;
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const categories = [
    {title:'Execução financeira',icon:'💰',items:[
      {title:'Receitas',pending:'A consulta oficial de receitas existe no portal, mas a URL específica ainda não foi confirmada com segurança.'},
      {title:'Despesas',url:'https://w3d.app.br/manari/despesas/despesas-gerais/',source:'Portal da Transparência de Manari'},
      {title:'Empenhos',url:'https://w3d.app.br/manari/despesas/despesas-detalhadas/',source:'Portal da Transparência de Manari'},
      {title:'Pagamentos',url:'https://w3d.app.br/manari/despesas/pagamentos/',source:'Portal da Transparência de Manari'},
      {title:'Transferências',pending:'A seção oficial existe, porém a consulta específica ainda precisa de confirmação documental/URL.'}
    ]},
    {title:'Pessoal',icon:'👥',items:[
      {title:'Servidores e Remunerações',url:'https://w3d.app.br/manari/recursos-humanos/servidores-e-remuneracoes/',source:'Portal da Transparência de Manari'},
      {title:'Folha de Pagamento',pending:'Não foi confirmada uma consulta pública específica de folha de pagamento distinta de remunerações/contracheque.'},
      {title:'Diárias',url:'https://w3d.app.br/manari/recursos-humanos/diarias/',source:'Portal da Transparência de Manari'}
    ]},
    {title:'Compras públicas',icon:'🧾',items:[
      {title:'Licitações',url:'https://w3d.app.br/manari/licitacoes/processos-licitatorios/',source:'Portal da Transparência de Manari'},
      {title:'Contratos',url:'https://w3d.app.br/manari/contratos/contratos-administrativos/',source:'Portal da Transparência de Manari'},
      {title:'Dispensas/Inexigibilidades',pending:'As duas seções aparecem no portal oficial, mas não foi confirmada uma única consulta específica segura para o card combinado.'},
      {title:'Fornecedores',pending:'A consulta aparece no mapa oficial, mas a URL específica ainda precisa ser confirmada.'}
    ]},
    {title:'Planejamento e contas',icon:'📊',items:[
      {title:'PPA',pending:'A seção PPA é indicada no portal, porém a URL específica não foi confirmada com segurança.'},
      {title:'LDO',url:'https://w3d.app.br/manari/planejamento-orcamentario/lei-de-diretrizes-orcamentarias-ldo/',source:'Portal da Transparência de Manari'},
      {title:'LOA',url:'https://w3d.app.br/manari/planejamento-orcamentario/lei-orcamentaria-anual-loa/',source:'Portal da Transparência de Manari'},
      {title:'RREO',url:'https://w3d.app.br/manari/relatorios-fiscais/relatorio-resumido-da-execucao-orcamentaria-rreo/',source:'Portal da Transparência de Manari'},
      {title:'RGF',url:'https://w3d.app.br/manari/relatorios-fiscais/relatorio-de-gestao-fiscal-rgf/',source:'Portal da Transparência de Manari'},
      {title:'Prestação de Contas',url:'https://w3d.app.br/manari/prestacao-de-contas/prestacao-de-contas-anual/',source:'Portal da Transparência de Manari'}
    ]},
    {title:'Recursos e investimentos',icon:'🏗️',items:[
      {title:'Convênios',url:'https://w3d.app.br/manari/transferencia-s-financeiras/convenios-firmados-com-outras-entidades/',source:'Portal da Transparência de Manari'},
      {title:'Emendas Parlamentares',service:'Emendas Parlamentares'},
      {title:'Obras Públicas',pending:'O portal lista painel/execução de obras, mas não foi confirmada nesta revisão uma URL pública específica e estável.'},
      {title:'Patrimônio',pending:'Nenhuma consulta oficial específica foi comprovada nesta revisão.'},
      {title:'Frota',pending:'Nenhuma consulta oficial específica foi comprovada nesta revisão.'}
    ]},
    {title:'Atos oficiais',icon:'⚖️',items:[
      {title:'Leis Municipais',internal:'laws',source:'Biblioteca interna / Supabase'},
      {title:'Decretos',url:'https://w3d.app.br/manari/index.php/institucional/atos-oficiais/decretos/',source:'Portal da Transparência de Manari'},
      {title:'Portarias',url:'https://w3d.app.br/manari/institucional/atos-oficiais/portarias/',source:'Portal da Transparência de Manari'},
      {title:'Diário Oficial',service:'Diário Oficial'},
      {title:'Editais',pending:'Não foi confirmada uma consulta geral de editais distinta das páginas de licitações/concursos.'},
      {title:'Concursos e Seleções',url:'https://w3d.app.br/manari/institucional/atos-oficiais/edital-de-concurso-publico/',source:'Portal da Transparência de Manari',note:'Fonte confirmada para concursos; seleções dependem de publicação específica.'}
    ]},
    {title:'Controle e cidadão',icon:'🛡️',items:[
      {title:'LAI/e-SIC',service:'e-SIC / Pedido de Informação'},
      {title:'Ouvidoria',service:'Ouvidoria Municipal'},
      {title:'Carta de Serviços',service:'Carta de Serviços'},
      {title:'LGPD',url:'https://w3d.app.br/manari/lgpd/lei-geral-de-protecao-de-dados-lgpd/',source:'Portal da Transparência de Manari'},
      {title:'Controle Interno',pending:'Há identificação do setor responsável no portal, mas não foi confirmada uma página específica de consulta institucional.'},
      {title:'Auditorias',url:'https://w3d.app.br/manari/fiscalizacao-e-controle/resulta-de-auditorias-realizadas-pelo-controle-interno/',source:'Portal da Transparência de Manari'},
      {title:'Dados Abertos',service:'Dados Abertos'}
    ]}
  ];

  async function loadServices(){
    if(serviceCache) return serviceCache;
    if(!CFG.supabaseUrl || !CFG.supabaseAnonKey){ serviceCache=[]; return serviceCache; }
    try{
      const r=await fetch(`${CFG.supabaseUrl}/rest/v1/app_services?select=title,service_url,summary,active&active=eq.true`,{headers:{apikey:CFG.supabaseAnonKey,Authorization:`Bearer ${CFG.supabaseAnonKey}`},cache:'no-store'});
      serviceCache=r.ok?await r.json():[];
    }catch{ serviceCache=[]; }
    return serviceCache;
  }
  function findService(title){
    const n=norm(title);
    return (serviceCache||[]).find(x=>norm(x.title)===n) || (serviceCache||[]).find(x=>norm(x.title).includes(n)||n.includes(norm(x.title)));
  }
  function resolved(item){
    if(item.internal) return {...item,status:'ok'};
    if(item.url) return {...item,status:'ok'};
    if(item.service){
      const s=findService(item.service);
      if(s?.service_url) return {...item,url:s.service_url,source:'Serviço já cadastrado no aplicativo / Supabase',status:'ok'};
      return {...item,pending:'Serviço ainda não possui fonte ativa confirmada no aplicativo.',status:'pending'};
    }
    return {...item,status:'pending'};
  }
  function build(){
    const main=document.querySelector('#manariSocialApp .sm-main');
    if(!main || main.querySelector('.sm-transparency-view')) return;
    const view=document.createElement('section');
    view.className='sm-transparency-view';
    view.setAttribute('aria-label','Central da Transparência');
    main.appendChild(view);
  }
  function render(q=''){
    build();
    const view=document.querySelector('.sm-transparency-view'); if(!view)return;
    const nq=norm(q);
    const resolvedCats=categories.map(c=>({...c,items:c.items.map(resolved)}));
    const all=resolvedCats.flatMap(c=>c.items);
    const ok=all.filter(i=>i.status==='ok').length, pending=all.length-ok;
    const sections=resolvedCats.map(c=>{
      const cards=c.items.map(i=>{
        const hay=norm(`${c.title} ${i.title} ${i.note||''} ${i.pending||''}`);
        const hidden=nq&&!hay.includes(nq)?' sm-tp-hidden':'';
        const pendingClass=i.status==='pending'?' pending':'';
        const attrs=i.status==='ok'?`data-tp-title="${esc(i.title)}"${i.url?` data-tp-url="${esc(i.url)}"`:''}${i.internal?` data-tp-internal="${esc(i.internal)}"`:''}`:'';
        return `<button class="sm-tp-card${pendingClass}${hidden}" ${attrs} type="button"><div class="sm-tp-card-top"><b>${esc(i.title)}</b><span class="sm-tp-status">${i.status==='ok'?'Fonte oficial':'Pendente'}</span></div><small>${esc(i.note||i.pending||'Abrir consulta oficial específica')}</small><span class="sm-tp-source">${esc(i.source||'Aguardando comprovação da fonte')}</span></button>`;
      }).join('');
      const visible=c.items.some(i=>!nq||norm(`${c.title} ${i.title} ${i.note||''} ${i.pending||''}`).includes(nq));
      return `<section class="sm-tp-category${visible?'':' sm-tp-hidden'}"><div class="sm-tp-category-head"><span class="sm-tp-category-icon">${c.icon}</span><h2>${esc(c.title)}</h2></div><div class="sm-tp-grid">${cards}</div></section>`;
    }).join('');
    view.innerHTML=`<div class="sm-transparency-head"><button class="sm-transparency-back" type="button" aria-label="Voltar">←</button><div class="sm-transparency-title"><h1>Central da Transparência</h1><p>Consultas oficiais organizadas por assunto, dentro do aplicativo da Prefeitura de Manari.</p></div></div><div class="sm-transparency-search"><input type="search" value="${esc(q)}" placeholder="Buscar receitas, contratos, servidores, leis..." aria-label="Buscar na Central da Transparência"><span>⌕</span></div><div class="sm-tp-summary"><span class="sm-tp-chip ok">${ok} itens com fonte confirmada</span><span class="sm-tp-chip pending">${pending} itens pendentes de comprovação</span></div>${sections}<div class="sm-tp-empty">Nenhum item encontrado para esta busca.</div><div class="sm-tp-note"><strong>Critério de publicação:</strong> a Central não considera um requisito atendido apenas por existir um card. Itens sem fonte oficial específica comprovada ficam identificados como pendentes até que a Prefeitura disponibilize ou confirme a consulta/documento correspondente.</div>`;
    const any=resolvedCats.some(c=>c.items.some(i=>!nq||norm(`${c.title} ${i.title} ${i.note||''} ${i.pending||''}`).includes(nq)));
    view.querySelector('.sm-tp-empty').style.display=any?'none':'block';
  }
  async function open(){
    await loadServices();
    document.querySelectorAll('#manariSocialApp [data-nav="transparencia"]').forEach(el=>el.dataset.nav='transparencia-central');
    document.querySelector('#manariSocialApp .sm-content')?.classList.add('sm-tp-hidden');
    document.querySelector('.sm-transparency-view')?.classList.add('open');
    render('');
    document.querySelector('.sm-transparency-view')?.classList.add('open');
    document.querySelector('#manariSocialApp .sm-main')?.scrollTo?.({top:0,behavior:'smooth'});
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function close(){
    document.querySelector('.sm-transparency-view')?.classList.remove('open');
    document.querySelector('#manariSocialApp .sm-content')?.classList.remove('sm-tp-hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function handleCard(card){
    const internal=card.dataset.tpInternal;
    if(internal==='laws'){
      close();
      if(window.ManariLaws?.open) window.ManariLaws.open(); else location.hash='#manari-laws';
      return;
    }
    if(card.dataset.tpUrl) window.open(card.dataset.tpUrl,'_blank','noopener');
  }
  function adaptNav(){
    document.querySelectorAll('#manariSocialApp [data-nav="transparencia"]').forEach(el=>el.dataset.nav='transparencia-central');
  }
  const observer=new MutationObserver(adaptNav);
  function boot(){
    build(); adaptNav();
    observer.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      const nav=e.target.closest('#manariSocialApp [data-nav="transparencia-central"]');
      if(nav){e.preventDefault();e.stopPropagation();open();return;}
      if(e.target.closest('.sm-transparency-back')){close();return;}
      const card=e.target.closest('.sm-tp-card[data-tp-title]'); if(card){handleCard(card);return;}
    },true);
    document.addEventListener('input',e=>{if(e.target.matches('.sm-transparency-search input')) render(e.target.value)},true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.sm-transparency-view.open'))close()});
  }
  window.ManariTransparency={open,close,render};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();