// src/scripts/creations/effects.ts — as animações de cada criação, uma função
// por efeito. Todas com a mesma assinatura: recebem as PEÇAS da criação (o
// bloco, a moldura, as linhas de texto…) e as três fases em alturas de tela, e
// devolvem uma timeline que vai do nada, passa pela criação inteira parada e
// volta ao nada.
//
// Três regras que TODO efeito segue, porque a timeline é dirigida pelo scroll
// (ver main.ts) e não por um play():
//
// 1. Só fromTo, com os dois extremos escritos. Um `to` grava o valor inicial
//    na primeira vez que renderiza — e "primeira vez", numa timeline que o
//    scroll pode atravessar em qualquer ordem (um salto pelo indicador, um
//    reload no meio da página), pode acontecer em qualquer estado. Com os
//    dois extremos explícitos não há nada pra gravar errado. E a saída COMEÇA
//    exatamente onde a entrada TERMINA: a pausa de leitura entre as duas é a
//    ausência de tween, não um tween parado.
//
// 2. A entrada renderiza na hora (immediateRender: true) e a saída não. É
//    assim que cada peça já nasce no estado "antes de entrar" — a moldura do
//    grow já pequena, a cortina já fechada, o texto já apagado — sem uma
//    lista paralela de gsap.set() pra manter em dia. A saída, ao contrário,
//    NÃO pode renderizar ao nascer: o `from` dela é o estado de repouso, e
//    aplicá-lo agora desfaria o que a entrada acabou de armar.
//
// 3. Todo efeito nasce e morre em opacidade zero (frame() abaixo). É isso que
//    garante "uma criação por vez": o último quadro de uma e o primeiro da
//    seguinte são os dois papel vazio, e a timeline mestra só as encosta.
import gsap from 'gsap';
import type { Effect } from '../../data/creations';
import { EFFECTS, SCROLL } from './config';

export interface SlideParts {
  /** a criação inteira — é o que esmaece nas pontas */
  root: HTMLElement;
  /** a moldura da imagem — é o que cada efeito move */
  media: HTMLElement;
  /** as linhas de texto, na ordem da página (rótulo, título, descrição, link) */
  copy: HTMLElement[];
  /** o painel de tinta — só existe na criação com `effect: 'curtain'` */
  curtain: HTMLElement | null;
  /** as tiras — só existem na criação com `effect: 'pieces'` */
  pieces: HTMLElement[];
  /** de que lado o `slide` vem */
  from: 'left' | 'right';
}

/** As três fases em alturas de tela, já normalizadas pelo main.ts. */
export interface Phases {
  enter: number;
  hold: number;
  exit: number;
}

export type Builder = (parts: SlideParts, phases: Phases) => gsap.core.Timeline;

type Timeline = gsap.core.Timeline;

// ——— peças comuns ———

/** O esfumado do bloco inteiro nas duas pontas, e o comprimento exato da
 *  timeline. O set vazio no fim é o que fixa a duração: sem ele a timeline
 *  terminaria no último tween, e um efeito cuja saída acaba cedo ficaria mais
 *  curto que o trecho de rolagem que o main.ts reservou pra ele. */
function frame(tl: Timeline, root: HTMLElement, ph: Phases) {
  const total = ph.enter + ph.hold + ph.exit;
  const fadeIn = ph.enter * SCROLL.FADE;
  const fadeOut = ph.exit * SCROLL.FADE;
  tl.fromTo(
    root,
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: fadeIn, ease: 'none', immediateRender: true },
    0,
  );
  tl.fromTo(
    root,
    { autoAlpha: 1 },
    { autoAlpha: 0, duration: fadeOut, ease: 'none', immediateRender: false },
    total - fadeOut,
  );
  tl.set({}, {}, total);
  return total;
}

/** Quanto dura UMA linha pra `n` linhas escalonadas caberem numa janela. */
function perLine(window: number, n: number) {
  return window / (1 + EFFECTS.COPY.STAGGER * Math.max(0, n - 1));
}

/** O texto entra: linha a linha, subindo. `x` é o deslocamento lateral extra
 *  que o slide usa pra o texto vir do mesmo lado da moldura. */
function copyIn(tl: Timeline, copy: HTMLElement[], at: number, window: number, x = 0) {
  if (!copy.length) return;
  const d = perLine(window, copy.length);
  tl.fromTo(
    copy,
    { y: EFFECTS.COPY.RISE, x, opacity: 0 },
    {
      y: 0,
      x: 0,
      opacity: 1,
      duration: d,
      ease: 'power2.out',
      stagger: d * EFFECTS.COPY.STAGGER,
      immediateRender: true,
    },
    at,
  );
}

/** O texto sai: o mesmo gesto, mais curto e pra cima — sair é sempre mais
 *  rápido que chegar, porque a atenção já foi embora. */
