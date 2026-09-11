// src/scripts/creations/main.ts — a rolagem da Coleção de Criações.
//
// O que esta página promete é que o scroll É a linha do tempo: rolar devagar
// anda devagar, parar no meio para no meio, voltar desanda. Nada dispara e
// roda sozinho (a entrada é a exceção, e acontece antes de haver o que
// rolar). Daí a arquitetura:
//
//   • UM palco de tela cheia, preso (pin) pelo total da sequência — abertura
//     mais as criações. Um pin só: a inversão é robusta por construção, "ir
//     direto pra criação 5" é uma conta (timing.ts), e não há espaçadores de
//     pin se acumulando no iOS.
//   • UMA timeline mestra, pausada, com a saída da abertura (opening.ts) e as
//     criações em fila (effects.ts), e o ScrollTrigger com `scrub` mapeando a
//     posição do scroll pro tempo dela. 1 segundo de timeline = 1 altura de
//     tela de rolagem.
//   • Atrás de tudo, o canva de fotos (field.ts) e o indicador (nav.ts) são
//     função do tempo DA MESTRA — e não do progresso do trigger, que com o
//     scrub numérico corre na frente da imagem.
//   • A rolagem é suavizada por um Lenis próprio desta página no desktop (ver
//     smooth.ts); no toque ela é a nativa. O Lenis move o próprio window, então
//     o ScrollTrigger lê o window direto.
//
// A decisão "palco ou versão simples" NÃO é tomada aqui: é do script inline
// no <head> da página, antes do primeiro paint. Aqui só se confirma: se a
// marca não é 'stage', liga-se o indicador da versão simples e nada mais. E se
// o palco falhar ao montar, a página volta pra versão simples em vez de ficar
// presa num estado pela metade.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Effect } from '../../data/creations';
import { viewportSize } from '../viewport';
import { JUMP, RESTORE, SCROLL, STATIC } from './config';
import { DOCKING, slideTimeline, type SlideParts } from './effects';
import { createField } from './field';
import { prepararEntrada } from './intro';
import { createIndicator } from './nav';
import { closingTimeline, heroTimeline } from './opening';
import { createSmooth, type Smooth } from './smooth';
import { timing, type Timing } from './timing';
import { EASE, revertSplits, splitHeading } from './type';

gsap.registerPlugin(ScrollTrigger);

const pad = (n: number) => String(n).padStart(2, '0');
const inOutSine = (x: number) => 0.5 - Math.cos(Math.PI * x) / 2;
const outCubic = (x: number) => 1 - (1 - x) ** 3;

