import { storedMotionMode } from './motion';
import { CRAFT_HOME_KEY, CRAFT_RETURN_KEY } from './craftNavigation';

/** Quanto a página espera por um quadro ocioso antes de abrir a cortina. */
const TIDE_CALM_CAP = 800;
const TIDE_CALM_FALLBACK = 420;

/** Rede de segurança para um `transitionend` perdido ou uma camada sem transição. */
const TIDE_TRANSITION_TIMEOUT = 2200;

// Do not let the tides depart underneath the browser's cross-document
// snapshot. The event is captured as soon as this module runs; unsupported
// browsers resolve immediately and the timeout prevents an implementation bug
// from ever holding the water curtain indefinitely.
const pageRevealFinished = new Promise<void>((resolve) => {
  if (!('onpagereveal' in window)) {
    resolve();
    return;
  }

  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    resolve();
  };

  window.addEventListener('pagereveal', (event) => {
    const transition = (event as any).viewTransition;
    if (transition) void transition.finished.catch(() => {}).then(done);
    else done();
  }, { once: true });
  window.setTimeout(done, 700);
});

export function initCraft() {
  const root = document.documentElement;
  const transition = document.querySelector<HTMLElement>('[data-craft-transition]');
  const tides = transition
    ? [...transition.querySelectorAll<HTMLElement>('[data-craft-tide]')]
    : [];
  const back = document.querySelector<HTMLAnchorElement>('[data-craft-back]');
  let leaving = false;
  let rememberedHome: string | null = null;

  try {
    rememberedHome = sessionStorage.getItem(CRAFT_HOME_KEY);
  } catch {}

  // A escolha feita no portão da home manda. Em acesso direto, onde ela ainda
  // não existe, respeitamos a preferência do sistema.
  const mode = storedMotionMode();
  if (mode) root.dataset.motion = mode;
  const reduced = mode === 'reduced' ||
    (!mode && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /** Espera TODAS as marés concluírem o movimento.
   *
   * Cada camada pode terminar num quadro diferente. Resolver no primeiro
   * `transitionend` deixaria as demais serem cortadas ao esconder a cortina.
   * O timeout garante que remoção de DOM, CSS sem transição ou um evento
   * perdido nunca congele a navegação. */
  const waitForTides = (timeout = TIDE_TRANSITION_TIMEOUT) => {
    if (!tides.length) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const pending = new Set(tides);
      let finished = false;
      let guard = 0;

      const cleanup = () => {
        window.clearTimeout(guard);
        tides.forEach((tide) => tide.removeEventListener('transitionend', onEnd));
      };
      const done = () => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve();
      };
      const onEnd = (event: TransitionEvent) => {
        const tide = event.currentTarget as HTMLElement;
        // Ignora transições de descendentes e propriedades decorativas mais
        // curtas; o deslocamento da camada é o relógio da coreografia.
        if (event.target !== tide || event.propertyName !== 'transform') return;
        pending.delete(tide);
        if (!pending.size) done();
      };

      tides.forEach((tide) => tide.addEventListener('transitionend', onEnd));
      guard = window.setTimeout(done, timeout);
    });
  };

  const calmFrame = () => new Promise<void>((resolve) => {
    const go = () => requestAnimationFrame(() => resolve());
    const idle = (window as any).requestIdleCallback;
    if (typeof idle === 'function') idle.call(window, go, { timeout: TIDE_CALM_CAP });
    else window.setTimeout(go, TIDE_CALM_FALLBACK);
  });

  const finishEntry = () => {
    root.removeAttribute('data-craft-entry');
    transition?.classList.remove('is-opening');
    if (transition) transition.style.visibility = 'hidden';
  };

  // Sem a marca, trata-se de acesso direto/reload e a página já nasce em
  // repouso. Com ela, continuamos o gesto que começou no anel.
  if (root.dataset.craftEntry === 'armed') {
    if (reduced || !transition) {
      finishEntry();
    } else {
      void Promise.all([calmFrame(), pageRevealFinished]).then(() => {
        root.dataset.craftEntry = 'opening';
        transition.classList.add('is-opening');
        void waitForTides().then(finishEntry);
      });
    }
  }

  const closeIntoWater = async () => {
    if (!transition || reduced) return;

    document.body.classList.add('has-craft-transition');
    transition.style.visibility = '';
    transition.classList.remove('is-opening', 'is-closing');
    transition.classList.add('is-preparing-exit');

    // Materializa a pose aberta antes de pedir a fechada; sem este layout, o
    // navegador pode condensar as duas escritas e não animar nada.
    void transition.offsetWidth;
    transition.classList.add('is-closing');
    await waitForTides();
  };

  back?.addEventListener('click', async (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (leaving) return;
    leaving = true;

    await closeIntoWater();

    let home = rememberedHome;
    try {
      home ??= sessionStorage.getItem(CRAFT_HOME_KEY);
      rememberedHome = home;
      sessionStorage.setItem(CRAFT_RETURN_KEY, '1');
      sessionStorage.removeItem(CRAFT_HOME_KEY);
    } catch {}

    // Preservar o histórico permite ao BFCache devolver a cena Three.js viva.
    // Acesso direto continua com um destino explícito e seguro.
    if (home && history.length > 1) history.back();
    else location.href = home ?? '/';
  });

  // A custom Back can leave this document frozen on the final, closed water
  // sheet in BFCache. If the visitor later goes Forward, restore Craft's calm
  // page instead of reviving that already-consumed departure frame.
  window.addEventListener('pageshow', (event) => {
    if (!(event as PageTransitionEvent).persisted || !leaving) return;
    leaving = false;
    document.body.classList.remove('has-craft-transition');
    root.removeAttribute('data-craft-entry');
    transition?.classList.remove('is-opening', 'is-preparing-exit', 'is-closing');
    if (transition) transition.style.visibility = 'hidden';
  });
}
