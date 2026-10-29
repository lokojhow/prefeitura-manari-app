import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {authReturnState,recoveryDestination,rememberRecovery,recoveryUser,validateNewPassword} from '../www/esic/auth-return.mjs';
import {mountPasswordReset} from '../www/esic/password-reset.mjs';

const UID='76c046c7-78dd-4b73-8d53-c93f4c4da001';
const session={user:{id:UID,email:'cidadao@example.invalid'},expires_at:Math.floor(Date.now()/1000)+3600};
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
function fixture({recovery=false,stored=false,authError=false,signedIn=true,verifiedId=UID,sessionError=null,updateError=null}={}) {
 const ids=['recovery-status','password-editor','recovery-request-card','recovery-identity','recovery-password','recovery-confirmation','recovery-request','recovery-email','password-editor-form','recovery-complete'];
 const nodes=new Map(ids.map(id=>[id,{id,hidden:true,textContent:'',value:'',dataset:{},classList:{toggle(){}},focus(){},querySelectorAll:()=>[],reset(){nodes.get('recovery-password').value='';nodes.get('recovery-confirmation').value='';}}]));
 const values=new Map(),storage={setItem:(key,value)=>values.set(key,value),getItem:key=>values.get(key),removeItem:key=>values.delete(key)};
 if(stored)rememberRecovery(storage,session);
 const calls=[];let callback,insideCallback=false;
 const document={location:{href:'https://portal.example/esic/redefinir-senha/'},defaultView:{sessionStorage:storage,history:{replaceState(...args){calls.push(['clean-url',args[2]]);}}},getElementById:id=>nodes.get(id),querySelectorAll:()=>[]};
 const client={auth:{
  onAuthStateChange(fn){callback=fn;},
  async getSession(){assert.equal(insideCallback,false,'Auth SDK calls must run outside the auth callback');if(recovery){recovery=false;insideCallback=true;callback('PASSWORD_RECOVERY',session);insideCallback=false;}return {data:{session:signedIn?session:null},error:sessionError};},
  async getUser(){calls.push(['getUser']);return {data:{user:signedIn?{...session.user,id:verifiedId}:null},error:null};},
  async resetPasswordForEmail(email,options){calls.push(['reset-email',email,options]);return {error:null};},
  async updateUser(payload){calls.push(['update',payload]);return {error:updateError};},
  async signOut(options){calls.push(['sign-out',options]);callback('SIGNED_OUT',null);return {error:null};}
 }};
 const app=mountPasswordReset(document,client,{recovery:recovery,error:authError});
 const submit=async id=>{nodes.get(id).onsubmit({preventDefault(){},currentTarget:nodes.get(id)});await tick();};
 return {nodes,calls,app,submit,storage,emit:(event,data)=>callback(event,data)};
}

