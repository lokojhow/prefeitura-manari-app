import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adicionarDiasCorridos,calcularPrazoLAI,validarRecurso} from './esic-prazos.js';
test('contagem atravessa fim do mês',()=>assert.equal(adicionarDiasCorridos('2026-10-22',20),'2026-11-11'));
test('ano bissexto',()=>assert.equal(adicionarDiasCorridos('2028-02-25',5),'2028-03-01'));
test('recusa datas inválidas',()=>assert.throws(()=>adicionarDiasCorridos('2026-02-30',20),/Data inválida/));
test('prorrogação modelada para 30 dias',()=>assert.deepEqual(calcularPrazoLAI({recebidoEm:'2026-10-22',prorrogado:true}),{prazoInicial:'2026-11-11',prazoFinal:'2026-11-21',prorrogado:true,requerJustificativa:true}));
test('recursos exigem resposta e fundamento',()=>{assert.equal(validarRecurso({situacao:'recebido',justificativa:'Solicito revisão do pedido'}).valido,false);assert.equal(validarRecurso({situacao:'respondido',justificativa:'Solicito revisão da resposta fornecida'}).valido,true);});
