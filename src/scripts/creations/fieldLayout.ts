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
import { FIELD, RIBBON } from './config';
import { timing } from './timing';

export interface FieldCard {
  /** qual foto: posição em FIELD_PHOTOS */
  photo: number;
  /** centro, em % da largura da tela */
  x: number;
  /** centro, em alturas de tela a partir do topo do CANVA */
  yc: number;
  /** largura em vmin */
  w: number;
  /** o plano: 0 é o mais distante (a menor), 1 o mais próximo (a maior). Ver
   *  FIELD.DEPTH — sai do mesmo sorteio do tamanho, sem sorteio novo */
  depth: number;
  /** acende (fora das faixas protegidas) ou é sempre fantasma */
  lit: boolean;
  /** está fora da faixa protegida da abertura / das criações */
  heroOk: boolean;
  stageOk: boolean;
  /** só entra em tela larga (ver FIELD.MOBILE.EVERY) */
  wideOnly: boolean;
  /** posição na fita da abertura, 0 = topo da curva; -1 = não participa */
  rank: number;
}

/** mulberry32 — o mesmo gerador determinístico do mural (photos/layout.ts). */
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

/** Altura do canva em alturas de tela: o que o plano MAIS RÁPIDO percorre ao
 *  longo da página inteira, mais a tela que já está visível no fim. O
 *  andamento (warp) não muda a conta: ele termina onde começou. `creations` é
 *  o mesmo argumento do timing(): a contagem, ou a pausa a mais de cada uma. */
export function canvasHeight(creations: number | readonly number[]): number {
  return FIELD.RATE * (1 + FIELD.DEPTH) * timing(creations).total + 1;
}

/**
 * @param photos    quantas fotos há em FIELD_PHOTOS (a lista repete)
 * @param creations quantas criações a página tem — ou a pausa a mais de cada
 *                  uma (ver timing.ts → extraHold). Define a altura do canva
 */
export function layoutField(photos: number, creations: number | readonly number[]): FieldCard[] {
  if (!photos) return [];
  const next = rng(FIELD.SEED);
  const minRows = Math.ceil(canvasHeight(creations) / FIELD.ROW_VH);
  const sizes = FIELD.SIZES_VMIN;
  const outside = (x: number, band: readonly number[]) => x < band[0] || x > band[1];

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

  // As linhas vão até cobrir o canva E até haver fotos elegíveis pra fita
  // inteira. Com o fundo mais lento o canva encurtou, e a fita (60 fotos que
  // aparecem em toda tela) quase não cabia nele. As linhas extras são só
  // ACRESCENTADAS no fim: os sorteios das primeiras continuam os mesmos, e com
  // eles a abertura e quem forma a fita. O teto é só uma trava contra laço
  // infinito se FILL um dia for zero.
  const cards: FieldCard[] = [];
  let eligible = 0;
  for (let r = 0; (r < minRows || eligible < RIBBON.COUNT) && r < minRows + 400; r++) {
    for (let c = 0; c < FIELD.COLS; c++) {
      if (next() > FIELD.FILL) continue;
      const x = ((c + 0.5 + (next() * 2 - 1) * FIELD.JITTER) / FIELD.COLS) * 100;
      const yc = (r + 0.5 + (next() * 2 - 1) * FIELD.JITTER) * FIELD.ROW_VH;
      const size = Math.floor(next() * sizes.length);
      const lit = next() < FIELD.LIT_SHARE;
      const wideOnly = cards.length % FIELD.MOBILE.EVERY !== 0;
      cards.push({
        photo: nextPhoto(),
        x,
        yc,
        w: sizes[size],
        depth: sizes.length > 1 ? size / (sizes.length - 1) : 0.5,
        lit,
        heroOk: outside(x / 100, FIELD.SAFE_X.hero),
        stageOk: outside(x / 100, FIELD.SAFE_X.stage),
        wideOnly,
        rank: -1,
      });
      if (!wideOnly) eligible++;
    }
  }

  // ——— quem forma a fita da abertura ———
  //
  // As primeiras COUNT fotos do canva que aparecem em TODA tela (no celular
  // metade das comuns sai por CSS, e uma fita montada sem olhar isso perderia
  // metade dos membros justamente na tela em que ela é o primeiro que se vê).
  // "As primeiras" porque a fita se desmancha PRA DENTRO do canva: as de cima
  // terminam perto da tela, as outras vão embora por baixo — o estouro parece
  // um espalhar, e não um sumiço. A ordem é a do canva, e vira a ordem na
  // curva: ninguém cruza o caminho de ninguém no estouro.
  cards
    .filter((c) => !c.wideOnly)
    .slice(0, RIBBON.COUNT)
    .forEach((c, i) => {
      c.rank = i;
    });

  return cards;
}
