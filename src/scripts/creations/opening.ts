// src/scripts/creations/opening.ts — a tipografia das duas pontas da página:
// a SAÍDA da abertura (dentro da mestra) e o fechamento (no trigger dele).
//
// O vocabulário é o mesmo das criações (ver effects.ts): varredura pro rótulo
// e pra dica, lavagem pro parágrafo, palavras subindo de máscaras pro título.
// A diferença é o gesto do título da abertura: as duas linhas se ABREM de
// novo — o mesmo vão por onde a fita correu na entrada — e cada uma
// escorrega pra fora da própria máscara. A primeira miniatura sobe pelo vão.
//
// A regra de dono (ver intro.ts): nada aqui escreve a opacidade das peças da
// abertura. A entrada é dona dela, por --intro-title e --intro-rest. Onde a
// saída precisa apagar algo sem máscara (o parágrafo, em navegador sem
// mask-image), ela escreve --exit-a, que o CSS multiplica.
import gsap from 'gsap';
import { viewportSize } from '../viewport';
import { CLOSING, OPENING, TYPE } from './config';
import { EASE, WASH, splitHeading } from './type';

type Timeline = gsap.core.Timeline;
type Window = readonly [number, number];

// o mesmo recorte das criações (ver effects.ts)
const CLIP_HIDDEN = 'inset(-40% 108% -40% -8%)';
const CLIP_SHOWN = 'inset(-40% -8% -40% -8%)';
const CLIP_GONE = 'inset(-40% -8% -40% 108%)';

/** A saída da abertura, em H alturas de tela. */
export function heroTimeline(hero: HTMLElement, H: number): Timeline {
  const tl = gsap.timeline();
  const at = (w: Window) => ({ at: w[0] * H, dur: w[1] * H });
  const q = (sel: string) => hero.querySelector<HTMLElement>(sel);

  const wipeOut = (el: HTMLElement | null, w: Window) => {
    if (!el) return;
    const x = at(w);
    tl.fromTo(el, { clipPath: CLIP_SHOWN }, { clipPath: CLIP_GONE, duration: x.dur, ease: EASE.LIFT }, x.at);
  };
  wipeOut(q('[data-cc-hero-hint]'), OPENING.HINT);
  wipeOut(q('[data-cc-hero-kicker]'), OPENING.KICKER);

  const lead = q('[data-cc-hero-lead]');
  if (lead) {
    const x = at(OPENING.LEAD);
    const prop = WASH ? '--out' : '--exit-a';
    tl.fromTo(
      lead,
      { [prop]: WASH ? 0 : 1 },
      { [prop]: WASH ? 1 : 0, duration: x.dur, ease: EASE.WASH },
      x.at,
    );
  }

  // o título se abre: as máscaras se afastam do centro, a de cima pra cima e
  // a de baixo pra baixo; as linhas escorregam pra fora delas; e o título
  // inteiro cresce um tanto. Valores em função, e em px do viewport medido:
  // o invalidateOnRefresh refaz a conta quando a tela muda.
  const title = q('[data-cc-hero-title]');
  const masks = [...hero.querySelectorAll<HTMLElement>('[data-cc-hero-mask]')];
  const lines = [...hero.querySelectorAll<HTMLElement>('[data-cc-hero-line]')];
  const side = (i: number) => (i ? 1 : -1);
  if (masks.length) {
    const x = at(OPENING.PART);
    tl.fromTo(
      masks,
      { y: 0 },
      {
        y: (i: number) => (side(i) * OPENING.PART_VH * viewportSize().height) / 100,
        duration: x.dur,
        ease: 'sine.inOut',
      },
      x.at,
    );
  }
  if (lines.length) {
    const x = at(OPENING.LINES_OUT);
    tl.fromTo(
      lines,
      { yPercent: 0 },
      { yPercent: (i: number) => side(i) * OPENING.LINE_OUT_PCT, duration: x.dur, ease: EASE.LIFT },
      x.at,
    );
  }
  if (title) {
    const x = at(OPENING.PART);
    tl.fromTo(
      title,
      { scale: 1, transformOrigin: 'center center' },
      { scale: OPENING.TITLE_SCALE, duration: x.dur, ease: 'none' },
      x.at,
    );
  }

  {
    const x = at(OPENING.BLOCK);
    tl.fromTo(hero, { autoAlpha: 1 }, { autoAlpha: 0, duration: x.dur, ease: 'none', immediateRender: false }, x.at);
  }
  // (o indicador lateral entra na janela OPENING.NAV, mas quem o escreve é o
  // nav.ts, como função do tempo — ver o comentário lá)
  tl.set({}, {}, H);
  return tl;
}

/** O fechamento: se escreve enquanto sobe pela tela, dirigido pelo scroll
 *  como o resto (voltar o desfaz). É o único trecho fora do palco. */
export function closingTimeline(closing: HTMLElement, scrub: number): Timeline {
  const C = TYPE.CLOSING;
  const kicker = closing.querySelector<HTMLElement>('.eyebrow');
  const heading = closing.querySelector<HTMLElement>('h2');
  const lead = closing.querySelector<HTMLElement>('.lead');
  const links = [...closing.querySelectorAll<HTMLElement>('nav a')];

  const tl = gsap.timeline({
    scrollTrigger: { trigger: closing, start: CLOSING.START, end: CLOSING.END, scrub },
  });

  if (kicker) {
    tl.fromTo(kicker, { clipPath: CLIP_HIDDEN }, { clipPath: CLIP_SHOWN, duration: C.KICKER[1], ease: EASE.WASH }, C.KICKER[0]);
  }
  const words = heading ? splitHeading(heading) : [];
  if (words.length) {
    const T = TYPE.TITLE;
    const d = C.TITLE[1] / (1 + T.STAGGER * Math.max(0, words.length - 1));
    tl.fromTo(
      words,
      { yPercent: T.RISE, rotate: T.TILT, transformOrigin: '0% 100%' },
      { yPercent: 0, rotate: 0, duration: d, stagger: d * T.STAGGER, ease: EASE.INK },
      C.TITLE[0],
    );
  }
  if (lead) {
    const prop = WASH ? '--in' : 'opacity';
    tl.fromTo(lead, { [prop]: 0, y: '0.5em' }, { [prop]: 1, y: 0, duration: C.LEAD[1], ease: EASE.WASH }, C.LEAD[0]);
  }
  if (links.length) {
    // STAGGER aqui é absoluto (fração do trecho entre um link e o seguinte),
    // e cada link usa o que sobra da janela
    const d = Math.max(0.05, C.LINKS[1] - C.STAGGER * (links.length - 1));
    tl.fromTo(
      links,
      { clipPath: CLIP_HIDDEN },
      { clipPath: CLIP_SHOWN, duration: d, stagger: C.STAGGER, ease: EASE.WASH },
      C.LINKS[0],
    );
  }
  tl.set({}, {}, 1);
  return tl;
}
