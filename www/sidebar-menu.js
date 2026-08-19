// Prefeitura de Manari — menu lateral de Secretarias e Áreas
// Substitui definitivamente a antiga faixa horizontal, preservando a navegação já existente do app.
(() => {
  const STRIP = '.secretaria-strip';
  const CHIP = '.secretaria-chip[data-dept]';
  const HIDE_CLASS = 'manari-hide-secretaria-bar';
  let drawer = null;
  let backdrop = null;
  let handle = null;
  let lastSignature = '';

  const css = `
    .${HIDE_CLASS}{display:none!important}
    .manari-sidebar-handle{position:fixed;left:0;top:42%;transform:translateY(-50%);z-index:2147482500;width:44px;height:64px;border:0;border-radius:0 18px 18px 0;background:#087b43;color:#fff;box-shadow:0 5px 18px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:800;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .manari-sidebar-backdrop{position:fixed;inset:0;z-index:2147482600;background:rgba(8,31,49,.52);opacity:0;pointer-events:none;transition:opacity .2s ease}
    .manari-sidebar-backdrop.is-open{opacity:1;pointer-events:auto}
    .manari-sidebar{position:fixed;left:0;top:0;bottom:0;z-index:2147482700;width:min(88vw,370px);background:#fff;transform:translateX(-102%);transition:transform .24s ease;box-shadow:18px 0 45px rgba(0,0,0,.18);display:flex;flex-direction:column;color:#14334d;font-family:inherit;padding-top:env(safe-area-inset-top)}
    .manari-sidebar.is-open{transform:translateX(0)}
    .manari-sidebar-top{background:linear-gradient(135deg,#075f39,#06442e);color:#fff;min-height:70px;display:flex;align-items:center;justify-content:space-between;padding:12px 18px}
    .manari-sidebar-title{font-size:15px;font-weight:900;letter-spacing:.02em}
    .manari-sidebar-close{width:42px;height:42px;border:0;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font-size:30px;line-height:1;cursor:pointer}
    .manari-sidebar-brand{padding:18px 20px 12px;border-bottom:1px solid #edf1ee}
    .manari-sidebar-brand strong{display:block;font-size:18px;color:#123b5b}
    .manari-sidebar-brand span{display:block;margin-top:3px;font-size:12px;color:#6c7a83}
    .manari-sidebar-scroll{overflow:auto;-webkit-overflow-scrolling:touch;padding:12px 14px 24px}
    .manari-sidebar-section{font-size:12px;font-weight:900;color:#0b7b45;text-transform:uppercase;letter-spacing:.04em;padding:10px 8px 8px}
    .manari-sidebar-item{width:100%;border:0;background:#fff;border-radius:13px;padding:12px 10px;display:flex;align-items:center;gap:11px;text-align:left;color:#14334d;font:inherit;font-size:14px;font-weight:750;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .manari-sidebar-item:active,.manari-sidebar-item.is-active{background:#eef6f0;color:#086c3d}
    .manari-sidebar-icon{width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex:0 0 28px;color:#0a8748}
    .manari-sidebar-icon img,.manari-sidebar-icon svg{max-width:26px;max-height:26px;width:auto;height:auto}
    .manari-sidebar-label{flex:1;min-width:0}
    .manari-sidebar-arrow{font-size:20px;color:#71808a;font-weight:400}
    @media (min-width:900px){.manari-sidebar-handle{top:34%}}
  `;

  function injectStyle(){
    if(document.getElementById('manariSidebarStyle')) return;
    const style=document.createElement('style');
    style.id='manariSidebarStyle';
    style.textContent=css;
    document.head.appendChild(style);
  }

  function findBarContainer(strip){
    if(!strip) return null;
    let node=strip;
    for(let i=0;i<6 && node && node!==document.body;i++,node=node.parentElement){
      const text=(node.textContent||'').toLowerCase();
      const h=node.getBoundingClientRect?.().height||9999;
      if(text.includes('secretarias') && h>20 && h<260) return node;
    }
    return strip;
  }

  function hideOldBar(){
    document.querySelectorAll(STRIP).forEach(strip=>{
      const box=findBarContainer(strip);
      if(box) box.classList.add(HIDE_CLASS);
    });
  }

  function getItems(){
    const seen=new Set();
    return Array.from(document.querySelectorAll(CHIP)).map(chip=>{
      const dept=chip.dataset.dept;
      if(!dept || seen.has(dept)) return null;
      seen.add(dept);
      const label=(chip.textContent||'').replace(/\s+/g,' ').trim() || dept;
      const media=chip.querySelector('img,svg');
      return {dept,label,icon:media?media.cloneNode(true):null};
    }).filter(Boolean);
  }

  function getActiveDept(){
    const active=document.querySelector(`${CHIP}.active,${CHIP}[aria-current="true"],${CHIP}[aria-selected="true"]`);
    return active?.dataset?.dept || null;
  }

  function close(){
    drawer?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    document.body.style.overflow='';
    handle?.setAttribute('aria-expanded','false');
  }

  function open(){
    build();
    drawer?.classList.add('is-open');
    backdrop?.classList.add('is-open');
    document.body.style.overflow='hidden';
    handle?.setAttribute('aria-expanded','true');
    drawer?.querySelector('.manari-sidebar-close')?.focus({preventScroll:true});
  }

  function navigateTo(dept){
    const candidates=Array.from(document.querySelectorAll(CHIP));
    const target=candidates.find(chip=>chip.dataset.dept===dept);
    close();
    if(target){
      target.click();
      setTimeout(()=>window.scrollTo({top:0,left:0,behavior:'auto'}),0);
    }
  }

  function renderItems(){
    const items=getItems();
    const signature=items.map(i=>`${i.dept}:${i.label}`).join('|');
    if(signature===lastSignature && drawer?.querySelector('.manari-sidebar-items')) return;
    lastSignature=signature;
    const list=drawer?.querySelector('.manari-sidebar-items');
    if(!list) return;
    list.innerHTML='';
    const active=getActiveDept();
    items.forEach(item=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='manari-sidebar-item'+(active===item.dept?' is-active':'');
      button.dataset.dept=item.dept;
      button.innerHTML='<span class="manari-sidebar-icon"></span><span class="manari-sidebar-label"></span><span class="manari-sidebar-arrow">›</span>';
      button.querySelector('.manari-sidebar-label').textContent=item.label;
      const iconBox=button.querySelector('.manari-sidebar-icon');
      if(item.icon) iconBox.appendChild(item.icon); else iconBox.textContent='▦';
      button.addEventListener('click',()=>navigateTo(item.dept));
      list.appendChild(button);
    });
  }

  function build(){
    injectStyle();
    hideOldBar();

    if(!handle){
      handle=document.createElement('button');
      handle.type='button';
      handle.className='manari-sidebar-handle';
      handle.setAttribute('aria-label','Abrir menu de secretarias e áreas');
      handle.setAttribute('aria-expanded','false');
      handle.textContent='☰';
      handle.addEventListener('click',open);
      document.body.appendChild(handle);
    }

    if(!backdrop){
      backdrop=document.createElement('div');
      backdrop.className='manari-sidebar-backdrop';
      backdrop.addEventListener('click',close);
      document.body.appendChild(backdrop);
    }

    if(!drawer){
      drawer=document.createElement('aside');
      drawer.className='manari-sidebar';
      drawer.setAttribute('aria-label','Menu de secretarias e áreas');
      drawer.innerHTML=`
        <div class="manari-sidebar-top">
          <div class="manari-sidebar-title">PREFEITURA DE MANARI</div>
          <button type="button" class="manari-sidebar-close" aria-label="Fechar menu">×</button>
        </div>
        <div class="manari-sidebar-brand">
          <strong>Secretarias e Áreas</strong>
          <span>Escolha uma área para acessar</span>
        </div>
        <div class="manari-sidebar-scroll">
          <div class="manari-sidebar-section">Secretarias e áreas</div>
          <div class="manari-sidebar-items"></div>
        </div>`;
      drawer.querySelector('.manari-sidebar-close').addEventListener('click',close);
      document.body.appendChild(drawer);
    }
    renderItems();
  }

  document.addEventListener('keydown',e=>{if(e.key==='Escape') close();});

  let scheduled=0;
  const observer=new MutationObserver(()=>{
    clearTimeout(scheduled);
    scheduled=setTimeout(()=>{
      hideOldBar();
      if(document.querySelector(CHIP)) build();
      renderItems();
    },60);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build,{once:true});
  else build();
})();
