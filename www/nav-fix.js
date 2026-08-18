// Prefeitura de Manari — navegação horizontal estável das secretarias.
// Esta rotina é a autoridade final sobre a posição da faixa enquanto uma secretaria é trocada.
// Ela neutraliza reposicionamentos concorrentes causados por rerenderizações assíncronas.
(() => {
  const STRIP = '.secretaria-strip';
  const CHIP = '.secretaria-chip[data-dept]';

  let selectedDept = null;
  let savedTop = null;
  let activeUntil = 0;
  let timers = [];
  let raf = 0;
  let correcting = false;
  let observedStrip = null;

  const getStrip = () => document.querySelector(STRIP);

  const getChip = (strip, dept) => {
    if (!strip || !dept) return null;
    return Array.from(strip.querySelectorAll(CHIP))
      .find(chip => chip.dataset.dept === dept) || null;
  };

  const getTargetLeft = (strip, chip) => {
    if (!strip || !chip) return 0;
    const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
    return Math.max(
      0,
      Math.min(
        max,
        chip.offsetLeft - ((strip.clientWidth - chip.offsetWidth) / 2)
      )
    );
  };

  const centerSelected = () => {
    if (!selectedDept || Date.now() > activeUntil) return;

    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const strip = getStrip();
      const chip = getChip(strip, selectedDept);

      if (strip && chip) {
        const target = getTargetLeft(strip, chip);
        if (Math.abs(strip.scrollLeft - target) > 1) {
          correcting = true;
          strip.scrollLeft = target;
          requestAnimationFrame(() => { correcting = false; });
        }
      }

      if (savedTop !== null && Math.abs(window.scrollY - savedTop) > 1) {
        window.scrollTo({ top: savedTop, left: 0, behavior: 'auto' });
      }
    });
  };

  const bindStripGuard = () => {
    const strip = getStrip();
    if (!strip || strip === observedStrip) return;

    observedStrip = strip;
    strip.addEventListener('scroll', () => {
      if (correcting || !selectedDept || Date.now() > activeUntil) return;
      // Qualquer rotina antiga que tente recolocar a faixa em outra posição é corrigida no mesmo ciclo.
      centerSelected();
    }, { passive: true });
  };

  const runStabilization = () => {
    timers.forEach(clearTimeout);
    timers = [];

    activeUntil = Date.now() + 4500;
    [0, 16, 32, 50, 80, 120, 180, 260, 360, 500, 700, 950, 1250, 1600, 2100, 2800, 3600, 4400].forEach(delay => {
      timers.push(setTimeout(() => {
        bindStripGuard();
        centerSelected();
      }, delay));
    });

    timers.push(setTimeout(() => {
      centerSelected();
      savedTop = null;
    }, 4550));
  };

  document.addEventListener('click', event => {
    const chip = event.target.closest?.(CHIP);
    if (!chip) return;

    selectedDept = chip.dataset.dept;
    savedTop = window.scrollY;
    bindStripGuard();
    runStabilization();
  }, true);

  const observer = new MutationObserver(() => {
    bindStripGuard();
    if (selectedDept && Date.now() <= activeUntil) centerSelected();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('resize', () => {
    bindStripGuard();
    if (!selectedDept) return;
    const strip = getStrip();
    const chip = getChip(strip, selectedDept);
    if (!strip || !chip) return;
    strip.scrollLeft = getTargetLeft(strip, chip);
  });

  window.addEventListener('pageshow', bindStripGuard);
  bindStripGuard();
})();
