// src/scripts/photos/layout.ts — o packing do mural: linhas justificadas
// (estilo Flickr) fechadas num TILE retangular exato, que o infiniteCanvas
// replica em grade pra fazer o plano infinito.
//
// Por que justified rows, e não masonry: a justificação produz linhas de
// largura EXATA — cada linha é escalada até fechar a largura do tile — e a
// soma das alturas fecha a outra dimensão. O retângulo fecha nos dois eixos
// por construção, sem crop e sem distorção (só a ALTURA da linha varia; a
// proporção de cada foto é sagrada). Masonry deixa as colunas com fundos
// serrilhados: não existe TILE_H comum sem esticar alguma coluna no braço.
//
// ——— a aritmética da costura ———
// O passo de repetição (stride) EMBUTE o gap: as linhas justificam até
// (tileW - GAP) e cada linha soma (altura + GAP) ao tile. Assim a cópia
// vizinha, colada em múltiplos de tileW/tileH, já nasce a um GAP de distância
// da anterior — o respiro entre a última foto de um tile e a primeira do
// seguinte é IGUAL ao respiro interno, e a emenda não existe visualmente.
import type { Photo } from './photos';
import { MURAL } from './config';

export interface TileItem {
  photo: Photo;
  /** posição dentro do tile, em px (origem no canto superior esquerdo) */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Tile {
  /** passo de repetição em X/Y, gap incluso — o "mod" do infiniteCanvas */
  w: number;
  h: number;
  items: TileItem[];
}

// PRNG determinístico (mulberry32): o mural sai igual em todo carregamento,
// e a "aleatoriedade" do embaralhado vira uma decisão de design reproduzível.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates com o PRNG acima. Cada repetição da lista entra numa ordem
// própria: é o que disfarça o tile pequeno sem inventar foto nova.
function shuffled<T>(list: T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A sequência que preenche o tile: a lista inteira, repetida (embaralhada por
 *  semente) até passar do mínimo. Toda foto aparece o mesmo nº de vezes. */
function sequence(photos: Photo[], rand: () => number): Photo[] {
  const reps = Math.max(1, Math.ceil(MURAL.TILE_MIN_PHOTOS / photos.length));
  const seq: Photo[] = [];
  for (let r = 0; r < reps; r++) seq.push(...shuffled(photos, rand));

  // Reparo de vizinhança: cada repetição é embaralhada por conta própria, e a
  // FRONTEIRA entre duas pode colar a mesma foto (quase) lado a lado — com
  // linhas de ~6 fotos, isso aparece como duplicata dentro de uma linha. Uma
  // passada só: quem conflita com as REPEAT_WINDOW anteriores troca de lugar
  // com o próximo à frente que não conflite. (Se a troca criar conflito lá na
  // frente, a passada chega lá e repara de novo.)
  const win = Math.min(MURAL.REPEAT_WINDOW, photos.length - 1);
  const clashes = (i: number, id: string) => {
    for (let k = Math.max(0, i - win); k < i; k++) if (seq[k].id === id) return true;
    return false;
  };
  for (let i = 1; i < seq.length; i++) {
    if (!clashes(i, seq[i].id)) continue;
    for (let j = i + 1; j < seq.length; j++) {
      if (!clashes(i, seq[j].id)) {
        [seq[i], seq[j]] = [seq[j], seq[i]];
        break;
      }
    }
  }
  return seq;
}

/** A altura-alvo das linhas para uma dada largura de VIEWPORT (não de tile: o
 *  tile é sempre largo, ver MURAL.MIN_TILE_W — quem decide quantas fotos cabem
 *  de ponta a ponta é a tela). Fração da largura, presa entre piso e teto. */
export function targetRowHeight(viewportW: number): number {
  return Math.round(
    Math.min(
      MURAL.TARGET_ROW_HEIGHT,
      Math.max(MURAL.MIN_ROW_HEIGHT, viewportW * MURAL.ROW_HEIGHT_VW),
    ),
  );
}

export function buildTile(
  photos: Photo[],
  tileW: number,
  rowH: number = MURAL.TARGET_ROW_HEIGHT,
): Tile {
  const rand = mulberry32(MURAL.SEED);
  const seq = sequence(photos, rand);
  const contentW = tileW - MURAL.GAP;   // as linhas fecham AQUI; o gap final é a costura

  const items: TileItem[] = [];
  let y = 0;

  let row: Photo[] = [];
  let aspectSum = 0;

  const flushRow = () => {
    // a justificação: altura que faz a soma das larguras + gaps bater EXATO em
    // contentW. As proporções não mudam — só a régua da linha.
    const gaps = MURAL.GAP * (row.length - 1);
    const rowH = (contentW - gaps) / aspectSum;

    let x = 0;
    row.forEach((photo, i) => {
      let w = (photo.w / photo.h) * rowH;
      // acumular floats deixa a última foto a uma fração de px da borda; ela
      // absorve o resto pra linha fechar exatamente — invisível, mas é o que
      // garante costura perfeita entre cópias
      if (i === row.length - 1) w = contentW - x;
      items.push({ photo, x, y, w, h: rowH });
      x += w + MURAL.GAP;
    });

    y += rowH + MURAL.GAP;
    row = [];
    aspectSum = 0;
  };

  const rowFits = () =>
    aspectSum * rowH + MURAL.GAP * (row.length - 1) >= contentW;

  for (const photo of seq) {
    row.push(photo);
    aspectSum += photo.w / photo.h;
    if (rowFits()) flushRow();
  }

  // Sobrou uma linha aberta: o tile TEM que fechar em retângulo, então ela é
  // completada com fotos do começo da sequência até justificar. São duplicatas
  // a mais — num mural que já é um padrão repetido, indistinguíveis.
  if (row.length) {
    for (let i = 0; !rowFits(); i = (i + 1) % seq.length) {
      row.push(seq[i]);
      aspectSum += seq[i].w / seq[i].h;
    }
    flushRow();
  }

  return { w: tileW, h: y, items };
}
