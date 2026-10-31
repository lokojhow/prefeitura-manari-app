// Local browser QA with fictitious data. Copy beside app.mjs; never deploy fixture.
import {mount} from './app.mjs';
const admin=new URL(location.href).searchParams.get('as')==='admin';
const user=admin?{id:'76c046c7-78dd-4b73-8d53-c93f4c4da003',email:'administrador@example.invalid'}:null;
const rows=[],events=[],departments=[{code:'educacao',name:'Educação',active:true},{code:'obras',name:'Infraestrutura e Obras',active:true}];
let sequence=0;
const client={auth:{getUser:async()=>({data:{user}}),onAuthStateChange(){},signOut:async()=>({error:null})},from(table){return {select(){return this;},eq(){return this;},order:async()=>({data:table==='portal_departments'?departments:events,error:null})};},async rpc(name,p){
 if(name==='is_portal_admin')return {data:admin};
 if(name==='manari_ouvidoria_submit'){const row={id:'76c046c7-78dd-4b73-8d53-'+String(++sequence).padStart(12,'0'),protocol:'OUV-TESTE-'+sequence,kind:p.p_kind,subject:p.p_subject,description:p.p_description,department_code:p.p_department,other_department:p.p_other,is_anonymous:p.p_anonymous,status:'recebido',created_at:new Date().toISOString()};rows.push(row);return {data:{protocol:row.protocol,key:p.p_anonymous?'a'.repeat(64):null,anonymous:p.p_anonymous}};}
 if(name==='manari_ouvidoria_track'){if(p.p_key!=='a'.repeat(64))return {error:Error('Protocolo ou chave inválidos.')};const row=rows.find(r=>r.protocol===p.p_protocol);return row?{data:{...row,history:events}}:{error:Error('Protocolo ou chave inválidos.')};}
 if(name==='manari_ouvidoria_list')return {data:{rows,total:rows.length,page:1,departments:[]}};
 return {error:Error('Operação não configurada na fixture.')};
}};
document.querySelector('.notice').textContent='PRÉVIA • Dados fictícios de teste, sem conexão com o banco.';
mount(document,client);
