import {friendlyError} from './api.mjs';
import {setPasswordVisibility} from './app.mjs';
import {authReturnState,rememberRecovery,recoveryUser,clearRecovery,validateNewPassword} from './auth-return.mjs';

export function mountPasswordReset(document,client,initialReturn=authReturnState(document.location.href)) {
 const $=id=>document.getElementById(id);
 const storage=document.defaultView.sessionStorage;
 let authorizedUser=initialReturn.error?null:recoveryUser(storage),version=0,complete=false;
 const message=(text,error=false)=>{$('recovery-status').textContent=text;$('recovery-status').classList.toggle('error',error);};
 const show=(id,visible)=>{$(id).hidden=!visible;};
 const cleanUrl=()=>{const url=new URL(document.location.href);url.hash='';url.search='';document.defaultView.history.replaceState(null,'',url.href);};
 function unavailable(expired=false) {
  authorizedUser=null;clearRecovery(storage);show('password-editor',false);show('recovery-request-card',true);
  message(expired?'Este link expirou ou já foi utilizado. Peça um novo link abaixo e abra o e-mail mais recente.':'Informe o e-mail da sua conta para receber um link e definir uma nova senha.',expired);
 }
 for(const button of document.querySelectorAll('[data-password-target]')) {
  const input=$(button.dataset.passwordTarget);
  button.onclick=()=>setPasswordVisibility(input,button,input.type==='password');
  input.form.addEventListener('reset',()=>setPasswordVisibility(input,button,false));
 }
 async function busy(form,action) {
  if(form.dataset.busy)return;
  form.dataset.busy='true';const buttons=Array.from(form.querySelectorAll('button'));buttons.forEach(button=>button.disabled=true);
  try {await action();}catch(error){message(friendlyError(error),true);}
  finally {delete form.dataset.busy;buttons.forEach(button=>button.disabled=false);}
 }
 async function verifySession() {
  const current=++version;
  if(initialReturn.error){unavailable(true);cleanUrl();return;}
  const result=await client.auth.getSession();
  if(current!==version||complete)return;
  cleanUrl();
  if(result.error||!result.data?.session?.user||!authorizedUser||result.data.session.user.id!==authorizedUser) {
   unavailable(initialReturn.recovery||Boolean(result.error));return;
  }
  const verified=await client.auth.getUser();
  if(current!==version||complete)return;
  if(verified.error||verified.data?.user?.id!==authorizedUser){unavailable(true);return;}
  $('recovery-identity').textContent=verified.data.user.email||'Sua conta';
  show('recovery-request-card',false);show('password-editor',true);
  message('Link confirmado. Defina e confirme sua nova senha abaixo.');
  $('recovery-password').focus({preventScroll:true});
 }
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY'&&!initialReturn.error&&!complete) {
   authorizedUser=session?.user?.id||null;rememberRecovery(storage,session);
   // Run outside the Auth callback to avoid the Supabase session lock.
   setTimeout(()=>void verifySession().catch(()=>unavailable(true)),0);
  } else if(event==='SIGNED_OUT'&&!complete) {++version;unavailable(initialReturn.error||initialReturn.recovery);}
 });
 $('recovery-request').onsubmit=event=>{
  event.preventDefault();const form=event.currentTarget;
  void busy(form,async()=>{
   const email=$('recovery-email').value.trim();
   // Keep the already allowlisted /esic/ return. Its controller forwards the
   // fragment to this dedicated page before the SDK consumes the auth result.
   const result=await client.auth.resetPasswordForEmail(email,{redirectTo:new URL('../',document.location.href).href});
   if(result.error)throw result.error;
   message('Se houver uma conta com esse e-mail, enviaremos um link de recuperação. Abra somente o e-mail mais recente.');
  });
 };
 $('password-editor-form').onsubmit=event=>{
  event.preventDefault();const form=event.currentTarget;
  void busy(form,async()=>{
   if(!authorizedUser||initialReturn.error){unavailable(true);return;}
   const password=$('recovery-password').value,confirmation=$('recovery-confirmation').value;
   validateNewPassword(password,confirmation);
   const verified=await client.auth.getUser();
   if(verified.error||verified.data?.user?.id!==authorizedUser){unavailable(true);return;}
   const result=await client.auth.updateUser({password});
   if(result.error){if(/expired|session missing|jwt/i.test(result.error.message||''))unavailable(true);else throw result.error;return;}
   complete=true;++version;clearRecovery(storage);authorizedUser=null;form.reset();
   show('password-editor',false);show('recovery-request-card',false);show('recovery-complete',true);
   // End only the temporary e-SIC session; other users/devices are unaffected.
   const signedOut=await client.auth.signOut({scope:'local'});
   message(signedOut.error?'Senha salva. Use o botão abaixo para voltar ao e-SIC.':'Senha salva com sucesso. Entre no e-SIC com sua nova senha.');
  });
 };
 const ready=verifySession().catch(()=>unavailable(true));
 return {ready};
}

if(typeof document!=='undefined'&&document.documentElement.dataset.esicRuntime==='password-recovery') {
 const initialReturn=authReturnState(document.location.href);
 try {
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.0');
  const client=createClient('https://dxvqiiawthxwkypvsxci.supabase.co','sb_publishable_Zno2VuYH9oev89OpttorUA_wzNb0EP6',{auth:{storageKey:'manari-esic-auth-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  mountPasswordReset(document,client,initialReturn);
 } catch {
  document.getElementById('recovery-status').textContent='Não foi possível iniciar a recuperação. Confira sua conexão e recarregue esta página.';
  document.getElementById('recovery-status').classList.add('error');
 }
}
