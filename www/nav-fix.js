// Prefeitura de Manari — correção robusta da navegação horizontal das secretarias.
// Mantém scrollY e scrollLeft durante renderizações síncronas e assíncronas.
(() => {
  const STRIP = '.secretaria-strip';
  const CHIP = '.secretaria-chip[data-dept]';

  let state = null;
  let restoring = false;
  let lastKnownLeft = 0;
  let lastStrip = null;
  let releaseTimer = 0;
  let restoreTimers = [];

  const getStrip = () => document.querySelector(STRIP);

  const rememberNaturalScroll = () => {
    const strip = getStrip();
    if (!strip) return;
    if (strip !== lastStrip) lastStrip = strip;
    if (!restoring && !state) lastKnownLeft = strip.scrollLeft;
  };

  const keepActiveVisible = (strip, dept) => {
    if (!strip || !dept) return;
    const active = Array.from(strip.querySelectorAll(CHIP))
      .find(chip => chip.dataset.dept === dept);
    if (!active) return;

    const stripRect = strip.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const gap = 8;

    if (activeRect.left < stripRect.left + gap) {
      strip.scrollLeft -= (stripRect.left + gap) - activeRect.left;
    } else if (activeRect.right > stripRect.right - gap) {
      strip.scrollLeft += activeRect.right - (stripRect.right - gap);
    }
  };

  const restore = () => {
    if (!state) return;
    const strip = getStrip();
    restoring = true;

    window.scrollTo({ top: state.top, left: 0, behavior: 'auto' });

    if (strip) {
      // Primeiro devolve exatamente a posição em que o usuário estava.
      strip.scrollLeft = state.left;
      // Só desloca o mínimo necessário se o item tocado tiver ficado fora da área visível.
      keepActiveVisible(strip, state.dept);
      state.left = strip.scrollLeft;
      lastKnownLeft = strip.scrollLeft;
    }

    // Qualquer ajuste horizontal deve ser neutro no eixo vertical.
    window.scrollTo({ top: state.top, left: 0, behavior: 'auto' });

    requestAnimationFrame(() => {
      restoring = false;
    });
  };

  const scheduleRestores = () => {
    restoreTimers.forEach(clearTimeout);
    restoreTimers = [];
    // Cobre renderizações imediatas, transições e hidratações atrasadas do app.
    [0, 16, 50, 120, 250, 500, 900, 1400, 2200, 3200].forEach(delay => {
      restoreTimers.push(setTimeout(restore, delay));
    });

    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      if (state) {
        restore();
        lastKnownLeft = state.left;
      }
      state = null;
      restoring = false;
    }, 3600);
  };

  document.addEventListener('scroll', event => {
    const strip = event.target?.closest?.(STRIP) || (event.target?.matches?.(STRIP) ? event.target : null);
    if (!strip || restoring || state) return;
    lastKnownLeft = strip.scrollLeft;
  }, true);

  document.addEventListener('touchend', rememberNaturalScroll, true);
  document.addEventListener('pointerup', rememberNaturalScroll, true);

  document.addEventListener('click', event => {
    const chip = event.target.closest?.(CHIP);
    if (!chip) return;

    const strip = chip.closest(STRIP) || getStrip();
    const left = strip ? strip.scrollLeft : lastKnownLeft;
    state = {
      top: window.scrollY,
      left: Number.isFinite(left) ? left : lastKnownLeft,
      dept: chip.dataset.dept
    };
    lastKnownLeft = state.left;
    scheduleRestores();
  }, true);

  const observer = new MutationObserver(() => {
    if (state) {
      restore();
    } else {
      const strip = getStrip();
      if (strip && lastKnownLeft > 0 && strip.scrollLeft === 0) {
        // Se a faixa foi recriada pelo render, recupera a última posição conhecida.
        strip.scrollLeft = lastKnownLeft;
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Guarda a posição mesmo quando o navegador recria a faixa sem disparar clique.
  window.addEventListener('pageshow', () => {
    const strip = getStrip();
    if (strip && lastKnownLeft > 0) strip.scrollLeft = lastKnownLeft;
  });
})();
