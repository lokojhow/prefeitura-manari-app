export const PORTAL='https://prefeitura-manari-app.appaquitem.workers.dev/esic/';
const EVENTS=Object.freeze({criado:'Pedido registrado',encaminhado:'Pedido encaminhado',respondido:'Resposta disponível',prorrogado:'Prazo prorrogado',recurso:'Recurso registrado',recurso_decidido:'Decisão de recurso disponível',teste:'Teste de envio'});
export function notificationMessage(row){
 if(!EVENTS[row.event]||!/^[A-Z0-9-]{5,80}$/.test(row.protocol))throw Error('Invalid notification');
 return {subject:'e-SIC Manari — '+EVENTS[row.event],text:`${EVENTS[row.event]}.\n\nProtocolo: ${row.protocol}.\n\nAcesse sua conta para consultar os detalhes com segurança:\n${PORTAL}\n\nVocê pode alterar sua preferência de avisos por e-mail dentro da sua conta.`};
}
export function mailError(error){if(error?.code==='EAUTH'||error?.responseCode===535)return 'smtp_auth';if(['EENVELOPE','EMESSAGE'].includes(error?.code))return 'smtp_rejected';if(['ETIMEDOUT','ECONNECTION','ECONNRESET','EDNS','ESOCKET'].includes(error?.code))return 'network';return 'provider';}
export function createMailerHandler({rpc,transportFactory}){
 const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 return async request=>{
  if(request.method!=='POST')return json(405,{error:'Método não permitido'});
  const token=request.headers.get('X-Esic-Job');if(!token||!/^[a-f0-9]{64}$/.test(token))return json(401,{error:'Não autorizado'});
  let cfg;
  try{cfg=await rpc('manari_esic_mail_runtime',{p_token:token});}catch{return json(401,{error:'Não autorizado'});}
  if(!cfg?.ready)return json(503,{configured:false,sent:0});
  let transport;
  try{
   transport=transportFactory(cfg);const jobs=await rpc('manari_esic_mail_claim',{});let sent=0,failed=0;
   await Promise.all(jobs.map(async row=>{
    let accepted=false,error=null;
    try{const content=notificationMessage(row);const result=await transport.sendMail({...content,from:{name:'e-SIC | Prefeitura de Manari',address:cfg.sender},to:row.email,messageId:`<esic-${row.id}@manari-notificacoes.local>`});accepted=Array.isArray(result?.accepted)&&result.accepted.some(email=>String(email).toLowerCase()===row.email.toLowerCase());if(!accepted)error='smtp_rejected';}catch(e){error=mailError(e);}
    await rpc('manari_esic_mail_finish',{p_id:row.id,p_token:row.token,p_sent:accepted,p_error:error});if(accepted)sent++;else failed++;
   }));return json(200,{configured:true,processed:jobs.length,sent,failed});
  }catch{return json(500,{error:'Falha no processamento de avisos'});}finally{transport?.close?.();}
 };
}
