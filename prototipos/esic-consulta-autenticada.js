/**
 * Consulta restrita às solicitações do usuário autenticado.
 * Requer RLS citizen_requests_own_read verificada em homologação.
 * Filtro no frontend é defesa adicional, não substitui RLS do Postgres.
 */
export function criarConsultaEsic(supabase,{homologado=false}={}){
 if(!supabase?.auth?.getUser||!supabase?.from)throw new Error('Cliente Supabase inválido.');
 async function usuario(){
  if(!homologado)throw new Error('Consulta bloqueada até homologação.');
  const {data:{user}={},error}=await supabase.auth.getUser();
  if(error||!user?.id)throw new Error('Autenticação necessária.');
  return user.id;
 }
 const campos='id,protocol,subject,message,status,response_text,response_at,department,created_at,updated_at';
 return {
  async meusPedidos(){
   const uid=await usuario();
   const {data,error}=await supabase.from('citizen_requests').select(campos)
    .eq('request_type','esic').eq('user_id',uid).order('created_at',{ascending:false}).limit(100);
   if(error)throw new Error('Falha ao consultar solicitações.');
   return Array.isArray(data)?data:[];
  },
  async detalhe(id){
   const uid=await usuario();
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id)))throw new Error('Identificador inválido.');
   const {data,error}=await supabase.from('citizen_requests').select(campos)
    .eq('request_type','esic').eq('user_id',uid).eq('id',id).maybeSingle();
   if(error)throw new Error('Consulta indisponível.');
   if(!data)throw new Error('Pedido não localizado nesta conta.');
   return data;
  }
 };
}
