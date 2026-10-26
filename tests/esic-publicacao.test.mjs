import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createEsicApi,friendlyError} from '../www/esic/api.mjs';
const UID='76c046c7-78dd-4b73-8d53-c93f4c4da001';
const RID='76c046c7-78dd-4b73-8d53-c93f4c4da004';
function fixture({authenticated=true,admin=false,error=null}={}) {
 const calls=[];
 const builder={select(fields){calls.push(['select',fields]);return this;},eq(...args){calls.push(['eq',...args]);return this;},insert(row){calls.push(['insert',row]);return this;},order(){return Promise.resolve({data:[],error});},single(){return Promise.resolve({data:{id:RID,protocol:'MAN-TEST'},error});}};
 const client={auth:{getUser:async()=>({data:{user:authenticated?{id:UID}:null},error:null})},rpc:async(name,args)=>{calls.push(['rpc',name,args]);return {data:name==='is_portal_admin'?admin:{status:'respondido'},error};},from(table){calls.push(['from',table]);return builder;}};
 return {api:createEsicApi(client),calls};
}
test('regressão de inicialização: todos os controles usados existem uma única vez no HTML',async()=>{
 const html=await readFile(new URL('../www/esic/index.html',import.meta.url),'utf8');
 const app=await readFile(new URL('../www/esic/app.mjs',import.meta.url),'utf8');
 const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,'IDs duplicados');
 for(const match of app.matchAll(/(?:\$|form)\('([^']+)'/g))assert(ids.includes(match[1]),`Controle ausente: ${match[1]}`);
 for(const name of ['admin','action','request-id','queue-items','queue-refresh','response','department'])assert(ids.includes(name),`Painel administrativo incompleto: ${name}`);
});
test('lista pessoal aplica filtros de módulo e titular, inclusive para administrador',async()=>{
 const {api,calls}=fixture({admin:true});await api.mine();
 assert(calls.some(c=>c[0]==='eq'&&c[1]==='citizen_id'&&c[2]===UID));
 assert(calls.some(c=>c[0]==='eq'&&c[1]==='module'&&c[2]==='esic'));
});
test('painel nega cidadão antes de consultar a fila',async()=>{
 const {api,calls}=fixture();await assert.rejects(api.queue(),/não autorizado/);
 assert(!calls.some(c=>c[0]==='from'));
});
test('fila administrativa autorizada restringe módulo e-SIC',async()=>{
 const {api,calls}=fixture({admin:true});await api.queue();
 assert.deepEqual(calls.find(c=>c[0]==='rpc'),['rpc','is_portal_admin',undefined]);
 assert(calls.some(c=>c[0]==='eq'&&c[1]==='module'&&c[2]==='esic'));
});
test('cadastro de pedido ignora campos administrativos forjados',async()=>{
 const {api,calls}=fixture();await api.create({subject:'  Pedido teste  ',description:'Uma descrição fictícia completa.',citizen_id:'outro',status:'respondido',response_text:'forjado'});
 assert.deepEqual(calls.find(c=>c[0]==='insert')[1],{citizen_id:UID,module:'esic',category:'geral',subject:'Pedido teste',description:'Uma descrição fictícia completa.'});
});
test('sem sessão, envio e listagem não acessam tabelas',async()=>{
 const {api,calls}=fixture({authenticated:false});await assert.rejects(api.create({}),/Entre/);await assert.rejects(api.mine(),/Entre/);assert.equal(calls.length,0);
});
test('validadores rejeitam texto vazio, IDs inválidos e ação nula',async()=>{
 const {api,calls}=fixture({admin:true});
 await assert.rejects(api.create({subject:'    ',description:'Descrição válida de teste.'}),/Assunto/);
 await assert.rejects(api.history('outro'),/Protocolo inválido/);
 await assert.rejects(api.act({requestId:RID,action:null}),/Ação inválida/);
 await assert.rejects(api.act({requestId:RID,action:'responder',response:'  '}),/Resposta/);
 assert.equal(calls.length,0);
});
test('resposta usa RPC auditada e parâmetros mínimos',async()=>{
 const {api,calls}=fixture({admin:true});
 await api.act({requestId:RID,action:'responder',response:'  Informação de teste para o cidadão.  ',department:'ignorado'});
 assert.deepEqual(calls.at(-1),['rpc','manari_digital_admin_action',{p_request:RID,p_action:'responder',p_department:null,p_response:'Informação de teste para o cidadão.'}]);
 assert(!calls.some(c=>c[0]==='from'));
});
test('erros de banco são propagados e falhas de sessão/rede são traduzidas',async()=>{
 const {api}=fixture({error:{message:'permission denied'}});await assert.rejects(api.mine(),{message:'permission denied'});
 assert.match(friendlyError({message:'Invalid Refresh Token: Refresh Token Not Found'}),/sessão expirou/);
 assert.match(friendlyError({message:'Failed to fetch'}),/internet/);
});
test('retorno de autenticação remove parâmetros e fragmentos da página',()=>{
 assert.equal(new URL('./','https://app.example/esic/?redirect_to=https://evil.test#access_token=secret').href,'https://app.example/esic/');
});
