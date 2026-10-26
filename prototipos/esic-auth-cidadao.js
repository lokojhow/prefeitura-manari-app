/**
 * Cadastro e acesso do cidadão via Supabase Auth.
 * Não armazenar senhas em tabelas de pedidos nem no navegador manualmente.
 * Requer projeto ativo, confirmação de email, SMTP e URLs autorizadas.
 */
export function criarAutenticacaoCidadao(supabase,{habilitado=false,redirectUrl}={}){
 const auth=supabase?.auth;
 if(!auth?.signUp||!auth?.signInWithPassword||!auth?.signOut||!auth?.resetPasswordForEmail||!auth?.getUser)
  throw new Error('Cliente Supabase Auth inválido.');
 function disponivel(){if(!habilitado)throw new Error('Cadastro de cidadãos indisponível até homologação.');}
 function emailValido(email){return typeof email==='string'&&email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);}
 function validar(email,senha){if(!emailValido(email)||typeof senha!=='string'||senha.length<12||senha.length>128)throw new Error('Use e-mail válido e senha com pelo menos 12 caracteres.');}
 return {
  async cadastrar({nome,email,senha,aceitePrivacidade}){
   disponivel();validar(email,senha);
   if(typeof nome!=='string'||nome.trim().length<2||nome.trim().length>150)throw new Error('Nome inválido.');
   if(aceitePrivacidade!==true)throw new Error('Confirme que leu o aviso de privacidade.');
   const options={data:{full_name:nome.trim()}};
   if(redirectUrl)options.emailRedirectTo=redirectUrl;
   const {data,error}=await auth.signUp({email:email.trim().toLowerCase(),password:senha,options});
   if(error)throw new Error('Não foi possível concluir o cadastro. Verifique o e-mail e tente novamente.');
   return {necessitaConfirmarEmail:!data?.session};
  },
  async entrar({email,senha}){
   disponivel();if(!emailValido(email)||!senha)throw new Error('Informe e-mail e senha.');
   const {data,error}=await auth.signInWithPassword({email:email.trim().toLowerCase(),password:senha});
   if(error||!data?.user)throw new Error('Não foi possível entrar. Confira os dados e a confirmação do e-mail.');
   return {id:data.user.id,email:data.user.email};
  },
  async recuperar(email){
   disponivel();if(!emailValido(email))throw new Error('E-mail inválido.');
   const options=redirectUrl?{redirectTo:redirectUrl}:undefined;
   const {error}=await auth.resetPasswordForEmail(email.trim().toLowerCase(),options);
   if(error)throw new Error('Não foi possível solicitar a recuperação.');
   return {mensagem:'Se existir uma conta para esse e-mail, você receberá as instruções.'};
  },
  async usuario(){disponivel();const {data,error}=await auth.getUser();if(error)throw new Error('Não foi possível verificar o acesso.');return data?.user??null;},
  async sair(){disponivel();const {error}=await auth.signOut();if(error)throw new Error('Não foi possível sair.');}
 };
}
