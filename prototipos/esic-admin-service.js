/* Módulo operacional para uso APENAS após homologação das RPCs.
   Não injete service_role no navegador. O host fornece Supabase autenticado. */
export function criarServicoAdministrativoEsic(supabase) {
 if(!supabase?.rpc || !supabase?.auth?.getUser) throw new Error('Supabase não configurado');
 async function autenticar(){
  const {data,error}=await supabase.auth.getUser();
  if(error || !data?.user) throw new Error('Autenticação de servidor necessária.');
 }
 return {
  async encaminhar(pedidoId,departamento){
   await autenticar();
   if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(pedidoId)))throw new Error('Pedido inválido');
   if(!departamento || typeof departamento!=='string')throw new Error('Selecione um departamento');
   const {error}=await supabase.rpc('esic_admin_encaminhar',{p_id:pedidoId,p_department:departamento});
   if(error)throw new Error('Encaminhamento não autorizado ou indisponível.');
  },
  async responder(pedidoId,resposta){
   await autenticar();
   if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(pedidoId)))throw new Error('Pedido inválido');
   if(String(resposta??'').trim().length<10)throw new Error('Informe uma resposta completa.');
   const {error}=await supabase.rpc('esic_admin_responder',{p_id:pedidoId,p_resposta:resposta.trim()});
   if(error)throw new Error('Resposta não autorizada ou indisponível.');
  }
 };
}
export function criarServicoAdministrativoDemo(){
 return {async encaminhar(){throw new Error('Demonstração: alterações desativadas.');},async responder(){throw new Error('Demonstração: alterações desativadas.');}};
}
