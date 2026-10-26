// Regras de prazo do e-SIC — implementação local testável, sem gravação.
// Prazos gerais LAI em dias corridos, sujeitos à confirmação de regulamento municipal.
export function adicionarDiasCorridos(dataISO,dias) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)||!Number.isInteger(dias)||dias<0||dias>365)
  throw new Error('Data ou prazo inválido.');
 const data=new Date(dataISO+'T12:00:00Z');
 if(Number.isNaN(data.getTime())||data.toISOString().slice(0,10)!==dataISO)throw new Error('Data inválida.');
 data.setUTCDate(data.getUTCDate()+dias);
 return data.toISOString().slice(0,10);
}
export function calcularPrazoLAI({recebidoEm,prorrogado=false}){
 return {
  prazoInicial:adicionarDiasCorridos(recebidoEm,20),
  prazoFinal:adicionarDiasCorridos(recebidoEm,prorrogado?30:20),
  prorrogado,
  requerJustificativa:prorrogado
 };
}
export function validarRecurso({situacao,justificativa}){
 const texto=String(justificativa??'').trim();
 if(!['respondido','indeferido'].includes(situacao))return {valido:false,motivo:'Pedido ainda não elegível a recurso.'};
 if(texto.length<10 || texto.length>10000)return {valido:false,motivo:'Fundamentação deve conter de 10 a 10.000 caracteres.'};
 return {valido:true};
}
// Não confundir modelo local com decisão oficial: admissibilidade e prazos
// recursais devem ser definidos por norma municipal e avaliados pelo servidor.
