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
