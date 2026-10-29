import {dashboardParams} from './dashboard.mjs';
const FIELDS = 'id,protocol,citizen_id,module,category,subject,description,status,department,requested_department_code,response_text,responded_at,created_at,updated_at';
export const STATUS = Object.freeze({recebido:'Recebido',em_analise:'Em análise',respondido:'Respondido',arquivado:'Arquivado'});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ok = ({data,error}) => { if(error) throw error; return data; };
function text(value,min,max,label) {
 const result=String(value??'').trim();
 if(result.length<min || result.length>max) throw Error(`${label}: use de ${min} a ${max} caracteres.`);
 return result;
}
function id(value) { if(!UUID.test(String(value))) throw Error('Protocolo inválido.'); return value; }
export function createEsicApi(client) {
 async function user() {
  const result=await client.auth.getUser();
  if(result.error) throw result.error;
  if(!result.data?.user?.id) throw Error('Entre na sua conta para continuar.');
  return result.data.user;
 }
 async function admin() {
  await user();
  if(ok(await client.rpc('is_portal_admin'))!==true) throw Error('Acesso administrativo não autorizado.');
 }
 return Object.freeze({
  async create(input) {
   const u=await user();
   const requested_department_code=String(input.requested_department_code||'');
   if(!/^[a-z0-9_]{1,100}$/.test(requested_department_code))throw Error('Selecione a secretaria para seu pedido.');
   const payload={citizen_id:u.id,module:'esic',category:'geral',subject:text(input.subject,5,200,'Assunto'),description:text(input.description,10,10000,'Descrição'),requested_department_code};
   return ok(await client.from('manari_digital_requests').insert(payload).select(FIELDS).single());
  },
  async mine() {
   const u=await user();
   return ok(await client.from('manari_digital_requests').select(FIELDS).eq('module','esic').eq('citizen_id',u.id).order('created_at',{ascending:false}));
  },
  async queue() {
   await admin();
   return ok(await client.from('manari_digital_requests').select(FIELDS).eq('module','esic').order('created_at',{ascending:false}));
  },
  async departments() {
   return ok(await client.from('portal_departments').select('code,name,active,sort_order').order('sort_order',{ascending:true}));
  },
  async dashboard(filters) {
   const params=dashboardParams(filters);await admin();
   return ok(await client.rpc('manari_digital_admin_dashboard',params));
  },
  async history(requestId) {
   id(requestId);
   await user();
   return ok(await client.from('manari_digital_events').select('event_type,details,created_at').eq('request_id',requestId).order('created_at'));
  },
  async act({requestId,action,department,response}) {
   id(requestId);
   if(!['encaminhar','responder','arquivar','reabrir'].includes(action)) throw Error('Ação inválida.');
   const p_department=action==='encaminhar'?text(department,1,120,'Setor'):null;
   const p_response=action==='responder'?text(response,10,10000,'Resposta'):null;
   await admin();
   // The server enforces the role, valid state transitions and audit logging.
   return ok(await client.rpc('manari_digital_admin_action',{p_request:requestId,p_action:action,p_department,p_response}));
  }
 });
}

export function friendlyError(error) {
 const message=String(error?.message??error??'Erro inesperado.');
 if(/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
 if(/email not confirmed/i.test(message)) return 'Seu cadastro precisa de confirmação. Abra o e-mail recebido ou use Reenviar confirmação de e-mail abaixo.';
 if(/refresh.token|jwt expired|auth session missing/i.test(message)) return 'Sua sessão expirou. Entre novamente.';
 if(/failed to fetch|network|fetch failed/i.test(message)) return 'Não foi possível conectar. Confira sua internet e tente novamente.';
 if(/email address not authorized|email_address_not_authorized/i.test(message)) return 'O serviço de envio ainda não está liberado para esse e-mail. Entre em contato com o atendimento.';
 if(/rate.limit|too many requests|security purposes/i.test(message)) return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
 if(error?.code==='23503'&&/requested_department/i.test(message))return 'A secretaria selecionada não está disponível. Atualize a página e escolha outra opção.';
 return message;
}

export async function resendSignupConfirmation(client,email,redirectTo) {
 const result=await client.auth.resend({type:'signup',email:String(email).trim(),options:{emailRedirectTo:redirectTo}});
 if(result.error)throw result.error;
}
