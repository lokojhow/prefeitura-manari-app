// Browser-only, in-memory fixture. Copy beside app.mjs for local QA; never ship.
import {mountEsic} from './app.mjs';
import {manariDate,dateRangeForPreset,OTHER_DEPARTMENT,OTHER_DEPARTMENT_LABEL} from './dashboard.mjs';
const adminId='76c046c7-78dd-4b73-8d53-c93f4c4da003',citizenId='76c046c7-78dd-4b73-8d53-c93f4c4da001';
let admin=new URL(location.href).searchParams.get('as')!=='citizen',user={id:admin?adminId:citizenId,email:admin?'administrador@example.invalid':'cidadao@example.invalid'},authChanged=()=>{};
const departments=[{code:'educacao',name:'Educação',active:true},{code:'obras',name:'Infraestrutura e Obras',active:true},{code:'agricultura',name:'Agricultura',active:true},{code:'ouvidoria',name:'Ouvidoria e LAI',active:true}];
const codes=['educacao','obras','agricultura',null],statuses=['recebido','em_analise','respondido','arquivado'];
const rows=Array.from({length:34},(_,i)=>{
 const day=i<20?dateRangeForPreset('today').from:i<28?dateRangeForPreset('yesterday').from:dateRangeForPreset('week').from;
 const status=statuses[(i+Math.floor(i/4))%4];
 return {id:`76c046c7-78dd-4b73-8d53-${String(i+100).padStart(12,'0')}`,protocol:`TESTE-PAINEL-${String(i+1).padStart(3,'0')}`,citizen_id:i%5===0?adminId:citizenId,module:'esic',category:'geral',subject:`Pedido simulado ${String(i+1).padStart(2,'0')}`,description:'Informação fictícia para testar os filtros e o atendimento.',requested_department_code:codes[i%4],status,department:null,created_at:new Date(day+`T${String(8+i%10).padStart(2,'0')}:00:00-03:00`).toISOString(),response_text:status==='respondido'?'Resposta fictícia para o teste de interface.':null};
});
const events=[];
function dashboard(p) {
 const matches=rows.filter(r=>r.module==='esic'&&(!p.p_date_from||manariDate(new Date(r.created_at))>=p.p_date_from)&&(!p.p_date_to||manariDate(new Date(r.created_at))<=p.p_date_to)&&(!p.p_status||r.status===p.p_status)&&(!p.p_department||(p.p_department==='__unassigned__'?!r.requested_department_code&&!r.requested_department_other:p.p_department===OTHER_DEPARTMENT?Boolean(r.requested_department_other):r.requested_department_code===p.p_department))).sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
 const open=matches.filter(r=>['recebido','em_analise'].includes(r.status)),groups=new Map();
 for(const row of open){const code=row.requested_department_other?OTHER_DEPARTMENT:row.requested_department_code;groups.set(code,(groups.get(code)||0)+1);}
 return {rows:matches.slice((p.p_page-1)*p.p_page_size,p.p_page*p.p_page_size),total:matches.length,page:p.p_page,page_size:p.p_page_size,totals:{total:matches.length,open:open.length,answered:matches.filter(r=>r.status==='respondido').length,archived:matches.filter(r=>r.status==='arquivado').length},departments:[...groups].map(([code,count])=>({code,name:code===OTHER_DEPARTMENT?OTHER_DEPARTMENT_LABEL:departments.find(d=>d.code===code)?.name||'Secretaria não informada',open:count})).sort((a,b)=>b.open-a.open)};
}
const client={auth:{
 getSession:async()=>({data:{session:user?{user}:null},error:null}),getUser:async()=>({data:{user},error:null}),
 onAuthStateChange:fn=>{authChanged=fn;},signOut:async()=>{user=null;authChanged('SIGNED_OUT');return {error:null};}
},
 from(table){let filters=[],inserted;return {select(){return this;},eq(key,value){filters.push([key,value]);return this;},insert(payload){inserted={...payload,id:'76c046c7-78dd-4b73-8d53-000000000999',protocol:'TESTE-NOVO-001',status:'recebido',created_at:new Date().toISOString()};rows.push(inserted);return this;},single:async()=>({data:inserted,error:null}),order:async()=>({data:table==='portal_departments'?departments:(table==='manari_digital_events'?events:rows).filter(r=>filters.every(([key,value])=>r[key]===value)),error:null})};},
 async rpc(name,p){
  if(name==='is_portal_admin')return {data:admin&&Boolean(user),error:null};
  if(name==='manari_digital_admin_dashboard'){await new Promise(resolve=>setTimeout(resolve,p.p_department==='educacao'?1200:20));return {data:dashboard(p),error:null};}
  const row=rows.find(r=>r.id===p.p_request);if(!row||!admin||!user)return {error:Error('Não autorizado')};
  row.status={encaminhar:'em_analise',responder:'respondido',arquivar:'arquivado',reabrir:'em_analise'}[p.p_action];
  if(p.p_action==='encaminhar')row.department=p.p_department;
  if(p.p_action==='responder'){row.response_text=p.p_response;row.responded_at=new Date().toISOString();}
  events.push({request_id:row.id,event_type:p.p_action==='responder'?'respondido':'encaminhado',created_at:new Date().toISOString(),details:row.department||''});return {data:{id:row.id},error:null};
 }};
document.querySelector('.notice').textContent='TESTE DE INTERFACE • Dados simulados, sem conexão com o banco.';
mountEsic(document,client);
