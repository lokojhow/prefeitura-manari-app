// Prefeitura de Manari — CMS Setorial estruturado V4
(() => {
  if (window.ManariSectorCMS) return;
  const CFG = window.MANARI_CONFIG || {};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  let client=null, session=null, staff=null, schemas=[], activeModule=null, records=[];

  async function getClient(){
    if(client)return client;
    if(!CFG.supabaseUrl||!CFG.supabaseAnonKey)return null;
    for(let i=0;i<80;i++){
      if(window.supabase?.createClient){
        client=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
        return client;
      }
      await new Promise(r=>setTimeout(r,100));
    }
    return null;
  }
  async function identity(){
    const c=await getClient(); if(!c)return false;
    const {data}=await c.auth.getSession(); session=data?.session||null;
    if(!session)return false;
    const {data:s}=await c.from('portal_staff_members').select('*').eq('user_id',session.user.id).eq('active',true).maybeSingle();
    staff=s||null; return !!staff;
  }
  function allowed(module){
    if(!staff)return false;
    if(['admin','manager'].includes(staff.role))return true;
    const mods=staff.modules||[];
    return !mods.length||mods.includes(module);
  }
  async function loadSchemas(){
    const c=await getClient();
    const {data}=await c.from('portal_module_schemas').select('*').eq('active',true).order('sort_order');
    schemas=(data||[]).filter(s=>allowed(s.module));
  }
  async function loadRecords(module){
    const c=await getClient();
    const {data,error}=await c.from('portal_records').select('*').eq('module',module).order('updated_at',{ascending:false});
    if(error)throw error; records=data||[];
  }
  function ensure(){
    if(document.querySelector('.mpcms-overlay'))return;
    const el=document.createElement('div');el.className='mpcms-overlay';
    el.innerHTML=`<section class="mpcms-shell" role="dialog" aria-modal="true" aria-label="Sistema de Gestão do Portal"><aside class="mpcms-side"><div class="mpcms-brand"><img src="app-icon-192.png" alt=""><div><b>MANARI</b><span>Gestão do Portal</span></div></div><div class="mpcms-user"></div><nav class="mpcms-modules"></nav><button class="mpcms-exit" type="button">Sair do painel</button></aside><main class="mpcms-main"><header class="mpcms-top"><button class="mpcms-mobile-menu" type="button">☰</button><div><h1>Sistema de Gestão do Portal</h1><p></p></div><button class="mpcms-close" type="button" aria-label="Fechar">×</button></header><div class="mpcms-view"></div></main></section>`;
    document.body.appendChild(el);
    el.querySelector('.mpcms-close').addEventListener('click',close);
    el.querySelector('.mpcms-exit').addEventListener('click',close);
    el.querySelector('.mpcms-mobile-menu').addEventListener('click',()=>el.querySelector('.mpcms-side').classList.toggle('open'));
  }
  function close(){document.querySelector('.mpcms-overlay')?.classList.remove('open');document.body.style.overflow='';}
  async function open(module){
    ensure();
    const ok=await identity();
    if(!ok){window.ManariPortalAuth?.open();return;}
    await loadSchemas();
    document.querySelector('.mpcms-overlay').classList.add('open');document.body.style.overflow='hidden';
    renderSidebar();
    const target=(module&&schemas.find(s=>s.module===module))||schemas[0];
    if(target)await openModule(target.module); else renderNoAccess();
  }
  function renderNoAccess(){document.querySelector('.mpcms-view').innerHTML='<div class="mpcms-empty"><strong>Nenhum módulo autorizado.</strong><span>Peça ao administrador para liberar o setor correto para este usuário.</span></div>';}
  function renderSidebar(){
    const user=document.querySelector('.mpcms-user');
    user.innerHTML=`<strong>${esc(staff.full_name||staff.email||'Responsável')}</strong><span>${esc(staff.department||'Prefeitura de Manari')}</span><small>${esc(staff.role==='admin'?'Administrador geral':staff.role==='manager'?'Gerente':'Responsável do setor')}</small>`;
    const nav=document.querySelector('.mpcms-modules');
    nav.innerHTML=schemas.map(s=>`<button type="button" data-cms-module="${esc(s.module)}"><span>▦</span><div><b>${esc(s.title)}</b><small>${esc(s.description||'')}</small></div></button>`).join('');
    nav.querySelectorAll('[data-cms-module]').forEach(b=>b.addEventListener('click',()=>openModule(b.dataset.cmsModule)));
  }
  async function openModule(module){
    const schema=schemas.find(s=>s.module===module);if(!schema)return;
    activeModule=module;document.querySelectorAll('[data-cms-module]').forEach(b=>b.classList.toggle('active',b.dataset.cmsModule===module));
    document.querySelector('.mpcms-side')?.classList.remove('open');
    const top=document.querySelector('.mpcms-top p');top.textContent=`${schema.title} • ${staff.department||'Prefeitura de Manari'}`;
    const view=document.querySelector('.mpcms-view');view.innerHTML='<div class="mpcms-loading">Carregando registros…</div>';
    try{await loadRecords(module);renderModule(schema);}catch(e){view.innerHTML=`<div class="mpcms-empty"><strong>Não foi possível carregar.</strong><span>${esc(e.message||'Erro de conexão')}</span></div>`;}
  }
  function statusLabel(s){return s==='published'?'Publicado':s==='archived'?'Arquivado':'Rascunho';}
  function renderModule(schema){
    const published=records.filter(r=>r.status==='published').length,draft=records.filter(r=>r.status==='draft').length,archived=records.filter(r=>r.status==='archived').length;
    const view=document.querySelector('.mpcms-view');
    view.innerHTML=`<section class="mpcms-module-head"><div><span class="mpcms-kicker">MÓDULO</span><h2>${esc(schema.title)}</h2><p>${esc(schema.description||'Gerencie as informações oficiais deste módulo.')}</p></div><button class="mpcms-primary" type="button" data-new>+ Adicionar novo</button></section><section class="mpcms-stats"><div><b>${records.length}</b><span>Total</span></div><div><b>${published}</b><span>Publicados</span></div><div><b>${draft}</b><span>Rascunhos</span></div><div><b>${archived}</b><span>Arquivados</span></div></section><section class="mpcms-toolbar"><input type="search" placeholder="Pesquisar registros deste módulo…" data-search><select data-status><option value="">Todos os status</option><option value="published">Publicado</option><option value="draft">Rascunho</option><option value="archived">Arquivado</option></select></section><div class="mpcms-table-wrap"><table class="mpcms-table"><thead><tr><th>Registro</th><th>Atualizado</th><th>Status</th><th>Ações</th></tr></thead><tbody></tbody></table></div><div class="mpcms-empty-table"></div>`;
    view.querySelector('[data-new]').addEventListener('click',()=>renderForm(schema));
    view.querySelector('[data-search]').addEventListener('input',()=>renderRows(schema));
    view.querySelector('[data-status]').addEventListener('change',()=>renderRows(schema));
    renderRows(schema);
  }
  function renderRows(schema){
    const view=document.querySelector('.mpcms-view');if(!view)return;
    const q=norm(view.querySelector('[data-search]')?.value),st=view.querySelector('[data-status]')?.value||'';
    const rows=records.filter(r=>(!st||r.status===st)&&(!q||norm([r.title,r.summary,JSON.stringify(r.data)].join(' ')).includes(q)));
    const tbody=view.querySelector('tbody'),empty=view.querySelector('.mpcms-empty-table');
    tbody.innerHTML=rows.map(r=>`<tr><td><b>${esc(r.title)}</b><small>${esc(r.summary||'Sem resumo')}</small></td><td>${esc(new Date(r.updated_at).toLocaleDateString('pt-BR'))}</td><td><span class="mpcms-status ${esc(r.status)}">${statusLabel(r.status)}</span></td><td><div class="mpcms-row-actions"><button data-view="${r.id}" title="Visualizar">◉</button><button data-edit="${r.id}" title="Editar">✎</button>${r.status!=='published'?`<button data-publish="${r.id}" title="Publicar">✓</button>`:''}${r.status!=='archived'?`<button data-archive="${r.id}" title="Arquivar">⌑</button>`:''}</div></td></tr>`).join('');
    empty.innerHTML=rows.length?'':'<div class="mpcms-empty"><strong>Nenhum registro encontrado.</strong><span>Use “Adicionar novo” para cadastrar a primeira informação deste módulo.</span></div>';
    tbody.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>renderForm(schema,records.find(r=>r.id===b.dataset.edit))));
    tbody.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>renderPreview(schema,records.find(r=>r.id===b.dataset.view))));
    tbody.querySelectorAll('[data-publish]').forEach(b=>b.addEventListener('click',()=>changeStatus(b.dataset.publish,'published')));
    tbody.querySelectorAll('[data-archive]').forEach(b=>b.addEventListener('click',()=>changeStatus(b.dataset.archive,'archived')));
  }
  async function changeStatus(id,status){
    const c=await getClient();const {error}=await c.from('portal_records').update({status}).eq('id',id);if(error){alert(error.message);return;}await openModule(activeModule);
  }
  function inputFor(field,value){
    const v=value??''; const req=field.required?' required':''; const key=esc(field.key),label=esc(field.label||field.key);
    if(field.type==='textarea')return `<label>${label}<textarea name="${key}"${req}>${esc(v)}</textarea></label>`;
    if(field.type==='select')return `<label>${label}<select name="${key}"${req}><option value="">Selecione</option>${(field.options||[]).map(o=>`<option value="${esc(o)}"${String(v)===String(o)?' selected':''}>${esc(o)}</option>`).join('')}</select></label>`;
    if(field.type==='currency')return `<label>${label}<input type="number" step="0.01" inputmode="decimal" name="${key}" value="${esc(v)}"${req}></label>`;
    return `<label>${label}<input type="${['date','month','number'].includes(field.type)?field.type:'text'}" name="${key}" value="${esc(v)}"${req}></label>`;
  }
  function renderForm(schema,record){
    const view=document.querySelector('.mpcms-view'),data=record?.data||{};
    view.innerHTML=`<div class="mpcms-form-page"><button class="mpcms-back" type="button">← Voltar para ${esc(schema.title)}</button><div class="mpcms-form-card"><div class="mpcms-form-title"><div><span class="mpcms-kicker">${record?'EDITAR REGISTRO':'NOVO REGISTRO'}</span><h2>${record?'Editar':'Cadastrar'} ${esc(schema.title)}</h2><p>Preencha os campos oficiais abaixo. Você pode salvar como rascunho antes de publicar.</p></div></div><form id="mpcmsForm"><section><h3>Identificação</h3><div class="mpcms-grid2"><label>Título do registro<input name="_title" value="${esc(record?.title||'')}" required></label><label>Resumo curto<input name="_summary" value="${esc(record?.summary||'')}"></label></div></section><section><h3>Informações do módulo</h3><div class="mpcms-grid2">${(schema.fields||[]).map(f=>inputFor(f,data[f.key])).join('')}</div></section><section><h3>Documento / comprovante</h3><div class="mpcms-grid2"><label>Arquivo oficial<input type="file" name="_file" accept="application/pdf,image/jpeg,image/png,image/webp"></label><label>Fonte externa obrigatória, se houver<input type="url" name="_source_url" value="${esc(record?.source_url||'')}" placeholder="Somente quando tecnicamente obrigatório"></label></div>${record?.file_url?`<div class="mpcms-current-file">Arquivo atual: <a href="${esc(record.file_url)}" target="_blank" rel="noopener">visualizar</a></div>`:''}</section><div class="mpcms-form-actions"><button class="mpcms-secondary" type="submit" data-save="draft">Salvar rascunho</button><button class="mpcms-primary" type="submit" data-save="published">Salvar e publicar</button>${record?'<button class="mpcms-danger" type="button" data-archive-form>Arquivar</button>':''}</div><div class="mpcms-form-status"></div></form></div></div>`;
    view.querySelector('.mpcms-back').addEventListener('click',()=>openModule(schema.module));
    let desiredStatus=record?.status||'draft';
    view.querySelectorAll('[data-save]').forEach(b=>b.addEventListener('click',()=>desiredStatus=b.dataset.save));
    view.querySelector('#mpcmsForm').addEventListener('submit',e=>saveRecord(e,schema,record,desiredStatus));
    view.querySelector('[data-archive-form]')?.addEventListener('click',()=>changeStatus(record.id,'archived'));
  }
  async function uploadFile(file,module){
    if(!(file instanceof File)||!file.size)return null;
    const c=await getClient();const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-');const path=`${module}/${Date.now()}-${safe}`;
    const {error}=await c.storage.from('portal-documentos').upload(path,file,{upsert:false});if(error)throw error;
    const {data}=c.storage.from('portal-documentos').getPublicUrl(path);return data?.publicUrl||null;
  }
  async function saveRecord(e,schema,record,status){
    e.preventDefault();const form=e.currentTarget,st=form.querySelector('.mpcms-form-status');st.textContent='Salvando…';
    try{
      const fd=new FormData(form),payloadData={};(schema.fields||[]).forEach(f=>{let v=fd.get(f.key);if(f.type==='number'||f.type==='currency'){v=v===''?null:Number(v)}payloadData[f.key]=v;});
      const file=fd.get('_file');const uploaded=await uploadFile(file,schema.module);
      const payload={module:schema.module,department:staff.department||schema.department_code||null,title:String(fd.get('_title')||'').trim(),summary:String(fd.get('_summary')||'').trim()||null,status,data:payloadData,source_url:String(fd.get('_source_url')||'').trim()||null};
      if(uploaded)payload.file_url=uploaded; else if(record?.file_url)payload.file_url=record.file_url;
      const c=await getClient();let error;
      if(record)({error}=await c.from('portal_records').update(payload).eq('id',record.id));else({error}=await c.from('portal_records').insert(payload));
      if(error)throw error;st.textContent=status==='published'?'Publicado com sucesso.':'Rascunho salvo.';setTimeout(()=>openModule(schema.module),500);
    }catch(err){st.textContent='Não foi possível salvar: '+(err.message||'erro inesperado');}
  }
  function renderPreview(schema,record){
    const view=document.querySelector('.mpcms-view');
    view.innerHTML=`<div class="mpcms-form-page"><button class="mpcms-back" type="button">← Voltar</button><article class="mpcms-preview"><div class="mpcms-preview-head"><div><span class="mpcms-status ${esc(record.status)}">${statusLabel(record.status)}</span><h2>${esc(record.title)}</h2><p>${esc(record.summary||'')}</p></div><button class="mpcms-primary" data-edit-now>Editar</button></div><dl>${(schema.fields||[]).map(f=>`<div><dt>${esc(f.label||f.key)}</dt><dd>${esc(record.data?.[f.key]??'—')}</dd></div>`).join('')}</dl>${record.file_url?`<a class="mpcms-primary link" href="${esc(record.file_url)}" target="_blank" rel="noopener">Abrir documento</a>`:''}</article></div>`;
    view.querySelector('.mpcms-back').addEventListener('click',()=>openModule(schema.module));view.querySelector('[data-edit-now]').addEventListener('click',()=>renderForm(schema,record));
  }

  window.ManariSectorCMS={open,close};
})();