function copyOut(tl: Timeline, copy: HTMLElement[], at: number, window: number, x = 0) {
  if (!copy.length) return;
  const d = perLine(window, copy.length);
  tl.fromTo(
    copy,
    { y: 0, x: 0, opacity: 1 },
    {
      y: -EFFECTS.COPY.RISE * 0.6,
      x,
      opacity: 0,
      duration: d,
      ease: 'power2.in',
      stagger: d * EFFECTS.COPY.STAGGER,
      immediateRender: false,
    },
    at,
  );
}

/** Onde, dentro da entrada, o texto começa — e quanto lhe sobra. */
function copyWindow(ph: Phases) {
  const at = ph.enter * EFFECTS.COPY.DELAY;
  return { at, window: ph.enter - at };
}

// ——— os efeitos ———

/** grow — a moldura cresce do centro até o tamanho, e sai encolhendo. */
const grow: Builder = ({ root, media, copy }, ph) => {
  const tl = gsap.timeline();
  frame(tl, root, ph);
  const E = ph.enter + ph.hold;

  tl.fromTo(
    media,
    { scale: EFFECTS.GROW.FROM, transformOrigin: 'center center' },
    { scale: 1, duration: ph.enter, ease: 'power2.out', immediateRender: true },
    0,
  );
  const c = copyWindow(ph);
  copyIn(tl, copy, c.at, c.window);

  tl.fromTo(
    media,
    { scale: 1 },
    { scale: EFFECTS.GROW.TO, duration: ph.exit, ease: 'power2.in', immediateRender: false },
    E,
  );
  copyOut(tl, copy, E, ph.exit * 0.6);
  return tl;
};

/** slide — a moldura vem de um lado da tela e sai pelo outro; o texto vem
 *  junto, com um deslocamento menor. */
const slide: Builder = ({ root, media, copy, from }, ph) => {
  const tl = gsap.timeline();
  frame(tl, root, ph);
  const E = ph.enter + ph.hold;
  const dir = from === 'left' ? -1 : 1;
  const far = `${EFFECTS.SLIDE.DISTANCE_VW}vw`;

  tl.fromTo(
    media,
    { x: dir > 0 ? far : `-${far}` },
    { x: 0, duration: ph.enter, ease: 'power3.out', immediateRender: true },
    0,
  );
  const c = copyWindow(ph);
  copyIn(tl, copy, c.at, c.window, dir * EFFECTS.SLIDE.COPY_SHIFT);

  tl.fromTo(
    media,
    { x: 0 },
    { x: dir > 0 ? `-${far}` : far, duration: ph.exit, ease: 'power3.in', immediateRender: false },
    E,
  );
  copyOut(tl, copy, E, ph.exit * 0.6, -dir * EFFECTS.SLIDE.COPY_SHIFT);
  return tl;
};

/** curtain — um painel de tinta cobre a tela inteira; ele sobe (a borda de
 *  baixo vai até o topo) e revela a criação já montada; na saída desce de
 *  volta a partir do topo. A imagem assenta de um leve zoom enquanto é
 *  revelada, pra revelação não ser só um recorte andando sobre algo parado. */
const curtain: Builder = ({ root, media, copy, curtain }, ph) => {
  const tl = gsap.timeline();
  frame(tl, root, ph);
  const E = ph.enter + ph.hold;
  const fadeIn = ph.enter * SCROLL.FADE;
  const fadeOut = ph.exit * SCROLL.FADE;

  if (curtain) {
    tl.fromTo(
      curtain,
      { scaleY: 1, transformOrigin: 'top center' },
      { scaleY: 0, duration: ph.enter - fadeIn, ease: 'power3.inOut', immediateRender: true },
      fadeIn,
    );
  }
  tl.fromTo(
    media,
    { scale: EFFECTS.CURTAIN.ZOOM, transformOrigin: 'center center' },
    { scale: 1, duration: ph.enter, ease: 'power2.out', immediateRender: true },
    0,
  );
  // o texto sobe enquanto ainda está por baixo do painel, e aparece já em
  // movimento conforme a borda passa por ele
  copyIn(tl, copy, ph.enter * 0.5, ph.enter * 0.5);

  if (curtain) {
    tl.fromTo(
      curtain,
      { scaleY: 0, transformOrigin: 'top center' },
      { scaleY: 1, duration: ph.exit - fadeOut, ease: 'power3.inOut', immediateRender: false },
      E,
    );
  }
  return tl;
};

/** pieces — a imagem chega em tiras verticais, alternando de cima e de
 *  baixo com um leve giro, e se encaixa do centro pra fora; na saída as tiras
 *  se soltam das bordas pro centro. */
