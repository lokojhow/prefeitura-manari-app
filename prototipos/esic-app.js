/** Ponto de entrada do módulo e-SIC. Não habilita gravações antes da homologação. */
import {criarAutenticacaoCidadao} from './esic-auth-cidadao.js';
import {criarServicoCidadaoEsic} from './esic-cidadao-integracao.js';
import {criarAtendimentoEsic} from './esic-atendimento-service.js';
import {criarServicoRecursosEsic} from './esic-recursos.js';
export function inicializarEsicManari(supabase,{ambiente='desenvolvimento',homologacaoAprovada=false,redirectUrl}={}){
 const autorizado=ambiente==='homologacao' && homologacaoAprovada===true;
 return Object.freeze({
  situacao:autorizado?'Homologação habilitada':'Operações restritas até homologação',
  autenticacao:criarAutenticacaoCidadao(supabase,{habilitado:autorizado,redirectUrl}),
  cidadao:criarServicoCidadaoEsic(supabase,{homologado:autorizado}),
  administracao:criarAtendimentoEsic(supabase,{homologado:autorizado}),
  recursos:criarServicoRecursosEsic(supabase,{homologado:autorizado})
 });
}
