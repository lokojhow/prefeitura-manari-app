/** Serviço futuro: exige RPC homologada e usuário autenticado, sem INSERT direto. */
export function criarSolicitacoesEsic(supabase,{homologado=false}={}){
 if(!supabase?.auth?.getUser || !supabase?.rpc)throw new Error('Cliente inválido');
 return {
  async solicitar({assunto,descricao,nome,email}){
   if(!homologado)throw new Error('Envio desativado até homologação.');
   const {data:{user}={},error:authError}=await supabase.auth.getUser();
   if(authError||!user?.id)throw new Error('Autenticação necessária.');
   const {data,error}=await supabase.rpc('esic_criar_pedido_autenticado',{
    p_assunto:String(assunto??'').trim(),p_descricao:String(descricao??'').trim(),
    p_nome:String(nome??'').trim(),p_email:String(email??'').trim()
   });
   if(error||!Array.isArray(data)||!data[0]?.protocol)throw new Error('Não foi possível registrar a solicitação.');
   return data[0];
  }
 };
}
