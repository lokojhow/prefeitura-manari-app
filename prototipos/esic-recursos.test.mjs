import {test} from 'node:test';import assert from 'node:assert/strict';
import {validarPedidoRecurso,criarServicoRecursosEsic} from './esic-recursos.js';
const pedidoId='4d93ca24-2d51-4df2-9c3e-64a1c5972f36';
function db(){const calls=[];return {calls,auth:{getUser:async()=>({data:{user:{id:'a'}}})},rpc:async(name,params)=>{calls.push({name,params});return {data:{protocolo:'R-DEMO'},error:null}}};}
test('rejeita justificativa insuficiente',()=>assert.equal(validarPedidoRecurso({pedidoId,justificativa:'curta'}).valido,false));
test('rejeita identificador e instância inválidos',()=>{assert.equal(validarPedidoRecurso({pedidoId:'x',justificativa:'Argumentos de revisão'}).valido,false);assert.equal(validarPedidoRecurso({pedidoId,nivel:4,justificativa:'Argumentos de revisão'}).valido,false);});
test('bloqueia recurso até homologação',async()=>{const s=db();await assert.rejects(()=>criarServicoRecursosEsic(s).apresentar({pedidoId,justificativa:'Solicito reexame da decisão'}),/bloqueados/);assert.equal(s.calls.length,0);});
test('contrato envia somente parâmetros esperados',async()=>{const s=db();await criarServicoRecursosEsic(s,{homologado:true}).apresentar({pedidoId,justificativa:'Solicito reexame da decisão',nivel:1,user_id:'forjado'});assert.deepEqual(Object.keys(s.calls[0].params).sort(),['p_justificativa','p_nivel','p_pedido_id']);});