export function initCreations() {
  const html = document.documentElement;
  const stage = document.querySelector<HTMLElement>('[data-cc-stage]');
  const hero = document.querySelector<HTMLElement>('[data-cc-hero]');
  const slides = [...document.querySelectorAll<HTMLElement>('[data-cc-slide]')];
  const nav = document.querySelector<HTMLElement>('[data-cc-nav]');
  const items = [...document.querySelectorAll<HTMLAnchorElement>('[data-cc-nav-item]')];
  const closing = document.querySelector<HTMLElement>('[data-cc-closing-inner]');
  if (!stage || !hero || !slides.length) return;

  // quem aquece as fotos é o palco; a versão simples não tem o que aquecer
  let onActive: (index: number) => void = () => {};
  const indicator = createIndicator({
    nav,
    items,
    sr: document.querySelector<HTMLElement>('[data-cc-nav-current]'),
    roll: document.querySelector<HTMLElement>('[data-cc-roll]'),
    onActive: (i) => onActive(i),
  });

  // ——— a versão simples ———
  //
  // As criações são blocos empilhados e a página rola normalmente. O que
  // resta ao script é dizer qual está na tela: uma faixa fina no meio do
  // viewport, e quem a cruza é a ativa. Os traços do indicador são âncoras
  // de verdade (#criacao-NN), então o salto é do navegador.
  const staticMode = () => {
    const margin = ((1 - STATIC.ACTIVE_BAND) / 2) * 100;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          indicator.still(slides.indexOf(entry.target as HTMLElement));
        }
      },
      { rootMargin: `-${margin}% 0px -${margin}% 0px` },
    );
    slides.forEach((slide) => io.observe(slide));
  };

  if (html.dataset.creations !== 'stage') {
    staticMode();
    return;
  }

  // numa caixa, e não numa variável solta: quem a preenche é o stageMode, e
  // o TypeScript não enxerga a atribuição dentro dele no catch abaixo
  const held: { smooth: Smooth | null } = { smooth: null };
  try {
    stageMode();
  } catch (err) {
    // O palco não montou (um efeito desconhecido, uma peça que faltou no
    // markup, um navegador sem algo que o GSAP pediu). Melhor a lista
    // empilhada do que uma tela presa mostrando nada: desfaz tudo que o GSAP
    // e o SplitText já escreveram — só as propriedades que eles tocam,
    // porque o `--ratio` da moldura também é inline e precisa ficar.
    console.warn('[creations] stage unavailable — falling back to the stacked layout', err);
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill(true));
    held.smooth?.destroy();
    revertSplits();
    const touched = [
      ...stage.querySelectorAll('*'),
      ...(closing ? [closing, ...closing.querySelectorAll('*')] : []),
      ...(nav ? [nav] : []),
    ];
    gsap.set(touched, {
      clearProps: 'transform,opacity,visibility,clipPath,transformOrigin,perspective,width,--in,--out,--gap,--dock,--exit-a,--intro-title,--intro-rest,--nav-alpha,--nav-out',
    });
    html.classList.remove('is-intro');
    html.dataset.creations = 'static';
    staticMode();
  }

  function stageMode() {
    if (!stage || !hero) return;

    // A barra de endereço do celular encolhe e cresce ao rolar; sem o
    // ignoreMobileResize o ScrollTrigger recalcularia tudo a cada mudança.
    // E o refresh só acontece em resize e visibilidade, e não no 'load': a
    // geometria do pin não depende de imagem nem de fonte, e um refresh no
    // meio da fita era um tranco. O refresh que importa é o explícito, lá
    // embaixo, ANTES do primeiro quadro da entrada.
    ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,resize' });

    const T = timing(slides.length);

    // os títulos são divididos ANTES de as timelines serem montadas: elas
    // guardam referência às palavras
    const parts = slides.map((slide, i) => {
      const p = partsOf(slide, i);
      if (!(p.effect in DOCKING)) throw new Error(`unknown effect "${p.effect}" on creation ${pad(i + 1)}`);
      return p;
    });

    const master = gsap.timeline({ paused: true });
    master.add(heroTimeline(hero, T.H), 0);
    parts.forEach((p, i) => master.add(slideTimeline(p, T.phases), T.start(i)));
    master.set({}, {}, T.total);

    const field = stage.querySelector<HTMLElement>('[data-cc-field]');
    const driver = field
      ? createField({
          field,
          cards: [...field.querySelectorAll<HTMLElement>('[data-cc-card]')],
          featured: [...field.querySelectorAll<HTMLElement>('[data-cc-featured]')],
          frames: parts.map((p) => p.frame),
          // o vão entre as linhas do título: é a caixa em que a fita da
          // abertura corre, e o motor a mede como mede as molduras
          ribbon: hero.querySelector<HTMLElement>('[data-cc-ribbon]'),
          timing: T,
        })
      : null;
    driver?.measure();

    held.smooth = createSmooth();
    const lenis = held.smooth?.lenis ?? null;

    // ——— aquecer as fotos ———
    //
    // Decodificar a foto no tamanho natural ANTES do encaixe. Crescendo, o
    // Chrome decodificava a mesma foto 3–4 vezes (medido) — bem na hora em
    // que ela chega. Só a atual e a próxima (ver SCROLL.DECODE_AHEAD).
    const fotos = parts.map((_, k) => stage.querySelector<HTMLImageElement>(`[data-cc-featured="${k}"] img`));
    const aquecidas = new Set<number>();
    const aquecer = (k: number) => {
      const img = fotos[k];
      if (!img || aquecidas.has(k)) return;
      aquecidas.add(k);
      img.decode?.().catch(() => aquecidas.delete(k));
    };
    onActive = (i) => {
      for (let k = Math.max(0, i); k <= i + SCROLL.DECODE_AHEAD; k++) aquecer(k);
    };

    const render = () => {
      const t = master.time();
      driver?.apply(t);
      indicator.at(t, T);
      nav?.classList.toggle('is-done', t >= T.total - 1e-4);
    };
    master.eventCallback('onUpdate', render);

    // ——— voltar pro mesmo quadro ———
    //
    // A página cuida da própria restauração: a do navegador acontecia antes
    // de o pin existir, numa página ainda curta, e caía no lugar errado. A
    // posição vai em TELAS (sobrevive a uma janela redimensionada). Um link
    // #criacao-NN leva à pausa daquela criação.
    try {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    } catch {}
    const resumeAt = pontoDeRetorno(T);
    if (resumeAt === null) window.scrollTo(0, 0);

    const intro =
      resumeAt === null && driver
        ? prepararEntrada({
            driver,
            html,
            hero,
            lenis,
            onPause: () => {
              aquecer(0);
              aquecer(1);
            },
          })
        : null;

    const scrub = lenis ? SCROLL.SCRUB : SCROLL.SCRUB_TOUCH;
    const trigger = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      // função, e não número: a altura da tela muda (giro do celular, janela
      // redimensionada) e o invalidateOnRefresh refaz a conta e os tweens junto
      end: () => `+=${Math.round(T.total * viewportSize().height)}`,
      pin: true,
      // com o Lenis a rolagem e o update caem no mesmo tique, e antecipar o
      // pin só o faria pular; no toque nativo ele ainda vale
      anticipatePin: lenis ? 0 : 1,
      scrub,
      animation: master,
      invalidateOnRefresh: true,
      onRefresh: () => {
        // a tela mudou (giro, janela): as molduras estão em outro lugar
        driver?.measure();
        render();
      },
    });

    if (closing) closingTimeline(closing, scrub);

    const toTop = (t: number) => trigger.start + (t / T.total) * (trigger.end - trigger.start);

    /** Leva a página a um ponto sem atravessar o caminho — nem o de uma
     *  rolagem suave em curso, nem o do scrub, que sem o progress(1)
     *  atravessaria as criações do meio em câmera rápida. */
    const cutY = (y: number) => {
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
      ScrollTrigger.update();
      trigger.getTween()?.progress(1);
    };
    const cut = (t: number) => cutY(toTop(t));

    // ——— os saltos pelo indicador ———
    //
    // Perto (até JUMP.GLIDE_MAX criações): a página DESLIZA até lá e o
    // encaixe se vê de verdade — o salto é a própria página, mais depressa.
    // Longe: uma folha de papel com o número da criação cobre a troca, a
    // página pousa perto do destino debaixo dela e termina o encaixe à vista.
    // É uma transição de interface no relógio, mas o quadro de chegada é o
    // mesmo de quem rolasse até lá. O foco vai pro título da criação, pra
    // quem navega por teclado não perder o lugar.
    const veil = document.querySelector<HTMLElement>('[data-cc-veil]');
    const veilNum = document.querySelector<HTMLElement>('[data-cc-veil-num]');
    const titles = parts.map((p) => p.title);
    let jumping = false;
    const goTo = (t: number, i?: number) => {
      if (jumping) return;
      const focus = () => {
        if (i !== undefined) titles[i]?.focus({ preventScroll: true });
      };
      const dist = Math.abs(t - master.time()) / T.SPC;
      if (lenis && dist <= JUMP.GLIDE_MAX) {
        lenis.scrollTo(toTop(t), {
          duration: JUMP.GLIDE_SECONDS * Math.max(0.5, dist),
          easing: inOutSine,
          onComplete: focus,
        });
        return;
      }
      if (!veil || !veilNum) {
        cut(t);
        focus();
        return;
      }
      jumping = true;
      lenis?.stop();
      veilNum.textContent = i !== undefined ? pad(i + 1) : '';
      const land = lenis && i !== undefined ? T.start(i) + T.phases.enter * JUMP.ARRIVE_FROM : t;
      gsap
        .timeline({
          onComplete: () => {
            jumping = false;
            focus();
          },
        })
        .fromTo(veil, { autoAlpha: 0 }, { autoAlpha: 1, duration: JUMP.VEIL_IN, ease: EASE.WASH })
        .fromTo(
          veilNum,
          { yPercent: JUMP.NUM_RISE, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: JUMP.VEIL_IN, ease: EASE.INK },
          JUMP.NUM_DELAY,
        )
        .add(() => {
          lenis?.start();
          cut(land);
          if (lenis && land !== t) {
            lenis.scrollTo(toTop(t), { duration: JUMP.ARRIVE_SECONDS, easing: outCubic });
          }
        }, `+=${JUMP.VEIL_HOLD}`)
        .to(veilNum, { yPercent: -JUMP.NUM_LIFT, opacity: 0, duration: JUMP.NUM_OUT, ease: EASE.LIFT })
        .to(veil, { autoAlpha: 0, duration: JUMP.VEIL_OUT, ease: EASE.WASH }, `<${JUMP.OUT_OVERLAP}`);
    };

    // O href (#criacao-NN) continua lá pra quem abre em nova aba ou copia o
    // link — por isso os modificadores passam direto.
    items.forEach((item, i) => {
      item.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        goTo(T.holdOf(i), i);
      });
    });

    window.addEventListener('pagehide', () => {
      try {
        sessionStorage.setItem(RESTORE.KEY, (window.scrollY / viewportSize().height).toFixed(4));
      } catch {}
    });
    // voltando pela bfcache a página volta inteira, mas o Lenis e o
    // ScrollTrigger precisam reler onde estão
    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      lenis?.resize();
      ScrollTrigger.update();
    });

    // O custo de criar o pin cai AQUI, antes do primeiro quadro da fita — e
    // não no fim dela, quando a página convida a rolar.
    ScrollTrigger.refresh();

    if (intro) {
      requestAnimationFrame(() => intro.play());
    } else {
      driver?.setIntro(1);
      html.classList.add('is-intro-done');
      if (resumeAt !== null) {
        if (resumeAt.kind === 'time') cut(resumeAt.value);
        else cutY(resumeAt.value * viewportSize().height);
      }
      render();
    }
  }
}

