// src/scripts/creations/field.ts — o canva de fotos ao fundo, em movimento.
//
// Tudo aqui é FUNÇÃO PURA do tempo da timeline mestra (t, em alturas de
// tela): dado t, cada foto tem uma posição, um tamanho e uma opacidade. O
// main.ts chama apply(t) a cada render da mestra. Não há um tween sequer:
// dezenas de fotos com estado encadeado quebravam no refresh do
// ScrollTrigger (ele renderiza a timeline ida e volta ao medir a página, e
// os fromTo rebobinavam valores gravados fora de ordem). Como função, o
// mesmo t dá sempre o mesmo canva, indo ou voltando, em reload no meio da
// página ou não — que é exatamente a promessa desta página.
//
// Três coisas acontecem em apply(t):
//
//   • o CANVA rola: toda foto comum está numa altura fixa do canva (medida no
//     build, ver fieldLayout.ts) e o canva inteiro sobe RATE vezes o que a
//     página rolou. Pra baixo, as fotos sobem e aparecem novas por baixo; pra
//     cima, o contrário. Fora da tela (com folga), a foto é escondida.
//
//   • as LUZES: cada foto comum é fantasma ou acesa (fora da faixa protegida
//     do trecho atual), vezes a respiração do canva — que cai durante a pausa
//     de leitura de cada criação e volta nas passagens.
//
//   • o ENCAIXE: a foto de cada criação também está no canva, como miniatura,
//     numa altura calculada pra que — subindo com o canva — ela chegue ao
//     centro da moldura exatamente quando a pausa de leitura começa. Ao longo
//     da entrada, a posição e o tamanho dela são uma mistura (peso w, de 0 a
//     1) entre "onde o canva a levaria" e "a moldura"; na pausa, w é 1 e ela
//     É a moldura; na saída w volta a 0 e ela recua pra onde o canva já
//     está — mais acima — e segue subindo. Nunca aparece nem some: só muda de
//     papel. O `effect` da criação diz de onde a miniatura parte e que giro,
//     recorte ou escalonamento acompanha o caminho (ver effects.ts → DOCKING).
//
// A moldura de cada criação é um espaço vazio no markup da criação
// (.cc-media, que na versão simples mostra a própria foto): aqui ela só é
// MEDIDA, e a foto que se vê no palco é sempre a do canva.
import type { Effect } from '../../data/creations';
import { EFFECTS, FIELD, SCROLL } from './config';
import { DOCKING, smooth, type Phases } from './effects';

export interface FieldInput {
  field: HTMLElement;
  /** as fotos comuns ([data-cc-card]) */
  cards: HTMLElement[];
  /** as fotos das criações ([data-cc-featured]), tiras inclusas */
  featured: HTMLElement[];
  /** as molduras a medir, uma por criação, na ordem */
  frames: HTMLElement[];
  creations: number;
  phases: Phases;
}

