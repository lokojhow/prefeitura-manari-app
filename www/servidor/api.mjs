export const KINDS=Object.freeze({mensal:'Mensal',decimo:'13º salário',ferias:'Férias',complementar:'Complementar'});
export const MAX_PDF=20*1024*1024;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validId(id){if(!UUID.test(String(id)))throw Error('Selecione um registro válido.');return id;}
export function monthDate(value){if(!/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(String(value)))throw Error('Selecione uma competência válida.');return value+'-01';}
export function registration(value){const v=String(value||'').trim();if(!/^[a-zA-Z0-9._-]{1,40}$/.test(v))throw Error('Matrícula: use até 40 letras, números, ponto, hífen ou sublinhado.');return v;}
export async function validatePdf(file){
 if(!file||!file.size||file.size>MAX_PDF||!/^application\/pdf$/.test(file.type)&&!String(file.name).toLowerCase().endsWith('.pdf'))throw Error('Selecione um arquivo PDF de até 20 MB.');
 if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw Error('O arquivo selecionado não contém um PDF válido.');
 return file;
}
export function filenameRegistration(name){return registration(String(name).replace(/\.pdf$/i,''));}
export function createRhApi(client){
 async function call(action,data={}){const {data:out,error}=await client.rpc('manari_rh',{p_action:action,p_data:data});if(error)throw error;return out;}
 async function manager(){const snapshot=await call('snapshot');if(snapshot?.manager!==true)throw Error('Acesso exclusivo do RH.');return snapshot;}
 function paging(input={}){const page=Number(input.page||1);if(!Number.isInteger(page)||page<1||page>100000)throw Error('Página inválida.');return page;}
 return Object.freeze({
  snapshot:()=>call('snapshot'),
  list:input=>call('list',{page:paging(input),month:input.month?monthDate(input.month):null,employee:input.employee?validId(input.employee):null,manage:input.manage===true,state:input.state||'published'}),
  async employees(search='',page=1){await manager();return call('employees',{search:String(search).trim().slice(0,160),page:paging({page})});},
  async register(input){await manager();const full_name=String(input.full_name||'').trim(),email=String(input.email||'').trim().toLowerCase(),department=String(input.department||'').trim();if(full_name.length<3||full_name.length>160||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||department.length>160)throw Error('Confira nome, e-mail e setor.');return call('register',{registration:registration(input.registration),full_name,email,department});},
  async employeeStatus(id,active){await manager();if(typeof active!=='boolean')throw Error('Situação inválida.');return call('employee_status',{id:validId(id),active});},
  async find(registrations){await manager();if(!Array.isArray(registrations)||!registrations.length||registrations.length>100)throw Error('Selecione de 1 a 100 PDFs por lote.');return call('find',{registrations:registrations.map(registration)});},
  async publish(input,file){
   await validatePdf(file);const employee=validId(input.employee),month=monthDate(input.month),kind=input.kind;
   if(!Object.hasOwn(KINDS,kind))throw Error('Selecione o tipo de contracheque.');
   const description=String(input.description||'').trim();if(description.length>200)throw Error('Descrição: máximo de 200 caracteres.');
   await manager();const reserved=await call('begin_upload',{employee,month,kind,description,size:file.size});
   try{
    const up=await client.storage.from('rh-contracheques').upload(reserved.path,file,{contentType:'application/pdf',upsert:false,cacheControl:'0'});if(up.error)throw up.error;
    return await call('publish',{id:validId(reserved.id)});
   }catch(error){
    // Only draft objects may be removed by storage RLS. A successful publication whose
    // response was lost can never be deleted by this cleanup.
    try{await client.storage.from('rh-contracheques').remove([reserved.path]);}catch{}
    throw error;
   }
  },
  async state(id,state){await manager();if(!['published','archived'].includes(state))throw Error('Situação inválida.');return call('payslip_status',{id:validId(id),state});},
  async document(id){const item=await call('document',{id:validId(id)});if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/i.test(item?.path||''))throw Error('Caminho de documento inválido.');const {data,error}=await client.storage.from('rh-contracheques').download(item.path);if(error)throw error;return data;},
  async team(){const s=await manager();if(!s.admin)throw Error('Acesso exclusivo do administrador geral.');return call('team');},
  async teamAccess(email,enabled){const s=await manager();if(!s.admin)throw Error('Acesso exclusivo do administrador geral.');if(typeof enabled!=='boolean')throw Error('Permissão inválida.');return call('team_access',{email:String(email).trim().toLowerCase(),enabled});}
 });
}
