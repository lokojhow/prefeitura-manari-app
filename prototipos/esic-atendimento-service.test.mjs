// Executar em pasta contendo esic-atendimento-service.js com: node --test
// É teste de contrato/mocks. NÃO substitui testes Supabase RLS em homologação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarAtendimentoEsic } from './esic-atendimento-service.js';
const id = '4d93ca24-2d51-4df2-9c3e-64a1c5972f36';
const makeDb = () => {
  const chamadas=[];
  return {chamadas,auth:{getUser:async()=>({data:{user:{id:'usuario-simulado'}}})},
    rpc:async(nome,parametros)=>{chamadas.push([nome,parametros]);return {data:nome==='esic_portal_fila'?[{id,protocol:'MAN-EXEMPLO',subject:'Teste'}]:null,error:null};}};
};
test('bloqueio padrão não faz chamada de rede',async()=>{
 const db=makeDb(),svc=criarAtendimentoEsic(db);
 await assert.rejects(()=>svc.fila(),/bloqueada/);
 assert.equal(db.chamadas.length,0);
});
test('fila autorizada chama somente RPC',async()=>{
 const db=makeDb(),svc=criarAtendimentoEsic(db,{homologado:true});
 const pedidos=await svc.fila();
 assert.equal(pedidos.length,1);
 assert.equal(db.chamadas[0][0],'esic_portal_fila');
});
test('não envia id inválido nem resposta vazia',async()=>{
 const db=makeDb(),svc=criarAtendimentoEsic(db,{homologado:true});
 await assert.rejects(()=>svc.responder('invalido','Resposta válida de exemplo'),/Identificador/);
 await assert.rejects(()=>svc.responder(id,'curta'),/entre 10 e 15/);
 assert.equal(db.chamadas.length,0);
});
test('nega quando não há autenticação',async()=>{
 const db=makeDb();db.auth.getUser=async()=>({data:{user:null}});
 await assert.rejects(()=>criarAtendimentoEsic(db,{homologado:true}).fila(),/Autenticação/);
 assert.equal(db.chamadas.length,0);
});
test('resposta e encaminhamento enviam apenas campos esperados',async()=>{
 const db=makeDb(),svc=criarAtendimentoEsic(db,{homologado:true});
 await svc.encaminhar(id,'saude');
 await svc.responder(id,'Resposta administrativa registrada');
 assert.deepEqual(db.chamadas.map(c=>c[0]),['esic_admin_encaminhar','esic_admin_responder']);
 assert.equal(db.chamadas[1][1].p_resposta,'Resposta administrativa registrada');
});
