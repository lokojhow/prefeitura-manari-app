/**
 * Recurso e-SIC: validação de formulário e separação de permissões.
 * Não oferece envio real: depende de RPC de recurso com titularidade/RLS,
 * prazo recursal municipal e instância de julgamento homologados.
 */
export function validarPedidoRecurso({pedidoId,justificativa,nivel=1}={}){
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(!uuid.test(String(pedidoId)))return {valido:false,motivo:'Pedido inválido.'};
 if(!Number.isInteger(nivel)||nivel<1||nivel>3)return {valido:false,motivo:'Instância recursal inválida.'};
 const motivo=String(justificativa??'').trim();
 if(motivo.length<10||motivo.length>10000)return {valido:false,motivo:'Justificativa deve ter entre 10 e 10.000 caracteres.'};
 return {valido:true,pedidoId,nivel,justificativa:motivo};
}
export function criarServicoRecursosEsic(supabase,{homologado=false}={}){
 if(!supabase?.auth?.getUser||!supabase?.rpc)throw new Error('Supabase não configurado.');
 return {async apresentar(dados){
   if(!homologado)throw new Error('Recursos bloqueados até homologação.');
   const v=validarPedidoRecurso(dados);if(!v.valido)throw new Error(v.motivo);
   const {data:{user}={},error:authError}=await supabase.auth.getUser();
   if(authError||!user?.id)throw new Error('Autenticação necessária.');
   // API futura, intencionalmente não implementada no banco em produção.
   const {data,error}=await supabase.rpc('esic_apresentar_recurso',{
     p_pedido_id:v.pedidoId,p_justificativa:v.justificativa,p_nivel:v.nivel
   });
   if(error)throw new Error('Recurso não autorizado ou indisponível.');
   return data;
 }};
}