test('retorno de recuperação e link expirado abrem página exclusiva antes de consumir o fragmento',()=>{
 for(const path of ['/esic/','/esic/index.html']) {
  const fragment='#access_token=fixture&refresh_token=fixture&type=recovery';
  const target=new URL(recoveryDestination('https://portal.example'+path+'?redirect_to=https://evil.invalid'+fragment));
  assert.equal(target.origin,'https://portal.example');assert.equal(target.pathname,'/esic/redefinir-senha/');assert.equal(target.search,'');assert.equal(target.hash,fragment);
 }
 assert.match(recoveryDestination('https://portal.example/esic/#error=access_denied&error_code=otp_expired'),/redefinir-senha\/#error=/);
 assert.equal(recoveryDestination('https://portal.example/esic/'),null);
 assert.equal(recoveryDestination('https://portal.example/esic/#access_token=fixture&type=signup'),null);
 assert.deepEqual(authReturnState('https://portal.example/esic/#type=recovery'),{recovery:true,error:false});
});

test('link válido mostra os campos exclusivos, verifica usuário e não faz consultas administrativas',async()=>{
 const f=fixture({recovery:true});await f.app.ready;await tick();
 assert.equal(f.nodes.get('password-editor').hidden,false);assert.equal(f.nodes.get('recovery-request-card').hidden,true);
 assert.equal(f.nodes.get('recovery-identity').textContent,'cidadao@example.invalid');
 assert.match(f.nodes.get('recovery-status').textContent,/Link confirmado/);
 assert.equal(recoveryUser(f.storage),UID);assert(f.calls.some(c=>c[0]==='getUser'));
});

test('link expirado bloqueia atualização mesmo com outra sessão autenticada e permite solicitar outro link',async()=>{
 const f=fixture({stored:true,authError:true});await f.app.ready;
 assert.equal(f.nodes.get('password-editor').hidden,true);assert.equal(f.nodes.get('recovery-request-card').hidden,false);
 assert.match(f.nodes.get('recovery-status').textContent,/expirou ou já foi utilizado/);assert.equal(recoveryUser(f.storage),null);
 f.nodes.get('recovery-email').value=' cidadao@example.invalid ';await f.submit('recovery-request');
 assert.deepEqual(f.calls.find(c=>c[0]==='reset-email'),['reset-email','cidadao@example.invalid',{redirectTo:'https://portal.example/esic/'}]);
 assert(!f.calls.some(c=>c[0]==='update'));
});

test('visita sem link ou sessão comum não habilita redefinição de senha',async()=>{
 for(const signedIn of [false,true]) {
  const f=fixture({signedIn});await f.app.ready;
  assert.equal(f.nodes.get('password-editor').hidden,true);assert.equal(f.nodes.get('recovery-request-card').hidden,false);
  await f.submit('password-editor-form');assert(!f.calls.some(c=>c[0]==='update'));
 }
});

test('recarregar a recuperação preserva o formulário apenas para o mesmo usuário validado',async()=>{
 const valid=fixture({stored:true});await valid.app.ready;assert.equal(valid.nodes.get('password-editor').hidden,false);
 const changed=fixture({stored:true,verifiedId:'outro-usuario'});await changed.app.ready;
 assert.equal(changed.nodes.get('password-editor').hidden,true);await changed.submit('password-editor-form');assert(!changed.calls.some(c=>c[0]==='update'));
 const failed=fixture({stored:true,sessionError:Error('expired')});await failed.app.ready;assert.equal(failed.nodes.get('password-editor').hidden,true);
});

test('senhas diferentes ou curtas não são enviadas, senha válida encerra somente a sessão local e limpa campos',async()=>{
 const f=fixture({stored:true});await f.app.ready;
 f.nodes.get('recovery-password').value='teste1234';f.nodes.get('recovery-confirmation').value='diferente';await f.submit('password-editor-form');
 assert(!f.calls.some(c=>c[0]==='update'));assert.match(f.nodes.get('recovery-status').textContent,/não são iguais/);
 f.nodes.get('recovery-confirmation').value='teste1234';await f.submit('password-editor-form');
 assert.deepEqual(f.calls.find(c=>c[0]==='update'),['update',{password:'teste1234'}]);
 assert.deepEqual(f.calls.find(c=>c[0]==='sign-out'),['sign-out',{scope:'local'}]);
 assert.equal(f.nodes.get('recovery-complete').hidden,false);assert.equal(f.nodes.get('password-editor').hidden,true);
 assert.equal(f.nodes.get('recovery-password').value,'');assert.equal(recoveryUser(f.storage),null);
 assert.throws(()=>validateNewPassword('1234567','1234567'),/8 a 128/);
});

test('erro ao salvar mantém os campos e não anuncia sucesso',async()=>{
 const f=fixture({stored:true,updateError:Error('Não foi possível salvar')});await f.app.ready;
 f.nodes.get('recovery-password').value='teste1234';f.nodes.get('recovery-confirmation').value='teste1234';await f.submit('password-editor-form');
 assert.equal(f.nodes.get('recovery-complete').hidden,true);assert.equal(f.nodes.get('password-editor').hidden,false);
 assert.match(f.nodes.get('recovery-status').textContent,/Não foi possível salvar/);assert(!f.calls.some(c=>c[0]==='sign-out'));
});

test('marcador expirado ou malformado não autoriza recuperação',()=>{
 const storage={getItem:()=>'{invalid'};assert.equal(recoveryUser(storage),null);
 storage.getItem=()=>JSON.stringify({userId:UID,expiresAt:Date.now()-1});assert.equal(recoveryUser(storage),null);
});

test('página de redefinição tem campos acessíveis, confirmação de senha e não exibe cadastro ou protocolos',async()=>{
 const html=await readFile(new URL('../www/esic/redefinir-senha/index.html',import.meta.url),'utf8');
 const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);assert.equal(ids.length,new Set(ids).size);
 for(const name of ['recovery-password','recovery-confirmation'])assert.match(html,new RegExp('id="'+name+'"[^>]+minlength="8"'));
 assert(!ids.some(id=>['auth','signup','compose','protocols','admin'].includes(id)));
 for(const path of ['../styles.css','../password-reset.mjs'])assert(html.includes(path));
});
