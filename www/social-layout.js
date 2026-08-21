// Prefeitura de Manari — interface social responsiva V2
(() => {
  const CFG = window.MANARI_CONFIG || {};
  const ROOT_ID = 'manariSocialApp';
  const state = { news: [], services: [], links: [], dept: 'todos', drawer: false };
  const logo = 'app-icon-512.png';
  const deptMap = {
    todos:['Todos','🏛️'],administracao:['Administração','🏢'],saude:['Saúde','❤️'],educacao:['Educação','🎓'],
    infraestrutura:['Obras','🚧'],assistencia:['Assistência Social','🤝'],esportes:['Esporte','⚽'],agricultura:['Agricultura','🌾'],
    transportes:['Transportes','🚌'],financas:['Finanças','💰'],controle_interno:['Controle Interno','📊']
  };
  const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatDate = d => { try{return new Date((d||'')+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','').toUpperCase()}catch{return ''} };

  async function rest(table, query=''){
    if(!CFG.supabaseUrl || !CFG.supabaseAnonKey) return [];
    const r=await fetch(`${CFG.supabaseUrl}/rest/v1/${table}?${query}`,{headers:{apikey:CFG.supabaseAnonKey,Authorization:`Bearer ${CFG.supabaseAnonKey}`},cache:'no-store'});
    if(!r.ok) return [];
    return r.json();
  }
  async function load(){
    const [news,services,links]=await Promise.all([
      rest('app_news','select=*&active=eq.true&order=featured.desc,published_at.desc,created_at.desc'),
      rest('app_services','select=*&active=eq.true&order=featured.desc,sort_order.asc'),
      rest('app_portal_links','select=*&active=eq.true&order=sort_order.asc')
    ]);
    state.news=news||[]; state.services=services||[]; state.links=links||[];
  }

  function toast(msg){
    let t=document.querySelector('.sm-toast'); if(!t){t=document.createElement('div');t.className='sm-toast';document.body.appendChild(t)}
    t.textContent=msg; t.classList.add('show'); clearTimeout(t._tm); t._tm=setTimeout(()=>t.classList.remove('show'),1800);
  }
  function shareApp(){
    const data={title:'Prefeitura de Manari',text:'Acesse o aplicativo oficial da Prefeitura Municipal de Manari.',url:location.href.split('#')[0]};
    if(navigator.share){navigator.share(data).catch(()=>{})} else if(navigator.clipboard){navigator.clipboard.writeText(data.url).then(()=>toast('Link do aplicativo copiado.'))} else {toast('Use o menu do navegador para compartilhar.')}
  }
  function openLinkItem(title){
    const n=norm(title);
    const item=state.links.find(x=>norm(x.title).includes(n)||n.includes(norm(x.title))) || state.services.find(x=>norm(x.title).includes(n)||n.includes(norm(x.title)));
    const url=item?.url||item?.service_url;
    if(url){window.open(url,'_blank','noopener');return true}
    return false;
  }
  function openServices(){document.querySelector('.sm-services-modal')?.classList.add('open');document.body.style.overflow='hidden';renderServiceList('')}
  function closeServices(){document.querySelector('.sm-services-modal')?.classList.remove('open');document.body.style.overflow=''}
  function renderServiceList(q=''){
    const list=document.querySelector('.sm-services-list'); if(!list)return;
    const nq=norm(q); const rows=state.services.filter(s=>!nq||norm([s.title,s.summary,s.department].join(' ')).includes(nq));
    list.innerHTML=rows.length?rows.map(s=>`<button class="sm-service" data-service-url="${esc(s.service_url||'')}"><b>${esc(s.title)}</b><span>${esc(s.summary||s.department||'Serviço municipal')}</span></button>`).join(''):'<div class="sm-empty">Nenhum serviço encontrado.</div>';
  }
  function openLaws(){ if(window.ManariLaws?.open) window.ManariLaws.open(); else location.hash='#manari-laws'; }
  function setDept(dept){state.dept=dept||'todos';renderStories();renderFeed();document.querySelector('.sm-feed-zone')?.scrollIntoView({behavior:'smooth',block:'start'});closeDrawer()}

  function navAction(key){
    if(key==='home'){state.dept='todos';renderStories();renderFeed();window.scrollTo({top:0,behavior:'smooth'});return}
    if(key==='services'){openServices();return}
    if(key==='news'){document.querySelector('.sm-feed-zone')?.scrollIntoView({behavior:'smooth'});return}
    if(key==='menu'){openDrawer();return}
    if(key==='laws'){openLaws();return}
    if(key==='share'){shareApp();return}
    if(key==='obras'){setDept('infraestrutura');return}
    if(key==='transparencia'){openLinkItem('Portal da Transparência');return}
    if(key==='diario'){openLinkItem('Diário Oficial');return}
    if(key==='ouvidoria'){openLinkItem('Ouvidoria Municipal')||openLinkItem('Ouvidoria');return}
    if(key==='esic'){openLinkItem('e-SIC');return}
    if(key==='sobre'){openLinkItem('História de Manari')||openLinkItem('Prefeito');return}
    if(key==='programas'){openLinkItem('Carta de Serviços');return}
  }

  function menuHtml(){return `
    <div class="sm-brand"><img src="${logo}" alt="Prefeitura de Manari"><div class="sm-brand-text">MANARI<small>Cuidando melhor das pessoas</small></div></div>
    <button class="sm-side-btn active" data-nav="home"><span class="sm-side-ico">⌂</span>Início</button>
    <div class="sm-side-title">Menu</div>
    <button class="sm-side-btn" data-nav="menu"><span class="sm-side-ico">🏛</span>Secretarias e Áreas</button>
    <button class="sm-side-btn" data-nav="services"><span class="sm-side-ico">▦</span>Serviços</button>
    <button class="sm-side-btn" data-nav="news"><span class="sm-side-ico">▣</span>Notícias</button>
    <button class="sm-side-btn" data-nav="obras"><span class="sm-side-ico">♧</span>Obras</button>
    <button class="sm-side-btn" data-nav="programas"><span class="sm-side-ico">♟</span>Programas</button>
    <button class="sm-side-btn" data-nav="transparencia"><span class="sm-side-ico">▥</span>Transparência</button>
    <button class="sm-side-btn" data-nav="laws"><span class="sm-side-ico">⚖</span>Leis Municipais</button>
    <button class="sm-side-btn" data-nav="diario"><span class="sm-side-ico">▤</span>Diário Oficial</button>
    <button class="sm-side-btn" data-nav="ouvidoria"><span class="sm-side-ico">◉</span>Ouvidoria</button>
    <button class="sm-side-btn" data-nav="esic"><span class="sm-side-ico">✉</span>e-SIC</button>
    <button class="sm-side-btn" data-nav="sobre"><span class="sm-side-ico">ⓘ</span>Sobre o Município</button>
    <button class="sm-side-btn sm-share" data-nav="share"><span class="sm-side-ico">⌯</span>Compartilhar aplicativo</button>
    <div class="sm-socials"><a href="https://www.instagram.com/prefeiturademanari/" target="_blank" rel="noopener">◎</a><span>●</span><span>▶</span><span>◉</span></div>`}

  function build(){
    if(document.getElementById(ROOT_ID)) return;
    document.body.classList.add('manari-social-v2');
    const root=document.createElement('div');root.id=ROOT_ID;
    root.innerHTML=`<div class="sm-shell">
      <aside class="sm-sidebar">${menuHtml()}</aside>
      <div class="sm-drawer-backdrop"></div>
      <main class="sm-main">
        <header class="sm-topbar">
          <button class="sm-mobile-menu" aria-label="Abrir menu">☰</button>
          <img class="sm-top-logo" src="${logo}" alt="Prefeitura de Manari">
          <div class="sm-search"><input type="search" placeholder="Buscar no site..." aria-label="Buscar"></div>
          <div class="sm-top-actions"><button class="sm-circle-btn" title="Notificações">♢</button><button class="sm-circle-btn" title="Conta">◯</button></div>
        </header>
        <div class="sm-content">
          <section class="sm-stories" aria-label="Áreas da Prefeitura"></section>
          <section class="sm-layout">
            <div class="sm-center">
              <div class="sm-hero-zone"></div>
              <div class="sm-tabs"><button class="sm-tab active" data-filter="todos">Para você</button><button class="sm-tab" data-filter="todos">Todas</button><button class="sm-tab" data-filter="infraestrutura">Obras</button><button class="sm-tab" data-filter="saude">Saúde</button><button class="sm-tab" data-filter="educacao">Educação</button><button class="sm-tab" data-filter="administracao">Administração</button></div>
              <div class="sm-feed-zone"><div class="sm-feed-grid"></div></div>
            </div>
            <aside class="sm-right-rail"></aside>
          </section>
        </div>
      </main>
      <nav class="sm-bottom-nav"><button class="sm-bottom-btn active" data-nav="home"><i>⌂</i>Início</button><button class="sm-bottom-btn" data-nav="news"><i>⌕</i>Buscar</button><button class="sm-bottom-btn" data-nav="services"><i>▦</i>Serviços</button><button class="sm-bottom-btn" data-nav="news"><i>▣</i>Notícias</button><button class="sm-bottom-btn" data-nav="menu"><i>☰</i>Menu</button></nav>
      <div class="sm-services-modal"><div class="sm-services-panel"><div class="sm-services-head"><h2>Serviços</h2><button class="sm-close" aria-label="Fechar">×</button></div><input class="sm-services-search" type="search" placeholder="Buscar serviço..."><div class="sm-services-list"></div></div></div>
    </div>`;
    document.body.insertBefore(root,document.body.firstChild);
    wire();
  }

  function renderStories(){
    const box=document.querySelector('.sm-stories'); if(!box)return;
    const base=[['todos','Todos','🏛️'],['administracao','Administração','🏢'],['saude','Saúde','❤️'],['educacao','Educação','🎓'],['infraestrutura','Obras','🚧'],['assistencia','Assistência','🤝'],['agricultura','Agricultura','🌾'],['esportes','Esporte','⚽']];
    box.innerHTML=base.map(([id,label,ico])=>`<button class="sm-story" data-dept="${id}"><div class="sm-story-ring"><div class="sm-story-inner">${id==='todos'?`<img src="${logo}" alt="">`:ico}</div></div><span>${label}</span></button>`).join('');
  }
  function featured(){return state.news.find(n=>n.featured)||state.news[0]||null}
  function renderHero(){
    const box=document.querySelector('.sm-hero-zone'); if(!box)return; const n=featured();
    if(!n){box.innerHTML='<div class="sm-hero"><div class="sm-hero-copy"><h1>Prefeitura de Manari</h1><p>Informação, serviços e transparência mais perto de você.</p><button class="sm-pill" data-nav="services">Acessar serviços</button></div></div>';return}
    const title=(n.title||'').toUpperCase(); const summary=n.summary||'Acompanhe as principais ações da Prefeitura de Manari.';
    box.innerHTML=`<div class="sm-hero">${n.image_url?`<img src="${esc(n.image_url)}" alt="${esc(n.title)}">`:''}<div class="sm-hero-shade"></div><div class="sm-hero-copy"><h1>${esc(title)}</h1><p>${esc(summary)}</p><button class="sm-pill" data-scroll-news>Saiba mais</button></div><div class="sm-dots"><span class="sm-dot active"></span><span class="sm-dot"></span><span class="sm-dot"></span></div></div>`;
  }
  function filteredNews(){if(state.dept==='todos')return state.news;return state.news.filter(n=>norm(n.department_id)===norm(state.dept)||norm(n.summary).includes(norm(state.dept)))}
  function deptLabel(id){return deptMap[id]?.[0]||String(id||'Prefeitura de Manari').replace(/_/g,' ')}
  function postCard(n,i){
    const dept=deptLabel(n.department_id); const txt=n.body||n.summary||n.title||''; const excerpt=txt.length>160?txt.slice(0,157)+'…':txt;
    return `<article class="sm-post"><div class="sm-post-head"><div class="sm-post-avatar"><img src="${logo}" alt=""></div><div class="sm-post-meta"><b>${esc(n.department_id?`Secretaria de ${dept}`:'Prefeitura de Manari')} <span class="sm-verified">●</span></b><small>${esc(dept)} • ${esc(formatDate(n.published_at))}</small></div><span>•••</span></div><div class="sm-post-text">${esc(excerpt)}</div>${n.image_url?`<img class="sm-post-media" src="${esc(n.image_url)}" alt="${esc(n.title||'Notícia')}">`:''}<div class="sm-post-actions"><button data-like>♥ ${i?96:128}</button><button>◯ ${i?18:24}</button><button data-share-post="${i}">⌯ ${i?25:37}</button><button class="save">▢</button></div></article>`;
  }
  function renderFeed(){
    const list=document.querySelector('.sm-feed-grid'); if(!list)return; const rows=filteredNews();
    list.innerHTML=rows.length?rows.map(postCard).join(''):'<div class="sm-empty">Ainda não há publicações nesta área.</div>';
    document.querySelectorAll('.sm-tab').forEach(t=>t.classList.toggle('active',t.dataset.filter===state.dept || (state.dept==='todos'&&t.dataset.filter==='todos'&&t.textContent.includes('Para'))));
  }
  function renderRightRail(){
    const rail=document.querySelector('.sm-right-rail'); if(!rail)return;
    const quick=state.services.slice(0,6);
    const infos=state.links.filter(x=>['Transparência','Institucional','Serviços ao cidadão'].includes(x.category)).slice(0,4);
    rail.innerHTML=`<div class="sm-quick"><div class="sm-section-top"><strong>Acesso rápido</strong><button data-nav="services">Ver todos</button></div><div class="sm-quick-grid">${quick.map((s,i)=>`<button class="sm-quick-card" data-url="${esc(s.service_url||'')}"><i>${['▣','◉','▤','▦','▥','◌'][i%6]}</i><b>${esc(s.title)}</b></button>`).join('')}</div></div><div class="sm-rail-card"><div class="sm-section-top"><strong>Informações oficiais</strong><button data-nav="transparencia">Ver todos</button></div>${infos.map((x,i)=>`<div class="sm-info-row"><div class="sm-info-date">${String(i+1).padStart(2,'0')}<br>INFO</div><div><b>${esc(x.title)}</b><span>${esc(x.description||x.department||'Prefeitura de Manari')}</span></div></div>`).join('')}</div><div class="sm-rail-card sm-notify"><strong>Fique por dentro!</strong><div style="font-size:10px;margin-top:5px;opacity:.9">Acompanhe novidades, serviços e informações oficiais da Prefeitura.</div><button data-nav="share">Compartilhar aplicativo</button></div>`;
  }
  function renderAll(){renderStories();renderHero();renderFeed();renderRightRail()}

  function openDrawer(){const side=document.querySelector('.sm-sidebar'),back=document.querySelector('.sm-drawer-backdrop');side?.classList.add('open');back?.classList.add('open');document.body.style.overflow='hidden'}
  function closeDrawer(){document.querySelector('.sm-sidebar')?.classList.remove('open');document.querySelector('.sm-drawer-backdrop')?.classList.remove('open');document.body.style.overflow=''}
  function wire(){
    document.addEventListener('click',e=>{
      const nav=e.target.closest('[data-nav]'); if(nav && nav.closest(`#${ROOT_ID}`)){navAction(nav.dataset.nav);return}
      const story=e.target.closest('.sm-story[data-dept]'); if(story){setDept(story.dataset.dept);return}
      const tab=e.target.closest('.sm-tab[data-filter]'); if(tab){setDept(tab.dataset.filter);return}
      const url=e.target.closest('[data-url]'); if(url?.dataset.url){window.open(url.dataset.url,'_blank','noopener');return}
      const service=e.target.closest('[data-service-url]'); if(service?.dataset.serviceUrl){window.open(service.dataset.serviceUrl,'_blank','noopener');return}
      if(e.target.closest('.sm-close')){closeServices();return}
      if(e.target.classList.contains('sm-services-modal')){closeServices();return}
      if(e.target.closest('.sm-mobile-menu')){openDrawer();return}
      if(e.target.classList.contains('sm-drawer-backdrop')){closeDrawer();return}
      if(e.target.closest('[data-scroll-news]')){document.querySelector('.sm-feed-zone')?.scrollIntoView({behavior:'smooth'});return}
      const share=e.target.closest('[data-share-post]'); if(share){const n=filteredNews()[Number(share.dataset.sharePost)];if(n){const data={title:n.title,text:n.summary||n.title,url:n.instagram_url||location.href};navigator.share?navigator.share(data).catch(()=>{}):navigator.clipboard?.writeText(data.url).then(()=>toast('Link copiado.'))}return}
      const like=e.target.closest('[data-like]'); if(like){like.style.color='#d92742';return}
    },true);
    document.querySelector('.sm-services-search')?.addEventListener('input',e=>renderServiceList(e.target.value));
    document.querySelector('.sm-search input')?.addEventListener('input',e=>{const q=norm(e.target.value);document.querySelectorAll('.sm-post').forEach(p=>p.style.display=!q||norm(p.textContent).includes(q)?'':'none')});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDrawer();closeServices()}});
  }

  async function init(){build();await load();renderAll()}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
