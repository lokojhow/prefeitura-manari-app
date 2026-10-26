import {createEsicApi,STATUS,friendlyError} from './api.mjs';

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
 let mine=[],queue=[],allowed=false,epoch=0,recovering=false,authTimer=null,activeUserId=null;
 const value=form=>Object.fromEntries(new FormData(form));
 const show=(element,visible)=>{$(element).hidden=!visible;};
 const date=value=>value?new Date(value).toLocaleString('pt-BR'):'—';
 const message=(text,error=false)=>{const el=$('status');el.textContent=text;el.classList.toggle('error',error);};
 function node(tag,text,className) {const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el;}
 function clearPrivate() {
  mine=[];queue=[];allowed=false;
  for(const target of ['requests','queue-items','request-id','selected-request'])$(target).replaceChildren();
  $('identity').textContent='';$('search').value='';$('queue-filter').value='';
  $('create').reset();$('action').reset();
  for(const target of ['compose','protocols','admin','account'])show(target,false);
 }
 async function run(control,fn) {
  if(control?.dataset.busy==='true')return;
  const buttons=control?Array.from(control.querySelectorAll('button')).concat(control.tagName==='BUTTON'?[control]:[]):[];
  if(control)control.dataset.busy='true';buttons.forEach(b=>b.disabled=true);
  try {await fn();}catch(error){message(friendlyError(error),true);}
  finally {if(control)delete control.dataset.busy;buttons.forEach(b=>b.disabled=false);}
 }
 function requestCard(request,adminView=false) {
  const card=node('article',null,'request');
  const head=node('div',null,'request-head');
  head.append(node('span',request.protocol,'protocol'),node('span',STATUS[request.status]||request.status,`badge ${request.status}`));
  card.append(head,node('h3',request.subject),node('p',`Registrado em ${date(request.created_at)}`,'hint'),node('p',request.description,'long-text'));
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
  if(adminView) {const select=node('button','Atender este protocolo','secondary');select.type='button';select.onclick=()=>{$('request-id').value=request.id;selectedRequest();$('action').scrollIntoView({behavior:'smooth',block:'start'});};card.append(select);}
  return card;
 }
 function renderMine() {
  const filter=$('search').value.trim().toLocaleLowerCase('pt-BR');
  const rows=mine.filter(r=>(r.protocol+' '+r.subject).toLocaleLowerCase('pt-BR').includes(filter));
  $('requests').replaceChildren(...rows.map(r=>requestCard(r)));
  if(!rows.length)$('requests').append(node('p',mine.length?'Nenhum protocolo corresponde à busca.':'Você ainda não registrou pedidos.','empty'));
 }
 function renderQueue() {
  const rows=queue.filter(r=>!$('queue-filter').value||r.status===$('queue-filter').value);
  const previous=$('request-id').value;
  $('queue-items').replaceChildren(...rows.map(r=>requestCard(r,true)));
  $('request-id').replaceChildren(...rows.map(r=>{const option=node('option',`${r.protocol} — ${r.subject}`);option.value=r.id;return option;}));
  if(rows.some(r=>r.id===previous))$('request-id').value=previous;
  if(!rows.length)$('queue-items').append(node('p','Nenhum pedido nesta situação.','empty'));
  $('action').hidden=!rows.length;selectedRequest();
 }
 function selectedRequest() {
  const request=queue.find(r=>r.id===$('request-id').value);
  $('selected-request').replaceChildren(...(request?[node('p',request.description,'long-text')]:[]));
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
 async function refreshQueue(version=epoch) {if(!allowed)return;const rows=await api.queue();if(version!==epoch)return;queue=rows||[];renderQueue();}
 async function identity() {
  const version=++epoch;clearPrivate();show('auth',true);show('recovery',recovering);
  const {data,error}=await client.auth.getSession();
  if(version!==epoch)return;
  if(error) {await client.auth.signOut({scope:'local'});message(friendlyError(error),true);return;}
  if(!data?.session?.user) {activeUserId=null;message('Entre ou crie uma conta para registrar e acompanhar pedidos.');return;}
  const user=await client.auth.getUser();if(version!==epoch)return;
  if(user.error||!user.data?.user) {message(friendlyError(user.error||Error('Sua sessão expirou. Entre novamente.')),true);return;}
  activeUserId=user.data.user.id;
  $('identity').textContent=user.data.user.email||'Conta autenticada';show('auth',false);show('account',true);
  if(recovering) {message('Escolha uma nova senha para sua conta.');return;}
  show('compose',true);show('protocols',true);
  const permission=await client.rpc('is_portal_admin');if(version!==epoch)return;
  allowed=!permission.error&&permission.data===true;show('admin',allowed);
  await refreshMine(version);if(version!==epoch)return;
  await refreshQueue(version);if(version!==epoch)return;
  message('Conta conectada. Seus protocolos estão atualizados.');
 }
 function form(id,handler) {$(id).onsubmit=event=>{event.preventDefault();void run(event.currentTarget,()=>handler(event.currentTarget));};}
 const redirect=()=>new URL('./',document.location.href).href;
 form('login',async form=>{
  message('Entrando…');const d=value(form),result=await client.auth.signInWithPassword({email:d.email.trim(),password:d.password});
  if(result.error)throw result.error;form.reset();recovering=false;await identity();
 });
 form('signup',async form=>{
  message('Criando conta…');const d=value(form),result=await client.auth.signUp({email:d.email.trim(),password:d.password,options:{emailRedirectTo:redirect()}});
  if(result.error)throw result.error;form.reset();
  if(result.data?.session)await identity();else message('Cadastro recebido. Confira seu e-mail para confirmar o acesso e depois entre na sua conta.');
 });
 form('reset',async form=>{
  const result=await client.auth.resetPasswordForEmail(value(form).email.trim(),{redirectTo:redirect()});if(result.error)throw result.error;
  form.reset();message('Se houver uma conta com esse e-mail, você receberá um link de recuperação.');
 });
 form('new-password',async form=>{
  const result=await client.auth.updateUser({password:value(form).password});if(result.error)throw result.error;
  form.reset();recovering=false;await identity();message('Senha atualizada. Você já pode acompanhar seus protocolos.');
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
  try{await refreshQueue(version);await refreshMine(version);}catch{message('Andamento salvo. A atualização da fila falhou; use Atualizar fila.',true);return;}
  if(version===epoch)message('Andamento registrado e histórico atualizado.');
 });
 $('logout').onclick=()=>void run($('logout'),async()=>{
  ++epoch;clearTimeout(authTimer);clearPrivate();activeUserId=null;recovering=false;show('auth',true);show('recovery',false);
  const result=await client.auth.signOut({scope:'local'});if(result.error)throw result.error;message('Sessão encerrada neste dispositivo.');
 });
 $('refresh').onclick=()=>void run($('refresh'),async()=>{await refreshMine();message('Protocolos atualizados.');});
 $('queue-refresh').onclick=()=>void run($('queue-refresh'),async()=>{await refreshQueue();message('Fila atualizada.');});
 $('search').oninput=renderMine;$('queue-filter').onchange=renderQueue;
 $('request-id').onchange=selectedRequest;$('action-kind').onchange=actionFields;
 client.auth.onAuthStateChange((event,session)=>{
  // Never await a Supabase API call while the auth callback holds its lock.
  if(event==='PASSWORD_RECOVERY')recovering=true;
  const changedAccount=event==='SIGNED_IN'&&session?.user?.id!==activeUserId;
  if(changedAccount||['SIGNED_OUT','PASSWORD_RECOVERY','USER_UPDATED'].includes(event)) {
   if(event==='SIGNED_OUT'||changedAccount){++epoch;clearPrivate();activeUserId=null;show('auth',true);}
   clearTimeout(authTimer);authTimer=setTimeout(()=>void run(null,identity),0);
  }
 });
 void run(null,identity);
 return {refresh:identity};
}

if(typeof document!=='undefined' && document.documentElement.dataset.esicRuntime==='supabase') {
 try {
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.0');
  const client=createClient('https://dxvqiiawthxwkypvsxci.supabase.co','sb_publishable_Zno2VuYH9oev89OpttorUA_wzNb0EP6',{auth:{storageKey:'manari-esic-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  mountEsic(document,client);
 } catch(error) {
  const status=document.getElementById('status');status.classList.add('error');status.textContent='Não foi possível iniciar o serviço. Recarregue a página ou entre em contato com a Ouvidoria.';
  console.error('Falha de inicialização do e-SIC:',error);
 }
}
