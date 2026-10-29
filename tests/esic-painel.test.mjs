import test from 'node:test';
import assert from 'node:assert/strict';
import {dateRangeForPreset,manariDate,dashboardParams,departmentName,UNASSIGNED_DEPARTMENT} from '../www/esic/dashboard.mjs';
import {createEsicApi} from '../www/esic/api.mjs';

test('hoje e ontem usam calendário de Manari, inclusive perto da meia-noite UTC',()=>{
 assert.equal(manariDate(new Date('2026-10-29T02:59:59Z')),'2026-10-28');
 assert.equal(manariDate(new Date('2026-10-29T03:00:00Z')),'2026-10-29');
 assert.deepEqual(dateRangeForPreset('today',new Date('2026-10-29T01:00:00Z')),{from:'2026-10-28',to:'2026-10-28'});
 assert.deepEqual(dateRangeForPreset('yesterday',new Date('2026-10-29T01:00:00Z')),{from:'2026-10-27',to:'2026-10-27'});
 assert.deepEqual(dateRangeForPreset('yesterday',new Date('2027-01-01T12:00:00Z')),{from:'2026-12-31',to:'2026-12-31'});
 assert.deepEqual(dateRangeForPreset('week',new Date('2026-03-02T12:00:00Z')),{from:'2026-02-24',to:'2026-03-02'});
 assert.deepEqual(dateRangeForPreset('all'),{from:'',to:''});
});
test('período mantém datas inclusivas para conversão no servidor e parâmetros de paginação',()=>{
 assert.deepEqual(dashboardParams({from:'2026-10-28',to:'2026-10-29',department:'educacao',status:'recebido',page:2}),{p_date_from:'2026-10-28',p_date_to:'2026-10-29',p_department:'educacao',p_status:'recebido',p_page:2,p_page_size:25});
 assert.equal(dashboardParams({department:UNASSIGNED_DEPARTMENT}).p_department,UNASSIGNED_DEPARTMENT);
 assert.equal(dashboardParams().p_department,null);
});
test('datas impossíveis, intervalo invertido, paginação e filtros inválidos falham antes da consulta',()=>{
 for(const filters of [{from:'2026-02-30'},{from:'29/10/2026'},{from:'2026-10-30',to:'2026-10-29'},{page:0},{pageSize:1001},{status:'inventado'},{department:'educacao,or.status.eq.recebido'}])assert.throws(()=>dashboardParams(filters));
});
test('gráfico identifica secretaria pelo catálogo e mantém pedidos antigos sem atribuição inventada',()=>{
 assert.equal(departmentName('educacao',[{code:'educacao',name:'Educação'}]),'Educação');
 assert.equal(departmentName(null,[]),'Secretaria não informada');
 assert.equal(departmentName('removida',[]),'Secretaria indisponível');
});
test('painel verifica papel antes de invocar agregação e envia somente filtros previstos',async()=>{
 const calls=[];let admin=false;
 const client={auth:{getUser:async()=>({data:{user:{id:'cidadao'}},error:null})},rpc:async(name,args)=>{calls.push([name,args]);return {data:name==='is_portal_admin'?admin:{rows:[],total:0,totals:{},departments:[]},error:null};}};
 const api=createEsicApi(client);
 await assert.rejects(api.dashboard({}),/não autorizado/);assert.equal(calls.length,1);
 admin=true;await api.dashboard({from:'2026-10-29',to:'2026-10-29',department:'obras',page:3});
 assert.deepEqual(calls.at(-1),['manari_digital_admin_dashboard',{p_date_from:'2026-10-29',p_date_to:'2026-10-29',p_department:'obras',p_status:null,p_page:3,p_page_size:25}]);
});
test('novo pedido exige escolha de secretaria e não consulta a fila administrativa',async()=>{
 const calls=[];
 const api=createEsicApi({auth:{getUser:async()=>({data:{user:{id:'cidadao'}},error:null})},from:()=>{calls.push('from');throw Error('Não deveria inserir');}});
 await assert.rejects(api.create({subject:'Pedido teste',description:'Descrição fictícia para teste.'}),/Selecione a secretaria/);
 assert.deepEqual(calls,[]);
});
