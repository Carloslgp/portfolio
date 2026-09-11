// src/scripts/creations/effects.ts — o que acontece com o TEXTO de cada
// criação, e a tabela de como a foto dela se ENCAIXA vindo do canva.
//
// A foto não é animada aqui. Ela já está no canva de fundo como miniatura e
// sobe com ele; o field.ts a leva até a moldura como função do tempo de
// rolagem (o "encaixe"), consultando a tabela DOCKING abaixo pra saber de
// onde a miniatura parte e que giro, dobradiça, arco ou recorte acompanha o
// caminho. O que este arquivo anima com o GSAP é o texto, o fólio e o
// esmaecer do bloco da criação — que é o que garante "uma por vez".
//
// Regras dos tweens (as mesmas do resto da página): só fromTo, com os dois
// extremos escritos; a entrada renderiza na hora e a saída não. E um dono por
// propriedade por elemento: o bloco do texto (copyBox) é dono do `y` da deriva
// e do `x` do slide; as palavras, o rótulo, a descrição e o link são donos
// das próprias propriedades.
import gsap from 'gsap';
import type { Effect } from '../../data/creations';
import { viewportSize } from '../viewport';
import { DOCK, EFFECTS, HOLD, SCROLL, TYPE } from './config';
import type { Phases } from './timing';
import { EASE, WASH } from './type';

export type { Phases } from './timing';

export interface SlideParts {
  /** a criação inteira — é o que liga e desliga nas pontas */
  root: HTMLElement;
  /** o bloco do texto: deriva junto com a foto (ver HOLD.CRUISE) */
  copyBox: HTMLElement | null;
  kicker: HTMLElement | null;
  /** as palavras do título, já divididas (ver type.ts) */
  words: HTMLElement[];
  desc: HTMLElement | null;
  link: HTMLElement | null;
  /** o número gigante no plano do canva (ver TYPE.FOLIO) */
  folio: HTMLElement | null;
  effect: Effect;
  /** de que lado o `slide` vem */
  from: 'left' | 'right';
}

type Timeline = gsap.core.Timeline;
type Window = readonly [number, number];

/** Liga e desliga o bloco nas duas pontas, e fixa o comprimento exato da
 *  timeline (o set vazio no fim). O fade é curtíssimo (SCROLL.FADE): quem
 *  revela o texto são as máscaras, não a opacidade do bloco. */
function frame(tl: Timeline, root: HTMLElement, ph: Phases) {
  const total = ph.enter + ph.hold + ph.exit;
  const fadeIn = ph.enter * SCROLL.FADE;
  const fadeOut = ph.exit * SCROLL.FADE;
  tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: fadeIn, ease: 'none', immediateRender: true }, 0);
  tl.fromTo(
    root,
    { autoAlpha: 1 },
    { autoAlpha: 0, duration: fadeOut, ease: 'none', immediateRender: false },
    total - fadeOut,
  );
  tl.set({}, {}, total);
}

/** Uma janela [início, duração] em frações de uma fase que começa em `base`
 *  e dura `len`. */
const win = (w: Window, base: number, len: number) => ({ at: base + w[0] * len, dur: w[1] * len });

/** Quanto dura UM item pra `n` itens escalonados caberem numa janela. */
const perItem = (window: number, n: number, stagger: number) =>
  window / (1 + stagger * Math.max(0, n - 1));

// O recorte das varreduras. Tudo em % (o GSAP interpola número a número e as
// unidades têm que bater), e com sobra de 40% em cima e embaixo e 8% dos
// lados: sem ela o recorte cortaria os descendentes, o sublinhado do link e a
// sombra do texto na composição `full`. Escondido, a borda direita do recorte
// fica na esquerda da sobra (-8%), e não em 0 — senão a sobra aparecia.
const CLIP_HIDDEN = 'inset(-40% 108% -40% -8%)';
const CLIP_SHOWN = 'inset(-40% -8% -40% -8%)';
const CLIP_GONE = 'inset(-40% -8% -40% 108%)';

