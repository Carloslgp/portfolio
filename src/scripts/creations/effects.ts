// src/scripts/creations/effects.ts — o que acontece com o TEXTO de cada
// criação, e a tabela de como a foto dela se ENCAIXA vindo do canva.
//
// A foto não é animada aqui. Ela já está no canva de fundo como miniatura e
// sobe com ele; o field.ts a leva até a moldura como função do tempo de
// rolagem (o "encaixe"), consultando a tabela DOCKING abaixo pra saber de
// onde a miniatura parte e que giro ou recorte acompanha o caminho. O que
// este arquivo anima com o GSAP é só o texto — e o esmaecer do bloco da
// criação, que é o que garante "uma por vez".
//
// Regras dos tweens de texto (são poucos, mas as regras são as mesmas do
// resto da página): só fromTo, com os dois extremos escritos; a entrada
// renderiza na hora e a saída não. Ver o comentário de field.ts sobre por
// que o canva NÃO é feito de tweens.
import gsap from 'gsap';
import type { Effect } from '../../data/creations';
import { EFFECTS, SCROLL } from './config';

export interface SlideParts {
  /** a criação inteira — é o que esmaece nas pontas */
  root: HTMLElement;
  /** as linhas de texto, na ordem da página (rótulo, título, descrição, link) */
  copy: HTMLElement[];
  effect: Effect;
  /** de que lado o `slide` vem */
  from: 'left' | 'right';
}

/** As três fases em alturas de tela, já normalizadas pelo main.ts. */
export interface Phases {
  enter: number;
  hold: number;
  exit: number;
}

type Timeline = gsap.core.Timeline;

/** O esfumado do bloco inteiro nas duas pontas, e o comprimento exato da
 *  timeline (o set vazio no fim fixa a duração). */
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
}

/** Quanto dura UMA linha pra `n` linhas escalonadas caberem numa janela. */
function perLine(window: number, n: number) {
  return window / (1 + EFFECTS.COPY.STAGGER * Math.max(0, n - 1));
}

/** O texto de uma criação: entra linha a linha subindo, depois que a foto já
 *  está a caminho da moldura; sai mais rápido, pra cima. No `slide` ele vem
 *  do mesmo lado que a foto. */
export function slideTimeline({ root, copy, effect, from }: SlideParts, ph: Phases): Timeline {
  const tl = gsap.timeline();
  frame(tl, root, ph);
  if (!copy.length) return tl;

  const shift = effect === 'slide' ? (from === 'left' ? -1 : 1) * EFFECTS.SLIDE.COPY_SHIFT : 0;
  const inAt = ph.enter * EFFECTS.COPY.DELAY;
  const dIn = perLine(ph.enter - inAt, copy.length);
  tl.fromTo(
    copy,
    { y: EFFECTS.COPY.RISE, x: shift, opacity: 0 },
    {
      y: 0,
      x: 0,
      opacity: 1,
      duration: dIn,
      ease: 'power2.out',
      stagger: dIn * EFFECTS.COPY.STAGGER,
      immediateRender: true,
    },
    inAt,
  );

  const outAt = ph.enter + ph.hold;
  const dOut = perLine(ph.exit * 0.6, copy.length);
  tl.fromTo(
    copy,
    { y: 0, x: 0, opacity: 1 },
    {
      y: -EFFECTS.COPY.RISE * 0.6,
      x: -shift,
      opacity: 0,
      duration: dOut,
      ease: 'power2.in',
      stagger: dOut * EFFECTS.COPY.STAGGER,
      immediateRender: false,
    },
    outAt,
  );
  return tl;
}

// ——— o encaixe ———

/** O peso do encaixe: 0 é a pose no canva, 1 é a moldura. Smoothstep, e não
 *  linear: a miniatura já está em movimento (sobe com o canva), e o encaixe
 *  precisa começar e terminar sem quina pra se ler como a MESMA foto
 *  mudando de papel, não como uma troca. */
export const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

export interface Docking {
  /** de onde a miniatura parte, em frações da tela (largura, altura),
   *  relativo ao centro da moldura no instante em que o encaixe termina */
  offset: (from: 'left' | 'right') => { dx: number; dy: number };
  /** giro extra ao longo do caminho, em graus, dado o peso */
  rotate?: (w: number) => { x: number; y: number };
  /** distância da "câmera" pro giro, em px */
  perspective?: number;
  /** a miniatura é um RECORTE da foto no tamanho da moldura, que se abre —
   *  em vez de uma foto pequena que cresce */
  reveal?: boolean;
  /** em quantas tiras a foto se encaixa (escalonadas do centro pras bordas) */
  strips?: number;
}

const still = () => ({ dx: 0, dy: 0 });

/** O nome que está em data/creations.ts → como a foto se encaixa. */
export const DOCKING: Record<Effect, Docking> = {
  grow: { offset: still },
  slide: {
    offset: (from) => ({
      dx: (from === 'left' ? -1 : 1) * EFFECTS.SLIDE.SIDE_VW,
      dy: EFFECTS.SLIDE.BELOW_VH,
    }),
  },
  tilt: {
    offset: still,
    // rotateX positivo leva a borda de cima pra longe: deitada pra trás
    rotate: (w) => ({ x: (1 - w) * EFFECTS.TILT.ANGLE, y: 0 }),
    perspective: EFFECTS.TILT.PERSPECTIVE,
  },
  flip: {
    offset: still,
    rotate: (w) => ({ x: 0, y: -(1 - w) * EFFECTS.FLIP.ANGLE }),
    perspective: EFFECTS.FLIP.PERSPECTIVE,
  },
  iris: { offset: still, reveal: true },
  pieces: { offset: still, strips: EFFECTS.PIECES.COUNT },
};
