import {createEsicApi,STATUS,friendlyError,resendSignupConfirmation} from './api.mjs';
import {recoveryDestination,rememberRecovery} from './auth-return.mjs';
import {dateRangeForPreset,departmentName,MANARI_TIME_ZONE,UNASSIGNED_DEPARTMENT} from './dashboard.mjs';

export function setPasswordVisibility(input,button,visible) {
 input.type=visible?'text':'password';
 const action=visible?'Ocultar':'Mostrar';
 button.textContent=action+' senha';
 button.setAttribute('aria-pressed',String(visible));
 button.setAttribute('aria-label',action+' '+(button.dataset.passwordLabel||'senha'));
}

export function mountEsic(document,client) {
 const $=id=>{const element=document.getElementById(id);if(!element)throw Error(`Elemento ausente: ${id}`);return element;};
 const api=createEsicApi(client);
 for(const button of document.querySelectorAll('[data-password-target]')) {
  const input=$(button.dataset.passwordTarget);
  button.onclick=()=>setPasswordVisibility(input,button,input.type==='password');
  input.form?.addEventListener('reset',()=>setPasswordVisibility(input,button,false));
 }
 let mine=[],queue=[],departments=[],allowed=false,epoch=0,authTimer=null,activeUserId=null;
 let dashboardPage=1,dashboardVersion=0,workspace='admin',selectedId='';
 const value=form=>Object.fromEntries(new FormData(form));
 const show=(element,visible)=>{$(element).hidden=!visible;};
 const date=value=>value?new Date(value).toLocaleString('pt-BR',{timeZone:MANARI_TIME_ZONE}):'—';
 const message=(text,error=false)=>{const el=$('status');el.textContent=text;el.classList.toggle('error',error);};
 function node(tag,text,className) {const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el;}
 function clearPrivate() {
  mine=[];queue=[];departments=[];allowed=false;dashboardPage=1;selectedId='';++dashboardVersion;
  for(const target of ['requests','queue-items','request-id','selected-request'])$(target).replaceChildren();
  $('identity').textContent='';$('search').value='';$('queue-filter').value='';
  $('queue-period').value='all';$('queue-from').value='';$('queue-to').value='';updatePeriod();
  $('queue-department').replaceChildren();$('department-chart').replaceChildren();
  for(const id of ['stat-total','stat-open','stat-answered','stat-archived'])$(id).textContent='0';
  $('queue-summary').textContent='Carregando chamados…';$('queue-page').textContent='Página 1 de 1';$('admin').setAttribute('aria-busy','false');
  $('create').reset();$('action').reset();
  for(const target of ['compose','protocols','admin','account','workspace-tabs','citizen-workspace','admin-detail','dashboard-insights'])show(target,false);
  document.body.classList.remove('admin-workspace');
 }
 async function run(control,fn) {
  if(control?.dataset.busy==='true')return;
  const buttons=control?Array.from(control.querySelectorAll('button')).concat(control.tagName==='BUTTON'?[control]:[]):[];
  if(control)control.dataset.busy='true';buttons.forEach(b=>b.disabled=true);
  try {await fn();}catch(error){message(friendlyError(error),true);}
  finally {if(control)delete control.dataset.busy;buttons.forEach(b=>b.disabled=false);}
 }
 function requestCard(request) {
  const card=node('article',null,'request');
  const head=node('div',null,'request-head');
  head.append(node('span',request.protocol,'protocol'),node('span',STATUS[request.status]||request.status,`badge ${request.status}`));
  card.append(head,node('h3',request.subject),node('p',`Registrado em ${date(request.created_at)}`,'hint'),node('p',request.description,'long-text'));
  card.append(node('p',`Secretaria do pedido: ${departmentName(request.requested_department_code,departments)}`,'request-department'));
  if(request.department)card.append(node('p',`Setor responsável: ${request.department}`));
  if(request.response_text) {
   const response=node('div',null,'response');
   response.append(node('strong',request.status==='em_analise'?'Resposta anterior':'Resposta ao cidadão'),node('p',request.response_text,'long-text'),node('small',date(request.responded_at)));
   card.append(response);
  }
  const history=node('details');history.append(node('summary','Histórico do atendimento'));
  const historyBody=node('div');history.append(historyBody);let loaded=false;
  history.ontoggle=()=>{if(!history.open||loaded)return;const version=epoch;void run(null,async()=>{
   historyBody.textContent='Carregando histórico…';const rows=await api.history(request.id);if(version!==epoch)return;
   const list=node('ol',null,'history');list.append(node('li',`${date(request.created_at)} — Pedido registrado`));
   const names={criado:'Pedido registrado',encaminhado:'Encaminhado',respondido:'Respondido',arquivado:'Arquivado',reaberto:'Reaberto',recurso:'Recurso registrado'};
   for(const row of rows||[])if(row.event_type!=='criado')list.append(node('li',`${date(row.created_at)} — ${names[row.event_type]||row.event_type}${row.details?' • '+row.details:''}`));
   historyBody.replaceChildren(list);loaded=true;
  });};
  card.append(history);
  return card;
 }
 function renderMine() {
  const filter=$('search').value.trim().toLocaleLowerCase('pt-BR');
  const rows=mine.filter(r=>(r.protocol+' '+r.subject).toLocaleLowerCase('pt-BR').includes(filter));
  $('requests').replaceChildren(...rows.map(r=>requestCard(r)));
  if(!rows.length)$('requests').append(node('p',mine.length?'Nenhum protocolo corresponde à busca.':'Você ainda não registrou pedidos.','empty'));
 }
 function option(text,value) {const item=node('option',text);item.value=value;return item;}
 function departmentOptions() {
  const active=departments.filter(department=>department.active!==false);
  $('requested-department').replaceChildren(option('Selecione a secretaria',''),...active.map(d=>option(d.code==='ouvidoria'?`${d.name} — não sei qual secretaria escolher`:d.name,d.code)));
  $('department').replaceChildren(option('Selecione a secretaria',''),...active.map(d=>option(d.name,d.name)));
  $('queue-department').replaceChildren(option('Todas as secretarias',''),option('Secretaria não informada',UNASSIGNED_DEPARTMENT),...departments.map(d=>option(d.name+(d.active===false?' (inativa)':''),d.code)));
 }
 function setWorkspace(next) {
  workspace=next;
  const admin=allowed&&next==='admin';
  show('workspace-tabs',allowed);show('admin',admin);show('citizen-workspace',!admin);
  $('workspace-admin').setAttribute('aria-pressed',String(admin));$('workspace-citizen').setAttribute('aria-pressed',String(!admin));
  document.body.classList.toggle('admin-workspace',admin);
 }
 function updatePeriod() {
  const custom=$('queue-period').value==='custom';show('custom-period',custom);
  $('queue-from').disabled=!custom;$('queue-to').disabled=!custom;
  if(custom){const today=dateRangeForPreset('today');if(!$('queue-from').value)$('queue-from').value=today.from;if(!$('queue-to').value)$('queue-to').value=today.to;}
 }
 function dashboardFilters() {
  const range=$('queue-period').value==='custom'?{from:$('queue-from').value,to:$('queue-to').value}:dateRangeForPreset($('queue-period').value);
  return {...range,department:$('queue-department').value,status:$('queue-filter').value,page:dashboardPage,pageSize:25};
 }
 function queueNotice(text) {const row=node('tr'),cell=node('td',text,'empty');cell.colSpan=5;row.append(cell);$('queue-items').replaceChildren(row);}
 function renderQueue(data) {
  const total=Number(data.total),pages=Math.max(1,Math.ceil(total/data.page_size));
  if(!queue.some(request=>request.id===selectedId))selectedId='';
  $('queue-items').replaceChildren(...queue.map(request=>{
   const row=node('tr');
   const cell=(label,content)=>{const td=node('td');td.dataset.label=label;td.append(content);row.append(td);};
   cell('Abertura',node('span',date(request.created_at),'queue-date'));
   const identity=node('div');identity.append(node('span',request.protocol,'protocol'),node('strong',request.subject));cell('Protocolo e assunto',identity);
   cell('Secretaria',node('span',departmentName(request.requested_department_code,departments)));
   cell('Situação',node('span',STATUS[request.status]||request.status,`badge ${request.status}`));
   const open=node('button','Atender','secondary');open.type='button';open.setAttribute('aria-label',`Atender protocolo ${request.protocol}`);open.onclick=()=>{selectedId=request.id;$('request-id').value=request.id;selectedRequest();$('admin-detail').scrollIntoView({behavior:'smooth',block:'start'});};cell('Atendimento',open);
   return row;
  }));
  if(!queue.length)queueNotice('Nenhum chamado encontrado para os filtros selecionados.');
  $('request-id').replaceChildren(option('Selecione um chamado na lista',''),...queue.map(request=>option(`${request.protocol} — ${request.subject}`,request.id)));
  $('request-id').value=selectedId;selectedRequest();
  $('queue-summary').textContent=`${total.toLocaleString('pt-BR')} chamado${total===1?'':'s'} encontrado${total===1?'':'s'} • mais recentes primeiro`;
  $('queue-page').textContent=`Página ${dashboardPage} de ${pages}`;
  $('queue-previous').disabled=dashboardPage<=1;$('queue-next').disabled=dashboardPage>=pages;
  for(const [id,key] of [['stat-total','total'],['stat-open','open'],['stat-answered','answered'],['stat-archived','archived']])$(id).textContent=Number(data.totals[key]||0).toLocaleString('pt-BR');
  const rows=data.departments||[],max=Math.max(1,...rows.map(row=>Number(row.open)));
  const chart=node('ul',null,'department-bars');
  for(const row of rows){const item=node('li'),label=node('div',null,'bar-label');label.append(node('span',row.name),node('strong',Number(row.open).toLocaleString('pt-BR')));const track=node('div',null,'bar-track'),bar=node('div',null,'bar-fill');bar.style.width=(Number(row.open)/max*100)+'%';track.append(bar);item.append(label,track);chart.append(item);}
  $('department-chart').replaceChildren(rows.length?chart:node('p','Nenhum chamado aberto para os filtros selecionados.','empty'));
  show('dashboard-insights',true);
 }
 function selectedRequest() {
  const request=queue.find(r=>r.id===$('request-id').value);
  selectedId=request?.id||'';show('admin-detail',Boolean(request));
  $('selected-request').replaceChildren(...(request?[requestCard(request)]:[]));
  const actions=request&&['recebido','em_analise'].includes(request.status)?['encaminhar','responder']:request?.status==='respondido'?['arquivar','reabrir']:request?.status==='arquivado'?['reabrir']:[];
  for(const option of $('action-kind').options)option.disabled=!actions.includes(option.value);
  if(!$('action-kind').value||!actions.includes($('action-kind').value))$('action-kind').value=actions[0]||'';
  $('action-submit').disabled=!request;actionFields();
 }
 function actionFields() {
  const action=$('action-kind').value;
  show('department-field',action==='encaminhar');$('department').required=action==='encaminhar';
  show('response-field',action==='responder');$('response').required=action==='responder';
 }
 async function refreshMine(version=epoch) {const rows=await api.mine();if(version!==epoch)return;mine=rows||[];renderMine();}
 async function refreshQueue(version=epoch) {
  if(!allowed)return;const current=++dashboardVersion;
  $('admin').setAttribute('aria-busy','true');show('dashboard-insights',false);show('admin-detail',false);
  $('queue-previous').disabled=true;$('queue-next').disabled=true;$('queue-summary').textContent='Atualizando chamados…';queueNotice('Carregando chamados…');
  try {
   const data=await api.dashboard(dashboardFilters());if(version!==epoch||current!==dashboardVersion)return;
   if(!Array.isArray(data?.rows)||!data.totals)throw Error('Não foi possível carregar o painel. Tente atualizar novamente.');
   const lastPage=Math.max(1,Math.ceil(Number(data.total)/data.page_size));
   if(dashboardPage>lastPage){dashboardPage=lastPage;return await refreshQueue(version);}
   queue=data.rows;renderQueue(data);
  } catch(error) {if(version===epoch&&current===dashboardVersion){queue=[];selectedId='';$('queue-summary').textContent='Não foi possível atualizar os chamados.';queueNotice('Confira os filtros e tente atualizar o painel.');throw error;}}
  finally {if(version===epoch&&current===dashboardVersion)$('admin').setAttribute('aria-busy','false');}
 }
 async function identity() {
  const version=++epoch;clearPrivate();show('auth',true);
  const {data,error}=await client.auth.getSession();
  if(version!==epoch)return;
  if(error) {await client.auth.signOut({scope:'local'});message(friendlyError(error),true);return;}
  if(!data?.session?.user) {activeUserId=null;message('Entre ou crie uma conta para registrar e acompanhar pedidos.');return;}
  const user=await client.auth.getUser();if(version!==epoch)return;
  if(user.error||!user.data?.user) {message(friendlyError(user.error||Error('Sua sessão expirou. Entre novamente.')),true);return;}
  if(activeUserId!==user.data.user.id)workspace='admin';activeUserId=user.data.user.id;
  $('identity').textContent=user.data.user.email||'Conta autenticada';show('auth',false);show('account',true);
  show('compose',true);show('protocols',true);
  const [permission,catalog]=await Promise.all([client.rpc('is_portal_admin'),api.departments()]);if(version!==epoch)return;
  departments=catalog||[];departmentOptions();allowed=!permission.error&&permission.data===true;setWorkspace(workspace);
  await refreshMine(version);if(version!==epoch)return;
  await refreshQueue(version);if(version!==epoch)return;
  message(allowed?'Painel de atendimento atualizado.':'Conta conectada. Seus protocolos estão atualizados.');
 }
 function form(id,handler) {$(id).onsubmit=event=>{event.preventDefault();void run(event.currentTarget,()=>handler(event.currentTarget));};}
 const redirect=()=>new URL('./',document.location.href).href;
 form('login',async form=>{
  message('Entrando…');const d=value(form),result=await client.auth.signInWithPassword({email:d.email.trim(),password:d.password});
  if(result.error) {
   if(result.error.code==='email_not_confirmed'||/email not confirmed/i.test(result.error.message||'')) {
    $('confirmation-email').value=d.email.trim();$('confirmation-help').scrollIntoView({behavior:'smooth',block:'center'});
   }
   throw result.error;
  }
  form.reset();await identity();
 });
 form('signup',async form=>{
  message('Criando conta…');const d=value(form),result=await client.auth.signUp({email:d.email.trim(),password:d.password,options:{emailRedirectTo:redirect()}});
  if(result.error)throw result.error;form.reset();
  if(result.data?.session)await identity();else {
   $('confirmation-email').value=d.email.trim();
   message('Para concluir o cadastro, confirme seu e-mail antes de entrar. Confira a caixa de entrada e o spam. Se já possui conta, use Entrar ou Esqueci minha senha.');
  }
 });
 form('resend-confirmation',async form=>{
  await resendSignupConfirmation(client,value(form).email,redirect());
  message('Se houver um cadastro pendente para esse e-mail, a confirmação será reenviada. Confira a caixa de entrada e o spam.');
 });
 form('reset',async form=>{
  const result=await client.auth.resetPasswordForEmail(value(form).email.trim(),{redirectTo:redirect()});if(result.error)throw result.error;
  form.reset();message('Se houver uma conta com esse e-mail, você receberá um link de recuperação.');
 });
 form('create',async form=>{
  message('Registrando pedido…');const version=epoch;let created;
  try{created=await api.create(value(form));}catch(error){if(/network|fetch/i.test(String(error.message)))throw Error('Não foi possível confirmar o registro. Atualize seus protocolos antes de enviar novamente.');throw error;}
  if(version!==epoch)return;form.reset();
  try{await refreshMine(version);await refreshQueue(version);}catch{message(`Pedido registrado: ${created.protocol}. A atualização da lista falhou; use Atualizar.`,true);return;}
  if(version===epoch)message(`Pedido registrado com sucesso. Seu protocolo é ${created.protocol}.`);
 });
 form('action',async form=>{
  const d=value(form),version=epoch;
  await api.act({requestId:d.request_id,action:d.action,department:d.department,response:d.response});
  if(version!==epoch)return;$('response').value='';$('department').value='';
  try{await refreshQueue(version);await refreshMine(version);}catch{message('Andamento salvo. A atualização do painel falhou; use Atualizar painel.',true);return;}
  if(version===epoch)message('Andamento registrado e histórico atualizado.');
 });
 $('logout').onclick=()=>void run($('logout'),async()=>{
  ++epoch;clearTimeout(authTimer);clearPrivate();activeUserId=null;show('auth',true);
  const result=await client.auth.signOut({scope:'local'});if(result.error)throw result.error;message('Sessão encerrada. Entre ou crie outra conta abaixo.');
  $('auth').scrollIntoView({behavior:'smooth',block:'start'});$('login-email').focus({preventScroll:true});
 });
 $('refresh').onclick=()=>void run($('refresh'),async()=>{await refreshMine();message('Protocolos atualizados.');});
 $('queue-refresh').onclick=()=>void run($('queue-refresh'),async()=>{await refreshQueue();message('Painel atualizado.');});
 const applyFilters=()=>{dashboardPage=1;void run(null,refreshQueue);};
 $('admin-filters').onsubmit=event=>{event.preventDefault();applyFilters();};
 $('queue-period').onchange=()=>{updatePeriod();applyFilters();};$('queue-department').onchange=applyFilters;$('queue-filter').onchange=applyFilters;
 $('queue-clear').onclick=()=>{$('queue-period').value='all';$('queue-department').value='';$('queue-filter').value='';$('queue-from').value='';$('queue-to').value='';updatePeriod();applyFilters();};
 $('queue-previous').onclick=()=>{if(dashboardPage>1){--dashboardPage;void run(null,refreshQueue);}};
 $('queue-next').onclick=()=>{++dashboardPage;void run(null,refreshQueue);};
 $('workspace-admin').onclick=()=>setWorkspace('admin');$('workspace-citizen').onclick=()=>setWorkspace('citizen');
 $('close-request').onclick=()=>{$('request-id').value='';selectedRequest();};
 $('search').oninput=renderMine;
 $('request-id').onchange=selectedRequest;$('action-kind').onchange=actionFields;
 client.auth.onAuthStateChange((event,session)=>{
  // Never await a Supabase API call while the auth callback holds its lock.
  if(event==='PASSWORD_RECOVERY') {
   rememberRecovery(document.defaultView.sessionStorage,session);
   document.location.replace(new URL('./redefinir-senha/',document.location.href).href);
   return;
  }
  const changedAccount=event==='SIGNED_IN'&&session?.user?.id!==activeUserId;
  if(changedAccount||['SIGNED_OUT','USER_UPDATED'].includes(event)) {
   if(event==='SIGNED_OUT'||changedAccount){++epoch;clearPrivate();activeUserId=null;show('auth',true);}
   clearTimeout(authTimer);authTimer=setTimeout(()=>void run(null,identity),0);
  }
 });
 void run(null,identity);
 return {refresh:identity};
}

if(typeof document!=='undefined' && document.documentElement.dataset.esicRuntime==='supabase') {
 const recoveryTarget=recoveryDestination(document.location.href);
 if(recoveryTarget)document.location.replace(recoveryTarget);
 else {
 try {
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.0');
  const client=createClient('https://dxvqiiawthxwkypvsxci.supabase.co','sb_publishable_Zno2VuYH9oev89OpttorUA_wzNb0EP6',{auth:{storageKey:'manari-esic-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  mountEsic(document,client);
 } catch(error) {
  const status=document.getElementById('status');status.classList.add('error');status.textContent='Não foi possível iniciar o serviço. Recarregue a página ou entre em contato com a Ouvidoria.';
  console.error('Falha de inicialização do e-SIC:',error);
 }
 }
}
