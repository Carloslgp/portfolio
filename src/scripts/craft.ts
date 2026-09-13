import { storedMotionMode } from './motion';
import { CRAFT_HOME_KEY, CRAFT_RETURN_KEY } from './craftNavigation';
import { claimRingEntry } from './ringEntry';

/** Quanto a página espera por um quadro ocioso antes de abrir a cortina. */
const TIDE_CALM_CAP = 800;
const TIDE_CALM_FALLBACK = 420;

/** Rede de segurança para um `transitionend` perdido ou uma camada sem transição. */
const TIDE_TRANSITION_TIMEOUT = 2200;

// O desktop ainda usa o cross-fade nativo entre documentos; capture o evento
// assim que o módulo carregar para a cortina não abrir sob o snapshot. No
// mobile essa transição não existe e a promessa resolve imediatamente.
const pageRevealFinished = new Promise<void>((resolve) => {
  const usesNativeTransition = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!usesNativeTransition || !('onpagereveal' in window)) {
    resolve();
    return;
  }

  let settled = false;
  const done = () => {
    if (settled) return;
    settled = true;
    resolve();
  };

  window.addEventListener('pagereveal', (event) => {
    const nativeTransition = (event as any).viewTransition;
    if (nativeTransition) void nativeTransition.finished.catch(() => {}).then(done);
    else done();
  }, { once: true });

  // Compatibilidade para navegadores que expõem o evento mas não o disparam.
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

  // A home que abriu ESTA entrada do histórico (ver ringEntry.ts). É ela que
  // diz se o Back pode voltar pela história ou precisa ir pelo href.
  const home = claimRingEntry(CRAFT_HOME_KEY);

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

    // A volta costurada — a água fechando aqui e a home recebendo esse mesmo
    // quadro — só existe quando o ANEL abriu esta entrada e pra quem já passou
    // pelo portão da home nesta sessão.
    //
    // Sem o anel logo atrás (chegou por link, ou por um /craft reaberto pelo
    // Back de uma sala) não há de onde voltar: a home é uma chegada e nasce com
    // a descida da câmera inteira. O recado a faria nascer já assentada no
    // segmento Craft — o visitante era teleportado pra frente do anel.
    //
    // Sem escolha guardada a home ABRE de verdade, com a pergunta, e a pintura
    // que ela armaria por cima da cortina taparia justamente os botões dela: a
    // volta ficava presa na água. Então, sem escolha, nem cortina nem recado.
    if (home && mode) {
      await closeIntoWater();
      try {
        sessionStorage.setItem(CRAFT_RETURN_KEY, '1');
      } catch {}
    }

    // Preservar o histórico permite ao BFCache devolver a cena Three.js viva.
    // Sem o anel logo atrás — link direto, ou um /craft reaberto pelo Back de
    // uma sala —, o destino é explícito.
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
