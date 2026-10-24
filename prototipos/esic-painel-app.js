// Inicialização explícita pelo portal após autenticação; não armazena credenciais.
// SQL RPC esic_fila_atendimento deve existir no Supabase de homologação.
// Renderização via textContent para evitar HTML de origem não confiável.
export function montarPainelEsic({ supabase, raiz = document }) {
 if (!supabase?.auth?.getUser || !supabase?.rpc) throw new Error('Supabase v2 é obrigatório.');
 const $ = id => raiz.getElementById(id);
 const status = $('status'), busca=$('query'), linhas=$('rows'), mensagem=$('message');
 const fonte=$('source');
 const contadores={total:$('total'),recebidos:$('recebidos'),analise:$('analise'),respondidos:$('respondidos')};
 let pedidos=[];
 function texto(element,value){element.textContent=String(value);}
 function aviso(value){texto(mensagem,value);}
 function limpar(){linhas.replaceChildren();}
 function carregarContadores(){
  // A fila é limitada a 200 pedidos. Portanto, não apresentar contagens globais.
  texto(contadores.total,pedidos.length+'*');
  texto(contadores.recebidos,pedidos.filter(p=>p.situacao==='recebido').length+'*');
  texto(contadores.analise,pedidos.filter(p=>['encaminhado','em_analise'].includes(p.situacao)).length+'*');
  texto(contadores.respondidos,pedidos.filter(p=>p.situacao==='respondido').length+'*');
 }
 function render(){
  limpar();
  const termo=busca.value.trim().toLocaleLowerCase('pt-BR'),situacao=status.value;
  const visiveis=pedidos.filter(p=>(!situacao||p.situacao===situacao)&&(!termo||String(p.protocolo).includes(termo)||String(p.assunto).toLocaleLowerCase('pt-BR').includes(termo)));
  if(!visiveis.length){texto(linhas,'Nenhum pedido correspondente na fila autorizada.');return;}
  const lista=document.createElement('div');
  for(const p of visiveis){
   const entrada=document.createElement('article');entrada.className='entry';
   const detalhe=document.createElement('div'),titulo=document.createElement('b'),meta=document.createElement('small');
   texto(titulo,'Protocolo '+p.protocolo+' — '+p.assunto);
   const data=new Date(p.criado_em);
   texto(meta,(Number.isNaN(data.valueOf())?'Data indisponível':new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(data))+' • '+p.situacao.replaceAll('_',' '));
   detalhe.append(titulo,meta);entrada.append(detalhe);lista.append(entrada);
  }
  linhas.append(lista);
 }
 async function recarregar(){
  aviso('Verificando autorização e atualizando fila...');
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){pedidos=[];limpar();throw new Error('Faça login com uma conta autorizada da prefeitura.');}
  const {data,error}=await supabase.rpc('esic_fila_atendimento');
  if(error){pedidos=[];limpar();throw new Error('Não foi possível carregar a fila. Confirme a permissão do servidor.');}
  pedidos=Array.isArray(data)?data:[];
  carregarContadores();render();
  texto(fonte,'Fila autorizada • até 200 registros');
  aviso('Dados carregados de ambiente configurado. *Indicadores representam apenas os registros retornados, não o total geral.');
 }
 const filtrar=$('filtrar');
 const filtrarHandler=()=>render();
 filtrar.addEventListener('click',filtrarHandler);
 busca.addEventListener('input',filtrarHandler);
 status.addEventListener('change',filtrarHandler);
 return {recarregar,desmontar(){
  filtrar.removeEventListener('click',filtrarHandler);
  busca.removeEventListener('input',filtrarHandler);
  status.removeEventListener('change',filtrarHandler);
 }};
}
