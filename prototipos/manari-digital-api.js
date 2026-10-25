/** Manari Digital: Supabase JS v2 client adapter. Use publishable/anon client only. */
export function criarManariDigitalApi(supabase) {
 if (!supabase?.auth || !supabase?.from || !supabase?.rpc) throw new TypeError('Supabase client inválido');
 async function usuario() { const {data,error}=await supabase.auth.getUser();if(error) throw error;if(!data?.user?.id)throw Error('Faça login para continuar.');return data.user; }
 function validarTexto(value,min,max,field){const v=String(value??'').trim();if(v.length<min||v.length>max)throw Error(field+' inválido.');return v;}
 function ok(result){if(result.error)throw result.error;return result.data;}
 return Object.freeze({
  async cadastrar(email,senha){const e=validarTexto(email,5,254,'E-mail');if(!e.includes('@'))throw Error('E-mail inválido.');return ok(await supabase.auth.signUp({email:e,password:senha}));},
  async entrar(email,senha){return ok(await supabase.auth.signInWithPassword({email, password:senha}));},
  async sair(){return ok(await supabase.auth.signOut());},
  async abrir({module,category='geral',subject,description}){
   const u=await usuario();if(!['esic','ouvidoria','protocolo'].includes(module))throw Error('Módulo inválido.');
   return ok(await supabase.from('manari_digital_requests').insert({citizen_id:u.id,module,category:validarTexto(category,1,80,'Categoria'),subject:validarTexto(subject,5,200,'Assunto'),description:validarTexto(description,10,10000,'Descrição')}).select('id,protocol,module,subject,status,created_at').single());
  },
  async meusProtocolos(){await usuario();return ok(await supabase.from('manari_digital_requests').select('id,protocol,module,subject,status,department,response_text,responded_at,created_at').order('created_at',{ascending:false}));},
  async historico(requestId){await usuario();return ok(await supabase.from('manari_digital_events').select('event_type,details,created_at').eq('request_id',requestId).order('created_at'));},
  async filaAdministrativa(){await usuario();return ok(await supabase.from('manari_digital_requests').select('id,protocol,module,category,subject,description,status,department,created_at').order('created_at',{ascending:false}));},
  async acaoAdministrativa({id,acao,departamento=null,resposta=null}){await usuario();return ok(await supabase.rpc('manari_digital_admin_action',{p_request:id,p_action:acao,p_department:departamento,p_response:resposta}));}
 });
}
