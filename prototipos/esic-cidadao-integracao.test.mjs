import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServicoCidadaoEsic} from './esic-cidadao-integracao.js';
const dados={assunto:'Documentos de obra',descricao:'Solicito cópia de documentos de uma obra pública.',nome:'Pessoa Exemplo',email:'pessoa@example.test'};
function stub(){
 const calls=[];
 const db={calls,auth:{getUser:async()=>({data:{user:{id:'id-teste'}}})},rpc:async(name,args)=>{calls.push({name,args});return {data:[{id:'id-teste-pedido',protocol:'MAN-TESTE'}],error:null};},
 from(table){calls.push({table});return {select(){return this},eq(){return this},order(){return this},limit(){return Promise.resolve({data:[],error:null})},maybeSingle(){return Promise.resolve({data:null,error:null})}}}};
 return db;
}
test('integração inteira é desativada por padrão',async()=>{
 const db=stub(),svc=criarServicoCidadaoEsic(db);
 await assert.rejects(()=>svc.solicitar(dados),/desativado/);
 await assert.rejects(()=>svc.meusPedidos(),/bloqueada/);
 assert.equal(db.calls.length,0);
});
test('cadastro validado invoca apenas RPC no modo homologação',async()=>{
 const db=stub(),svc=criarServicoCidadaoEsic(db,{homologado:true});
 const p=await svc.solicitar(dados);
 assert.equal(p.protocol,'MAN-TESTE');
 assert.equal(db.calls[0].name,'esic_criar_pedido_autenticado');
});
test('dados inválidos são barrados antes de ir ao banco',async()=>{
 const db=stub(),svc=criarServicoCidadaoEsic(db,{homologado:true});
 await assert.rejects(()=>svc.solicitar({...dados,email:'inválido'}),/E-mail inválido/);
 assert.equal(db.calls.length,0);
});
test('a lista de pedidos usa apenas a consulta autenticada',async()=>{
 const db=stub(),svc=criarServicoCidadaoEsic(db,{homologado:true});
 assert.deepEqual(await svc.meusPedidos(),[]);
 assert.deepEqual(db.calls[0],{table:'citizen_requests'});
});
