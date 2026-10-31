import {createWorkflowApi,dateLabel,deadlineState} from './workflow-api.mjs';
import {friendlyError} from './api.mjs';
export function mountWorkflow(document,client,{context,notify,refresh}){
 const api=createWorkflowApi(client),$=id=>document.getElementById(id);
 let data={settings:{},requests:[],appeals:[],mail:[]},requests=new Map();
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn)=>{const n=el('button',text,'secondary');n.type='button';n.onclick=()=>void run(n,fn);return n;};
 const input=(tag,label,min,max)=>{const box=el('div'),id='wf-'+(++sequence);const l=el('label',label);l.htmlFor=id;const field=el(tag);field.id=id;field.required=true;field.minLength=min;field.maxLength=max;if(tag==='textarea')field.rows=3;box.append(l,field);return {box,field};};let sequence=0;
 async function run(control,fn){if(control.dataset.busy)return;control.dataset.busy='true';const buttons=control.tagName==='BUTTON'?[control]:[...control.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await fn();}catch(error){notify(friendlyError(error),true);}finally{delete control.dataset.busy;buttons.forEach(b=>b.disabled=false);}}
 function submitForm(title,label,max,submit){const form=el('form',null,'workflow-form');form.append(el('h4',title));const t=input('textarea',label,10,max);form.append(t.box);const send=el('button','Confirmar');send.type='submit';form.append(send);form.onsubmit=e=>{e.preventDefault();void run(form,async()=>{await submit(t.field.value);await refresh();});};return form;}
 function appealForm(r,level){return submitForm(`Apresentar recurso — instância ${level}`,'Explique por que solicita a revisão da resposta',10000,async reason=>{await api.appeal(r.id,reason,level,r.responded_at);notify('Recurso registrado. Acompanhe a análise neste protocolo.');});}
 function deadline(r){const meta=requests.get(r.id)||r;return {date:meta.due_date||r.effective_due_date,state:deadlineState(meta.due_date||r.effective_due_date,data.today,['recebido','em_analise'].includes(r.status))};}
 function decorate(card,r){
  const meta=requests.get(r.id)||r,ctx=context(),d=deadline(r),block=el('section',null,'workflow-info');
  if(d.date){const labels={vencido:'Prazo vencido',proximo:'Prazo próximo',em_dia:'No prazo',concluido:'Atendimento respondido'};block.append(el('p',`${labels[d.state]||'Prazo'} • Limite de resposta: ${dateLabel(d.date)}`,`deadline ${d.state}`));}
  if(meta.extension_reason)block.append(el('p',`Prorrogação: ${meta.extension_reason}`,'long-text'));
  const mine=r.citizen_id===ctx.userId;
  const response=card.querySelector('.response');
  if(mine&&response&&['respondido','arquivado'].includes(r.status)&&r.responded_at&&!meta.response_read_at){
   response.hidden=true;
   block.append(button('Consultar resposta',async()=>{await api.acknowledge(r.id,r.responded_at);await refresh();notify('Resposta consultada. O prazo para recurso aparece no protocolo.');}));
  }
  if(mine&&meta.response_read_at&&['respondido','arquivado'].includes(r.status)){
   block.append(el('p',`Prazo para apresentar recurso: ${dateLabel(meta.appeal_deadline)}.`,'hint'));
   const appeal=data.appeals.find(a=>a.request_id===r.id&&a.source_response_at===r.responded_at&&a.level===1);
   if(!appeal&&meta.appeal_deadline>=data.today){const details=el('details');details.append(el('summary','Solicitar revisão da resposta'),appealForm(r,1));block.append(details);}
  }
  for(const a of data.appeals.filter(a=>a.request_id===r.id)){
   const item=el('article',null,'appeal-card');item.append(el('h4',`Recurso — instância ${a.level}`),el('p',a.reason,'long-text'),el('p',a.status==='pendente'?`Em análise • Prazo: ${dateLabel(a.due_date)}`:`Decidido em ${dateLabel(a.decided_at)}`,'hint'));
   if(a.status==='pendente'&&!data.settings.reviewers_configured?.[a.level-1])item.append(el('p','Aguardando designação da autoridade responsável pela análise.','hint'));
   if(a.decision){
    if(!mine||a.read_at){item.append(el('div',a.decision,'response long-text'));if(mine&&a.level<data.settings.appeal_levels){item.append(el('p',`Prazo para próxima instância: ${dateLabel(a.next_deadline)}`,'hint'));if(a.next_deadline>=data.today&&!data.appeals.some(n=>n.request_id===r.id&&n.source_response_at===a.source_response_at&&n.level===a.level+1)){const details=el('details');details.append(el('summary','Recorrer à próxima instância'),appealForm(r,a.level+1));item.append(details);}}}
    else item.append(button('Consultar decisão do recurso',async()=>{await api.acknowledge(r.id,a.decided_at,a.id);await refresh();}));
   }
   block.append(item);
  }
  if(ctx.admin&&['recebido','em_analise'].includes(r.status)&&!meta.extended_at&&d.date>=data.today){const details=el('details');details.append(el('summary','Prorrogar prazo com justificativa'),submitForm('Prorrogação de prazo','Justificativa ao cidadão',2000,async reason=>{await api.extend(r.id,reason);notify('Prorrogação registrada no histórico do cidadão.');}));block.append(details);}
  const mail=data.mail.find(m=>m.request_id===r.id);if(mail){const labels={enviado:'Aviso enviado ao servidor de e-mail',pendente:data.settings.mail_ready?'Aviso por e-mail aguardando envio':'Avisos por e-mail aguardando ativação',enviando:'Enviando aviso por e-mail',falhou:'Não foi possível enviar o aviso por e-mail. Acompanhe por este portal.',ignorado:'Aviso por e-mail desativado nesta conta'};block.append(el('p',labels[mail.state]||'','hint'));}
  card.append(block);
 }
 function renderAdministration(){
  const ctx=context();if(!ctx.admin)return;
  const list=$('appeal-queue');list.replaceChildren();
  for(const a of data.appeals){const item=el('article',null,'appeal-card');item.append(el('h4',`${a.protocol} • Instância ${a.level}`),el('strong',a.subject),el('p',a.reason,'long-text'),el('p',`${a.status==='pendente'?'Aguardando decisão':'Decidido'} • Prazo: ${dateLabel(a.due_date)}`,a.status==='pendente'&&a.due_date<data.today?'deadline vencido':'hint'));
   if(a.may_decide&&a.status==='pendente'){
    const form=submitForm('Registrar decisão recursal','Decisão fundamentada e informação solicitada, se houver revisão',10000,async decision=>{await api.decide(a.id,decision,outcome.value);notify('Decisão do recurso registrada e disponibilizada ao cidadão.');});
    const label=el('label','Resultado');label.htmlFor='outcome-'+a.id;const outcome=el('select');outcome.id=label.htmlFor;for(const [value,name]of [['mantida','Manter a resposta'],['revisada','Revisar a resposta']]){const o=el('option',name);o.value=value;outcome.append(o);}form.prepend(label,outcome);item.append(form);
   }else if(a.status==='pendente')item.append(el('p','A decisão ficará disponível para a autoridade designada desta instância. O autor da resposta não pode julgar o recurso contra sua própria resposta.','hint'));
   if(a.decision)item.append(el('div',a.decision,'response long-text'));list.append(item);
  }
  if(!data.appeals.length)list.append(el('p','Nenhum recurso registrado.','empty'));
  const s=data.settings,a=data.administration||{};
  $('workflow-config-note').textContent=s.responsible_configured?'Responsável configurado. Os parâmetros abaixo controlam os novos prazos.':'Responsável pelo e-SIC ainda não designado. Os pedidos e recursos podem ser registrados normalmente.';
  for(const key of ['response_days','extension_days','appeal_days','decision_days','appeal_levels'])$('cfg-'+key).value=s[key];
  $('cfg-roll_weekends').checked=s.roll_weekends;$('cfg-holidays').value=(a.holidays||[]).join('\n');
  for(const [id,value]of [['cfg-responsible',a.responsible_id],['cfg-reviewer-1',a.reviewers?.[0]],['cfg-reviewer-2',a.reviewers?.[1]],['cfg-reviewer-3',a.reviewers?.[2]]]){const select=$(id);select.replaceChildren();const empty=el('option','A designar');empty.value='';select.append(empty);for(const operator of a.operators||[]){const o=el('option',operator.name);o.value=operator.id;select.append(o);}select.value=value||'';}
  $('mail-login').value=a.smtp_login||'';$('mail-sender').value=a.sender_email||'';
  const test=a.last_test,errors={smtp_auth:'A chave SMTP foi recusada pelo provedor.',smtp_rejected:'O provedor recusou o destinatário ou o remetente.',network:'Falha de conexão com o provedor.',provider:'Falha temporária no provedor.'};
  $('mail-configuration-state').textContent=(s.mail_ready?'Chave SMTP configurada.':'Falta configurar a chave SMTP para ativar os avisos.')+` Na fila: ${a.mail_pending||0}. Falhas: ${a.mail_failed||0}.`+(test?` Último teste: ${test.state==='enviado'?'aceito pelo servidor de e-mail':test.state}. ${errors[test.error_code]||''}`:'');
 }
 $('workflow-settings').onsubmit=e=>{e.preventDefault();void run(e.currentTarget,async()=>{const config={};for(const key of ['response_days','extension_days','appeal_days','decision_days','appeal_levels'])config[key]=Number($('cfg-'+key).value);config.roll_weekends=$('cfg-roll_weekends').checked;config.holidays=$('cfg-holidays').value.split(/\s+/).filter(Boolean);config.responsible_id=$('cfg-responsible').value;config.reviewers=[1,2,3].map(i=>$('cfg-reviewer-'+i).value);await api.configure(config);await refresh();notify('Configurações salvas. Prazos já registrados foram preservados.');});};
 $('mail-settings').onsubmit=e=>{e.preventDefault();void run(e.currentTarget,async()=>{const key=$('mail-password');try{await api.mailConfigure({password:key.value,login:$('mail-login').value.trim(),sender:$('mail-sender').value.trim()});}finally{key.value='';}await refresh();notify('Configuração de envio salva. Use Enviar teste para verificar o recebimento.');});};
 $('mail-test').onclick=()=>void run($('mail-test'),async()=>{await api.mailTest();notify('Teste entrou na fila. O envio é processado a cada minuto; confira sua caixa de entrada e atualize o painel.');});
 $('email-preference').onchange=()=>void run($('email-preference-control'),async()=>{await api.preference($('email-preference').checked);notify('Preferência de e-mail salva.');});
 return {
  async load(rows,valid=()=>true){const epoch=context().epoch;const next=await api.snapshot(rows.map(r=>r.id));if(context().epoch!==epoch||!valid())return;data=next;requests=new Map((data.requests||[]).map(r=>[r.id,r]));$('email-preference').checked=data.email_enabled!==false;renderAdministration();},
  clear(){data={settings:{},requests:[],appeals:[],mail:[]};requests.clear();$('appeal-queue').replaceChildren();$('mail-password').value='';$('mail-configuration-state').textContent='';},
  decorate,deadline
 };
}
