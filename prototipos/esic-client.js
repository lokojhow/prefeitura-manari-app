/* e-SIC Manari: cliente de integração opt-in para ambiente de homologação.
 * Requer supabase-js v2 injetado pelo aplicativo host. Nenhuma chave armazenada aqui.
 */
export function criarClienteEsic(supabase) {
  if (!supabase || typeof supabase.rpc !== 'function') throw new Error('Cliente Supabase não configurado.');
  return {
    async verificarSessao() {
      const {data,error}=await supabase.auth.getUser();
      if(error) throw error;
      return data?.user ?? null;
    },
    async abrirPedido({assunto,descricao}) {
      const a=String(assunto??'').trim(),d=String(descricao??'').trim();
      if(a.length<5 || a.length>200 || d.length<10 || d.length>10000) {
        throw new Error('Confira o tamanho do assunto e da descrição.');
      }
      const {data,error}=await supabase.rpc('esic_abrir_pedido',{p_assunto:a,p_descricao:d});
      if(error) throw error;
      const registro=Array.isArray(data)?data[0]:data;
      if(!registro?.pedido_id || !registro?.protocolo) throw new Error('O servidor não retornou o protocolo.');
      return registro;
    },
    async encaminharPedido(id,unidadeId) {
      const {error}=await supabase.rpc('esic_encaminhar_pedido',{p_pedido:id,p_unidade:unidadeId});
      if(error) throw error;
    },
    async responderPedido(id,resposta) {
      const {error}=await supabase.rpc('esic_responder_pedido',{p_pedido:id,p_resposta:String(resposta??'').trim()});
      if(error) throw error;
    }
  };
}
