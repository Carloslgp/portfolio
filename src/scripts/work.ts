import { storedMotionMode } from './motion';
import { WORK_HOME_KEY, WORK_RETURN_KEY } from './workNavigation';
import { claimRingEntry } from './ringEntry';
import { viewportSize } from './viewport';

/** Teto da espera pela thread livre, em ms (ver calmFrame). Escolhido pelo que
 *  se mediu: o carregamento da /work num celular lento leva uns 400ms para
 *  soltar a thread, e o dobro disso ainda é uma pausa que se lê como o pouso da
 *  pintura, não como travamento. */
const CURTAIN_CALM_CAP = 800;

/** O mesmo, para quem não tem requestIdleCallback (Safari antigo): sem a
 *  pergunta, resta esperar o tempo típico. */
const CURTAIN_CALM_FALLBACK = 420;

/** A que distância do fim, em px, a seta da dobra já não aponta pra nada. Um
 *  punhado de pixels e não zero: a rolagem é fracionária (zoom, dpr não
 *  inteiro) e o fim costuma parar a meio pixel do alvo — com zero, a seta fica
 *  acesa pra sempre numa página que já acabou. */
const HINT_END = 24;

export function initWork() {
  const transition = document.querySelector<HTMLElement>('[data-work-transition]');
  const back = document.querySelector<HTMLAnchorElement>('[data-work-back]');
  const hint = document.querySelector<HTMLElement>('[data-work-hint]');
  let leaving = false;

  // A home que abriu ESTA entrada do histórico (ver ringEntry.ts): decide se o
  // Back volta pela história ou pelo href.
  const home = claimRingEntry(WORK_HOME_KEY);

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

  // ——— a seta da dobra ———
  //
  // Ela responde ao ESTADO ("ainda falta página"), não a um gesto já feito: some
  // ao chegar no fim e volta se a página crescer de novo — o que acontece de
  // verdade aqui, porque trocar de aba troca a altura do rail.
  //
  // Sem Lenis nesta página (ela não carrega o main.ts), então a medida é a
  // nativa mesmo.
  const syncHint = () => {
    const doc = document.documentElement;
    const left = doc.scrollHeight - viewportSize().height - window.scrollY;
    hint?.classList.toggle('is-gone', left <= HINT_END);
  };

  if (hint) {
    syncHint();
    window.addEventListener('scroll', syncHint, { passive: true });
    // a altura do documento muda sem ninguém rolar: a troca de aba, a fonte que
    // chega depois do primeiro layout, o giro do celular
    new ResizeObserver(syncHint).observe(document.body);
  }

  back?.addEventListener('click', async (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || leaving) return;
    event.preventDefault();
    leaving = true;

    // A volta costurada só existe pra quem já passou pelo portão da home nesta
    // sessão — mesmo motivo do /craft (ver craft.ts): sem escolha guardada a
    // home pergunta, e a pintura armada por cima da cortina taparia a pergunta.
    if (mode) {
      await closeIntoPainting();
      try {
        sessionStorage.setItem(WORK_RETURN_KEY, '1');
      } catch {}
    }

    // Quando a origem é o anel, voltar no histórico permite ao navegador
    // restaurar a cena Three.js viva pelo BFCache. Link direto continua tendo
    // um destino seguro e explícito.
    if (home && history.length > 1) history.back();
    else location.href = home ?? '/';
  });
}
