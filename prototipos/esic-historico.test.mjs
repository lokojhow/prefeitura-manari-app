import {test} from 'node:test';import assert from 'node:assert/strict';
import {construirLinhaDoTempo,resumoFila} from './esic-historico.js';
test('ordena eventos cronologicamente',()=>{
 const l=construirLinhaDoTempo({status:'respondido',eventos:[{tipo:'respondido',ocorrido_em:'2026-10-24T12:00:00Z'},{tipo:'recebido',ocorrido_em:'2026-10-22T12:00:00Z'}]});
 assert.equal(l.eventos[0].tipo,'recebido');
});
test('ignora eventos não permitidos',()=>{
 const l=construirLinhaDoTempo({status:'recebido',eventos:[{tipo:'dado_interno',ocorrido_em:'2026-10-22T12:00:00Z'}]});
 assert.equal(l.eventos.length,0);
});
test('contabiliza fila por situação',()=>{
 const s=resumoFila([{status:'recebido'},{status:'em_analise'},{status:'respondido'},{status:'recebido'}]);
 assert.equal(s.total,4);assert.equal(s.recebido,2);
});
