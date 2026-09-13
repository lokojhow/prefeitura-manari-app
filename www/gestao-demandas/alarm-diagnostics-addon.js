(()=>{
if(window.__MANARI_ALARM_DIAGNOSTICS__)return;window.__MANARI_ALARM_DIAGNOSTICS__=true;
const wait=setInterval(()=>{
  const btn=document.getElementById('enableCalendarAlarms');
  const status=document.getElementById('alarmStatus');
  if(!btn||!status)return;
  clearInterval(wait);
  const p=window.Capacitor?.Plugins?.LocalNotifications;
  if(!p){status.textContent='Alarmes nativos indisponíveis nesta versão.';return}
  async function ensureChannel(){try{await p.createChannel({id:'manari_agenda',name:'Agenda e lembretes',description:'Alarmes de aniversários, eventos e demandas',importance:5,visibility:1,vibration:true,sound:'default'});}catch(_){}}
  async function ensureExact(){try{const s=await p.checkExactNotificationSetting();const value=s?.exact_alarm||s?.value||s?.status;if(value==='granted')return true;status.textContent='Ative “Alarmes e lembretes” nas configurações do Android.';try{await p.changeExactNotificationSetting();}catch(_){}return false}catch(_){return true}}
  async function ensureDisplay(){try{let s=await p.checkPermissions();if(s.display==='granted')return true;s=await p.requestPermissions();return s.display==='granted'}catch(_){return false}}
  async function testNow(){if(!(await ensureDisplay())){status.textContent='Permissão de notificações não concedida.';return}await ensureChannel();const exact=await ensureExact();const at=new Date(Date.now()+8000);try{const result=await p.schedule({notifications:[{id:2147000001,title:'Teste de alarme — Manari',body:'Se você recebeu este aviso, os alarmes do aplicativo estão funcionando.',channelId:'manari_agenda',schedule:{at},sound:'default',foreground:true,isExactNotification:true,isExactMandatory:false,extra:{kind:'manari-test'}}]});status.textContent=exact?'Teste agendado para tocar em 8 segundos.':'Teste agendado; falta liberar alarme exato no Android.';if(result?.warning)status.textContent+=' '+result.warning}catch(e){status.textContent='Falha no teste: '+(e?.message||'erro desconhecido')}}
  const wrap=btn.parentElement;if(wrap&&!document.getElementById('testCalendarAlarm')){const t=document.createElement('button');t.id='testCalendarAlarm';t.className='ghost';t.type='button';t.textContent='🔔 Testar agora';t.onclick=testNow;wrap.insertBefore(t,status)}
  const old=btn.onclick;btn.onclick=async e=>{if(!(await ensureDisplay())){status.textContent='Permissão de notificações não concedida.';return}await ensureChannel();const exact=await ensureExact();if(old)await old.call(btn,e);status.textContent=exact?'Alarmes ativados. Use “Testar agora” para conferir.':'Notificações ativadas, mas falta liberar “Alarmes e lembretes” no Android.'};
},300);
})();