const pieces: Builder = ({ root, copy, pieces }, ph) => {
  const tl = gsap.timeline();
  frame(tl, root, ph);
  const E = ph.enter + ph.hold;
  const { DISTANCE, TILT, STAGGER } = EFFECTS.PIECES;

  const spanIn = ph.enter * STAGGER;
  tl.fromTo(
    pieces,
    {
      yPercent: (k: number) => (k % 2 ? DISTANCE : -DISTANCE),
      rotation: (k: number) => (k % 2 ? -TILT : TILT),
      opacity: 0,
      transformOrigin: 'center center',
    },
    {
      yPercent: 0,
      rotation: 0,
      opacity: 1,
      duration: ph.enter - spanIn,
      ease: 'power3.out',
      stagger: { amount: spanIn, from: 'center' },
      immediateRender: true,
    },
    0,
  );
  const c = copyWindow(ph);
  copyIn(tl, copy, c.at, c.window);

  const spanOut = ph.exit * STAGGER;
  tl.fromTo(
    pieces,
    { yPercent: 0, rotation: 0, opacity: 1 },
    {
      yPercent: (k: number) => (k % 2 ? -DISTANCE : DISTANCE),
      rotation: (k: number) => (k % 2 ? TILT : -TILT),
      opacity: 0,
      duration: ph.exit - spanOut,
      ease: 'power3.in',
      stagger: { amount: spanOut, from: 'edges' },
      immediateRender: false,
    },
    E,
  );
  copyOut(tl, copy, E, ph.exit * 0.6);
  return tl;
};

/** iris — a criação inteira (imagem E texto) aparece por um círculo que
 *  cresce do centro da tela; na saída ele fecha. O texto não tem movimento
 *  próprio aqui de propósito: o círculo é o gesto todo.
 *
 *  Linear, e não com ease: o conteúdo ocupa só até ~metade do raio final (o
 *  resto do círculo cresce sobre papel vazio, invisível), e com uma curva
 *  suave o círculo passava por essa metade em poucos por cento da fase —
 *  ficava um ponto por um terço da entrada e de repente estava tudo aberto.
 *  Crescendo a passo constante, a abertura é visível em dois terços da fase
 *  e o último terço é o assentamento, como nos outros efeitos. */
const iris: Builder = ({ root }, ph) => {
  const tl = gsap.timeline();
  frame(tl, root, ph);
  const E = ph.enter + ph.hold;
  const closed = 'circle(0% at 50% 50%)';
  const open = `circle(${EFFECTS.IRIS.RADIUS}% at 50% 50%)`;

  tl.fromTo(
    root,
    { clipPath: closed },
    { clipPath: open, duration: ph.enter, ease: 'none', immediateRender: true },
    0,
  );
  tl.fromTo(
    root,
    { clipPath: open },
    { clipPath: closed, duration: ph.exit, ease: 'none', immediateRender: false },
    E,
  );
  return tl;
};

/** flip — a moldura entra tombada pra trás, girando ao redor da própria
 *  base, e assenta em pé; na saída tomba pra trás ao redor do topo.
 *
 *  Os sinais seguem o rotateX do CSS: ângulo POSITIVO leva a borda de cima
 *  pra longe de quem olha. Deitada pra trás com a base no chão é, portanto,
 *  +ANGLE; e pra borda de BAIXO ir pra longe (o tombo pelo topo, na saída) o
 *  ângulo é negativo. Com os sinais trocados a moldura vinha inclinada em
 *  direção à câmera — o topo maior que a base — e lia-se como "caindo em
 *  cima" da pessoa, não como algo que se levanta. */
const flip: Builder = ({ root, media, copy }, ph) => {
  const tl = gsap.timeline();
  frame(tl, root, ph);
  const E = ph.enter + ph.hold;
  const { ANGLE, PERSPECTIVE, LIFT_VH } = EFFECTS.FLIP;

  tl.fromTo(
    media,
    {
      rotationX: ANGLE,
      y: `${LIFT_VH}vh`,
      transformOrigin: 'center bottom',
      transformPerspective: PERSPECTIVE,
    },
    { rotationX: 0, y: 0, duration: ph.enter, ease: 'power3.out', immediateRender: true },
    0,
  );
  const c = copyWindow(ph);
  copyIn(tl, copy, c.at, c.window);

  tl.fromTo(
    media,
    { rotationX: 0, y: 0, transformOrigin: 'center top', transformPerspective: PERSPECTIVE },
    {
      rotationX: -ANGLE,
      y: `-${LIFT_VH}vh`,
      duration: ph.exit,
      ease: 'power3.in',
      immediateRender: false,
    },
    E,
  );
  copyOut(tl, copy, E, ph.exit * 0.6);
  return tl;
};

/** O nome que está em data/creations.ts → a função que o constrói. */
export const BUILDERS: Record<Effect, Builder> = { grow, slide, curtain, pieces, iris, flip };
