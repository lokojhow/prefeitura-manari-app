import test from 'node:test';
import assert from 'node:assert/strict';
import {criarManariDigitalApi} from './manari-digital-api.js';

function mock(userId='citizen-1') {
 const calls=[];
 const chain={insert(payload){calls.push(['insert',payload]);return this;},select(fields){calls.push(['select',fields]);return this;},single(){return Promise.resolve({data:{protocol:'MAN-TEST'},error:null});},order(){return Promise.resolve({data:[],error:null});},eq(){return this;}};
 const supabase={
 auth:{getUser:async()=>({data:{user:userId?{id:userId}:null},error:null}),signUp:async(v)=>({data:v,error:null}),signInWithPassword:async(v)=>({data:v,error:null}),signOut:async()=>({data:null,error:null})},
 from:table=>{calls.push(['from',table]);return chain;},
 rpc:async(name,args)=>{calls.push(['rpc',name,args]);return {data:{status:'em_analise'},error:null};}
 };
 return {api:criarManariDigitalApi(supabase),calls};
}
test('sem sessão, não cria protocolo',async()=>{const {api,calls}=mock(null);await assert.rejects(api.abrir({module:'esic',subject:'Solicitação',description:'Descrição de teste válida'}),/login/);assert.equal(calls.length,0)});
test('não aceita módulo diferente dos previstos',async()=>{const {api}=mock();await assert.rejects(api.abrir({module:'admin',subject:'Solicitação',description:'Descrição de teste válida'}),/Módulo/);});
test('solicitação autenticada envia apenas campos admitidos',async()=>{const {api,calls}=mock();const r=await api.abrir({module:'esic',subject:'  Solicitação ',description:'Descrição de teste válida'});assert.equal(r.protocol,'MAN-TEST');assert.deepEqual(calls.find(c=>c[0]==='insert')[1],{citizen_id:'citizen-1',module:'esic',category:'geral',subject:'Solicitação',description:'Descrição de teste válida'});});
test('valida tamanho mínimo do conteúdo',async()=>{const {api}=mock();await assert.rejects(api.abrir({module:'esic',subject:'Pedido',description:'curta'}),/Descrição/);});
test('ação administrativa usa RPC e não grava direto na tabela',async()=>{const {api,calls}=mock();await api.acaoAdministrativa({id:'req1',acao:'encaminhar',departamento:'Saúde'});assert.deepEqual(calls.find(c=>c[0]==='rpc'),['rpc','manari_digital_admin_action',{p_request:'req1',p_action:'encaminhar',p_department:'Saúde',p_response:null}]);});
