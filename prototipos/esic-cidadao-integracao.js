/**
 * Integração única de cidadão para a interface e-SIC.
 * Nenhuma conexão é aberta aqui: o host injeta cliente autenticado.
 * Bloqueado até homologação explícita das RPCs e da RLS do banco real.
 */
import {criarSolicitacoesEsic} from './esic-cadastro-seguro.js';
import {criarConsultaEsic} from './esic-consulta-autenticada.js';
import {validarSolicitacao} from './esic-fluxo.js';

export function criarServicoCidadaoEsic(supabase,{homologado=false}={}){
 const cadastro=criarSolicitacoesEsic(supabase,{homologado});
 const consulta=criarConsultaEsic(supabase,{homologado});
 return {
  async solicitar(dados){
   if(!homologado)throw new Error('O envio está desativado até a homologação.');
   const v=validarSolicitacao(dados);
   if(!v.valido)throw new Error(v.motivo);
   return cadastro.solicitar(v);
  },
  meusPedidos:()=>consulta.meusPedidos(),
  detalhe:id=>consulta.detalhe(id)
 };
}
