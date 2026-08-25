import { storedMotionMode } from './motion';
import { WORK_HOME_KEY, WORK_RETURN_KEY } from './workNavigation';

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

  const waitForPanel = (timeout = 1000) => {
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

  // A primeira metade aconteceu no anel. Aqui a pintura se parte ao meio e
  // revela a lista — sem marcador (link direto ou reload), nada é encenado.
  if (document.documentElement.dataset.workEntry === 'armed') {
    if (reduced || !transition) {
      finishEntry();
    } else {
      requestAnimationFrame(() => {
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
