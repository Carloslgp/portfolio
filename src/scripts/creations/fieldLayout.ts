// src/scripts/creations/fieldLayout.ts — ONDE cada foto comum do canva cai.
// Roda no BUILD (o frontmatter da página importa daqui) e é função pura:
// mesma semente, mesmo canva, em todo build e em todo visitante. Nada disto
// é recalculado no cliente — o que chega lá são data-attributes prontos, e o
// field.ts só os move com a rolagem.
//
// Por que no build e não no cliente: um layout sorteado ao carregar mudaria a
// cada visita (e a cada reload no meio da página), e sortear depois do
// primeiro paint é o fundo inteiro pulando de lugar.
//
// As fotos das CRIAÇÕES não passam por aqui: a posição delas no canva é
// função da moldura em que vão se encaixar, que só se conhece na tela (ver
// field.ts).
import { FIELD, RIBBON, SCROLL } from './config';

export interface FieldCard {
  /** qual foto: posição em FIELD_PHOTOS */
  photo: number;
  /** centro, em % da largura da tela */
  x: number;
  /** centro, em alturas de tela a partir do topo do CANVA */
  yc: number;
  /** largura em vmin */
  w: number;
  /** acende (fora das faixas protegidas) ou é sempre fantasma */
  lit: boolean;
  /** está fora da faixa protegida da abertura / das criações */
  heroOk: boolean;
  stageOk: boolean;
  /** só entra em tela larga (ver FIELD.MOBILE.EVERY) */
  wideOnly: boolean;
  /** posição na fita da abertura, 0 = topo da curva; -1 = não participa.
   *  ONDE isso cai na tela é medido no cliente (ver field.ts) — aqui só se
   *  decide QUEM entra e em que ordem. */
  rank: number;
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

/** Altura do canva em alturas de tela: o que ele percorre ao longo da página
 *  inteira (RATE vezes a rolagem) mais a tela que já está visível no fim. */
export function canvasHeight(creations: number): number {
  const total = SCROLL.HERO_SCREENS + creations * SCROLL.SCREENS_PER_CREATION;
  return FIELD.RATE * total + 1;
}

/**
 * @param photos    quantas fotos há em FIELD_PHOTOS (a lista repete)
 * @param creations quantas criações a página tem (define a altura do canva)
 */
export function layoutField(photos: number, creations: number): FieldCard[] {
  if (!photos) return [];
  const next = rng(FIELD.SEED);
  const rows = Math.ceil(canvasHeight(creations) / FIELD.ROW_VH);
  const sizes = FIELD.SIZES_VMIN;
  const outside = (x: number, band: readonly [number, number]) => x < band[0] || x > band[1];

  // as fotos saem em ciclos embaralhados da lista, pra mesma foto não se
  // repetir antes de todas as outras aparecerem — e nunca duas iguais em
  // sequência na fronteira entre ciclos
  const all = Array.from({ length: photos }, (_, i) => i);
  let cycle: number[] = [];
  let cursor = 0;
  let last = -1;
  const nextPhoto = () => {
    if (cursor >= cycle.length) {
      cycle = shuffle(all, next);
      if (cycle.length > 1 && cycle[0] === last) [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
      cursor = 0;
    }
    last = cycle[cursor++];
    return last;
  };

  const cards: FieldCard[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < FIELD.COLS; c++) {
      if (next() > FIELD.FILL) continue;
      const x = ((c + 0.5 + (next() * 2 - 1) * FIELD.JITTER) / FIELD.COLS) * 100;
      const yc = (r + 0.5 + (next() * 2 - 1) * FIELD.JITTER) * FIELD.ROW_VH;
      const w = sizes[Math.floor(next() * sizes.length)];
      const lit = next() < FIELD.LIT_SHARE;
      cards.push({
        photo: nextPhoto(),
        x,
        yc,
        w,
        lit,
        heroOk: outside(x / 100, FIELD.SAFE_X.hero),
        stageOk: outside(x / 100, FIELD.SAFE_X.stage),
        wideOnly: cards.length % FIELD.MOBILE.EVERY !== 0,
        rank: -1,
      });
    }
  }

  // ——— quem forma a fita da abertura ———
  //
  // As primeiras COUNT fotos do canva que aparecem em TODA tela. O filtro de
  // wideOnly não é detalhe: no celular metade das fotos comuns é escondida por
  // CSS, e uma fita montada sem olhar isso perderia metade dos membros
  // justamente na tela em que ela é o primeiro que se vê.
  //
  // "As primeiras" porque a fita se desmancha PRA DENTRO do canva: cada foto
  // vai da curva até o lugar dela, e as de cima do canva são as que terminam
  // perto da tela. As outras seguem pra fora dela, que é o que faz o estouro
  // parecer um espalhar e não um sumiço — elas não somem, elas vão embora.
  //
  // A ordem é a do canva (linha a linha, de cima pra baixo), e vira a ordem na
  // curva: assim ninguém cruza o caminho de ninguém no estouro.
  cards
    .filter((c) => !c.wideOnly)
    .slice(0, RIBBON.COUNT)
    .forEach((c, i) => {
      c.rank = i;
    });

  return cards;
}
