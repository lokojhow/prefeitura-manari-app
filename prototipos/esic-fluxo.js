/**
 * Fluxo do e-SIC em ambiente de homologação.
 * Modelo puro de transições, NÃO substitui autorização/estado do servidor.
 */
export const ESTADOS=Object.freeze(['recebido','em_analise','respondido','arquivado']);
export const EVENTOS=Object.freeze(['encaminhar','responder','arquivar']);
const ROTAS={
 recebido:{encaminhar:'em_analise',responder:'respondido'},
 em_analise:{encaminhar:'em_analise',responder:'respondido'},
 respondido:{arquivar:'arquivado'},
 arquivado:{}
};
export function proximoEstado(estado,evento){
 if(!ESTADOS.includes(estado)||!EVENTOS.includes(evento))throw new Error('Estado ou evento desconhecido.');
 const proximo=ROTAS[estado]?.[evento];
 if(!proximo)throw new Error('Transição não permitida.');
 return proximo;
}
export function validarSolicitacao({assunto,descricao,nome,email}){
 const s=String(assunto??'').trim(),d=String(descricao??'').trim(),n=String(nome??'').trim(),e=String(email??'').trim();
 if(s.length<5||s.length>200)return {valido:false,motivo:'Assunto deve ter de 5 a 200 caracteres.'};
 if(d.length<10||d.length>10000)return {valido:false,motivo:'Descrição deve ter de 10 a 10.000 caracteres.'};
 if(n.length<2||n.length>180)return {valido:false,motivo:'Nome inválido.'};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)||e.length>254)return {valido:false,motivo:'E-mail inválido.'};
 return {valido:true,assunto:s,descricao:d,nome:n,email:e};
}
