// Prefeitura de Manari — navegação horizontal estável das secretarias.
// Novo padrão: a secretaria tocada vira a referência da faixa e permanece visível/centralizada.
// Não tenta mais preservar um scrollLeft antigo, evitando conflito com rerenderizações do app.
(() => {
  const STRIP = '.secretaria-strip';
  const CHIP = '.secretaria-chip[data-dept]';

  let selectedDept = null;
  let savedTop = null;
  let activeUntil = 0;
  let timers = [];
  let raf = 0;

  const getStrip = () => document.querySelector(STRIP);

  const getChip = (strip, dept) => {
    if (!strip || !dept) return null;
    return Array.from(strip.querySelectorAll(CHIP))
      .find(chip => chip.dataset.dept === dept) || null;
  };

  const centerSelected = () => {
    if (!selectedDept || Date.now() > activeUntil) return;

    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const strip = getStrip();
      const chip = getChip(strip, selectedDept);

      if (strip && chip) {
        const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
        const target = Math.max(
          0,
          Math.min(
            max,
            chip.offsetLeft - ((strip.clientWidth - chip.offsetWidth) / 2)
          )
        );

        // Sem animação para impedir que a renderização do app dispute com a posição da faixa.
        strip.scrollLeft = target;
      }

      if (savedTop !== null) {
        window.scrollTo({ top: savedTop, left: 0, behavior: 'auto' });
      }
    });
  };

  const runStabilization = () => {
    timers.forEach(clearTimeout);
    timers = [];

    // Mantém a secretaria tocada como referência durante todo o ciclo de renderização.
    [0, 16, 40, 80, 140, 220, 350, 550, 800, 1100, 1500, 2000, 2600].forEach(delay => {
      timers.push(setTimeout(centerSelected, delay));
    });

    activeUntil = Date.now() + 3000;
    timers.push(setTimeout(() => {
      centerSelected();
      savedTop = null;
    }, 3000));
  };

  document.addEventListener('click', event => {
    const chip = event.target.closest?.(CHIP);
    if (!chip) return;

    selectedDept = chip.dataset.dept;
    savedTop = window.scrollY;
    activeUntil = Date.now() + 3000;
    runStabilization();
  }, true);

  // Se o aplicativo recriar a faixa ou os chips depois do clique, recentraliza o item escolhido.
  const observer = new MutationObserver(() => {
    if (selectedDept && Date.now() <= activeUntil) centerSelected();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Em resize/orientação, mantém a secretaria atual visível sem mexer no eixo vertical.
  window.addEventListener('resize', () => {
    if (!selectedDept) return;
    const strip = getStrip();
    const chip = getChip(strip, selectedDept);
    if (!strip || !chip) return;

    const max = Math.max(0, strip.scrollWidth - strip.clientWidth);
    strip.scrollLeft = Math.max(0, Math.min(max, chip.offsetLeft - ((strip.clientWidth - chip.offsetWidth) / 2)));
  });
})();