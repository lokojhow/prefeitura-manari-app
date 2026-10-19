// Mantém os títulos legíveis na coluna, incluindo telas abertas de tablets e Fold.
(()=>{
 if(window.__MANARI_HEADINGS__)return;window.__MANARI_HEADINGS__=true;
 let queued=false;const observed=new WeakSet();
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
 function highlight(title){
  if(title.dataset.manariTitleText===title.textContent)return;
  let count=0;
  for(const node of [...title.childNodes]){
   if(node.nodeType!==Node.TEXT_NODE)continue;
   const parts=node.textContent.split(/(\s+)/),fragment=document.createDocumentFragment();
   for(const part of parts){
    if(count<3&&part.replace(/[^\p{L}]/gu,'').length>=5){const span=document.createElement('span');span.className='manari-title-keyword';span.textContent=part;fragment.appendChild(span);count++}else fragment.appendChild(document.createTextNode(part));
   }
   node.replaceWith(fragment);
  }
  title.dataset.manariTitleText=title.textContent;
 }
 function fit(title){
  if(!title.isConnected||!title.clientWidth)return;
  title.style.removeProperty('font-size');
  const style=getComputedStyle(title),base=parseFloat(style.fontSize),available=title.clientWidth-4;
  if(!context||available<=0||!Number.isFinite(base))return;
  let ratio=1;
  // Mede cada palavra com a fonte efetivamente aplicada, também no trecho verde.
  const walker=document.createTreeWalker(title,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode()){
   const textStyle=getComputedStyle(node.parentElement);
   context.font=`${textStyle.fontStyle} ${textStyle.fontWeight} ${base}px ${textStyle.fontFamily}`;
   const spacing=parseFloat(textStyle.letterSpacing)||0;
   const text=textStyle.textTransform==='uppercase'?node.textContent.toLocaleUpperCase('pt-BR'):node.textContent;
   for(const word of text.split(/\s+/).filter(Boolean)){const width=context.measureText(word).width+Math.max(0,word.length-1)*spacing;if(width>0)ratio=Math.min(ratio,available/width)}
  }
  if(ratio<1)title.style.setProperty('font-size',`${Math.floor(base*ratio*10)/10}px`,'important');
 }
 function update(){queued=false;document.querySelectorAll('.hero-copy h1').forEach(title=>{highlight(title);fit(title);if(!observed.has(title)){observer?.observe(title);observed.add(title)}})}
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(update)}
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
 new MutationObserver(schedule).observe(document.querySelector('#mainView')||document.body,{childList:true,subtree:true});
 window.addEventListener('resize',schedule,{passive:true});
 if(document.fonts){document.fonts.ready.then(schedule);document.fonts.addEventListener?.('loadingdone',schedule)}
 schedule();
})();
