// Browser-only UI fixture. Never include in the deployment assets.
// It exercises the actual UI controller with in-memory data; backend tests are separate.
import {mountEsic} from './app.mjs';
const adminId='76c046c7-78dd-4b73-8d53-c93f4c4da003';
let user={id:adminId,email:'administrador@example.invalid'};
let authChanged=()=>{};
const rows=[
 {id:'76c046c7-78dd-4b73-8d53-c93f4c4da004',protocol:'TESTE-UI-001',citizen_id:adminId,module:'esic',category:'geral',subject:'Pedido fictício do administrador',description:'Informação fictícia para testar a interface.',status:'recebido',created_at:'2026-10-25T12:00:00Z'},
 {id:'76c046c7-78dd-4b73-8d53-c93f4c4da005',protocol:'TESTE-UI-002',citizen_id:'76c046c7-78dd-4b73-8d53-c93f4c4da001',module:'esic',category:'geral',subject:'Pedido fictício de outro cidadão',description:'Este pedido só deve aparecer na fila administrativa.',status:'recebido',created_at:'2026-10-25T12:00:00Z'}
];
const events=[];
const client={
 auth:{
  getSession:async()=>({data:{session:user?{user}:null},error:null}),
  getUser:async()=>({data:{user},error:null}),
  signOut:async()=>{user=null;authChanged('SIGNED_OUT');return {error:null};},
  onAuthStateChange:fn=>{authChanged=fn;return {data:{subscription:{unsubscribe(){}}}};}
 },
 from(table) {
  let filters=[];
  return {select(){return this;},eq(key,value){filters.push([key,value]);return this;},
   order:async()=>({data:(table==='manari_digital_events'?events:rows).filter(r=>filters.every(([key,value])=>r[key]===value)),error:null})};
 },
 async rpc(name,args) {
  if(name==='is_portal_admin')return {data:user?.id===adminId,error:null};
  const row=rows.find(r=>r.id===args.p_request);
  if(!row||!user)return {data:null,error:{message:'Acesso negado'}};
  const status={encaminhar:'em_analise',responder:'respondido',arquivar:'arquivado',reabrir:'em_analise'};
  row.status=status[args.p_action];row.updated_at=new Date().toISOString();
  if(args.p_action==='responder'){row.response_text=args.p_response;row.responded_at=row.updated_at;}
  if(args.p_action==='encaminhar')row.department=args.p_department;
  events.push({request_id:row.id,event_type:{encaminhar:'encaminhado',responder:'respondido',arquivar:'arquivado',reabrir:'reaberto'}[args.p_action],details:args.p_department||'',created_at:row.updated_at});
  return {data:{id:row.id,status:row.status},error:null};
 }
};
document.querySelector('.notice').textContent='TESTE DE INTERFACE • Dados simulados, sem conexão com o banco.';
mountEsic(document,client);
