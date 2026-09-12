(()=>{
  const section=document.getElementById('view-calendario');if(!section)return;
  section.innerHTML=`<div class="page-head"><div><h1>Calendário</h1><p>Aniversários, demandas e eventos em uma agenda mensal</p></div></div><div id="calendarAppMount"></div>`;
  if(!document.querySelector('script[data-calendar-reminders]')){const r=document.createElement('script');r.src='calendar-reminders-addon.js?v=2';r.dataset.calendarReminders='1';document.body.appendChild(r)}
  if(!document.querySelector('script[data-trello-board]')){const s=document.createElement('script');s.src='trello-board-addon.js?v=2';s.dataset.trelloBoard='1';s.onload=()=>{if(!document.querySelector('script[data-trello-detail]')){const d=document.createElement('script');d.src='trello-card-detail-addon.js?v=2';d.dataset.trelloDetail='1';document.body.appendChild(d)}};document.body.appendChild(s)}
})();