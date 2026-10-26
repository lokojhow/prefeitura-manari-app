import {test} from 'node:test';import assert from 'node:assert/strict';
import {criarDemoEsic} from './esic-demo-integrado.js';
const dados={assunto:'Informação sobre obras',descricao:'Gostaria de receber dados da obra municipal.',nome:'Pessoa Exemplo',email:'teste@example.test'};
test('fluxo completo cidadão/atendente em memória',async()=>{
 const svc=criarDemoEsic();
 const recebido=await svc.solicitar(dados);
 assert.match(recebido.protocol,/^DEMO-/);
 assert.equal((await svc.meusPedidos()).length,1);
 const encaminhado=await svc.encaminhar(recebido.id,'Obras e Infraestrutura');
 assert.equal(encaminhado.status,'em_analise');
 const respondido=await svc.responder(recebido.id,'Resposta oficial de demonstração.');
 assert.equal(respondido.status,'respondido');
 assert.match((await svc.detalhe(recebido.id)).response_text,/demonstração/);
 await assert.rejects(()=>svc.responder(recebido.id,'Outra resposta oficial.'),/Transição/);
});
test('impede assunto inválido',async()=>await assert.rejects(()=>criarDemoEsic().solicitar({...dados,assunto:'oi'}),/Assunto/));
test('estado em memória não compartilha dados entre sessões',async()=>{
 const um=criarDemoEsic(),dois=criarDemoEsic();await um.solicitar(dados);
 assert.equal((await dois.fila()).length,0);
});
