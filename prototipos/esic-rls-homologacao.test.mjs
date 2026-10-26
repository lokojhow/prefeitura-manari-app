import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testarIsolamentoCidadaos} from './esic-rls-homologacao.js';
function cliente(user,visible){
 return {auth:{getUser:async()=>({data:{user:{id:user}}})},
  from(){return {select(){return this},eq(k,v){if(k==='id')this.id=v;return this},
   async maybeSingle(){return {data:visible.includes(this.id)?{id:this.id,protocol:'FAKE'}:null,error:null}}}}};
}
test('falha se usuário A consegue ver pedido B',async()=>{
 const r=await testarIsolamentoCidadaos({clienteA:cliente('A',['A','B']),clienteB:cliente('B',['B']),pedidoA:'A',pedidoB:'B'});
 assert.equal(r.aprovado,false);assert.equal(r.vazamentoA,true);
});
test('aprova isolamento quando cada cidadão só vê o próprio pedido',async()=>{
 const r=await testarIsolamentoCidadaos({clienteA:cliente('A',['A']),clienteB:cliente('B',['B']),pedidoA:'A',pedidoB:'B'});
 assert.equal(r.aprovado,true);
});
test('impede teste usando a mesma conta',async()=>{
 await assert.rejects(()=>testarIsolamentoCidadaos({clienteA:cliente('A',['A']),clienteB:cliente('A',['B']),pedidoA:'A',pedidoB:'B'}),/duas contas diferentes/);
});
