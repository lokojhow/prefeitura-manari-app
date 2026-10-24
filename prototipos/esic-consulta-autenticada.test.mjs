import {test} from 'node:test';import assert from 'node:assert/strict';
import {criarConsultaEsic} from './esic-consulta-autenticada.js';
const id='4d93ca24-2d51-4df2-9c3e-64a1c5972f36';
function mock(authenticated=true){
 const calls=[];
 const chain={select(c){calls.push(['select',c]);return this;},eq(k,v){calls.push(['eq',k,v]);return this;},order(){return this;},limit(){return Promise.resolve({data:[],error:null});},maybeSingle(){return Promise.resolve({data:null,error:null});}};
 return {calls,auth:{getUser:async()=>({data:{user:authenticated?{id:'user-abc'}:null}})},from(table){calls.push(['from',table]);return chain;}};
}
test('consulta bloqueada por padrão',async()=>{const db=mock();await assert.rejects(()=>criarConsultaEsic(db).meusPedidos(),/bloqueada/);assert.equal(db.calls.length,0);});
test('sem sessão não consulta',async()=>{const db=mock(false);await assert.rejects(()=>criarConsultaEsic(db,{homologado:true}).meusPedidos(),/Autenticação/);assert.equal(db.calls.length,0);});
test('lista exige filtros de dono e tipo',async()=>{const db=mock();await criarConsultaEsic(db,{homologado:true}).meusPedidos();assert.deepEqual(db.calls.filter(x=>x[0]==='eq'),[['eq','request_type','esic'],['eq','user_id','user-abc']]);});
test('identificador inválido impede consulta',async()=>{const db=mock();await assert.rejects(()=>criarConsultaEsic(db,{homologado:true}).detalhe('outro'),/Identificador/);assert.equal(db.calls.length,0);});
test('detalhe aplica filtro de titular e pedido',async()=>{const db=mock();await assert.rejects(()=>criarConsultaEsic(db,{homologado:true}).detalhe(id),/não localizado/);assert.deepEqual(db.calls.filter(x=>x[0]==='eq'),[['eq','request_type','esic'],['eq','user_id','user-abc'],['eq','id',id]]);});
