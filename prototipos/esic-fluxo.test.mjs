import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proximoEstado,validarSolicitacao} from './esic-fluxo.js';
const pedido={assunto:'Dados sobre obra',descricao:'Solicito informações públicas sobre uma obra municipal.',nome:'Cidadão Exemplo',email:'exemplo@dominio.test'};
test('fluxo completo de resposta e arquivamento',()=>{
 assert.equal(proximoEstado('recebido','encaminhar'),'em_analise');
 assert.equal(proximoEstado('em_analise','responder'),'respondido');
 assert.equal(proximoEstado('respondido','arquivar'),'arquivado');
});
test('não permite responder pedido arquivado',()=>assert.throws(()=>proximoEstado('arquivado','responder'),/não permitida/));
test('não permite arquivar sem resposta',()=>assert.throws(()=>proximoEstado('recebido','arquivar'),/não permitida/));
test('aceita solicitação completa',()=>assert.equal(validarSolicitacao(pedido).valido,true));
test('recusa email incorreto e assunto vazio',()=>{
 assert.equal(validarSolicitacao({...pedido,email:'inválido'}).valido,false);
 assert.equal(validarSolicitacao({...pedido,assunto:'a'}).valido,false);
});
