import {test} from 'node:test';import assert from 'node:assert/strict';
import {inicializarEsicManari} from './esic-app.js';
function stub(){return {auth:{getUser:async()=>({data:{user:{id:'a'}}}),signUp:async()=>({data:{session:null}}),signInWithPassword:async()=>({data:{user:{id:'a'}}}),signOut:async()=>({}),resetPasswordForEmail:async()=>({})},rpc:async()=>({data:[]}),from(){return {select(){return this},eq(){return this},order(){return this},limit(){return Promise.resolve({data:[]})}}}};}
test('produção não é liberada por opção booleana isolada',async()=>{const app=inicializarEsicManari(stub(),{ambiente:'producao',homologacaoAprovada:true});await assert.rejects(()=>app.cidadao.meusPedidos(),/bloqueada/);});
test('módulos permanecem bloqueados por padrão',async()=>{const app=inicializarEsicManari(stub());await assert.rejects(()=>app.administracao.fila(),/bloqueada/);await assert.rejects(()=>app.autenticacao.usuario(),/indisponível/);});
