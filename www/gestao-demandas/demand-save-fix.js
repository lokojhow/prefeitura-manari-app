(()=>{
if(window.__MANARI_DEMAND_SAVE_FIX__)return;window.__MANARI_DEMAND_SAVE_FIX__=true;
const form=document.getElementById('demandForm');if(!form)return;
const original=form.onsubmit;if(typeof original!=='function')return;
let saving=false;
form.onsubmit=async function(e){
  if(saving){e.preventDefault();window.toast?.('Aguarde, a demanda já está sendo salva.');return false}
  const btn=form.querySelector('button.primary');
  const oldText=btn?.textContent||'Salvar demanda';
  saving=true;
  if(btn){btn.disabled=true;btn.textContent='Salvando...';btn.setAttribute('aria-busy','true')}
  try{return await original.call(this,e)}
  catch(err){console.error('Falha ao salvar demanda',err);window.toast?.('Não foi possível salvar. Tente novamente.');return false}
  finally{
    saving=false;
    if(btn){btn.disabled=false;btn.textContent=oldText;btn.removeAttribute('aria-busy')}
  }
};
})();