/** O texto de uma criação, e a deriva dele. */
export function slideTimeline(p: SlideParts, ph: Phases): Timeline {
  const tl = gsap.timeline();
  frame(tl, p.root, ph);

  const E = ph.enter;
  const X0 = ph.enter + ph.hold;
  const X = ph.exit;
  const span = E + ph.hold + X;
  const vh = () => viewportSize().height;

  // A DERIVA: o bloco do texto sobe devagar a criação inteira, com a MESMA
  // função que a moldura usa no field.ts (zero no meio da pausa). Os valores
  // são funções pra o invalidateOnRefresh refazer a conta quando a tela muda
  // — e em px do viewport medido, e não em vh, porque no iOS o vh e o
  // --viewport-h divergem com a barra de endereço.
  if (p.copyBox) {
    const mid = E + ph.hold / 2;
    tl.fromTo(
      p.copyBox,
      { y: () => HOLD.CRUISE * mid * vh() },
      { y: () => -HOLD.CRUISE * (span - mid) * vh(), duration: span, ease: 'none', immediateRender: true },
      0,
    );

    // no `slide` o texto vem do mesmo lado que a foto, e sai pro outro
    if (p.effect === 'slide') {
      const shift = (p.from === 'left' ? -1 : 1) * EFFECTS.SLIDE.COPY_SHIFT;
      const a = TYPE.KICKER.IN[0] * E;
      const b = (TYPE.TITLE.IN[0] + TYPE.TITLE.IN[1]) * E;
      tl.fromTo(p.copyBox, { x: shift }, { x: 0, duration: b - a, ease: EASE.INK, immediateRender: true }, a);
      tl.fromTo(
        p.copyBox,
        { x: 0 },
        { x: -shift, duration: TYPE.COPY_GONE_BY * X, ease: EASE.LIFT, immediateRender: false },
        X0,
      );
    }
  }

  // o título: cada palavra sobe de dentro da própria máscara, e na saída
  // continua subindo — pra frente se lê como virar a página, pra trás como
  // rebobinar
  if (p.words.length) {
    const n = p.words.length;
    const T = TYPE.TITLE;
    const wi = win(T.IN, 0, E);
    const d = perItem(wi.dur, n, T.STAGGER);
    tl.fromTo(
      p.words,
      { yPercent: T.RISE, rotate: T.TILT, transformOrigin: '0% 100%' },
      { yPercent: 0, rotate: 0, duration: d, stagger: d * T.STAGGER, ease: EASE.INK, immediateRender: true },
      wi.at,
    );
    const wo = win(T.OUT, X0, X);
    const dO = perItem(wo.dur, n, T.STAGGER);
    tl.fromTo(
      p.words,
      { yPercent: 0, rotate: 0 },
      { yPercent: -T.RISE, rotate: 0, duration: dO, stagger: dO * T.STAGGER, ease: EASE.LIFT, immediateRender: false },
      wo.at,
    );
  }

  const wipe = (el: HTMLElement | null, IN: Window, OUT: Window) => {
    if (!el) return;
    const wi = win(IN, 0, E);
    const wo = win(OUT, X0, X);
    tl.fromTo(el, { clipPath: CLIP_HIDDEN }, { clipPath: CLIP_SHOWN, duration: wi.dur, ease: EASE.WASH, immediateRender: true }, wi.at);
    tl.fromTo(el, { clipPath: CLIP_SHOWN }, { clipPath: CLIP_GONE, duration: wo.dur, ease: EASE.LIFT, immediateRender: false }, wo.at);
  };
  wipe(p.kicker, TYPE.KICKER.IN, TYPE.KICKER.OUT);
  wipe(p.link, TYPE.LINK.IN, TYPE.LINK.OUT);

  // a descrição: a lavagem (--in / --out movem as bordas de um degradê de
  // máscara, ver o CSS), ou opacidade onde o navegador não sabe fazer isso
  if (p.desc) {
    const wi = win(TYPE.DESC.IN, 0, E);
    const wo = win(TYPE.DESC.OUT, X0, X);
    const inProp = WASH ? '--in' : 'opacity';
    const outProp = WASH ? '--out' : 'opacity';
    tl.fromTo(
      p.desc,
      { [inProp]: 0, y: '0.5em' },
      { [inProp]: 1, y: 0, duration: wi.dur, ease: EASE.WASH, immediateRender: true },
      wi.at,
    );
    tl.fromTo(
      p.desc,
      { [outProp]: WASH ? 0 : 1 },
      { [outProp]: WASH ? 1 : 0, duration: wo.dur, ease: EASE.WASH, immediateRender: false },
      wo.at,
    );
  }

  // o fólio atravessa a criação inteira devagar e só aparece no miolo dela
  if (p.folio) {
    const F = TYPE.FOLIO;
    tl.fromTo(p.folio, { yPercent: F.FROM }, { yPercent: F.TO, duration: span, ease: 'none', immediateRender: true }, 0);
    const fi = win(F.IN, 0, E);
    const fo = win(F.OUT, X0, X);
    tl.fromTo(p.folio, { opacity: 0 }, { opacity: 1, duration: fi.dur, ease: EASE.WASH, immediateRender: true }, fi.at);
    tl.fromTo(p.folio, { opacity: 1 }, { opacity: 0, duration: fo.dur, ease: EASE.WASH, immediateRender: false }, fo.at);
  }

  return tl;
}

