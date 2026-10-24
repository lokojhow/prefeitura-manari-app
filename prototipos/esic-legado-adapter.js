/**
 * e-SIC Manari: adaptador compatível com public.citizen_requests atual.
 * Sem escrita administrativa nem leitura privilegiada.
 * Usar SOMENTE após autenticação e validação do fluxo de homologação.
 * Requer Supabase JS v2 fornecido pelo frontend do portal.
 */
export function criarEsicLegado(supabase) {
  if (!supabase?.auth?.getUser || !supabase?.from) throw new Error('Supabase indisponível');
  async function usuario() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) throw new Error('Faça login para acessar o e-SIC.');
    return data.user;
  }
  async function solicitar({ assunto, descricao, nome, email, telefone = '' }) {
    const u = await usuario();
    const subject=String(assunto??'').trim(),message=String(descricao??'').trim();
    const requester_name=String(nome??'').trim(),requester_email=String(email??'').trim();
    if (subject.length<5 || subject.length>200 || message.length<10 || message.length>10000)
      throw new Error('Confira o assunto e a descrição.');
    if (requester_name.length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requester_email))
      throw new Error('Informe nome e e-mail válidos.');
    // Usa default para protocolo, status e datas. NÃO fornece campos de servidor.
    const {data,error}=await supabase.from('citizen_requests')
      .insert({request_type:'esic',subject,message,requester_name,requester_email,
               requester_phone:String(telefone??'').trim()||null,anonymous:false,user_id:u.id})
      .select('id,protocol,created_at').single();
    if(error) throw new Error('Não foi possível registrar a solicitação. Tente novamente.');
    if(!data?.protocol) throw new Error('Solicitação sem protocolo confirmado. Verifique atendimento.');
    return data;
  }
  async function meusPedidos() {
    const u=await usuario();
    const {data,error}=await supabase.from('citizen_requests')
      .select('id,protocol,subject,status,created_at,updated_at,response_at')
      .eq('request_type','esic').eq('user_id',u.id).order('created_at',{ascending:false}).limit(100);
    if(error) throw new Error('Não foi possível consultar seus pedidos.');
    return data ?? [];
  }
  async function detalhe(id) {
    const u=await usuario();
    if(!/^[0-9a-f-]{36}$/i.test(String(id))) throw new Error('Identificador inválido.');
    const {data,error}=await supabase.from('citizen_requests')
      .select('id,protocol,subject,message,status,response_text,response_at,created_at,updated_at')
      .eq('id',id).eq('request_type','esic').eq('user_id',u.id).maybeSingle();
    if(error || !data) throw new Error('Pedido não encontrado ou sem permissão.');
    return data;
  }
  return { solicitar,meusPedidos,detalhe };
}
