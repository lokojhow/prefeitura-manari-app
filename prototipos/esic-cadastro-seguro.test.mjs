import {test} from 'node:test';import assert from 'node:assert/strict';
import {criarSolicitacoesEsic} from './esic-cadastro-seguro.js';
function mock(authenticated=true){const calls=[];return {calls,auth:{getUser:async()=>({data:{user:authenticated?{id:'usuario'}:null}})},rpc:async(name,args)=>{calls.push({name,args});return {data:[{id:'uuid',protocol:'MAN-EXEMPLO'}],error:null};}}}
test('envio bloqueado por padrão',async()=>{const db=mock();await assert.rejects(()=>criarSolicitacoesEsic(db).solicitar({}),/desativado/);assert.equal(db.calls.length,0)});
test('sem autenticação não envia',async()=>{const db=mock(false);await assert.rejects(()=>criarSolicitacoesEsic(db,{homologado:true}).solicitar({}),/Autenticação/);assert.equal(db.calls.length,0)});
test('envia apenas campos definidos à RPC',async()=>{const db=mock();const s=criarSolicitacoesEsic(db,{homologado:true});await s.solicitar({assunto:'Obra',descricao:'Detalhes',nome:'Exemplo',email:'x@test.test',user_id:'outra-pessoa',status:'respondido'});assert.deepEqual(Object.keys(db.calls[0].args).sort(),['p_assunto','p_descricao','p_email','p_nome']);assert.equal(db.calls[0].name,'esic_criar_pedido_autenticado')});