// ——— as curvas do encaixe ———

/** A smoothstep: sai do repouso e volta ao repouso. Continua sendo a curva da
 *  fita da abertura. */
export const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

const binom = (n: number, k: number) => {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
};

/** A curva do encaixe: a Beta(a, b) acumulada pra inteiros, como soma de
 *  Bernstein. settle(2, 2) É a smoothstep; `a` diz quão devagar ela descola
 *  do repouso, `b` quão longa é a assentada. Velocidade zero nas duas pontas
 *  sempre que a, b >= 2 — a regra que a página aprendeu com o espalhar da
 *  fita, que parava de uma vez quando a curva era uma potência. */
export const settle = (a: number, b: number) => {
  const n = a + b - 1;
  const c = Array.from({ length: n + 1 }, (_, j) => binom(n, j));
  return (u: number) => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let s = 0;
    for (let j = a; j <= n; j++) s += c[j] * u ** j * (1 - u) ** (n - j);
    return s;
  };
};

// ——— o encaixe ———

export interface Docking {
  /** de onde a miniatura parte, em frações da tela (largura, altura),
   *  relativo ao centro da moldura */
  offset: (from: 'left' | 'right') => { dx: number; dy: number };
  /** giro ao longo do caminho, em graus, dado o peso do canal de giro e o
   *  lado da tela em que a moldura está (1 = esquerda, -1 = direita) */
  rotate?: (w: number, side: 1 | -1) => { x: number; y: number };
  /** distância da "câmera" pro giro, em px */
  perspective?: number;
  /** onde fica a dobradiça do giro, em frações da meia-largura/meia-altura a
   *  partir do centro da foto */
  hinge?: (side: 1 | -1) => { x: number; y: number };
  /** a miniatura é um RECORTE da foto no tamanho da moldura, que se abre —
   *  em vez de uma foto pequena que cresce */
  reveal?: boolean;
  /** em quantas ripas a foto se encaixa */
  strips?: number;
  /** o arco do caminho (ver DOCK.ARC) */
  arc: number;
}

const still = () => ({ dx: 0, dy: 0 });

/** O nome que está em data/creations.ts → como a foto se encaixa. */
export const DOCKING: Record<Effect, Docking> = {
  grow: { offset: still, arc: DOCK.ARC.grow },
  slide: {
    offset: (from) => ({
      dx: (from === 'left' ? -1 : 1) * EFFECTS.SLIDE.SIDE_VW,
      dy: EFFECTS.SLIDE.BELOW_VH,
    }),
    arc: DOCK.ARC.slide,
  },
  tilt: {
    offset: still,
    // rotateX positivo leva a borda de cima pra longe, e com a dobradiça
    // abaixo do centro é a foto se levantando a partir da base
    rotate: (w) => ({ x: (1 - w) * EFFECTS.TILT.ANGLE, y: 0 }),
    perspective: EFFECTS.TILT.PERSPECTIVE,
    hinge: () => ({ x: 0, y: EFFECTS.TILT.HINGE }),
    arc: DOCK.ARC.tilt,
  },
  flip: {
    offset: still,
    // o sinal acompanha o lado: é o que manda o lado de FORA pro fundo nos
    // dois casos (vindo pra frente, a perspectiva ampliaria a foto)
    rotate: (w, side) => ({ x: 0, y: -side * (1 - w) * EFFECTS.FLIP.ANGLE }),
    perspective: EFFECTS.FLIP.PERSPECTIVE,
    hinge: (side) => ({ x: side * EFFECTS.FLIP.HINGE, y: 0 }),
    arc: DOCK.ARC.flip,
  },
  iris: { offset: still, reveal: true, arc: DOCK.ARC.iris },
  pieces: { offset: still, strips: EFFECTS.PIECES.COUNT, arc: DOCK.ARC.pieces },
};
