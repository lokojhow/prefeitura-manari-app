import {proximoEstado,validarSolicitacao} from './esic-fluxo.js';
/** Banco de demonstração em memória. Nunca persiste dados, não usa rede. */
export function criarDemoEsic(){
 const pedidos=[];
 let sequencia=0;
 function copiar(p){return structuredClone(p);}
 return {
  async solicitar(dados){
   const v=validarSolicitacao(dados);
   if(!v.valido)throw new Error(v.motivo);
   sequencia+=1;
   const novo={id:'demo-'+sequencia,protocol:'DEMO-'+String(sequencia).padStart(5,'0'),
    subject:v.assunto,message:v.descricao,requester_name:v.nome,
    requester_email:v.email,status:'recebido',department:null,response_text:null,
    created_at:new Date().toISOString()};
   pedidos.unshift(novo);return copiar(novo);
  },
  async meusPedidos(){return copiar(pedidos);},
  async detalhe(id){const p=pedidos.find(p=>p.id===id);if(!p)throw new Error('Pedido não localizado.');return copiar(p);},
  async fila(){return copiar(pedidos);},
  async encaminhar(id,departamento){
   const p=pedidos.find(p=>p.id===id);if(!p)throw new Error('Pedido não localizado.');
   if(!String(departamento||'').trim())throw new Error('Escolha um setor.');
   p.status=proximoEstado(p.status,'encaminhar');p.department=departamento;return copiar(p);
  },
  async responder(id,resposta){
   const p=pedidos.find(p=>p.id===id);if(!p)throw new Error('Pedido não localizado.');
   if(String(resposta||'').trim().length<10)throw new Error('Resposta insuficiente.');
   p.status=proximoEstado(p.status,'responder');p.response_text=resposta.trim();return copiar(p);
  }
 };
}
