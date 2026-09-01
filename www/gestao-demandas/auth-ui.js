(()=>{
  const authDb=(typeof db!=='undefined'&&db)?db:(window.supabase?.createClient?.(window.MANARI_DEMANDAS_CONFIG?.supabaseUrl,window.MANARI_DEMANDAS_CONFIG?.supabaseAnonKey));
  if(!authDb)return;
  const byId=id=>document.getElementById(id);
  const loginForm=byId('loginForm'),loginPassword=byId('loginPassword'),loginEmail=byId('loginEmail');
  if(!loginForm||!loginPassword)return;

  const style=document.createElement('style');
  style.textContent=`
    .auth-links{display:flex;justify-content:space-between;gap:10px;margin-top:4px;flex-wrap:wrap}.auth-link{border:0;background:transparent;color:#087a46;font-weight:800;font-size:12px;padding:5px 0;cursor:pointer}.password-wrap{position:relative}.password-wrap input{width:100%;padding-right:86px!important}.show-pass{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#eef5f1;color:#174a35;border-radius:7px;padding:5px 8px;font-size:10px;font-weight:800;cursor:pointer}.auth-modal{position:fixed;inset:0;background:rgba(3,32,19,.66);display:grid;place-items:center;padding:18px;z-index:999}.auth-modal[hidden]{display:none}.auth-modal-card{width:min(430px,100%);background:#fff;border-radius:18px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.25)}.auth-modal-card h2{margin:0 0 5px;font-size:22px}.auth-modal-card>p{margin:0 0 17px;color:#748079;font-size:12px;line-height:1.5}.auth-modal-card form{display:grid;gap:12px}.auth-modal-card label{display:grid;gap:6px;font-size:11px;font-weight:800}.auth-modal-card input{border:1px solid #dfe7e2;border-radius:9px;padding:11px;outline:0}.auth-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}.auth-message{min-height:18px;margin:2px 0 0!important;font-size:11px!important}.auth-message.ok{color:#087a46}.auth-message.err{color:#b63b3b}.signup-note{font-size:10px!important;background:#f3f7f5;border-radius:9px;padding:9px;color:#52635a!important}
  `;
  document.head.appendChild(style);

  function wrapPassword(input){
    if(!input||input.parentElement?.classList.contains('password-wrap'))return;
    const wrap=document.createElement('div');wrap.className='password-wrap';
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    const b=document.createElement('button');b.type='button';b.className='show-pass';b.textContent='Mostrar';
    b.onclick=()=>{const showing=input.type==='text';input.type=showing?'password':'text';b.textContent=showing?'Mostrar':'Ocultar'};
    wrap.appendChild(b);
  }
  wrapPassword(loginPassword);

  const links=document.createElement('div');links.className='auth-links';links.innerHTML='<button type="button" class="auth-link" id="createAccountBtn">Criar conta</button><button type="button" class="auth-link" id="forgotPasswordBtn">Esqueci minha senha</button>';
  loginForm.appendChild(links);

  const modal=document.createElement('section');modal.className='auth-modal';modal.id='authModal';modal.hidden=true;
  modal.innerHTML=`<div class="auth-modal-card"><h2 id="authModalTitle">Conta</h2><p id="authModalText"></p><form id="authExtraForm"></form></div>`;
  document.body.appendChild(modal);
  const form=byId('authExtraForm'),title=byId('authModalTitle'),text=byId('authModalText');
  function close(){modal.hidden=true;form.innerHTML=''}
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  function message(msg,ok=false){const el=byId('authExtraMessage');if(el){el.textContent=msg;el.className='auth-message '+(ok?'ok':'err')}}
  function openSignup(){
    title.textContent='Criar conta';text.textContent='Crie seu acesso. O administrador libera as permissões da equipe depois do cadastro.';
    form.innerHTML=`<label>Nome completo<input id="signupName" required autocomplete="name"></label><label>E-mail<input id="signupEmail" type="email" required autocomplete="email"></label><label>Senha<div class="password-wrap"><input id="signupPassword" type="password" required minlength="8" autocomplete="new-password"><button type="button" class="show-pass" data-toggle="signupPassword">Mostrar</button></div></label><label>Confirmar senha<div class="password-wrap"><input id="signupPassword2" type="password" required minlength="8" autocomplete="new-password"><button type="button" class="show-pass" data-toggle="signupPassword2">Mostrar</button></div></label><p class="signup-note">Após criar a conta, o acesso fica aguardando liberação do administrador.</p><p id="authExtraMessage" class="auth-message"></p><div class="auth-modal-actions"><button type="button" class="ghost" id="authCancel">Cancelar</button><button class="primary">Criar conta</button></div>`;
    bindToggles();byId('authCancel').onclick=close;
    form.onsubmit=async e=>{e.preventDefault();const name=byId('signupName').value.trim(),email=byId('signupEmail').value.trim(),p1=byId('signupPassword').value,p2=byId('signupPassword2').value;if(p1!==p2)return message('As senhas não coincidem.');message('Criando conta...',true);const {data,error}=await authDb.auth.signUp({email,password:p1,options:{data:{full_name:name}}});if(error)return message(error.message||'Não foi possível criar a conta.');if(data.session)await authDb.auth.signOut();message('Conta criada. Verifique seu e-mail, se solicitado, e aguarde a liberação do administrador.',true);setTimeout(close,3000)};
    modal.hidden=false;
  }
  function openReset(){
    title.textContent='Redefinir senha';text.textContent='Informe seu e-mail e enviaremos um link seguro para criar uma nova senha.';
    form.innerHTML=`<label>E-mail<input id="resetEmail" type="email" required autocomplete="email" value="${(loginEmail?.value||'').replace(/"/g,'&quot;')}"></label><p id="authExtraMessage" class="auth-message"></p><div class="auth-modal-actions"><button type="button" class="ghost" id="authCancel">Cancelar</button><button class="primary">Enviar link</button></div>`;byId('authCancel').onclick=close;
    form.onsubmit=async e=>{e.preventDefault();const email=byId('resetEmail').value.trim();message('Enviando...',true);const options={};if(/^https?:/.test(location.href))options.redirectTo=location.href.split('#')[0].split('?')[0];const {error}=await authDb.auth.resetPasswordForEmail(email,options);if(error)return message(error.message||'Não foi possível enviar o link.');message('Link enviado. Confira sua caixa de entrada e também o spam.',true)};
    modal.hidden=false;
  }
  function openNewPassword(){
    title.textContent='Criar nova senha';text.textContent='Digite a nova senha para concluir a recuperação da conta.';
    form.innerHTML=`<label>Nova senha<div class="password-wrap"><input id="newPassword" type="password" required minlength="8" autocomplete="new-password"><button type="button" class="show-pass" data-toggle="newPassword">Mostrar</button></div></label><label>Confirmar nova senha<div class="password-wrap"><input id="newPassword2" type="password" required minlength="8" autocomplete="new-password"><button type="button" class="show-pass" data-toggle="newPassword2">Mostrar</button></div></label><p id="authExtraMessage" class="auth-message"></p><div class="auth-modal-actions"><button class="primary">Salvar nova senha</button></div>`;bindToggles();
    form.onsubmit=async e=>{e.preventDefault();const p1=byId('newPassword').value,p2=byId('newPassword2').value;if(p1!==p2)return message('As senhas não coincidem.');message('Salvando...',true);const {error}=await authDb.auth.updateUser({password:p1});if(error)return message(error.message||'Não foi possível atualizar a senha.');message('Senha atualizada com sucesso. Você já pode entrar com a nova senha.',true);setTimeout(async()=>{await authDb.auth.signOut();close();if(typeof showLogin==='function')showLogin()},1800)};
    modal.hidden=false;
  }
  function bindToggles(){document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{const input=byId(b.dataset.toggle),show=input.type==='password';input.type=show?'text':'password';b.textContent=show?'Ocultar':'Mostrar'})}
  byId('createAccountBtn').onclick=openSignup;byId('forgotPasswordBtn').onclick=openReset;
  authDb.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')setTimeout(openNewPassword,0)});
})();
