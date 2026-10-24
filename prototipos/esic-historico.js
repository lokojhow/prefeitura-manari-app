/**
 * Histórico público do pedido e-SIC. Apresentação segura, sem HTML fornecido pelo usuário.
 * O servidor deve entregar APENAS eventos autorizados para o titular da solicitação.
 */
export function construirLinhaDoTempo({status,eventos=[]}){
 const permitidos=new Set(['recebido','encaminhado','respondido','arquivado','recurso_apresentado','recurso_decidido']);
 const lista=eventos.filter(x=>x&&permitidos.has(x.tipo)&&typeof x.ocorrido_em==='string')
  .map(x=>({tipo:x.tipo,ocorrido_em:x.ocorrido_em,descricao:({
   recebido:'Pedido registrado',encaminhado:'Encaminhado ao setor responsável',
   respondido:'Resposta disponibilizada',arquivado:'Atendimento encerrado',
   recurso_apresentado:'Recurso apresentado',recurso_decidido:'Recurso analisado'
  })[x.tipo]}));
 lista.sort((a,b)=>a.ocorrido_em.localeCompare(b.ocorrido_em));
 return {status:String(status||'desconhecido'),eventos:lista};
}
export function resumoFila(pedidos=[]){
 const totais={recebido:0,em_analise:0,respondido:0,arquivado:0};
 for(const p of pedidos){if(Object.hasOwn(totais,p?.status))totais[p.status]++;}
 return {total:Object.values(totais).reduce((a,b)=>a+b,0),...totais};
}
