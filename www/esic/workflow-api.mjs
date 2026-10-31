const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function id(value){if(!UUID.test(String(value)))throw Error('Protocolo inválido.');return value;}
function text(value,min,max,label){const v=String(value??'').trim();if(v.length<min||v.length>max)throw Error(`${label}: use de ${min} a ${max} caracteres.`);return v;}
export function createWorkflowApi(client){
 async function call(name,params){const {data,error}=await client.rpc(name,params);if(error)throw error;return data;}
 return {
  snapshot(ids=[]){if(ids.length>150)throw Error('Muitos protocolos.');return call('manari_esic_snapshot',{p_requests:[...new Set(ids.map(id))]});},
  extend(request,reason){return call('manari_esic_extend',{p_request:id(request),p_reason:text(reason,10,2000,'Justificativa')});},
  acknowledge(request,responseAt,appeal=null){if(!responseAt||Number.isNaN(Date.parse(responseAt)))throw Error('Resposta inválida.');return call('manari_esic_acknowledge',{p_request:id(request),p_response_at:responseAt,p_appeal:appeal?id(appeal):null});},
  appeal(request,reason,level=1,responseAt){if(!responseAt||Number.isNaN(Date.parse(responseAt)))throw Error('Resposta inválida.');if(!Number.isInteger(level)||level<1||level>3)throw Error('Instância inválida.');return call('manari_esic_appeal',{p_request:id(request),p_reason:text(reason,10,10000,'Fundamentação'),p_level:level,p_response_at:responseAt});},
  decide(appeal,decision,outcome){if(!['mantida','revisada'].includes(outcome))throw Error('Resultado inválido.');return call('manari_esic_decide',{p_appeal:id(appeal),p_decision:text(decision,10,10000,'Decisão'),p_outcome:outcome});},
  configure(config){return call('manari_esic_configure',{p_config:config});},
  preference(enabled){if(typeof enabled!=='boolean')throw Error('Preferência inválida.');return call('manari_esic_email_preference',{p_enabled:enabled});},
  mailConfigure({password,login,sender}){return call('manari_esic_mail_configure',{p_password:password||null,p_login:login,p_sender:sender});},
  mailTest(){return call('manari_esic_mail_test',{});}
 };
}
export function dateLabel(date){return date?String(date).slice(0,10).split('-').reverse().join('/'):'—';}
export function deadlineState(date,today,open=true){
 if(!open)return 'concluido';if(!date||!today)return 'sem_prazo';if(date<today)return 'vencido';
 const distance=(Date.parse(date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000;
 return distance<=3?'proximo':'em_dia';
}
