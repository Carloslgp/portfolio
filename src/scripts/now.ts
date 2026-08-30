// src/scripts/now.ts — a segunda metade da transição, e a manutenção do
// relógio da página.
//
// A primeira metade aconteceu no anel (scripts/main.ts → initNowLink) e
// terminou num quadro: a pintura do segmento subida e lavada de luz, e a hora
// de Curitiba gigante no meio da tela. Esta página NASCE nele — o CSS do
// now.astro monta esse quadro antes do primeiro pixel, a partir da marca
// `data-now-entry`.
//
// O que este arquivo faz é desfazê-lo, e a parte interessante é uma só: a hora
// gigante não some, ela POUSA. O carimbo do cabeçalho contém a mesma string, na
// mesma família, e o pouso é uma escala uniforme medida entre as duas caixas
// (ver nowNavigation.ts → clockWarp). Quando ela chega, as duas estão
// exatamente sobrepostas — o que apaga em cima já está desenhado embaixo.
//
// Medir em vez de calcular: o alvo é perguntado à tela toda vez, e por isso a
// mesma conta serve pro celular, pro monitor largo e pra janela que mudou de
// tamanho enquanto a página estava aberta.
import { storedMotionMode } from './motion';
import {
  NOW_HOME_KEY, NOW_RETURN_KEY, clockWarp, msToNextMinute, nowDate, nowTime,
} from './nowNavigation';

/** Teto da espera pela thread livre, em ms. Mesmo número e mesmo motivo da
 *  cortina da /work: num celular lento o documento leva uns 400ms pra soltar a
 *  thread, e abrir a cortina em cima de uma thread ocupada é o que faz a
 *  animação sair aos trancos. */
const CALM_CAP = 800;
const CALM_FALLBACK = 420;

/** O pouso da hora. Um pouco mais curto que a saída da pintura (1.55s no CSS):
 *  ela precisa CHEGAR antes de a cortina acabar, senão o último quadro da
 *  transição é a página já limpa com um relógio ainda voando por cima dela. */
const LAND_MS = 1300;
const LAND_EASE = 'cubic-bezier(0.2, 0.86, 0.24, 1)';

/** ——— a entrega, em duas etapas e nesta ordem ———
 *
 *  O erro anterior era o carimbo acender no meio do voo: a hora ainda estava
 *  atravessando a tela e o seu destino já estava escrito embaixo dela. Dava pra
 *  ler o horário antes de a animação chegar nele, e é isso que fazia o pouso
 *  parecer aproximado — o alvo aparecia antes do tiro.
 *
 *  Agora nada acontece até a hora PARAR. Aí:
 *
 *    1. o carimbo acende DEBAIXO dela. Não se vê: a hora está opaca, exatamente
 *       em cima, e é o mesmo desenho (ver .now-stamp-time em now.astro).
 *    2. só então ela apaga, com o carimbo já inteiro embaixo.
 *
 *  A ordem não é gosto, é aritmética. Dois textos iguais sobrepostos a 50% não
 *  somam 100% de tinta, somam 75% — um crossfade simétrico teria um mergulho de
 *  opacidade bem no instante da entrega. Com o de baixo já em 1, a cobertura
 *  fica em 1 o tempo todo e o que sai de cena é uma cópia. */
const STAMP_FADE_MS = 160;
const GIANT_FADE_MS = 180;

/** Quando a hora terminou de entregar o quadro. A cortina não pode ser
 *  desarmada antes disto: `finishEntry` devolve a hora ao repouso do CSS (que é
 *  invisível), então desarmar cedo não abrevia o apagar — corta ele. */
const CLOCK_DONE_MS = LAND_MS + STAMP_FADE_MS + GIANT_FADE_MS;

/** A saída pelo "‹ Back". Mais curta que a entrada, pelo mesmo motivo do
 *  DEPART.returnScale: a ida é uma escolha e pode demorar o tempo dela, a volta
 *  é um passo atrás e não pode arrastar. Casa com o 1.05s da pintura voltando
 *  (ver [data-now-exit='closing'] em now.astro). */
const EXIT_MS = 1050;
const EXIT_EASE = 'cubic-bezier(0.32, 0, 0.24, 1)';

