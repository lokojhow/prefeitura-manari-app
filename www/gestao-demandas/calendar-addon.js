(()=>{
  const KEY='manari_comunicacao_datas_importantes_v1';
  const categories=['Aniversário da cidade','Festa tradicional','Data cívica','Aniversário de secretário(a)','Personalidade local','Comerciante tradicional','Evento cultural','Evento religioso','Campanha','Outra'];
  let dates=load(KEY,[]);

  const style=document.createElement('style');
  style.textContent=`
    .calendar-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .calendar-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;display:grid;gap:9px}
    .calendar-card h3{margin:0;font-size:16px}.calendar-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
    .calendar-date{display:flex;align-items:center;gap:10px}.calendar-date strong{font-size:28px;color:var(--green)}
    .calendar-date span{font-size:11px;color:var(--muted);text-transform:uppercase}
    .calendar-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:5px}
    .calendar-next{display:grid;gap:10px}.calendar-alert{border:1px solid var(--line);border-radius:13px;padding:12px;display:flex;gap:12px;align-items:center}
    @media(max-width:900px){.calendar-grid{grid-template-columns:1fr 1fr}}@media(max-width:600px){.calendar-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const nav=document.querySelector('.sidebar nav');
  const btn=document.createElement('button');
  btn.className='nav-item';btn.dataset.view='calendario';btn.innerHTML='◫ <span>Datas importantes</span>';
  const generatorBtn=[...nav.querySelectorAll('.nav-item')].find(x=>x.dataset.view==='gerador');
  nav.insertBefore(btn,generatorBtn||null);

  const main=document.querySelector('.main');
  const section=document.createElement('section');
  section.className='view';section.id='view-calendario';
  section.innerHTML=`
    <div class="grid-2">
      <form id="importantDateForm" class="panel form-panel">
        <div class="panel-head"><div><span class="eyebrow">Agenda estratégica</span><h3>Cadastrar data importante</h3></div></div>
        <div class="form-grid">
          <label class="wide">Nome / ocasião<input name="name" required placeholder="Ex.: Aniversário de Manari" /></label>
          <label>Categoria<select name="category">${categories.map(c=>`<option>${c}</option>`).join('')}</select></label>
          <label>Importância<select name="importance"><option>Normal</option><option>Alta</option><option>Essencial</option></select></label>
          <label>Dia<input name="day" type="number" min="1" max="31" required /></label>
          <label>Mês<select name="month">${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i)=>`<option value="${i+1}">${m}</option>`).join('')}</select></label>
          <label>Antecedência do aviso<select name="alertDays"><option value="30">30 dias antes</option><option value="15">15 dias antes</option><option value="7" selected>7 dias antes</option><option value="3">3 dias antes</option><option value="1">1 dia antes</option><option value="0">No dia</option></select></label>
          <label>Repete todo ano<select name="recurring"><option value="yes">Sim</option><option value="no">Não</option></select></label>
          <label class="wide">Informações / histórico<textarea name="notes" rows="4" placeholder="Quem é a pessoa, importância para a cidade, histórico da festa ou observações para a equipe..."></textarea></label>
        </div>
        <div class="actions"><button type="reset" class="ghost">Limpar</button><button type="submit" class="primary">Salvar data</button></div>
      </form>
      <section class="panel"><div class="panel-head"><div><span class="eyebrow">Próximas oportunidades</span><h3>Agenda de conteúdo</h3></div><span class="tag" id="importantCount">0</span></div><div id="importantUpcoming" class="calendar-next"></div></section>
    </div>
    <div class="panel" style="margin-top:18px"><div class="panel-head"><div><span class="eyebrow">Calendário institucional</span><h3>Datas cadastradas</h3></div><button class="ghost" id="exportDatesBtn">Exportar datas</button></div><div id="importantDatesList" class="calendar-grid"></div></div>
  `;
  const backup=document.getElementById('view-backup');
  main.insertBefore(section,backup||null);

  titles.calendario='Datas importantes';
  btn.addEventListener('click',()=>go('calendario'));

  function saveDates(){localStorage.setItem(KEY,JSON.stringify(dates));renderDates();}
  function monthName(m){return ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][Number(m)-1]||'--'}
  function nextOccurrence(x){const now=new Date();now.setHours(0,0,0,0);let y=now.getFullYear();let d=new Date(y,Number(x.month)-1,Number(x.day));if(d<now)d=new Date(y+1,Number(x.month)-1,Number(x.day));return d}
  function daysUntil(x){return Math.ceil((nextOccurrence(x)-new Date(new Date().setHours(0,0,0,0)))/86400000)}
  function dateCard(x){const until=daysUntil(x);return `<article class="calendar-card"><div class="calendar-date"><strong>${String(x.day).padStart(2,'0')}</strong><span>${monthName(x.month)}<br>${until===0?'HOJE':until+' dias'}</span></div><div><h3>${esc(x.name)}</h3><p>${esc(x.category)} • ${esc(x.importance)}</p></div><p>${esc(x.notes||'Sem observações.')}</p><div class="calendar-actions"><button class="primary small" data-date-demand="${x.id}">Criar demanda</button><button class="ghost" data-date-gen="${x.id}">Gerar conteúdo</button><button class="ghost" data-date-del="${x.id}">Excluir</button></div></article>`}
  function renderDates(){
    dates.sort((a,b)=>nextOccurrence(a)-nextOccurrence(b));
    document.getElementById('importantCount').textContent=dates.length;
    document.getElementById('importantDatesList').innerHTML=dates.length?dates.map(dateCard).join(''):'<p class="empty">Nenhuma data importante cadastrada ainda.</p>';
    const upcoming=dates.slice(0,6);
    document.getElementById('importantUpcoming').innerHTML=upcoming.length?upcoming.map(x=>`<div class="calendar-alert"><div class="date-box"><strong>${String(x.day).padStart(2,'0')}</strong><span>${monthName(x.month)}</span></div><div><strong>${esc(x.name)}</strong><p style="margin:3px 0 0;color:var(--muted);font-size:11px">${daysUntil(x)===0?'Hoje':`Faltam ${daysUntil(x)} dias`} • avisar ${x.alertDays} dias antes</p></div></div>`).join(''):'<p class="empty">Cadastre aniversários, festas e datas tradicionais.</p>';
    document.querySelectorAll('[data-date-del]').forEach(b=>b.onclick=()=>{if(confirm('Excluir esta data?')){dates=dates.filter(x=>x.id!==b.dataset.dateDel);saveDates();toast('Data excluída')}});
    document.querySelectorAll('[data-date-demand]').forEach(b=>b.onclick=()=>createDemandFromDate(b.dataset.dateDemand));
    document.querySelectorAll('[data-date-gen]').forEach(b=>b.onclick=()=>generateFromDate(b.dataset.dateGen));
  }
  function createDemandFromDate(id){
    const x=dates.find(d=>d.id===id);if(!x)return;
    const d=nextOccurrence(x);const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    state.demands.unshift({id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(),title:`Produzir conteúdo — ${x.name}`,secretariat:'Prefeitura',priority:x.importance==='Essencial'?'Alta':'Normal',date,time:'',location:'Manari',details:`Data institucional: ${x.category}. ${x.notes||''}`.trim(),coverage:'Arte',team:'',status:'Recebida',createdAt:new Date().toISOString(),sourceImportantDateId:x.id});
    save();toast('Demanda criada a partir da data');go('demandas');
  }
  function generateFromDate(id){
    const x=dates.find(d=>d.id===id);if(!x)return;go('gerador');
    setTimeout(()=>{document.getElementById('generatorDemand').value='';document.getElementById('genTitle').value=x.name;document.getElementById('genSecretariat').value='Prefeitura Municipal de Manari';document.getElementById('genLocation').value='Manari';document.getElementById('genDetails').value=`${x.category}. ${x.notes||''}`.trim();generate('all')},0);
  }
  document.getElementById('importantDateForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);dates.push({id:crypto.randomUUID?crypto.randomUUID():Date.now().toString(),name:f.get('name'),category:f.get('category'),importance:f.get('importance'),day:Number(f.get('day')),month:Number(f.get('month')),alertDays:Number(f.get('alertDays')),recurring:f.get('recurring')==='yes',notes:f.get('notes'),createdAt:new Date().toISOString()});saveDates();e.target.reset();toast('Data importante salva')};
  document.getElementById('exportDatesBtn').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),importantDates:dates},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`manari-datas-importantes-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)};

  const oldExport=document.getElementById('exportBtn').onclick;
  document.getElementById('exportBtn').onclick=()=>{const payload={version:2,exportedAt:new Date().toISOString(),demands:state.demands,teams:state.teams,importantDates:dates};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`manari-comunicacao-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast('Backup completo gerado')};
  document.getElementById('importInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.demands))throw new Error();state.demands=data.demands;state.teams=Array.isArray(data.teams)?data.teams:state.teams;if(Array.isArray(data.importantDates))dates=data.importantDates;localStorage.setItem(KEY,JSON.stringify(dates));save();renderDates();toast('Backup completo restaurado')}catch{toast('Arquivo de backup inválido')}e.target.value=''};
  renderDates();
})();