/** Pra onde a página volta ao carregar, se não for o topo: a pausa de uma
 *  criação (link #criacao-NN) ou a posição guardada ao sair (reload, voltar
 *  do histórico), em telas. */
function pontoDeRetorno(T: Timing): { kind: 'time' | 'screens'; value: number } | null {
  const deep = /^#criacao-(\d{2})$/.exec(location.hash);
  if (deep) {
    const i = Number(deep[1]) - 1;
    if (i >= 0 && i < T.n) return { kind: 'time', value: T.holdOf(i) };
  }
  try {
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (entry && (entry.type === 'reload' || entry.type === 'back_forward')) {
      const saved = Number(sessionStorage.getItem(RESTORE.KEY));
      if (Number.isFinite(saved) && saved > RESTORE.MIN_T) return { kind: 'screens', value: saved };
    }
  } catch {}
  return null;
}

/** As peças de uma criação, achadas pelos data-attributes do markup. A
 *  moldura é obrigatória — é nela que a foto do canva se encaixa, e é melhor
 *  falhar aqui (e cair na versão simples) do que encaixar em `null`. O título
 *  é dividido em palavras aqui (ver type.ts). */
function partsOf(slide: HTMLElement, index: number): SlideParts & { frame: HTMLElement; title: HTMLElement | null } {
  const q = (sel: string) => slide.querySelector<HTMLElement>(sel);
  const frame = q('[data-cc-media]');
  if (!frame) throw new Error(`creation "${slide.id}" has no [data-cc-media]`);
  const title = q('[data-cc-title]');
  return {
    root: slide,
    frame,
    title,
    copyBox: q('[data-cc-copy]'),
    kicker: q('[data-cc-kicker]'),
    words: title ? splitHeading(title) : [],
    desc: q('[data-cc-desc]'),
    link: q('[data-cc-link]'),
    folio: document.querySelector<HTMLElement>(`[data-cc-folio="${index}"]`),
    effect: slide.dataset.effect as Effect,
    from: slide.dataset.from === 'left' ? 'left' : 'right',
  };
}