export function initNow() {
  const clock = document.querySelector<HTMLElement>('[data-now-entry-clock]');
  const seam = document.querySelector<HTMLElement>('[data-now-entry-seam]');
  // duas coisas diferentes: `stamp` é a HORA do cabeçalho (o alvo medido do
  // pouso), `stampLine` é a linha inteira em que ela vive (o alvo do acender).
  const stamp = document.querySelector<HTMLElement>('[data-now-time]');
  const stampLine = document.querySelector<HTMLElement>('[data-now-stamp]');
  const back = document.querySelector<HTMLAnchorElement>('[data-now-back]');
  const root = document.documentElement;
  let leaving = false;

  const mode = storedMotionMode();
  if (mode) root.dataset.motion = mode;
  const reduced = mode === 'reduced' ||
    (!mode && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ——— o relógio ———
  //
  // O texto do primeiro quadro já foi escrito pelo script inline do now.astro,
  // que roda antes de qualquer pixel. Daqui em diante o dono é este tique, e ele
  // é agendado pra VIRADA do minuto (e não 60s corridos): assim o relógio não
  // fica devendo quase um minuto toda vez que a aba dorme e o timer atrasa.
  const tick = () => {
    const time = nowTime();
    document
      .querySelectorAll<HTMLElement>('[data-now-time], [data-now-entry-clock]')
      .forEach((el) => { el.textContent = time; });
    const date = document.querySelector<HTMLElement>('[data-now-date]');
    if (date) date.textContent = nowDate();
    window.setTimeout(tick, msToNextMinute());
  };
  // Uma leitura agora, e não só na próxima virada: entre o script inline e o
  // carregamento deste módulo pode ter passado um minuto numa rede ruim, e um
  // relógio "ao vivo" atrasado é pior que um relógio parado — este chega antes
  // de qualquer medida, então não desalinha o pouso.
  tick();

  /** Resolve quando a thread principal tem quadro sobrando — ver o comentário
   *  extenso em scripts/work.ts, que é a mesma espera pelo mesmo motivo.
   *  Esperar aqui não aparece: o que está na tela É a cortina, e ela é o mesmo
   *  quadro que a home entregou. */
  const calmFrame = () => new Promise<void>((resolve) => {
    const go = () => requestAnimationFrame(() => resolve());
    const idle = (window as any).requestIdleCallback;
    if (typeof idle === 'function') idle.call(window, go, { timeout: CALM_CAP });
    else window.setTimeout(go, CALM_FALLBACK);
  });

  /** Espera a pintura terminar de sair (ou de voltar), com teto. Sem a rede de
   *  segurança, um transitionend que não chega deixaria a cortina congelada em
   *  cima da página. */
  const waitForSeam = (timeout = 2400) => new Promise<void>((resolve) => {
    if (!seam) return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      seam.removeEventListener('transitionend', onEnd);
      resolve();
    };
    const onEnd = (event: TransitionEvent) => {
      if (event.propertyName === 'transform') finish();
    };
    seam.addEventListener('transitionend', onEnd);
    window.setTimeout(finish, timeout);
  });

  /** A transformação que põe a hora gigante EM CIMA do carimbo do cabeçalho.
   *
   *  Devolve null quando não há pouso possível: sem carimbo, sem caixa medível,
   *  ou com o carimbo fora da tela — o que acontece de verdade quando alguém
   *  rolou a página até o fim antes de clicar em "Back". Voar até um alvo
   *  invisível seria um risco atravessando a tela em direção a nada; sem alvo,
   *  quem chama resolve no fade simples. */
  const landing = () => {
    if (!clock || !stamp) return null;

    // zera antes de medir: getBoundingClientRect devolve a caixa JÁ
    // transformada, e medir por cima de um transform velho daria um destino
    // acumulado em vez do destino real
    clock.style.transition = 'none';
    clock.style.transform = '';

    const to = clock.getBoundingClientRect();
    const from = stamp.getBoundingClientRect();
    if (!to.width || !from.width) return null;
    if (from.bottom < 0 || from.top > window.innerHeight) return null;

    const warp = clockWarp(from, to);
    return `translate(-50%, -50%) translate(${warp.x}px, ${warp.y}px) scale(${warp.s})`;
  };

  const finishEntry = () => {
    root.removeAttribute('data-now-entry');
    if (clock) clock.removeAttribute('style');
    // o carimbo volta a ser texto comum: sem a marca, o `opacity: 0` do estado
    // armado já não vale, e sem o inline ele não fica preso no que a chegada
    // escreveu — o que importa pra saída, que precisa poder apagá-lo pelo CSS
    if (stampLine) stampLine.removeAttribute('style');
  };

  // ——— a chegada ———
  //
  // A marca troca de valor em vez de sair, igual à da /work: 'armed' é o quadro
  // parado que a home entregou, 'opening' é ele se desfazendo. Quem responde ao
  // segundo valor é o CSS (a pintura sobe, o conteúdo entra escalonado) e esta
  // função (a hora pousa).
  if (root.dataset.nowEntry === 'armed') {
    if (reduced) {
      finishEntry();
    } else {
      void calmFrame().then(() => {
        // medido AQUI, e não no carregamento: entre um e outro a fonte pode ter
        // chegado e mudado a caixa do carimbo
        const target = landing();

        if (clock && target) {
          clock.style.transition =
            `transform ${LAND_MS}ms ${LAND_EASE}, ` +
            `opacity ${GIANT_FADE_MS}ms linear ${LAND_MS + STAMP_FADE_MS}ms`;
          clock.style.transform = target;
          clock.style.opacity = '0';

          // o acender espera o pouso inteiro. É o atraso que conserta o defeito
          // descrito lá em cima, e ele é escrito daqui, e não do CSS, porque o
          // número que ele tem que respeitar (LAND_MS) mora aqui — dois arquivos
          // descrevendo o mesmo instante são duas chances de ele divergir.
          if (stampLine) {
            stampLine.style.transition = `opacity ${STAMP_FADE_MS}ms ease ${LAND_MS}ms`;
            stampLine.style.opacity = '1';
          }
        } else {
          // sem pouso possível (ver `landing`): a hora só apaga onde está e o
          // carimbo acende sozinho, sem esperar por um encontro que não vai ter
          if (clock) {
            clock.style.transition = `opacity ${GIANT_FADE_MS}ms ease`;
            clock.style.opacity = '0';
          }
          if (stampLine) {
            stampLine.style.transition = `opacity ${STAMP_FADE_MS}ms ease`;
            stampLine.style.opacity = '1';
          }
        }

        root.dataset.nowEntry = 'opening';

        // as DUAS pontas: a pintura saindo e a hora entregando. Antes só a
        // pintura era esperada, e como ela termina em 1.15s contra os 1.35s da
        // hora, o desarme cortava o apagar dela pelo meio — funcionava por
        // pouco, e deixaria de funcionar no primeiro ajuste de tempo.
        void Promise.all([
          waitForSeam(),
          new Promise<void>((done) => window.setTimeout(done, CLOCK_DONE_MS)),
        ]).then(finishEntry);
      });
    }
  }

  // ——— a saída ———
  //
  // A mesma cortina, ao contrário: a hora sai do carimbo e volta a crescer até
  // o meio da tela, a pintura desce de volta ao quadro que a home sabe receber,
  // e o conteúdo apaga. Do outro lado, a home rebobina o avanço a partir daí
  // (ver initNowLink → returnToRing).
  const closeIntoSky = async () => {
    if (reduced || !seam) return;

    // A pose de PARTIDA, medida agora e não guardada da chegada: a janela pode
    // ter mudado de tamanho, e quem entrou por link direto nunca teve pouso
    // nenhum pra reaproveitar.
    const landed = landing();
    if (clock) {
      clock.style.transition = 'none';
      clock.style.transform = landed ?? 'translate(-50%, -50%)';
      clock.style.opacity = '0';
    }

    root.dataset.nowExit = 'armed';
    // Um layout entre a pose de partida e a de chegada. Sem ele o navegador vê
    // só o estado final e não há transição nenhuma — é o mesmo empurrão que a
    // saída da /work dá antes de fechar as folhas.
    void document.body.offsetWidth;

    if (clock) {
      clock.style.transition =
        `transform ${EXIT_MS}ms ${EXIT_EASE}, opacity 400ms ease`;
      clock.style.transform = 'translate(-50%, -50%)';
      clock.style.opacity = '1';
    }
    root.dataset.nowExit = 'closing';

    await waitForSeam();
  };

  back?.addEventListener('click', async (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || leaving) return;
    event.preventDefault();
    leaving = true;

    await closeIntoSky();

    let home: string | null = null;
    try {
      home = sessionStorage.getItem(NOW_HOME_KEY);
      sessionStorage.setItem(NOW_RETURN_KEY, '1');
      sessionStorage.removeItem(NOW_HOME_KEY);
    } catch {}

    // Quando a origem é o anel, voltar no HISTÓRICO é o que permite ao
    // navegador restaurar a cena Three.js viva pelo BFCache — e aí a home
    // rebobina o avanço em vez de reconstruí-lo. Link direto continua tendo um
    // destino seguro e explícito.
    if (home && history.length > 1) history.back();
    else location.href = home ?? '/';
  });
}
