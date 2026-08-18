// Biblioteca de Leis Municipais de Manari
(() => {
  const CFG = window.MANARI_CONFIG || {};
  const SOURCE = 'https://w3d.app.br/transparencia/manari/Consulta_Leis_GRID_EXTERNO/';
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function loadLaws() {
    if (!CFG.supabaseUrl || !CFG.supabaseAnonKey) return [];
    const r = await fetch(`${CFG.supabaseUrl}/rest/v1/app_laws?select=*&active=eq.true&order=year.desc,sort_order.asc`, {
      headers: { apikey: CFG.supabaseAnonKey, Authorization: `Bearer ${CFG.supabaseAnonKey}` },
      cache: 'no-store'
    });
    if (!r.ok) throw new Error('Falha ao carregar leis');
    return r.json();
  }

  function closeModal() {
    document.getElementById('manariLawsOverlay')?.remove();
    document.body.style.overflow = '';
  }

  async function openModal() {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = 'manariLawsOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483200;background:rgba(8,31,49,.62);display:flex;align-items:flex-end;justify-content:center;';
    overlay.innerHTML = `<section role="dialog" aria-modal="true" aria-labelledby="manariLawsTitle" style="width:100%;max-width:760px;max-height:94vh;background:#f8f7f2;border-radius:24px 24px 0 0;overflow:auto;color:#17384f;font-family:inherit;box-shadow:0 -12px 40px rgba(0,0,0,.2)">
      <header style="position:sticky;top:0;z-index:2;background:#f8f7f2;padding:18px;border-bottom:1px solid #dfe6e1">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div><h2 id="manariLawsTitle" style="margin:0;font-size:22px;color:#123b5b">Leis Municipais</h2><p style="margin:5px 0 0;font-size:12px;color:#68767f">Prefeitura Municipal de Manari — acervo oficial</p></div>
          <button type="button" data-laws-close aria-label="Fechar" style="border:0;background:#eef3ef;border-radius:999px;width:40px;height:40px;font-size:22px;color:#123b5b">×</button>
        </div>
        <input id="manariLawsSearch" type="search" placeholder="Pesquisar por número, ano ou assunto..." aria-label="Pesquisar leis" style="width:100%;box-sizing:border-box;margin-top:12px;border:1px solid #d4ddd6;border-radius:13px;padding:12px 14px;font:inherit;background:#fff;color:#17384f;outline:none">
      </header>
      <div style="padding:14px 18px 28px">
        <div id="manariLawsSummary" style="font-size:12px;color:#60717c;margin-bottom:12px">Carregando leis...</div>
        <div id="manariLawsList"></div>
        <a href="${SOURCE}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;margin-top:16px;padding:12px;border-radius:12px;background:#0b8748;color:#fff;text-decoration:none;font-weight:800">Abrir acervo oficial completo (41 registros)</a>
        <p style="font-size:11px;line-height:1.45;color:#71808a;margin:10px 2px 0">Fonte oficial: Portal da Transparência de Manari. Última atualização informada pela fonte: 23/09/2025.</p>
      </div>
    </section>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('[data-laws-close]')) closeModal(); });
    document.addEventListener('keydown', function escClose(e){ if(e.key==='Escape'){ closeModal(); document.removeEventListener('keydown', escClose); } });

    const list = overlay.querySelector('#manariLawsList');
    const summary = overlay.querySelector('#manariLawsSummary');
    const search = overlay.querySelector('#manariLawsSearch');
    try {
      const laws = await loadLaws();
      const render = () => {
        const q = norm(search.value);
        const filtered = laws.filter(l => !q || norm([l.law_number,l.year,l.subject,l.status,l.file_name].join(' ')).includes(q));
        summary.textContent = `${filtered.length} lei(s) catalogada(s) no aplicativo. A fonte oficial informa 41 registros no acervo completo.`;
        list.innerHTML = filtered.length ? filtered.map(l => `<article style="background:#fff;border:1px solid #e2e7e3;border-radius:15px;padding:14px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><strong style="font-size:15px;color:#173f5c">Lei ${esc(l.law_number)}</strong><span style="font-size:10px;font-weight:800;background:#edf7f0;color:#087a42;border-radius:999px;padding:4px 7px">${esc(l.status || 'Publicada')}</span></div>
          <div style="font-size:11px;color:#6d7a83;margin-top:4px">Ano: ${esc(l.year || '—')}${l.law_date ? ` • Data: ${esc(new Date(l.law_date+'T00:00:00').toLocaleDateString('pt-BR'))}` : ''}</div>
          <p style="margin:9px 0 10px;font-size:12px;line-height:1.5;color:#526773">${esc(l.subject)}</p>
          <a href="${esc(l.document_url || SOURCE)}" target="_blank" rel="noopener noreferrer" style="font-size:12px;font-weight:800;color:#0b8748;text-decoration:none">Consultar documento oficial ›</a>
        </article>`).join('') : '<div style="background:#fff;border:1px solid #e2e7e3;border-radius:15px;padding:16px;font-size:13px;color:#60717c">Nenhuma lei encontrada para essa pesquisa.</div>';
      };
      search.addEventListener('input', render);
      render();
      search.focus();
    } catch (err) {
      summary.textContent = 'Não foi possível carregar o catálogo interno agora.';
      list.innerHTML = `<div style="background:#fff;border:1px solid #e2e7e3;border-radius:15px;padding:16px;font-size:13px;color:#60717c">Use o botão abaixo para acessar o acervo oficial completo.</div>`;
    }
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href="#manari-laws"], [data-manari-laws]');
    if (!a) return;
    e.preventDefault(); e.stopPropagation(); openModal();
  }, true);

  if (location.hash === '#manari-laws') setTimeout(openModal, 0);
  window.addEventListener('hashchange', () => { if (location.hash === '#manari-laws') openModal(); });
  window.ManariLaws = { open: openModal };
})();