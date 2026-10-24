import {test} from 'node:test';import assert from 'node:assert/strict';
import {validarAnexo,resumoNotificacao} from './esic-anexos-notificacoes.js';
test('aceita PDF no limite',()=>assert.equal(validarAnexo({name:'pedido.pdf',type:'application/pdf',size:10485760}).valido,true));
test('recusa arquivo executável',()=>assert.equal(validarAnexo({name:'arquivo.exe',type:'application/octet-stream',size:120}).valido,false));
test('recusa extensão MIME incompatíveis',()=>assert.equal(validarAnexo({name:'falso.pdf',type:'image/png',size:120}).valido,false));
test('recusa arquivo acima de 10MB',()=>assert.equal(validarAnexo({name:'foto.jpg',type:'image/jpeg',size:10485761}).valido,false));
test('notificação não inclui dados de conteúdo',()=>{const n=resumoNotificacao({protocolo:'MAN-20261022-ABCDEF12',evento:'respondido'});assert.match(n.mensagem,/acesse o portal/i);assert.doesNotMatch(n.mensagem,/resposta oficial:/i);});
