/**
 * Teste de isolamento entre cidadãos no ambiente de HOMOLOGAÇÃO.
 * Uso: instanciar dois clientes supabase-js (sessões diferentes) e fornecer
 * dois IDs fictícios criados previamente, cada um pertencendo à respectiva conta.
 * Requer conta A e B com pedidos esic fictícios. Não cria nem altera dados.
 */
export async function testarIsolamentoCidadaos({clienteA,clienteB,pedidoA,pedidoB}) {
 if (!clienteA?.auth?.getUser || !clienteB?.auth?.getUser || !pedidoA || !pedidoB || pedidoA===pedidoB)
  throw new Error('São necessárias duas contas e dois pedidos distintos de homologação.');
 const ua=await clienteA.auth.getUser(),ub=await clienteB.auth.getUser();
 const idA=ua.data?.user?.id,idB=ub.data?.user?.id;
 if(ua.error||ub.error||!idA||!idB||idA===idB)throw new Error('Autentique duas contas diferentes.');
 async function ler(client,id){
  const {data,error}=await client.from('citizen_requests')
   .select('id,protocol').eq('request_type','esic').eq('id',id).maybeSingle();
  if(error)throw new Error('Consulta falhou; verifique RLS e configuração de homologação.');
  return data;
 }
 const [aa,bb,ab,ba]=await Promise.all([
  ler(clienteA,pedidoA),ler(clienteB,pedidoB),ler(clienteA,pedidoB),ler(clienteB,pedidoA)
 ]);
 return {aprovado:aa?.id===pedidoA&&bb?.id===pedidoB&&!ab&&!ba,
  proprioA:aa?.id===pedidoA,proprioB:bb?.id===pedidoB,
  vazamentoA:!!ab,vazamentoB:!!ba};
}
