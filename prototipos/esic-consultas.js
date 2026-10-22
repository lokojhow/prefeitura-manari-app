/* Operações de leitura do cidadão no Supabase v2.
 * Complementa prototipos/esic-client.js.
 * Exige usuário autenticado; sem service_role, sem consultas anônimas.
 */
export function criarConsultasEsic(supabase) {
 if(!supabase || typeof supabase.rpc !== 'function') throw new Error('Cliente Supabase ausente');
 return {
   async meusPedidos() {
     const {data,error}=await supabase.rpc('esic_meus_pedidos');
     if(error) throw error;
     return Array.isArray(data)?data:[];
   },
   async detalhePedido(id) {
     if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id))) throw new Error('Identificador inválido');
     const {data,error}=await supabase.rpc('esic_detalhe_pedido',{p_id:id});
     if(error) throw error;
     return data;
   }
 };
}
