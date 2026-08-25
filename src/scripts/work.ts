import { storedMotionMode } from './motion';
import { WORK_HOME_KEY, WORK_RETURN_KEY } from './workNavigation';

/** Teto da espera pela thread livre, em ms (ver calmFrame). Escolhido pelo que
 *  se mediu: o carregamento da /work num celular lento leva uns 400ms para
 *  soltar a thread, e o dobro disso ainda é uma pausa que se lê como o pouso da
 *  pintura, não como travamento. */
const CURTAIN_CALM_CAP = 800;

/** O mesmo, para quem não tem requestIdleCallback (Safari antigo): sem a
 *  pergunta, resta esperar o tempo típico. */
const CURTAIN_CALM_FALLBACK = 420;

export function initWork() {
  const dialogs = document.querySelectorAll<HTMLDialogElement>('[data-work-dialog]');
  const transition = document.querySelector<HTMLElement>('[data-work-transition]');
  const back = document.querySelector<HTMLAnchorElement>('[data-work-back]');
  let opener: HTMLElement | null = null;
  let leaving = false;

  const mode = storedMotionMode();
  if (mode) document.documentElement.dataset.motion = mode;
  const reduced = mode === 'reduced' ||
    (!mode && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // A cortina dura mais que antes de propósito (ver --open-dur em work.astro),
  // e a rede de segurança tem que caber a duração inteira: cortá-la no meio
  // deixaria a folha congelada em cima da página.
  const waitForPanel = (timeout = 1600) => {
    const panel = transition?.querySelector<HTMLElement>('.work-transition-panel');
    if (!panel) return Promise.resolve();

    return new Promise<void>((resolve) => {
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        panel.removeEventListener('transitionend', onEnd);
        resolve();
      };
      const onEnd = (event: TransitionEvent) => {
        if (event.propertyName === 'transform') done();
      };
      panel.addEventListener('transitionend', onEnd);
      window.setTimeout(done, timeout);
    });
  };

  const finishEntry = () => {
    document.documentElement.removeAttribute('data-work-entry');
    transition?.classList.remove('is-opening');
    if (transition) transition.style.visibility = 'hidden';
  };

  /** Resolve quando a thread principal tem quadro sobrando.
   *
   *  A cortina abria num `requestAnimationFrame` logo depois do bundle rodar, e
   *  isso é o PIOR instante possível: o documento ainda está avaliando script,
   *  aplicando a fonte e decodificando os logos da lista. Medindo num celular
   *  emulado (CPU 6x), os primeiros ~400ms do documento têm quadros de 50 a
   *  80ms — e eles continuam lá com a cortina ESCONDIDA, então não é a
   *  animação que custa: ela é que estava sendo posta em cima de uma thread
   *  ocupada. Daí a abertura sair aos trancos no celular e lisa no desktop.
   *
   *  requestIdleCallback é exatamente a pergunta certa ("sobrou quadro?"), e o
   *  timeout é o teto: numa rede ruim a página pode nunca ficar ociosa, e é
   *  melhor abrir com tranco do que não abrir. Esperar aqui não aparece — a
   *  pintura cobrindo a tela É a cortina, e ela é o mesmo quadro que a home
   *  entregou. */
  const calmFrame = () => new Promise<void>((resolve) => {
    const go = () => requestAnimationFrame(() => resolve());
    // chamada PELO window: solta da dona, a função joga "Illegal invocation"
    const idle = (window as any).requestIdleCallback;
    if (typeof idle === 'function') idle.call(window, go, { timeout: CURTAIN_CALM_CAP });
    else window.setTimeout(go, CURTAIN_CALM_FALLBACK);
  });

  // A primeira metade aconteceu no anel. Aqui a pintura se parte ao meio e
  // revela a lista — sem marcador (link direto ou reload), nada é encenado.
  //
  // A marca troca de valor em vez de sair: 'armed' é o quadro parado que a home
  // entregou, 'opening' é ele se abrindo. Quem responde ao segundo valor é o
  // CONTEÚDO (ver work.astro), que entra escalonado com a cortina ainda quase
  // fechada — antes ele já estava montado por baixo e a abertura só o
  // descobria, então o movimento morria na borda das folhas.
  if (document.documentElement.dataset.workEntry === 'armed') {
    if (reduced || !transition) {
      finishEntry();
    } else {
      void calmFrame().then(() => {
        document.documentElement.dataset.workEntry = 'opening';
        transition.classList.add('is-opening');
        void waitForPanel().then(finishEntry);
      });
    }
  }

  const closeIntoPainting = async () => {
    if (!transition || reduced) return;
    document.body.classList.add('has-work-transition');
    transition.style.visibility = '';
    transition.classList.remove('is-opening', 'is-closing');
    transition.classList.add('is-preparing-exit');
    // Um layout entre o estado aberto e o fechado é o que dá às folhas um
    // ponto de partida real. Sem ele o navegador vê só o estado final.
    void transition.offsetWidth;
    transition.classList.add('is-closing');
    await waitForPanel();
  };

  back?.addEventListener('click', async (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || leaving) return;
    event.preventDefault();
    leaving = true;

    await closeIntoPainting();

    let home: string | null = null;
    try {
      home = sessionStorage.getItem(WORK_HOME_KEY);
      sessionStorage.setItem(WORK_RETURN_KEY, '1');
      sessionStorage.removeItem(WORK_HOME_KEY);
    } catch {}

    // Quando a origem é o anel, voltar no histórico permite ao navegador
    // restaurar a cena Three.js viva pelo BFCache. Link direto continua tendo
    // um destino seguro e explícito.
    if (home && history.length > 1) history.back();
    else location.href = home ?? '/';
  });

  const unlockPage = () => {
    document.body.classList.remove('has-work-dialog');
    opener?.focus();
    opener = null;
  };

  document.querySelectorAll<HTMLElement>('[data-dialog-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialogId = button.dataset.dialogOpen;
      if (!dialogId) return;

      const dialog = document.getElementById(dialogId);
      if (!(dialog instanceof HTMLDialogElement)) return;

      opener = button;
      document.body.classList.add('has-work-dialog');
      dialog.showModal();
    });
  });

  dialogs.forEach((dialog) => {
    dialog.querySelector<HTMLElement>('[data-dialog-close]')?.addEventListener('click', () => {
      dialog.close();
    });

    dialog.addEventListener('click', (event) => {
      const bounds = dialog.getBoundingClientRect();
      const clickedOutside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;

      if (clickedOutside) dialog.close();
    });

    dialog.addEventListener('close', unlockPage);
    dialog.addEventListener('cancel', () => {
      document.body.classList.remove('has-work-dialog');
    });
  });

  window.addEventListener('pagehide', () => {
    dialogs.forEach((dialog) => {
      if (dialog.open) dialog.close();
    });
  }, { once: true });
}
