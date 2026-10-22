// Validação CLIENTE para anexos, NÃO é autorização de upload.
// O servidor deve autorizar pedido, extensão real, análise antivírus e bucket privado.
const PERMITIDOS=new Set(['application/pdf','image/jpeg','image/png']);
export function validarAnexo({name,type,size},limite=10*1024*1024){
 if(typeof name!=='string'||name.length<1||name.length>180||/[\\/\x00-\x1f]/.test(name)) return {valido:false,erro:'Nome inválido.'};
 const ext=name.split('.').at(-1)?.toLowerCase();
 if(!({pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'}[ext]===type && PERMITIDOS.has(type)))
  return {valido:false,erro:'Use PDF, JPG ou PNG.'};
 if(!Number.isSafeInteger(size)||size<=0||size>limite)return {valido:false,erro:'Arquivo deve ter até 10 MB.'};
 return {valido:true,nome:name,bytes:size};
}
export function resumoNotificacao({protocolo,evento}){
 const tipos={recebido:'Pedido registrado',encaminhado:'Pedido encaminhado',respondido:'Resposta disponível'};
 if(!tipos[evento]||typeof protocolo!=='string'||!/^[A-Z0-9-]{5,60}$/.test(protocolo))throw new Error('Notificação inválida.');
 // Não incluir conteúdo do pedido, CPF ou resposta em avisos por e-mail.
 return {assunto:'e-SIC Manari — '+tipos[evento],mensagem:'Seu protocolo '+protocolo+' teve uma atualização. Acesse o portal da prefeitura para consultar com segurança.'};
}
