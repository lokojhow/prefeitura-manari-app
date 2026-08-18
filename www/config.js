window.MANARI_CONFIG = {
  // Projeto Supabase oficial do aplicativo Prefeitura de Manari.
  // A Publishable Key é própria para uso no frontend, protegida pelas políticas RLS do projeto.
  supabaseUrl: "https://dxvqiiawthxwkypvsxci.supabase.co",
  supabaseAnonKey: "sb_publishable_Zno2VuYH9oev89OpttorUA_wzNb0EP6",
  mediaBucket: "manari-media"
};

// Mantém a posição da faixa horizontal de Secretarias durante a troca de área.
// A restauração é feita após o novo layout estabilizar para evitar que o navegador
// reposicione a faixa no início durante renderizações/hidratações assíncronas.
(() => {
  let pendingSecretariaScroll = null;
  let clearPendingTimer = 0;
  let restoreFrame = 0;

  const restoreSecretariaScroll = () => {
    if (!pendingSecretariaScroll) return;

    cancelAnimationFrame(restoreFrame);
    restoreFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!pendingSecretariaScroll) return;

        const { top, left, dept } = pendingSecretariaScroll;
        const strip = document.querySelector('.secretaria-strip');

        window.scrollTo({ top, left: 0, behavior: 'auto' });

        if (strip) {
          strip.scrollLeft = left;

          const active = Array.from(strip.querySelectorAll('.secretaria-chip[data-dept]'))
            .find(chip => chip.dataset.dept === dept);

          if (active) {
            const stripRect = strip.getBoundingClientRect();
            const activeRect = active.getBoundingClientRect();

            if (activeRect.left < stripRect.left) {
              strip.scrollLeft -= stripRect.left - activeRect.left;
            } else if (activeRect.right > stripRect.right) {
              strip.scrollLeft += activeRect.right - stripRect.right;
            }
          }
        }

        // Nenhum ajuste horizontal pode provocar movimento vertical da página.
        window.scrollTo({ top, left: 0, behavior: 'auto' });
      });
    });

    clearTimeout(clearPendingTimer);
    clearPendingTimer = setTimeout(() => {
      pendingSecretariaScroll = null;
    }, 900);
  };

  document.addEventListener('click', event => {
    const chip = event.target.closest?.('.secretaria-chip[data-dept]');
    if (!chip) return;

    const strip = chip.closest('.secretaria-strip');
    pendingSecretariaScroll = {
      top: window.scrollY,
      left: strip?.scrollLeft || 0,
      dept: chip.dataset.dept
    };

    restoreSecretariaScroll();
  }, true);

  const observer = new MutationObserver(() => {
    if (pendingSecretariaScroll) restoreSecretariaScroll();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();

// Portal Oficial editável — V1.3
// Usa o Supabase já configurado no app. Não altera o layout/CSS existente:
// o hub é aberto somente quando o cidadão toca em "Acessar serviços".
(() => {
  const CFG = window.MANARI_CONFIG;
  if (!CFG?.supabaseUrl || !CFG?.supabaseAnonKey) return;

  const state = {
    client: null,
    links: [],
    services: [],
    content: [],
    category: 'Todos',
    query: '',
    admin: false,
    session: null,
    ready: false
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  const normalize = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const css = {
    overlay: 'position:fixed;inset:0;z-index:2147483000;background:rgba(8,31,49,.62);display:flex;align-items:flex-end;justify-content:center;padding:0;',
    panel: 'width:100%;max-width:760px;max-height:94vh;overflow:auto;background:#f8f7f2;border-radius:24px 24px 0 0;box-shadow:0 -12px 40px rgba(0,0,0,.18);font-family:inherit;color:#12324b;',
    header: 'position:sticky;top:0;z-index:3;background:#f8f7f2;padding:18px 18px 12px;border-bottom:1px solid rgba(18,50,75,.1);',
    top: 'display:flex;align-items:center;justify-content:space-between;gap:12px;',
    title: 'margin:0;font-size:22px;line-height:1.15;font-weight:800;color:#123b5b;',
    subtitle: 'margin:5px 0 0;font-size:13px;color:#66747f;',
    close: 'border:0;background:#eef3ef;border-radius:999px;width:40px;height:40px;font-size:22px;cursor:pointer;color:#123b5b;',
    search: 'width:100%;box-sizing:border-box;margin-top:12px;border:1px solid #dbe2dc;border-radius:13px;padding:12px 14px;font:inherit;background:#fff;color:#17384f;outline:none;',
    chips: 'display:flex;gap:8px;overflow:auto;padding:10px 0 2px;scrollbar-width:none;',
    chip: 'white-space:nowrap;border:1px solid #d7e0d8;background:#fff;border-radius:999px;padding:8px 12px;font:inherit;font-size:12px;font-weight:700;color:#315063;cursor:pointer;',
    chipActive: 'white-space:nowrap;border:1px solid #0c8a49;background:#0c8a49;border-radius:999px;padding:8px 12px;font:inherit;font-size:12px;font-weight:800;color:white;cursor:pointer;',
    body: 'padding:14px 18px 28px;',
    sectionTitle: 'margin:17px 0 9px;font-size:15px;font-weight:900;color:#123b5b;',
    grid: 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;',
    card: 'display:block;text-decoration:none;background:#fff;border:1px solid #e5e7e3;border-radius:16px;padding:14px;min-height:92px;box-shadow:0 3px 12px rgba(20,45,60,.04);color:#17384f;',
    cardTitle: 'display:block;font-size:14px;font-weight:850;line-height:1.25;color:#173f5c;margin-bottom:6px;',
    cardText: 'display:block;font-size:12px;line-height:1.4;color:#68767f;',
    badge: 'display:inline-block;margin-top:9px;font-size:10px;font-weight:800;color:#087a42;background:#edf7f0;border-radius:999px;padding:4px 7px;',
    info: 'background:#fff;border:1px solid #e5e7e3;border-radius:16px;padding:14px;margin-top:10px;',
    infoTitle: 'margin:0 0 6px;font-size:14px;font-weight:850;color:#173f5c;',
    infoText: 'margin:0;font-size:12px;line-height:1.55;color:#61717b;white-space:pre-line;',
    adminBar: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px dashed #ccd7ce;',
    btn: 'border:0;border-radius:11px;padding:9px 12px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;background:#0b8748;color:#fff;',
    btnSecondary: 'border:1px solid #ccd8d0;border-radius:11px;padding:9px 12px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;background:#fff;color:#24465b;',
    editor: 'margin-top:12px;background:#fff;border:1px solid #dfe5e0;border-radius:16px;padding:14px;',
    label: 'display:block;font-size:11px;font-weight:800;color:#456170;margin:10px 0 4px;',
    input: 'width:100%;box-sizing:border-box;border:1px solid #d4ddd6;border-radius:10px;padding:10px;font:inherit;font-size:13px;color:#183c54;background:#fff;',
    textarea: 'width:100%;box-sizing:border-box;border:1px solid #d4ddd6;border-radius:10px;padding:10px;font:inherit;font-size:13px;color:#183c54;background:#fff;min-height:76px;resize:vertical;',
    adminRow: 'border-top:1px solid #edf0ed;padding:10px 0;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;',
    mini: 'border:1px solid #d2ddd4;background:#fff;border-radius:8px;padding:6px 8px;font:inherit;font-size:11px;font-weight:800;color:#315063;cursor:pointer;',
    danger: 'border:1px solid #f0caca;background:#fff5f5;border-radius:8px;padding:6px 8px;font:inherit;font-size:11px;font-weight:800;color:#a32626;cursor:pointer;'
  };

  async function getClient() {
    if (state.client) return state.client;
    for (let i = 0; i < 80; i++) {
      if (window.supabase?.createClient) {
        state.client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        return state.client;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return null;
  }

  async function restRead(table, order = 'sort_order.asc') {
    const response = await fetch(`${CFG.supabaseUrl}/rest/v1/${table}?select=*&order=${encodeURIComponent(order)}`, {
      headers: { apikey: CFG.supabaseAnonKey, Authorization: `Bearer ${CFG.supabaseAnonKey}` },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Falha ao carregar ${table}`);
    return response.json();
  }

  async function refreshData() {
    const client = await getClient();
    if (client) {
      const [{ data: links, error: le }, { data: services, error: se }, { data: content, error: ce }] = await Promise.all([
        client.from('app_portal_links').select('*').order('category').order('sort_order'),
        client.from('app_services').select('*').order('sort_order'),
        client.from('app_portal_content').select('*').order('section').order('sort_order')
      ]);
      if (le || se || ce) throw le || se || ce;
      state.links = links || [];
      state.services = services || [];
      state.content = content || [];
      const { data: sessionData } = await client.auth.getSession();
      state.session = sessionData?.session || null;
      const user = state.session?.user;
      state.admin = !!user && (
        user.email === 'discipulojonathas@gmail.com' ||
        user.app_metadata?.manari_admin === true ||
        user.user_metadata?.manari_admin === true
      );
    } else {
      const [links, services, content] = await Promise.all([
        restRead('app_portal_links', 'sort_order.asc'),
        restRead('app_services', 'sort_order.asc'),
        restRead('app_portal_content', 'sort_order.asc')
      ]);
      state.links = links || [];
      state.services = services || [];
      state.content = content || [];
      state.admin = false;
    }
    state.ready = true;
  }

  function categories() {
    return ['Todos', ...Array.from(new Set(state.links.filter(x => x.active !== false).map(x => x.category).filter(Boolean)))];
  }

  function filteredLinks() {
    const q = normalize(state.query);
    return state.links.filter(item => {
      if (item.active === false && !state.admin) return false;
      if (state.category !== 'Todos' && item.category !== state.category) return false;
      if (!q) return true;
      return normalize([item.title, item.description, item.category, item.department].join(' ')).includes(q);
    });
  }

  function card(item) {
    const inactive = item.active === false ? ' — inativo' : '';
    const href = item.url ? esc(item.url) : '#';
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="${css.card}" data-portal-link="${esc(item.id)}">
      <span style="${css.cardTitle}">${esc(item.title)}${esc(inactive)}</span>
      <span style="${css.cardText}">${esc(item.description || 'Acesse a informação oficial.')}</span>
      <span style="${css.badge}">${esc(item.department || item.category || 'Prefeitura de Manari')} ›</span>
    </a>`;
  }

  function publicView() {
    const links = filteredLinks();
    const grouped = links.reduce((acc, item) => {
      (acc[item.category || 'Outros'] ||= []).push(item);
      return acc;
    }, {});
    const services = state.services.filter(s => s.active !== false && (!state.query || normalize([s.title,s.summary,s.department].join(' ')).includes(normalize(state.query))));
    const infos = state.content.filter(c => c.active !== false);

    const servicesHtml = services.length ? `
      <h3 style="${css.sectionTitle}">Serviços mais procurados</h3>
      <div style="${css.grid}">
        ${services.map(s => `<a href="${esc(s.service_url || '#')}" target="_blank" rel="noopener noreferrer" style="${css.card}">
          <span style="${css.cardTitle}">${esc(s.title)}</span>
          <span style="${css.cardText}">${esc(s.summary || '')}</span>
          <span style="${css.badge}">Acessar serviço ›</span>
        </a>`).join('')}
      </div>` : '';

    const groupsHtml = Object.entries(grouped).map(([name, items]) => `
      <h3 style="${css.sectionTitle}">${esc(name)}</h3>
      <div style="${css.grid}">${items.map(card).join('')}</div>
    `).join('');

    const infosHtml = !state.query && state.category === 'Todos' && infos.length ? `
      <h3 style="${css.sectionTitle}">Informações oficiais</h3>
      ${infos.map(i => `<div style="${css.info}">
        <p style="${css.infoTitle}">${esc(i.title)}</p>
        <p style="${css.infoText}">${esc(i.body || '')}</p>
      </div>`).join('')}` : '';

    return `${servicesHtml}${groupsHtml || `<div style="${css.info}"><p style="${css.infoText}">Nenhum resultado encontrado.</p></div>`}${infosHtml}`;
  }

  function adminManager() {
    return `<div id="manariPortalEditor" style="${css.editor}">
      <div style="${css.top}">
        <div>
          <strong>Gerenciar Portal Oficial</strong>
          <div style="${css.subtitle}">As alterações são salvas no Supabase e aparecem no aplicativo.</div>
        </div>
        <button type="button" style="${css.btnSecondary}" data-admin-close>Fechar</button>
      </div>
      <div style="${css.adminBar}">
        <button type="button" style="${css.btn}" data-add-link>+ Novo acesso</button>
        <button type="button" style="${css.btnSecondary}" data-add-service>+ Novo serviço</button>
        <button type="button" style="${css.btnSecondary}" data-edit-content>Editar informações</button>
      </div>
      <h3 style="${css.sectionTitle}">Acessos do portal</h3>
      <div>${state.links.map(item => `<div style="${css.adminRow}">
        <div><strong style="font-size:12px">${esc(item.title)}</strong><div style="${css.subtitle}">${esc(item.category)}${item.active === false ? ' · INATIVO' : ''}</div></div>
        <div style="display:flex;gap:5px"><button style="${css.mini}" data-edit-link="${esc(item.id)}">Editar</button><button style="${css.danger}" data-delete-link="${esc(item.id)}">Excluir</button></div>
      </div>`).join('')}</div>
      <h3 style="${css.sectionTitle}">Carta de Serviços</h3>
      <div>${state.services.map(item => `<div style="${css.adminRow}">
        <div><strong style="font-size:12px">${esc(item.title)}</strong><div style="${css.subtitle}">${esc(item.department || 'Geral')}${item.active === false ? ' · INATIVO' : ''}</div></div>
        <div style="display:flex;gap:5px"><button style="${css.mini}" data-edit-service="${esc(item.id)}">Editar</button><button style="${css.danger}" data-delete-service="${esc(item.id)}">Excluir</button></div>
      </div>`).join('')}</div>
    </div>`;
  }

  function formField(name, label, value = '', type = 'text') {
    if (type === 'textarea') return `<label style="${css.label}">${esc(label)}</label><textarea name="${esc(name)}" style="${css.textarea}">${esc(value)}</textarea>`;
    if (type === 'checkbox') return `<label style="${css.label};display:flex;align-items:center;gap:8px"><input type="checkbox" name="${esc(name)}" ${value ? 'checked' : ''}> ${esc(label)}</label>`;
    return `<label style="${css.label}">${esc(label)}</label><input type="${esc(type)}" name="${esc(name)}" value="${esc(value)}" style="${css.input}">`;
  }

  function showEntityForm(kind, item = {}) {
    const editor = document.getElementById('manariPortalEditor');
    if (!editor) return;
    const isService = kind === 'service';
    editor.innerHTML = `<form id="manariEntityForm">
      <div style="${css.top}"><strong>${item.id ? 'Editar' : 'Adicionar'} ${isService ? 'serviço' : 'acesso'}</strong><button type="button" style="${css.btnSecondary}" data-back-admin>Voltar</button></div>
      ${formField('title','Título',item.title)}
      ${isService ? formField('slug','Identificador (slug)',item.slug || '') : formField('category','Categoria',item.category || 'Serviços ao cidadão')}
      ${formField('department','Secretaria/área',item.department || '')}
      ${formField(isService ? 'summary' : 'description','Descrição',isService ? item.summary : item.description,'textarea')}
      ${isService ? [
        formField('audience','Quem pode solicitar',item.audience || '','textarea'),
        formField('requirements','Requisitos',item.requirements || '','textarea'),
        formField('documents','Documentos',item.documents || '','textarea'),
        formField('steps','Etapas',item.steps || '','textarea'),
        formField('deadline','Prazo',item.deadline || ''),
        formField('cost','Custo',item.cost || ''),
        formField('channel','Canal de atendimento',item.channel || ''),
        formField('contact','Contato',item.contact || ''),
        formField('service_url','Link oficial',item.service_url || '','url')
      ].join('') : formField('url','Link oficial',item.url || '','url')}
      ${formField('sort_order','Ordem',item.sort_order ?? 0,'number')}
      ${formField('active','Ativo',item.active !== false,'checkbox')}
      ${formField('featured','Destaque',item.featured === true,'checkbox')}
      <div style="${css.adminBar}"><button type="submit" style="${css.btn}">Salvar</button><span id="manariSaveStatus" style="${css.subtitle}"></span></div>
    </form>`;

    editor.querySelector('[data-back-admin]')?.addEventListener('click', render);
    editor.querySelector('#manariEntityForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const status = editor.querySelector('#manariSaveStatus');
      status.textContent = 'Salvando...';
      const fd = new FormData(event.currentTarget);
      const base = {
        title: String(fd.get('title') || '').trim(),
        department: String(fd.get('department') || '').trim() || null,
        sort_order: Number(fd.get('sort_order') || 0),
        active: fd.get('active') === 'on',
        featured: fd.get('featured') === 'on'
      };
      const table = isService ? 'app_services' : 'app_portal_links';
      const payload = isService ? {
        ...base,
        slug: String(fd.get('slug') || normalize(base.title).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')).trim(),
        summary: String(fd.get('summary') || '').trim(),
        audience: String(fd.get('audience') || '').trim(),
        requirements: String(fd.get('requirements') || '').trim(),
        documents: String(fd.get('documents') || '').trim(),
        steps: String(fd.get('steps') || '').trim(),
        deadline: String(fd.get('deadline') || '').trim(),
        cost: String(fd.get('cost') || '').trim(),
        channel: String(fd.get('channel') || '').trim(),
        contact: String(fd.get('contact') || '').trim(),
        service_url: String(fd.get('service_url') || '').trim(),
        metadata: item.metadata || { source: 'admin_app' }
      } : {
        ...base,
        category: String(fd.get('category') || '').trim() || 'Outros',
        description: String(fd.get('description') || '').trim(),
        url: String(fd.get('url') || '').trim(),
        metadata: item.metadata || { source: 'admin_app' }
      };
      try {
        const client = await getClient();
        const result = item.id
          ? await client.from(table).update(payload).eq('id', item.id)
          : await client.from(table).insert(payload);
        if (result.error) throw result.error;
        await refreshData();
        render(true);
      } catch (error) {
        console.error('[Portal Oficial] Falha ao salvar', error);
        status.textContent = `Erro: ${error.message || 'não foi possível salvar'}`;
      }
    });
  }

  function showContentEditor() {
    const editor = document.getElementById('manariPortalEditor');
    if (!editor) return;
    editor.innerHTML = `<div style="${css.top}"><strong>Informações institucionais</strong><button type="button" style="${css.btnSecondary}" data-back-admin>Voltar</button></div>
      <div style="${css.subtitle}">Edite contatos, responsáveis e textos oficiais sem alterar o código.</div>
      ${state.content.map(item => `<form data-content-form="${esc(item.id)}" style="${css.adminRow};display:block">
        <strong style="font-size:12px">${esc(item.section)} · ${esc(item.title)}</strong>
        ${formField('title','Título',item.title)}
        ${formField('body','Texto',item.body || '','textarea')}
        ${formField('active','Ativo',item.active !== false,'checkbox')}
        <button type="submit" style="${css.mini}">Salvar bloco</button>
        <span data-status style="${css.subtitle}"></span>
      </form>`).join('')}`;
    editor.querySelector('[data-back-admin]')?.addEventListener('click', render);
    editor.querySelectorAll('[data-content-form]').forEach(form => form.addEventListener('submit', async event => {
      event.preventDefault();
      const id = event.currentTarget.dataset.contentForm;
      const fd = new FormData(event.currentTarget);
      const status = event.currentTarget.querySelector('[data-status]');
      status.textContent = ' Salvando...';
      try {
        const client = await getClient();
        const { error } = await client.from('app_portal_content').update({
          title: String(fd.get('title') || '').trim(),
          body: String(fd.get('body') || '').trim(),
          active: fd.get('active') === 'on'
        }).eq('id', id);
        if (error) throw error;
        await refreshData();
        status.textContent = ' Salvo.';
      } catch (error) {
        status.textContent = ` Erro: ${error.message || 'falha ao salvar'}`;
      }
    }));
  }

  async function removeEntity(table, id) {
    if (!confirm('Excluir este item do Portal Oficial?')) return;
    try {
      const client = await getClient();
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) throw error;
      await refreshData();
      render(true);
    } catch (error) {
      alert(`Não foi possível excluir: ${error.message || 'erro desconhecido'}`);
    }
  }

  function render(openAdmin = false) {
    const overlay = document.getElementById('manariPortalOverlay');
    if (!overlay) return;
    const panel = overlay.querySelector('[data-portal-panel]');
    const cats = categories();
    panel.innerHTML = `
      <div style="${css.header}">
        <div style="${css.top}">
          <div><h2 style="${css.title}">Serviços e Portal Oficial</h2><p style="${css.subtitle}">Prefeitura Municipal de Manari · informações e serviços públicos</p></div>
          <button type="button" aria-label="Fechar" style="${css.close}" data-portal-close>×</button>
        </div>
        <input id="manariPortalSearch" type="search" placeholder="Buscar serviço, transparência, secretaria..." value="${esc(state.query)}" style="${css.search}">
        <div style="${css.chips}">${cats.map(cat => `<button type="button" data-category="${esc(cat)}" style="${cat === state.category ? css.chipActive : css.chip}">${esc(cat)}</button>`).join('')}</div>
        ${state.admin ? `<div style="${css.adminBar}"><button type="button" style="${css.btnSecondary}" data-open-admin>⚙ Gerenciar conteúdo</button></div>` : ''}
      </div>
      <div style="${css.body}" id="manariPortalBody">${openAdmin && state.admin ? adminManager() : publicView()}</div>`;

    panel.querySelector('[data-portal-close]')?.addEventListener('click', closePortal);
    panel.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
      state.category = button.dataset.category;
      render();
    }));
    const search = panel.querySelector('#manariPortalSearch');
    search?.addEventListener('input', () => {
      state.query = search.value;
      const body = panel.querySelector('#manariPortalBody');
      if (body) body.innerHTML = publicView();
    });
    panel.querySelector('[data-open-admin]')?.addEventListener('click', () => render(true));

    if (openAdmin && state.admin) {
      panel.querySelector('[data-admin-close]')?.addEventListener('click', () => render());
      panel.querySelector('[data-add-link]')?.addEventListener('click', () => showEntityForm('link'));
      panel.querySelector('[data-add-service]')?.addEventListener('click', () => showEntityForm('service'));
      panel.querySelector('[data-edit-content]')?.addEventListener('click', showContentEditor);
      panel.querySelectorAll('[data-edit-link]').forEach(btn => btn.addEventListener('click', () => showEntityForm('link', state.links.find(x => x.id === btn.dataset.editLink) || {})));
      panel.querySelectorAll('[data-edit-service]').forEach(btn => btn.addEventListener('click', () => showEntityForm('service', state.services.find(x => x.id === btn.dataset.editService) || {})));
      panel.querySelectorAll('[data-delete-link]').forEach(btn => btn.addEventListener('click', () => removeEntity('app_portal_links', btn.dataset.deleteLink)));
      panel.querySelectorAll('[data-delete-service]').forEach(btn => btn.addEventListener('click', () => removeEntity('app_services', btn.dataset.deleteService)));
    }
  }

  function closePortal() {
    document.getElementById('manariPortalOverlay')?.remove();
    document.body.style.overflow = '';
  }

  async function openPortal() {
    if (document.getElementById('manariPortalOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'manariPortalOverlay';
    overlay.setAttribute('style', css.overlay);
    overlay.innerHTML = `<div data-portal-panel role="dialog" aria-modal="true" aria-label="Serviços e Portal Oficial" style="${css.panel}">
      <div style="${css.header}"><div style="${css.top}"><h2 style="${css.title}">Serviços e Portal Oficial</h2><button type="button" style="${css.close}" data-portal-close>×</button></div></div>
      <div style="${css.body}"><div style="${css.info}"><p style="${css.infoText}">Carregando informações oficiais...</p></div></div>
    </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.querySelector('[data-portal-close]')?.addEventListener('click', closePortal);
    overlay.addEventListener('click', event => { if (event.target === overlay) closePortal(); });
    try {
      await refreshData();
      render();
    } catch (error) {
      console.error('[Portal Oficial] Falha ao carregar', error);
      const panel = overlay.querySelector('[data-portal-panel]');
      panel.innerHTML = `<div style="${css.header}"><div style="${css.top}"><h2 style="${css.title}">Serviços e Portal Oficial</h2><button type="button" style="${css.close}" data-portal-close>×</button></div></div><div style="${css.body}"><div style="${css.info}"><p style="${css.infoText}">Não foi possível carregar agora. Verifique sua conexão e tente novamente.</p></div></div>`;
      panel.querySelector('[data-portal-close]')?.addEventListener('click', closePortal);
    }
  }

  function isServicesTrigger(element) {
    const clickable = element?.closest?.('button,a,[role="button"]');
    if (!clickable) return false;
    const text = normalize(clickable.textContent);
    return text === 'acessar servicos' || text.includes('acessar servicos');
  }

  document.addEventListener('click', event => {
    if (!isServicesTrigger(event.target)) return;
    if (event.target.closest?.('#manariPortalOverlay')) return;
    event.preventDefault();
    event.stopPropagation();
    openPortal();
  }, true);

  window.ManariPortalOficial = { open: openPortal, refresh: refreshData };

  // Mantém o estado administrativo sincronizado quando o login existente do app muda.
  getClient().then(client => {
    client?.auth?.onAuthStateChange?.(() => {
      state.ready = false;
      if (document.getElementById('manariPortalOverlay')) refreshData().then(() => render()).catch(console.error);
    });
  }).catch(console.error);
})();
