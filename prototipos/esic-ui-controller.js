export function criarServicoDemonstracao() {
 return {async solicitar(){throw new Error('Demonstração: envio desativado.');},async meusPedidos(){return [];},async detalhe(){throw new Error('Consulta indisponível na demonstração.');}};
}
export function iniciarInterfaceEsic({servico,documento=document}) {
 if(!servico?.solicitar||!servico?.meusPedidos||!servico?.detalhe)throw new Error('Serviço não configurado.');
 const $=id=>documento.getElementById(id), form=$('form'),msg=$('alert'),lista=$('lista-respostas');
 const criar=(tag,value)=>{const n=documento.createElement(tag);n.textContent=String(value??'');return n;};
 async function atualizar(){
   const pedidos=await servico.meusPedidos();lista.replaceChildren();
   if(!pedidos.length){lista.append(criar('p','Nenhum pedido encontrado nesta conta.'));return;}
   for(const p of pedidos){
     const box=criar('article',''),titulo=criar('strong',p.subject),sub=criar('p','Protocolo: '+p.protocol+' • '+p.status),btn=criar('button','Ver resposta');
     btn.type='button';btn.className='btn';btn.addEventListener('click',async()=>{btn.disabled=true;try{const d=await servico.detalhe(p.id);box.append(criar('p',d.response_text||'Aguardando resposta oficial.'));}catch{box.append(criar('p','Consulta indisponível.'));}finally{btn.disabled=false;}});
     box.append(titulo,sub,btn);lista.append(box);
   }
 }
 form.addEventListener('submit',async e=>{
   e.preventDefault();const btn=form.querySelector('[type=submit]');btn.disabled=true;
   try{const p=await servico.solicitar({assunto:$('assunto').value,descricao:$('descricao').value,nome:$('nome-solicitante').value,email:$('email-solicitante').value});msg.textContent='Pedido registrado. Protocolo: '+p.protocol;form.reset();}
   catch(err){msg.textContent=err?.message||'Não foi possível registrar.';}
   finally{btn.disabled=false;}
 });
 $('consultar-btn').addEventListener('click',async()=>{
   const out=$('resultado-consulta');out.replaceChildren();
   try{
     const protocolo=$('protocolo-busca').value.trim();const pedidos=await servico.meusPedidos();
     const item=pedidos.find(p=>p.protocol===protocolo);
     if(!item){out.textContent='Protocolo não encontrado entre seus pedidos.';return;}
     const d=await servico.detalhe(item.id);
     out.append(criar('strong',d.subject),criar('p','Situação: '+d.status),criar('p',d.response_text||'Aguardando resposta.'));
   }catch{out.textContent='Não foi possível consultar seus pedidos.';}
 });
 $('tab-respostas').addEventListener('click',()=>atualizar().catch(()=>{lista.textContent='Faça login para consultar seus pedidos.';}));
 return {atualizar};
}
