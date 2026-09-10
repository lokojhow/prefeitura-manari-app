// Prefeitura de Manari — autenticação e gestão setorial V3.3
(() => {
  if (window.ManariPortalAuth) return;
  const CFG = window.MANARI_CONFIG || {};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client=null, session=null, staff=null, departments=[];
  async function getClient(){
    if(client)return client;
    if(!CFG.supabaseUrl||!CFG.supabaseAnonKey)return null;
    for(let i=0;i<80;i++){
      if(window.supabase?.createClient){client=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});client.auth.onAuthStateChange(()=>refreshIdentity());return client;}
      await new Promise(r=>setTimeout(r,100));
    }
    return null;
  }
  async function refreshIdentity(){
    const c=await getClient();if(!c)return;
    const {data}=await c.auth.getSession();session=data?.session||null;staff=null;
    if(session){const {data:s}=await c.from('portal_staff_members').select('*').eq('user_id',session.user.id).maybeSingle();staff=s||null;}
    updateAccountButton();
  }
  function updateAccountButton(){
    document.querySelectorAll('#manariSocialApp .sm-circle-btn[title="Conta"]').forEach(b=>{b.textContent=session?'●':'◯';b.title=session?(staff?'Área do setor':'Minha conta'):'Entrar';});
  }
  function ensure(){
    if(document.querySelector('.mpa-overlay'))return;
    const el=document.createElement('div');el.className='mpa-overlay';el.innerHTML='<section class="mpa-panel" role="dialog" aria-modal="true"><header class="mpa-head"><div><h1>Portal Administrativo</h1><p>Acesso dos responsáveis pelos setores da Prefeitura de Manari.</p></div><button class="mpa-close" aria-label="Fechar">×</button></header><div class="mpa-body"></div></section>';
    document.body.appendChild(el);el.querySelector('.mpa-close').addEventListener('click',close);el.addEventListener('click',e=>{if(e.target===el)close()});
  }
  function open(){ensure();document.querySelector('.mpa-overlay').classList.add('open');document.body.style.overflow='hidden';render();}
  function close(){document.querySelector('.mpa-overlay')?.classList.remove('open');document.body.style.overflow='';}
  async function render(){
    const body=document.querySelector('.mpa-body');if(!body)return;body.innerHTML='<div class="mpa-empty">Carregando acesso…</div>';
    await refreshIdentity();
    const token=new URLSearchParams(location.search).get('portal_invite');
    if(!session){token?renderFirstAccess(token):renderLogin();return;}
    if(token&&!staff){renderAcceptInvite(token);return;}
    if(staff?.role==='admin'){renderAdmin();return;}
    if(staff){renderStaff();return;}
    renderCitizenAccount();
  }
  function renderLogin(){
    const body=document.querySelector('.mpa-body');body.innerHTML=`<div class="mpa-card"><h2>Entrar</h2><p class="mpa-muted">Use o e-mail e a senha cadastrados para acessar sua área.</p><form class="mpa-form" id="mpaLogin"><label>E-mail<input type="email" name="email" required autocomplete="username"></label><label>Senha<input type="password" name="password" required autocomplete="current-password"></label><div class="mpa-actions"><button class="mpa-btn" type="submit">Entrar</button></div><div class="mpa-status"></div></form></div><div class="mpa-login-switch"><button class="mpa-linkbtn" data-forgot>Esqueci minha senha</button></div>`;
    body.querySelector('#mpaLogin').addEventListener('submit',login);body.querySelector('[data-forgot]').addEventListener('click',renderReset);
  }
  async function login(e){e.preventDefault();const c=await getClient(),fd=new FormData(e.currentTarget),st=e.currentTarget.querySelector('.mpa-status');st.textContent='Entrando…';const {error}=await c.auth.signInWithPassword({email:String(fd.get('email')).trim(),password:String(fd.get('password'))});if(error){st.textContent='Não foi possível entrar: '+error.message;return;}await refreshIdentity();render();}
  function renderReset(){const body=document.querySelector('.mpa-body');body.innerHTML=`<div class="mpa-card"><h2>Recuperar senha</h2><form class="mpa-form" id="mpaReset"><label>E-mail<input type="email" name="email" required></label><div class="mpa-actions"><button class="mpa-btn" type="submit">Enviar recuperação</button><button class="mpa-btn secondary" type="button" data-back>Voltar</button></div><div class="mpa-status"></div></form></div>`;body.querySelector('[data-back]').addEventListener('click',renderLogin);body.querySelector('#mpaReset').addEventListener('submit',resetPassword)}
  async function resetPassword(e){e.preventDefault();const c=await getClient(),fd=new FormData(e.currentTarget),st=e.currentTarget.querySelector('.mpa-status');const redirect=location.origin+location.pathname;const {error}=await c.auth.resetPasswordForEmail(String(fd.get('email')).trim(),{redirectTo:redirect});st.textContent=error?error.message:'Confira seu e-mail para redefinir a senha.'}
  function renderFirstAccess(token){
    const body=document.querySelector('.mpa-body');body.innerHTML=`<div class="mpa-card"><h2>Primeiro acesso do setor</h2><p class="mpa-muted">Você recebeu autorização para alimentar o portal. Crie sua senha para ativar o acesso.</p><form class="mpa-form" id="mpaSignup"><label>E-mail do convite<input type="email" name="email" required></label><label>Crie uma senha<input type="password" name="password" minlength="8" required></label><label>Repita a senha<input type="password" name="password2" minlength="8" required></label><div class="mpa-actions"><button class="mpa-btn" type="submit">Criar acesso</button><button class="mpa-btn secondary" type="button" data-login>Já tenho senha</button></div><div class="mpa-status"></div></form></div>`;
    body.querySelector('[data-login]').addEventListener('click',renderLogin);body.querySelector('#mpaSignup').addEventListener('submit',e=>signup(e,token));
  }
  async function signup(e,token){e.preventDefault();const c=await getClient(),fd=new FormData(e.currentTarget),st=e.currentTarget.querySelector('.mpa-status'),email=String(fd.get('email')).trim(),p=String(fd.get('password')),p2=String(fd.get('password2'));if(p!==p2){st.textContent='As senhas não conferem.';return;}st.textContent='Criando acesso…';const redirect=`${location.origin}${location.pathname}?portal_invite=${encodeURIComponent(token)}`;const {data,error}=await c.auth.signUp({email,password:p,options:{emailRedirectTo:redirect}});if(error){st.textContent='Não foi possível criar o acesso: '+error.message;return;}if(data.session){await acceptInvite(token);return;}st.textContent='A conta foi criada. Confirme o e-mail recebido e abra o link de confirmação para concluir.'}
  function renderAcceptInvite(token){const body=document.querySelector('.mpa-body');body.innerHTML=`<div class="mpa-card"><h2>Ativar acesso do setor</h2><p class="mpa-muted">Sua conta está autenticada. Falta apenas vincular a autorização do setor.</p><div class="mpa-actions"><button class="mpa-btn" data-accept>Ativar meu acesso</button></div><div class="mpa-status"></div></div>`;body.querySelector('[data-accept]').addEventListener('click',()=>acceptInvite(token))}
  async function acceptInvite(token){const c=await getClient(),st=document.querySelector('.mpa-status');if(st)st.textContent='Ativando…';const {error}=await c.rpc('accept_portal_invite',{p_token:token});if(error){if(st)st.textContent='Não foi possível ativar: '+error.message;return;}history.replaceState({},'',location.pathname+location.hash);await refreshIdentity();render();}
  function renderCitizenAccount(){const body=document.querySelector('.mpa-body');body.innerHTML=`<div class="mpa-card"><h2>Minha conta</h2><p class="mpa-muted">Você está autenticado, mas esta conta não possui permissão administrativa no portal.</p><div class="mpa-actions"><button class="mpa-btn secondary" data-logout>Sair</button></div></div>`;body.querySelector('[data-logout]').addEventListener('click',logout)}
  function renderStaff(){
    const modules=(staff.modules||[]).map(m=>`<span class="mpa-badge">${esc(m.replaceAll('_',' '))}</span>`).join(' ');
    const body=document.querySelector('.mpa-body');body.innerHTML=`<div class="mpa-card mpa-account"><div class="mpa-account-top"><div class="mpa-avatar">${esc((staff.full_name||staff.email||'S').slice(0,1).toUpperCase())}</div><div><h2>${esc(staff.full_name||'Responsável do setor')}</h2><div class="mpa-muted">${esc(staff.department||'Setor municipal')} • ${esc(staff.role)}</div></div></div><div>${modules}</div><div class="mpa-actions"><button class="mpa-btn" data-open-module>Ir para área de publicação</button><button class="mpa-btn secondary" data-logout>Sair</button></div></div>`;
    body.querySelector('[data-open-module]').addEventListener('click',()=>{close();window.ManariPortalInternal?.open(staff.department,(staff.modules||[])[0]||'administracao')});body.querySelector('[data-logout]').addEventListener('click',logout);
  }
  async function loadAdminData(){const c=await getClient();const [d,s,i]=await Promise.all([c.from('portal_departments').select('*').order('sort_order'),c.from('portal_staff_members').select('*').order('department'),c.from('portal_staff_invites').select('*').order('created_at',{ascending:false}).limit(50)]);departments=d.data||[];return{staffRows:s.data||[],invites:i.data||[]}}
  async function renderAdmin(){
    const body=document.querySelector('.mpa-body');body.innerHTML='<div class="mpa-empty">Carregando painel administrativo…</div>';const {staffRows,invites}=await loadAdminData();
    body.innerHTML=`<div class="mpa-card"><div class="mpa-account-top"><div class="mpa-avatar">A</div><div><h2>Administrador Geral</h2><div class="mpa-muted">Controle de acessos e responsáveis por setor.</div></div></div><div class="mpa-actions" style="margin-top:12px"><button class="mpa-btn secondary" data-logout>Sair</button></div></div><div class="mpa-card"><h2>Criar acesso para um setor</h2><p class="mpa-muted">Cadastre o responsável. O sistema gera um link de primeiro acesso; a própria pessoa cria a senha.</p><form class="mpa-form" id="mpaInvite"><div class="mpa-grid2"><label>Nome do responsável<input name="name" required></label><label>E-mail<input type="email" name="email" required></label><label>Setor<select name="department" required>${departments.map(d=>`<option value="${esc(d.code)}">${esc(d.name)}</option>`).join('')}</select></label><label>Perfil<select name="role"><option value="staff">Responsável do setor</option><option value="manager">Gerente</option><option value="admin">Administrador</option></select></label></div><div class="mpa-actions"><button class="mpa-btn" type="submit">Gerar acesso</button></div><div class="mpa-status"></div></form><div id="mpaInviteResult"></div></div><div class="mpa-card"><h2>Setores configurados</h2><div class="mpa-sector-grid">${departments.map(d=>`<div class="mpa-sector"><b>${esc(d.name)}</b><span>${esc(d.description||'')}</span><span>${esc((d.modules||[]).length)} módulo(s) autorizado(s)</span></div>`).join('')}</div></div><div class="mpa-card"><h2>Responsáveis ativos</h2><div class="mpa-list">${staffRows.length?staffRows.map(s=>`<div class="mpa-row"><div><b>${esc(s.full_name||s.email||'Usuário')}</b><small>${esc(s.department||'Sem setor')} • ${esc(s.role)}</small><span class="mpa-badge">${s.active?'Ativo':'Inativo'}</span></div></div>`).join(''):'<div class="mpa-empty">Nenhum responsável setorial cadastrado ainda.</div>'}</div></div><div class="mpa-card"><h2>Convites recentes</h2><div class="mpa-list">${invites.length?invites.map(i=>`<div class="mpa-row"><div><b>${esc(i.full_name||i.email)}</b><small>${esc(i.email)} • ${esc(i.department_code||'')}</small><span class="mpa-badge">${i.accepted_at?'Ativado':'Aguardando primeiro acesso'}</span></div></div>`).join(''):'<div class="mpa-empty">Nenhum convite criado.</div>'}</div></div>`;
    body.querySelector('[data-logout]').addEventListener('click',logout);body.querySelector('#mpaInvite').addEventListener('submit',createInvite);
  }
  async function createInvite(e){e.preventDefault();const c=await getClient(),fd=new FormData(e.currentTarget),st=e.currentTarget.querySelector('.mpa-status'),out=document.querySelector('#mpaInviteResult');st.textContent='Gerando acesso…';const {data,error}=await c.rpc('admin_create_portal_invite',{p_email:String(fd.get('email')).trim(),p_full_name:String(fd.get('name')).trim(),p_department_code:String(fd.get('department')),p_role:String(fd.get('role'))});if(error){st.textContent='Falha: '+error.message;return;}const inv=Array.isArray(data)?data[0]:data;const link=`${location.origin}${location.pathname}?portal_invite=${encodeURIComponent(inv.token)}`;st.textContent='Acesso criado.';out.innerHTML=`<div class="mpa-copy">${esc(link)}</div><div class="mpa-actions" style="margin-top:8px"><button class="mpa-btn secondary" type="button" data-copy>Copiar link de primeiro acesso</button></div>`;out.querySelector('[data-copy]').addEventListener('click',async()=>{await navigator.clipboard?.writeText(link);out.querySelector('[data-copy]').textContent='Link copiado';});}
  async function logout(){const c=await getClient();await c.auth.signOut();session=null;staff=null;render();}
  function bind(){document.addEventListener('click',e=>{const b=e.target.closest('#manariSocialApp .sm-circle-btn[title="Conta"],#manariSocialApp .sm-circle-btn[title="Entrar"],#manariSocialApp .sm-circle-btn[title="Minha conta"],#manariSocialApp .sm-circle-btn[title="Área do setor"]');if(b){e.preventDefault();e.stopImmediatePropagation();open();}},true);}
  async function boot(){bind();await refreshIdentity();if(new URLSearchParams(location.search).has('portal_invite'))open();}
  window.ManariPortalAuth={open,close,refresh:refreshIdentity};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();