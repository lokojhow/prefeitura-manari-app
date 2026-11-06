(function(){
'use strict';
const URL='https://dxvqiiawthxwkypvsxci.supabase.co', KEY='sb_publishable_Zno2VuYH9oev89OpttorUA_wzNb0EP6';
const $=id=>document.getElementById(id), statusNames={rascunho:'Rascunho',enviado:'Enviado',recebido:'Recebido',pendente:'Pendente',concluido:'Concluído',cancelado:'Cancelado'}, priorityNames={normal:'Normal',media:'Média',alta:'Alta'};
const state={client:null,profile:null,rows:[],sectors:[],filter:'todos',view:'processos',page:1,size:12,selected:null};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(s,error=false){const el=$('toast');el.textContent=String(s);el.className=error?'error':'';el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,4800)}
async function api(action,data={}){const r=await state.client.rpc('manari_protocolo',{p_acao:action,p_dados:data});if(r.error)throw r.error;return r.data}
function message(e){toast(e.message||String(e),true)}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e}
function fmt(date){return date?new Date(date).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—'}
function filtered(){let a=state.rows.slice(),s=$('search').value.toLocaleLowerCase('pt-BR').trim(),p=$('priority-filter').value;
if(state.filter==='enviados')a=a.filter(x=>x.criado_por===state.userId&&x.situacao!=='rascunho'||x.situacao==='enviado'&&x.origem===state.profile.setor);
else if(state.filter==='recebidos')a=a.filter(x=>x.destino===state.profile.setor&&x.situacao==='recebido');
else if(state.filter==='pendentes')a=a.filter(x=>x.destino===state.profile.setor&&x.situacao==='pendente');
else if(state.filter!=='todos')a=a.filter(x=>x.situacao===state.filter);
if(p)a=a.filter(x=>x.prioridade===p);
if(s)a=a.filter(x=>[x.numero+'/'+x.ano,x.assunto,x.descricao,x.origem,x.destino].some(v=>String(v??'').toLocaleLowerCase('pt-BR').includes(s)));
return a}
function counter(k){return state.rows.filter(x=>k==='enviados'?x.situacao==='enviado':k==='recebidos'?x.situacao==='recebido':x.situacao===k).length}
function render(){const cards=[['enviados','➤'],['recebidos','▱'],['pendentes','◷'],['concluido','✓'],['cancelado','×']];$('stats').replaceChildren(...cards.map(([k,icon])=>{const b=el('button','stat');b.innerHTML='<span class="stat-icon">'+safe(icon)+'</span><span><strong>'+counter(k)+'</strong><span>'+safe(k==='concluido'?'Concluídos':k==='cancelado'?'Cancelados':k.charAt(0).toUpperCase()+k.slice(1))+'</span></span>';b.onclick=()=>setFilter(k==='concluido'?'concluido':k==='cancelado'?'cancelado':k);return b}));
const folders=[['rascunho','Rascunhos','▤'],['pendentes','Pendentes','◷'],['enviados','Enviados','➤'],['recebidos','Recebidos','▱'],['cancelado','Cancelados','×'],['concluido','Concluídos','✓'],['todos','Todos os processos','▥']];
$('folder-list').replaceChildren(...folders.map(([k,n,i])=>{let b=el('button','folder'+(state.filter===k?' selected':''));b.innerHTML='<span>'+i+'</span> '+n+' <em>'+ (k==='todos'?state.rows.length:counter(k))+'</em>';b.onclick=()=>setFilter(k);return b}));
const rows=filtered(),pages=Math.max(1,Math.ceil(rows.length/state.size));state.page=Math.min(state.page,pages);const slice=rows.slice((state.page-1)*state.size,state.page*state.size);
const tbody=$('table-body');tbody.replaceChildren();if(!slice.length){const tr=el('tr');const td=el('td','empty','Nenhum processo encontrado nesta pasta.');td.colSpan=7;tr.append(td);tbody.append(tr)}else slice.forEach(x=>{const tr=el('tr');const td=el('td');const b=el('button','record-link',x.numero+'/'+x.ano);b.onclick=()=>openDetail(x.id);td.append(b);tr.append(td);
for(const t of [x.assunto,x.destino,x.descricao.length>86?x.descricao.slice(0,86)+'…':x.descricao])tr.append(el('td',null,t));
let st=el('td');st.innerHTML='<span class="status-badge '+safe(x.situacao)+'">'+safe(statusNames[x.situacao])+'</span>';tr.append(st);tr.append(el('td',null,fmt(x.criado_em)));let pr=el('td');pr.innerHTML='<span class="priority '+safe(x.prioridade)+'">'+safe(priorityNames[x.prioridade])+'</span>';tr.append(pr);tbody.append(tr)});
$('table-count').textContent='Mostrando '+slice.length+' de '+rows.length+' registros';$('page-label').textContent=state.page+' / '+pages;$('prev').disabled=state.page<=1;$('next').disabled=state.page>=pages;
document.querySelectorAll('.nav[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===state.view));
}
function setFilter(v){state.filter=v;state.page=1;render()}
async function refresh(){state.rows=await api('lista');render()}
function sectorOptions(select){select.replaceChildren(...state.sectors.map(s=>{const o=el('option',null,s.name);o.value=s.code;return o}))}
function openNew(){sectorOptions($('create-sector'));$('create-form').reset();if(state.sectors.some(s=>s.code===state.profile.setor))$('create-sector').value=state.profile.setor;$('create-dialog').showModal()}
async function openDetail(id){state.selected=id;const p=await api('detalhe',{id}),history=await api('historico',{id}),attachments=await api('anexos',{id});
$('detail-number').textContent='PROCESSO '+p.numero+'/'+p.ano;$('detail-title').textContent=p.assunto;
const fields=[['Situação',statusNames[p.situacao]],['Prioridade',priorityNames[p.prioridade]],['Origem',p.origem],['Destino atual',p.destino],['Data de abertura',fmt(p.criado_em)],['Descrição',p.descricao]];
$('detail-fields').replaceChildren(...fields.map(([k,v])=>{const d=el('div');d.append(el('span',null,k),el('strong',null,v));return d}));
$('history').replaceChildren(...history.map(m=>{const d=el('div','history-entry');d.append(el('strong',null,m.acao.charAt(0).toUpperCase()+m.acao.slice(1)),el('small',null,fmt(m.criado_em)),el('div',null,m.observacao||[m.origem,m.destino].filter(Boolean).join(' → ')));return d}));
if(!history.length)$('history').textContent='Sem movimentações.';
$('attachments').replaceChildren(...attachments.map(a=>{const row=el('div','attachment');row.append(el('span',null,'▤ '+a.nome));const b=el('button','outline','Abrir');b.onclick=()=>download(a.objeto,a.nome);row.append(b);return row}));
if(!attachments.length)$('attachments').textContent='Nenhum anexo.';
const options=[['','Selecione uma ação']];if(p.situacao==='rascunho'&&(p.criado_por===state.userId||state.profile.admin))options.push(['enviar','Enviar processo']);
if(p.situacao!=='rascunho'&&!['concluido','cancelado'].includes(p.situacao)&&(state.profile.admin||p.destino===state.profile.setor))options.push(['receber','Confirmar recebimento'],['encaminhar','Encaminhar para setor'],['pendente','Marcar pendente'],['concluir','Concluir processo']);
if(!['concluido','cancelado'].includes(p.situacao)&&(state.profile.admin||p.criado_por===state.userId))options.push(['cancelar','Cancelar processo']);
$('action-type').replaceChildren(...options.map(([v,t])=>{const o=el('option',null,t);o.value=v;return o}));
sectorOptions($('action-sector'));$('destino-wrap').hidden=true;
$('action-form').hidden=options.length===1;$('upload-form').hidden=['concluido','cancelado'].includes(p.situacao)||!(state.profile.admin||p.criado_por===state.userId||p.destino===state.profile.setor);
$('detail-dialog').showModal()}
async function download(path,name){try{const r=await state.client.storage.from('protocolo-anexos').download(path);if(r.error)throw r.error;const u=URL.createObjectURL(r.data);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)}catch(e){message(e)}}
function report(){const rows=filtered(),heads=['Processo','Assunto','Origem','Destino','Descrição','Situação','Prioridade','Data'];let csv=[heads,...rows.map(x=>[x.numero+'/'+x.ano,x.assunto,x.origem,x.destino,x.descricao,statusNames[x.situacao],priorityNames[x.prioridade],fmt(x.criado_em)])].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""').replace(/^[=+@-]/,'\u0027$&')+'"').join(';')).join('\r\n');const u=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='relatorio-processos.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
async function load(){const result=await state.client.auth.getUser();if(result.error)throw result.error;if(!result.data.user){$('auth-view').hidden=false;$('app').hidden=true;return}
state.userId=result.data.user.id;state.profile=await api('perfil');state.sectors=await api('setores');$('side-user').textContent=result.data.user.email||'Usuário';$('top-user').textContent=state.profile.admin?'Administrador':state.profile.setor;$('auth-view').hidden=true;$('app').hidden=false;await refresh()}
async function init(){if(!window.supabase){$('login-status').textContent='Não foi possível carregar a conexão. Verifique a internet.';return}
state.client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
try{await load()}catch(e){$('auth-view').hidden=false;$('app').hidden=true;$('login-status').textContent=e.message||'Acesso negado';}
}
$('login-form').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const f=new FormData(e.target),r=await state.client.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(r.error)throw r.error;await load()}catch(x){$('login-status').textContent=x.message||'Falha no acesso'}finally{b.disabled=false}};
$('logout').onclick=async()=>{await state.client.auth.signOut();location.reload()};
document.querySelectorAll('[data-new]').forEach(x=>x.onclick=openNew);document.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>x.closest('dialog').close());
$('create-form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const f=new FormData(e.target);const p=await api('novo',{assunto:f.get('assunto'),descricao:f.get('descricao'),destino:f.get('destino'),prioridade:f.get('prioridade')});$('create-dialog').close();await refresh();toast('Rascunho criado com sucesso.');await openDetail(p.id)}catch(x){message(x)}finally{b.disabled=false}};
$('action-type').onchange=()=>{$('destino-wrap').hidden=$('action-type').value!=='encaminhar'};
$('action-form').onsubmit=async e=>{e.preventDefault();const ac=$('action-type').value;if(!ac)return;const b=e.submitter;b.disabled=true;try{await api(ac,{id:state.selected,destino:$('action-sector').value,observacao:$('action-note').value});$('action-note').value='';$('detail-dialog').close();await refresh();await openDetail(state.selected);toast('Tramitação registrada.')}catch(x){message(x)}finally{b.disabled=false}};
$('upload-form').onsubmit=async e=>{e.preventDefault();const file=$('upload-file').files[0];if(!file)return;if(file.size>10485760||!['application/pdf','image/png','image/jpeg'].includes(file.type)){toast('Utilize PDF, PNG ou JPG com até 10 MB.',true);return}
const btn=e.submitter;btn.disabled=true;const suffix=file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg';const path=state.selected+'/'+crypto.randomUUID()+'.'+suffix;
try{const r=await state.client.storage.from('protocolo-anexos').upload(path,file,{contentType:file.type,upsert:false});if(r.error)throw r.error;try{await api('anexar',{id:state.selected,nome:file.name.slice(0,200),objeto:path,tamanho:file.size})}catch(err){await state.client.storage.from('protocolo-anexos').remove([path]);throw err}
$('detail-dialog').close();await openDetail(state.selected);toast('Anexo registrado.')}catch(x){message(x)}finally{btn.disabled=false}};
$('search').oninput=()=>{state.page=1;render()};$('priority-filter').onchange=()=>{state.page=1;render()};$('prev').onclick=()=>{state.page--;render()};$('next').onclick=()=>{state.page++;render()};
$('btn-export').onclick=report;
$('btn-protocolar').onclick=()=>{setFilter('rascunho');toast('Abra um rascunho e escolha Enviar processo.')};
$('btn-tramitar').onclick=()=>{setFilter('recebidos');toast('Abra um processo e selecione a ação de tramitação.')};
$('btn-arquivar').onclick=()=>{setFilter('recebidos');toast('Abra um processo recebido e escolha Concluir processo.')};
document.querySelectorAll('.nav[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;state.filter=b.dataset.view==='caixa'?'recebidos':'todos';if(b.dataset.view==='tramitacoes')state.filter='enviados';state.page=1;render();document.querySelector('.sidebar').classList.remove('open');if(b.dataset.view==='relatorios')toast('Utilize Gerar relatório para exportar o CSV.')});
$('menu').onclick=()=>document.querySelector('.sidebar').classList.toggle('open');
init();
})();