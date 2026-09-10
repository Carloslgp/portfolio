// src/scripts/creations/fieldLayout.ts — ONDE cada foto do campo de fundo cai
// e em que trecho ela acende. Roda no BUILD (o frontmatter da página importa
// daqui) e é função pura: mesma semente, mesmo campo, em todo build e em todo
// visitante. Nada disto é recalculado no cliente — o que chega lá são
// variáveis CSS e data-attributes já prontos, e o field.ts só os anima.
//
// Por que no build e não no cliente: um layout sorteado ao carregar mudaria a
// cada visita (e a cada reload no meio da página), e sortear depois do
// primeiro paint é o fundo inteiro pulando de lugar. Aqui o HTML já nasce com
// o campo montado.
import { FIELD } from './config';

export interface FieldCard {
  /** posição na lista de fotos (FIELD_PHOTOS[index % length]) */
  index: number;
  /** centro da foto, em % da largura/altura do palco */
  x: number;
  y: number;
  /** largura em vmin */
  w: number;
  /** 0 = longe (pequena, lenta) … 1 = perto (grande, rápida) */
  depth: number;
  /** deslocamento total ao longo da página inteira, em vh */
  dx: number;
  dy: number;
  /** um nível por trecho (abertura, depois cada criação):
   *  0 apagada, 1 fantasma, 2 acesa */
  levels: number[];
}

/** mulberry32 — o mesmo gerador determinístico do mural (photos/layout.ts):
 *  pequeno, suficiente pra sorteio de layout, e com semente inteira. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: T[], next: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Box = readonly [readonly [number, number], readonly [number, number]];

const inside = (x: number, y: number, box: Box) =>
  x >= box[0][0] && x <= box[0][1] && y >= box[1][0] && y <= box[1][1];

/** pode acender ali? só se o centro estiver fora de TODAS as caixas */
const clear = (x: number, y: number, boxes: readonly Box[]) =>
  !boxes.some((box) => inside(x, y, box));

/**
 * @param count    quantas fotos (é limitado ao número de células da grade)
 * @param segments quantos trechos a timeline tem: 1 (abertura) + criações
 */
export function layoutField(count: number, segments: number): FieldCard[] {
  const next = rng(FIELD.SEED);
  const { COLS, ROWS, JITTER } = FIELD.GRID;
  const sizes = FIELD.SIZES_VMIN;

  // ——— a dispersão ———
  const cells: { c: number; r: number }[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ c, r });
  const chosen = shuffle(cells, next).slice(0, Math.min(count, cells.length));

  const cards: FieldCard[] = chosen.map((cell, index) => {
    const x = ((cell.c + 0.5 + (next() * 2 - 1) * JITTER) / COLS) * 100;
    const y = ((cell.r + 0.5 + (next() * 2 - 1) * JITTER) / ROWS) * 100;
    // tamanhos distribuídos por igual, e a profundidade sai do tamanho
    const tier = index % sizes.length;
    const depth = sizes.length === 1 ? 1 : tier / (sizes.length - 1);
    // a órbita: direção tangente ao círculo que passa pela foto em volta do
    // centro da tela (em % — é uma aproximação, e serve: o que importa é que
    // fotos vizinhas andem em direções parecidas e o conjunto gire)
    const angle = Math.atan2(y - 50, x - 50);
    const speed = FIELD.DRIFT_VH * (FIELD.DRIFT_FAR + (1 - FIELD.DRIFT_FAR) * depth);
    return {
      index,
      x,
      y,
      w: sizes[tier],
      depth,
      dx: -Math.sin(angle) * speed,
      dy: Math.cos(angle) * speed,
      levels: [],
    };
  });

  // ——— as constelações ———
  const all = cards.map((_, i) => i);
  const okHero = cards.map((c) => clear(c.x / 100, c.y / 100, FIELD.SAFE.hero));
  const okStage = cards.map((c) => clear(c.x / 100, c.y / 100, FIELD.SAFE.stage));
  let previousLit = new Set<number>();

  for (let s = 0; s < segments; s++) {
    const isHero = s === 0;
    const ok = isHero ? okHero : okStage;
    const want = isHero ? FIELD.LIT_PER.hero : FIELD.LIT_PER.creation;
    const order = shuffle(all, next);

    // acende quem pode acender e NÃO acendeu no trecho anterior; se não
    // houver candidatas suficientes (campo pequeno), repete alguma
    const lit = new Set(order.filter((i) => ok[i] && !previousLit.has(i)).slice(0, want));
    if (lit.size < want) {
      order
        .filter((i) => ok[i] && !lit.has(i))
        .slice(0, want - lit.size)
        .forEach((i) => lit.add(i));
    }
    const off = new Set(order.filter((i) => !lit.has(i)).slice(0, FIELD.OFF_PER));

    cards.forEach((card, i) => card.levels.push(lit.has(i) ? 2 : off.has(i) ? 0 : 1));
    previousLit = lit;
  }

  return cards;
}
