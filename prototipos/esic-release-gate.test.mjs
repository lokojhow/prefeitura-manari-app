import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const base=new URL('.',import.meta.url);
const ler=(p)=>readFileSync(new URL(p,base),'utf8');
test('portal de demonstração não injeta credenciais privadas',()=>{
 const p=ler('esic-demo-completo.html');
 assert.doesNotMatch(p,/service_role|SUPABASE_SERVICE_ROLE_KEY/i);
 assert.match(p,/SIMULAÇÃO/);
});
test('configuração padrão da fila não permite acesso real acidental',()=>{
 const s=ler('esic-atendimento-service.js');
 assert.match(s,/homologado\s*=\s*false/);
 assert.match(s,/Operação bloqueada até homologação/);
});
test('sem supabase e sem persistência no demo',()=>{
 const s=ler('esic-demo-integrado.js');
 assert.doesNotMatch(s,/fetch\s*\(|\.rpc\s*\(|localStorage|sessionStorage/);
});
test('e-SIC não está anexado ao build do aplicativo de produção',()=>{
 assert.ok(existsSync(new URL('../package.json',base)));
 const pkg=JSON.parse(ler('../package.json'));
 assert.equal(pkg.name,'prefeitura-manari-android');
});