export interface FieldDriver {
  /** relê a tela: tamanhos em px e onde cada moldura está. Chamar no
   *  refresh do ScrollTrigger (a altura da tela mudou) */
  measure(): void;
  /** escreve o canva do instante t (tempo da mestra, em alturas de tela) */
  apply(t: number): void;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const num = (v: string | undefined, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function createField(input: FieldInput): FieldDriver {
  const { field, frames, creations, phases: ph } = input;
  const H = SCROLL.HERO_SCREENS;
  const SPC = SCROLL.SCREENS_PER_CREATION;

  const common = input.cards.map((el) => ({
    el,
    x: num(el.dataset.x) / 100,
    yc: num(el.dataset.yc),
    w: num(el.dataset.w),
    ratio: num(el.dataset.ratio, 1),
    lit: el.dataset.lit === '1',
    heroOk: el.dataset.heroOk === '1',
    stageOk: el.dataset.stageOk === '1',
    px: 0,
    off: false,
  }));

  const stars = input.featured.map((el) => ({
    el,
    // o atributo é data-cc-featured → a chave do dataset é ccFeatured
    k: num(el.dataset.ccFeatured),
    strip: num(el.dataset.strip),
    strips: Math.max(1, num(el.dataset.strips, 1)),
    effect: el.dataset.effect as Effect,
    from: (el.dataset.from === 'left' ? 'left' : 'right') as 'left' | 'right',
    ratio: num(el.dataset.ratio, 1),
    /** largura CSS do elemento, em px (a escala parte dela) */
    px: 0,
    /** a moldura: centro e largura, em px do canva */
    cx: 0,
    cy: 0,
    fw: 0,
    off: false,
  }));

  let W = 0;
  let VH = 0;
  let vmin = 0;

  const measure = () => {
    const rect = field.getBoundingClientRect();
    W = rect.width;
    VH = rect.height;
    vmin = Math.min(W, VH) / 100;
    common.forEach((c) => {
      c.px = c.w * vmin;
      c.el.style.width = `${c.px.toFixed(2)}px`;
    });
    const boxes = frames.map((frame) => {
      const r = frame.getBoundingClientRect();
      return { cx: r.left - rect.left + r.width / 2, cy: r.top - rect.top + r.height / 2, w: r.width };
    });
    stars.forEach((s) => {
      const box = boxes[s.k];
      if (!box) return;
      s.cx = box.cx;
      s.cy = box.cy;
      s.fw = box.w;
      // o iris vive no tamanho da moldura e abre o recorte; os outros vivem
      // no tamanho da miniatura e crescem por escala
      s.px = DOCKING[s.effect]?.reveal ? box.w : FIELD.FEATURED_VMIN * vmin;
      s.el.style.width = `${s.px.toFixed(2)}px`;
    });
    field.classList.add('is-ready');
  };

  const setOff = (item: { el: HTMLElement; off: boolean }, off: boolean) => {
    if (item.off === off) return;
    item.off = off;
    item.el.classList.toggle('is-off', off);
  };

  /** A respiração em t: 1 na abertura e depois do fim; dentro de cada
   *  criação desce a BREATH_MIN ao longo da entrada, fica lá na pausa e
   *  volta a 1 ao longo da saída. */
  const breathAt = (t: number) => {
    if (t < H || t >= H + creations * SPC) return 1;
    const k = (t - H) % SPC;
    const min = FIELD.BREATH_MIN;
    if (k < ph.enter) return 1 - (1 - min) * (k / ph.enter);
    if (k < ph.enter + ph.hold) return min;
    return min + (1 - min) * ((k - ph.enter - ph.hold) / ph.exit);
  };

  /** O peso bruto do encaixe da criação k em t: sobe na entrada, 1 na pausa,
   *  desce na saída, 0 fora. */
  const rawWeight = (k: number, t: number) => {
    const u = t - (H + k * SPC);
    if (u < 0 || u >= SPC) return 0;
    if (u < ph.enter) return u / ph.enter;
    if (u < ph.enter + ph.hold) return 1;
    return 1 - (u - ph.enter - ph.hold) / ph.exit;
  };

  /** As tiras se encaixam do centro pras bordas: cada uma espera a sua vez
   *  dentro da fração STAGGER da fase e faz o caminho no que sobra. Na saída
   *  o mesmo peso corre ao contrário, então elas se soltam das bordas pro
   *  centro — o espelho. */
  const stripWeight = (raw: number, strip: number, strips: number) => {
    const mid = (strips - 1) / 2;
    const rank = mid ? Math.abs(strip - mid) / mid : 0;
    const span = EFFECTS.PIECES.STAGGER;
    return smooth(clamp((raw - span * rank) / (1 - span)));
  };

  const apply = (t: number) => {
    if (!W) measure();
    const breath = breathAt(t);
    field.style.setProperty('--breath', breath.toFixed(4));

    // a troca de faixa protegida (abertura → criações) cruza linearmente
    // numa janela centrada no fim da abertura
    const mix = clamp((t - (H - FIELD.SWAP / 2)) / FIELD.SWAP);
    const shift = FIELD.RATE * t * VH;
    const cull = FIELD.CULL_VH * VH;

    for (const c of common) {
      const h = c.px / c.ratio;
      const cy = c.yc * VH - shift;
      if (cy + h / 2 < -cull || cy - h / 2 > VH + cull) {
        setOff(c, true);
        continue;
      }
      setOff(c, false);
      const cx = c.x * W;
      c.el.style.transform = `translate3d(${(cx - c.px / 2).toFixed(1)}px, ${(cy - h / 2).toFixed(1)}px, 0)`;
      const hero = c.lit && c.heroOk ? FIELD.LIT : FIELD.GHOST;
      const stage = c.lit && c.stageOk ? FIELD.LIT : FIELD.GHOST;
      c.el.style.setProperty('--level', lerp(hero, stage, mix).toFixed(4));
    }

    for (const s of stars) {
      const dock = DOCKING[s.effect];
      if (!dock || !s.fw) {
        setOff(s, true);
        continue;
      }
      const raw = rawWeight(s.k, t);
      const w = s.strips > 1 ? stripWeight(raw, s.strip, s.strips) : smooth(raw);

      // onde o canva a levaria neste instante: alinhada com a moldura no
      // instante do encaixe (fim da entrada), deslocada pela regra do efeito
      const tDock = H + s.k * SPC + ph.enter;
      const from = dock.offset(s.from);
      const canvasCx = s.cx + from.dx * W;
      const canvasCy = s.cy + from.dy * VH + FIELD.RATE * (tDock - t) * VH;

      const cx = lerp(canvasCx, s.cx, w);
      const cy = lerp(canvasCy, s.cy, w);
      const thumb = FIELD.FEATURED_VMIN * vmin;
      const width = lerp(thumb, s.fw, w);
      const h = s.px / s.ratio;

      if (raw === 0 && (cy + h / 2 < -cull || cy - h / 2 > VH + cull)) {
        setOff(s, true);
        continue;
      }
      setOff(s, false);

      const tx = (cx - s.px / 2).toFixed(1);
      const ty = (cy - h / 2).toFixed(1);
      if (dock.reveal) {
        // o elemento já tem o tamanho da moldura; o que muda é o recorte,
        // sempre centrado — por isso o centro visível é o centro do elemento
        const ix = Math.max(0, (s.px - width) / 2);
        const iy = Math.max(0, (h - width / s.ratio) / 2);
        s.el.style.clipPath = `inset(${iy.toFixed(1)}px ${ix.toFixed(1)}px ${iy.toFixed(1)}px ${ix.toFixed(1)}px)`;
        s.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      } else {
        const scale = (width / s.px).toFixed(4);
        const rot = dock.rotate?.(w);
        s.el.style.transform = rot
          ? `perspective(${dock.perspective ?? 1000}px) translate3d(${tx}px, ${ty}px, 0) scale(${scale}) rotateX(${rot.x.toFixed(2)}deg) rotateY(${rot.y.toFixed(2)}deg)`
          : `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
      }
      // no canva ela é uma foto acesa como as outras; encaixada, é a criação
      s.el.style.opacity = lerp(FIELD.LIT * breath, 1, w).toFixed(4);
    }
  };

  return { measure, apply };
}
