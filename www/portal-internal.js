// Prefeitura de Manari — serviços e documentos internos V3
(() => {
  if (window.ManariPortalInternal) return;
  const CFG = window.MANARI_CONFIG || {};
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const slug = s => norm(s).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
  const aliases = {
    'diario_oficial':'diario_oficial','leis_municipais':'leis','emendas_parlamentares':'emendas','licitacoes_e_contratos':'licitacoes',
    'portal_da_transparencia':'transparencia','ouvidoria_municipal':'ouvidoria','e_sic_pedido_de_informacao':'esic','carta_de_servicos':'carta_servicos',
    'contracheque_online':'contracheque','folha_de_pagamento':'folha_pagamento','servidores_e_remuneracoes':'servidores_remuneracoes'
  };
  const moduleFor = title => aliases[slug(title)] || slug(title);
  let client = null;
  let active = null;

  async function getClient(){
    if(client) return client;
    if(!CFG.supabaseUrl || !CFG.supabaseAnonKey) return null;
    for(let i=0;i<60;i++){
      if(window.supabase?.createClient){
        client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
        return client;
      }
      await new Promise(r=>setTimeout(r,100));
    }
    return null;
  }
  async function restDocs(module){
    try{
      const r=await fetch(`${CFG.supabaseUrl}/rest/v1/portal_documents?select=*&module=eq.${encodeURIComponent(module)}&active=eq.true&order=published_at.desc`,{headers:{apikey:CFG.supabaseAnonKey,Authorization:`Bearer ${CFG.supabaseAnonKey}`},cache:'no-store'});
      return r.ok?await r.json():[];
    }catch{return []}
  }
  async function loadDocs(module){
    const c=await getClient();
    if(c){const {data}=await c.from('portal_documents').select('*').eq('module',module).eq('active',true).order('published_at',{ascending:false});return data||[]}
    return restDocs(module);
  }
  function ensure(){
    if(document.querySelector('.mpi-overlay')) return;
    const el=document.createElement('div'); el.className='mpi-overlay'; el.innerHTML='<section class="mpi-panel" role="dialog" aria-modal="true" aria-label="Portal interno"><header class="mpi-head"><button class="mpi-back" aria-label="Voltar">←</button><div><h1></h1><p></p></div><button class="mpi-close" aria-label="Fechar">×</button></header><div class="mpi-search"><input type="search" placeholder="Buscar por título, número, ano ou setor..."></div><div class="mpi-body"></div></section>';
    document.body.appendChild(el);
    el.querySelector('.mpi-close').addEventListener('click',close);
    el.querySelector('.mpi-back').addEventListener('click',close);
    el.addEventListener('click',e=>{if(e.target===el)close()});
    el.querySelector('.mpi-search input').addEventListener('input',()=>renderRows());
  }
  function fmtDate(v){if(!v)return '';try{return new Date(v).toLocaleDateString('pt-BR')}catch{return ''}}
  function documentCard(d){
    const meta=[d.reference_number,d.reference_date?fmtDate(d.reference_date):'',d.year,d.department].filter(Boolean).join(' • ');
    const action=d.file_url?`<a class="mpi-open" href="${esc(d.file_url)}" target="_blank" rel="noopener">Visualizar / baixar</a>`:'';
    return `<article class="mpi-card" data-search="${esc(norm([d.title,d.description,d.reference_number,d.year,d.department,d.category].join(' ')))}"><div class="mpi-card-icon">▤</div><div class="mpi-card-main"><h3>${esc(d.title)}</h3>${meta?`<div class="mpi-meta">${esc(meta)}</div>`:''}${d.description?`<p>${esc(d.description)}</p>`:''}<div class="mpi-actions">${action}</div></div></article>`;
  }
  async function renderRows(){
    const body=document.querySelector('.mpi-body'); if(!body||!active)return;
    const q=norm(document.querySelector('.mpi-search input')?.value);
    if(active.module==='contracheque') return renderPayslips(q);
    const docs=active.docs||[];
    const rows=docs.filter(d=>!q||norm([d.title,d.description,d.reference_number,d.year,d.department,d.category].join(' ')).includes(q));
    body.innerHTML=rows.length?`<div class="mpi-count">${rows.length} ${rows.length===1?'publicação encontrada':'publicações encontradas'}</div><div class="mpi-list">${rows.map(documentCard).join('')}</div>`:`<div class="mpi-empty"><strong>Nenhum documento publicado ainda.</strong><span>Este módulo já funciona dentro do aplicativo. O setor responsável poderá alimentar esta área pelo painel administrativo.</span></div>`;
  }
  async function renderPayslips(q=''){
    const body=document.querySelector('.mpi-body'); if(!body)return;
    const c=await getClient();
    if(!c){body.innerHTML='<div class="mpi-empty"><strong>Não foi possível iniciar o acesso seguro.</strong></div>';return}
    const {data:{session}}=await c.auth.getSession();
    if(!session){
      body.innerHTML='<div class="mpi-empty"><strong>Área privada do servidor.</strong><span>Entre na sua conta para visualizar somente os seus contracheques.</span><button class="mpi-login" type="button">Entrar na conta</button></div>';
      body.querySelector('.mpi-login')?.addEventListener('click',()=>{document.querySelector('#manariSocialApp .sm-circle-btn[title="Conta"]')?.click();});
      return;
    }
    const {data,error}=await c.from('employee_payslips').select('*').eq('user_id',session.user.id).order('competence',{ascending:false});
    if(error){body.innerHTML='<div class="mpi-empty"><strong>Não foi possível carregar os contracheques.</strong></div>';return}
    let rows=(data||[]).filter(x=>!q||norm([x.description,x.competence].join(' ')).includes(q));
    body.innerHTML=rows.length?`<div class="mpi-count">${rows.length} contracheque(s)</div><div class="mpi-list">${rows.map(p=>`<article class="mpi-card"><div class="mpi-card-icon">💳</div><div class="mpi-card-main"><h3>${esc(p.description||'Contracheque')}</h3><div class="mpi-meta">Competência: ${esc(p.competence?new Date(p.competence+'T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'}):'')}</div><div class="mpi-actions"><a class="mpi-open" href="${esc(p.file_url)}" target="_blank" rel="noopener">Visualizar / baixar</a></div></div></article>`).join('')}</div>`:'<div class="mpi-empty"><strong>Nenhum contracheque disponível.</strong><span>Quando o RH publicar a competência, ela aparecerá aqui automaticamente.</span></div>';
  }
  async function open(title,moduleOverride){
    ensure();
    const module=moduleOverride||moduleFor(title);
    active={title,module,docs:[]};
    document.querySelector('.mpi-overlay')?.classList.add('open');
    document.body.style.overflow='hidden';
    document.querySelector('.mpi-head h1').textContent=title;
    document.querySelector('.mpi-head p').textContent=module==='contracheque'?'Acesso pessoal e protegido do servidor.':'Consulta oficial dentro do aplicativo da Prefeitura de Manari.';
    const body=document.querySelector('.mpi-body'); if(body)body.innerHTML='<div class="mpi-loading">Carregando…</div>';
    if(module==='contracheque'){await renderPayslips();return}
    active.docs=await loadDocs(module);
    renderRows();
  }
  function close(){document.querySelector('.mpi-overlay')?.classList.remove('open');document.body.style.overflow='';active=null}

  function intercept(){
    document.addEventListener('click',e=>{
      const service=e.target.closest('[data-service-url],.sm-quick-card[data-url]');
      if(service){
        const title=service.querySelector('b')?.textContent?.trim()||service.textContent.trim();
        if(title){e.preventDefault();e.stopImmediatePropagation();open(title);return}
      }
      const nav=e.target.closest('#manariSocialApp [data-nav]');
      if(!nav)return;
      const key=nav.dataset.nav;
      const map={diario:['Diário Oficial','diario_oficial'],ouvidoria:['Ouvidoria','ouvidoria'],esic:['e-SIC / Pedido de Informação','esic'],programas:['Carta de Serviços','carta_servicos']};
      if(map[key]){e.preventDefault();e.stopImmediatePropagation();open(map[key][0],map[key][1]);}
    },true);
  }
  window.ManariPortalInternal={open,close,moduleFor};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',intercept,{once:true});else intercept();
})();