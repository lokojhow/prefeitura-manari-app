const SEC_GREEN='#159447';
function secSvg(type){
 const c=SEC_GREEN;
 const base=`viewBox="0 0 120 120" aria-hidden="true" focusable="false"`;
 const svgs={
  gabinete:`<svg ${base}><path fill="${c}" d="M60 6 106 22v31c0 30-18 50-46 61C32 103 14 83 14 53V22L60 6Z"/><path fill="#fff" d="M31 43h58v39H31z"/><path fill="${c}" d="M38 51h12v23H38zm16-13h12v36H54zm16 9h12v27H70z"/></svg>`,
  administracao:`<svg ${base}><circle cx="28" cy="29" r="14" fill="${c}"/><circle cx="60" cy="22" r="15" fill="${c}"/><circle cx="92" cy="29" r="14" fill="${c}"/><path fill="${c}" d="M10 51c15-9 29-6 40 7l10 13 10-13c11-13 25-16 40-7-3 29-17 52-50 64C27 103 13 80 10 51Z"/></svg>`,
  educacao:`<svg ${base}><path fill="none" stroke="${c}" stroke-width="8" stroke-linejoin="round" d="M10 33c18-8 35-3 50 9 15-12 32-17 50-9v58c-18-8-35-3-50 9-15-12-32-17-50-9V33Z"/><path fill="${c}" d="M60 22 77 10l17 12-17 12-17-12Z"/><path stroke="${c}" stroke-width="7" d="M60 42v56"/></svg>`,
  assistencia:`<svg ${base}><circle cx="34" cy="29" r="15" fill="${c}"/><circle cx="86" cy="29" r="15" fill="${c}"/><circle cx="60" cy="58" r="12" fill="${c}"/><path fill="${c}" d="M7 48c16-4 30 3 39 16l14 21 14-21c9-13 23-20 39-16-4 31-20 51-53 67C27 99 11 79 7 48Z"/></svg>`,
  saude:`<svg ${base}><rect x="43" y="8" width="34" height="104" rx="8" fill="${c}"/><rect x="8" y="43" width="104" height="34" rx="8" fill="${c}"/></svg>`,
  agricultura:`<svg ${base}><circle cx="60" cy="60" r="48" fill="none" stroke="${c}" stroke-width="8"/><path fill="${c}" d="M59 96c-2-25 2-48 22-69 1 21-5 35-19 45 12-9 26-11 43-6-9 16-24 24-43 23-14 0-29-8-39-23 18-5 32-3 43 6-14-10-20-24-19-45 20 21 24 44 22 69H59Z"/></svg>`,
  infraestrutura:`<svg ${base}><circle cx="31" cy="20" r="13" fill="${c}"/><path fill="${c}" d="M17 36h29l9 27-12 5-7-18v55H24V71l-7 26-12-4 12-57Z"/><path fill="${c}" d="m51 58 10-10 34 34-10 10zM75 103l18-29 22 29H75Z"/></svg>`,
  esportes:`<svg ${base}><circle cx="38" cy="24" r="14" fill="${c}"/><path fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" d="m34 43 18 18 21-12m-21 12-12 31m12-31 28 28M30 47 12 67"/></svg>`,
  comunicacao:`<svg ${base}><circle cx="60" cy="60" r="18" fill="#f6921e"/><circle cx="60" cy="19" r="14" fill="#26a9e0"/><circle cx="101" cy="60" r="14" fill="#e51e63"/><circle cx="60" cy="101" r="14" fill="#39b54a"/><circle cx="19" cy="60" r="14" fill="#39b54a"/><path fill="#7f3f98" d="M44 37h32l17 23-17 23H44L27 60l17-23Z"/></svg>`
 };
 return svgs[type]||svgs.gabinete;
}
function secType(name=''){
 const n=name.toLowerCase();
 if(n.includes('administra'))return'administracao';
 if(n.includes('educa'))return'educacao';
 if(n.includes('assist'))return'assistencia';
 if(n.includes('saúde')||n.includes('saude'))return'saude';
 if(n.includes('agric'))return'agricultura';
 if(n.includes('infra'))return'infraestrutura';
 if(n.includes('esporte'))return'esportes';
 if(n.includes('comunica'))return'comunicacao';
 return'gabinete';
}
(function(){
 const style=document.createElement('style');
 style.textContent=`#secretariatsGrid .secretariat-card .sec-icon{width:116px!important;height:116px!important;min-width:116px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important}#secretariatsGrid .secretariat-card .sec-icon svg{width:104px!important;height:104px!important;display:block!important}@media(max-width:760px){#secretariatsGrid .secretariat-card .sec-icon{width:100px!important;height:100px!important;min-width:100px!important}#secretariatsGrid .secretariat-card .sec-icon svg{width:92px!important;height:92px!important}}`;
 document.head.appendChild(style);
 window.renderSecretariats=function(){
  $('secretariatsGrid').innerHTML=state.secretariats.map((s,i)=>{const ds=state.demands.filter(d=>d.secretariat===s.name),open=ds.filter(d=>d.status!=='Publicada').length;return`<article class="secretariat-card"><div class="sec-icon">${secSvg(secType(s.name))}</div><h3>${esc(s.name)}</h3><p>${esc(s.description||'Espaço da secretaria')}</p><div class="sec-count"><span>${ds.length} demandas</span><strong>${open} em aberto</strong></div><div class="actions"><button class="ghost" data-sec-new="${i}">Nova demanda</button><button class="ghost" data-sec-del="${i}">Remover</button></div></article>`}).join('');
  document.querySelectorAll('[data-sec-new]').forEach(b=>b.onclick=()=>{const s=state.secretariats[+b.dataset.secNew];go('nova');$('demandSecretariat').value=s.name});
  document.querySelectorAll('[data-sec-del]').forEach(b=>b.onclick=()=>{if(confirm('Remover esta secretaria?')){state.secretariats.splice(+b.dataset.secDel,1);save()}});
 };
})();