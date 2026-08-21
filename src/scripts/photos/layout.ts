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
//
// ——— e por que o tile não pode ser pequeno ———
// A pasta é finita: um plano infinito feito dela SEMPRE se repete, e não há
// truque que invente foto. O que dá pra escolher é a que distância a repetição
// acontece. Um tile do tamanho da tela devolve o mural inteiro a cada tela
// andada; um tile de várias telas obriga a pessoa a caminhar muito antes de
// reconhecer o arranjo, que é a diferença entre "mural infinito" e "papel de
// parede". Daí este arquivo se importar tanto com o TAMANHO do padrão e com a
// DISTÂNCIA entre duas cópias da mesma foto.
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

  // Reparo de vizinhança — a primeira defesa, e em UMA dimensão só: cada
  // repetição é embaralhada por conta própria, e a FRONTEIRA entre duas pode
  // colar a mesma foto (quase) lado a lado. Uma passada: quem conflita com as
  // REPEAT_WINDOW anteriores troca de lugar com o próximo à frente que não
  // conflite. (Se a troca criar conflito lá na frente, a passada chega lá e
  // repara de novo.)
  //
  // A janela olha pra trás DANDO A VOLTA: a sequência fecha um tile, e o fim
  // dela encosta no começo da cópia seguinte. Sem o wrap, a emenda ficaria sem
  // vigia justamente onde a repetição mais aparece.
  const win = Math.min(MURAL.REPEAT_WINDOW, photos.length - 1);
  const clashes = (i: number, id: string) => {
    for (let k = i - win; k < i; k++) {
      if (seq[(k + seq.length) % seq.length].id === id) return true;
    }
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

/** Empacota UMA sequência em linhas justificadas, fechando o retângulo exato.
 *
 *  A ordem de `items` é a ordem de `seq`, e o espalhamento lá embaixo depende
 *  disso: é por ela que um item mal posto aponta de volta pra sua posição na
 *  sequência. */
function pack(seq: Photo[], tileW: number, rowH: number): Tile {
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
  // completada com duplicatas até justificar.
  //
  // QUAIS duplicatas importa muito, e essa era a maior fonte de repetição
  // visível do mural. Puxar as primeiras fotos da sequência é a pior escolha
  // possível: esta é a ÚLTIMA linha, e a última linha encosta na PRIMEIRA da
  // cópia de baixo — as fotos do começo saíam reimpressas a menos de meia tela
  // delas mesmas. Aqui a escolha sai do miolo da sequência (o ponto mais longe
  // das duas pontas) e pula quem já está nesta linha ou nas vizinhas.
  if (row.length) {
    const perto = new Set(items.filter((it) => it.y === 0).map((it) => it.photo.id));
    for (const it of items.slice(-MURAL.REPEAT_WINDOW)) perto.add(it.photo.id);

    while (!rowFits()) {
      const extra = pickFiller(seq, row, perto);
      row.push(extra);
      aspectSum += extra.w / extra.h;
    }
    flushRow();
  }

  return { w: tileW, h: y, items };
}

/** Uma foto pra tapar o buraco da última linha: do miolo da sequência pra
 *  fora, a primeira que não esbarra em ninguém por perto. Se todas esbarrarem
 *  (pasta minúscula), vale a do miolo mesmo — o tile precisa fechar. */
function pickFiller(seq: Photo[], row: Photo[], perto: Set<string>): Photo {
  const naLinha = new Set(row.map((p) => p.id));
  const meio = Math.floor(seq.length / 2);
  for (let k = 0; k < seq.length; k++) {
    const cand = seq[(meio + k) % seq.length];
    if (!naLinha.has(cand.id) && !perto.has(cand.id)) return cand;
  }
  return seq[meio];
}

/** Distância entre duas instâncias NO PLANO, não dentro do tile.
 *
 *  O que a pessoa enxerga não é o tile: é o ladrilhamento. Duas fotos em
 *  pontas opostas do retângulo podem estar coladas pela costura, e a cópia da
 *  coluna ao lado entra deslocada de meio tile (a regra é do infiniteCanvas —
 *  se ela mudar lá, muda aqui). Daí varrer as nove cópias em volta e ficar com
 *  a menor distância: é a única que a pessoa vai ver. */
function copyDistance(a: TileItem, b: TileItem, tile: Tile): number {
  const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2, by = b.y + b.h / 2;
  let best = Infinity;
  for (let dc = -1; dc <= 1; dc++) {
    const shift = Math.abs(dc) % 2 ? tile.h / 2 : 0;
    for (let dr = -1; dr <= 1; dr++) {
      const dx = bx + dc * tile.w - ax;
      const dy = by + dr * tile.h + shift - ay;
      best = Math.min(best, Math.hypot(dx, dy));
    }
  }
  return best;
}

/** O quanto este tile ainda amontoa cópias, e quem são os culpados.
 *
 *  O custo é contínuo — a sobra que falta pra cada par chegar em `min`, ao
 *  quadrado — e não uma contagem de infratores. Contagem faz uma paisagem de
 *  degraus, onde quase toda troca "empata" e a busca anda às cegas; com a
 *  sobra ao quadrado, afastar um par de 600 pra 900px já melhora a nota, e os
 *  pares MUITO grudados pesam desproporcionalmente mais que os quase certos —
 *  que é exatamente a ordem em que a pessoa repara neles. */
function spreadCost(tile: Tile, goal: number): { cost: number; min: number; blame: number[] } {
  const porFoto = new Map<string, number[]>();
  tile.items.forEach((it, i) => {
    const lista = porFoto.get(it.photo.id);
    if (lista) lista.push(i);
    else porFoto.set(it.photo.id, [i]);
  });

  let cost = 0;
  let min = Infinity;
  const ruins: { i: number; d: number }[] = [];
  for (const idxs of porFoto.values()) {
    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) {
        const d = copyDistance(tile.items[idxs[a]], tile.items[idxs[b]], tile);
        if (d < min) min = d;
        if (d >= goal) continue;
        const falta = (goal - d) / goal;
        cost += falta * falta;
        // os DOIS entram na lista: mover qualquer um resolve o par, e às vezes
        // só um dos dois tem pra onde ir
        ruins.push({ i: idxs[a], d }, { i: idxs[b], d });
      }
    }
  }
  return { cost, min, blame: ruins.sort((p, q) => p.d - q.d).map((r) => r.i) };
}

export function buildTile(
  photos: Photo[],
  tileW: number,
  rowH: number = MURAL.TARGET_ROW_HEIGHT,
): Tile {
  const rand = mulberry32(MURAL.SEED);
  const seq = sequence(photos, rand);
  const goal = MURAL.MIN_COPY_DIST * rowH;

  // ——— espalhamento em 2D ———
  // A janela do sequence() conta POSIÇÕES numa fita, e o mural é um plano:
  // nenhuma contagem de posições sabe dizer que a posição 20 caiu exatamente
  // embaixo da 4. Então aqui a conversa é com o layout PRONTO — empacota, mede
  // a distância real entre as cópias de cada foto, manda quem ficou perto
  // demais pra outro lugar sorteado, empacota de novo.
  //
  // Reempacotar inteiro a cada passada não é desperdício: mudar uma foto de
  // lugar muda a largura da linha dela, que muda onde as linhas quebram daí
  // pra frente. O layout seguinte é OUTRO, e medir o anterior não diria nada.
  //
  // Uma troca por passada, e não todas as ofensoras de uma vez: mexer em tudo
  // junto produz um mural sem relação com o que acabou de ser medido, e a
  // passada seguinte estaria chutando. A troca que piora é DESFEITA — sem isso
  // a busca vira um passeio aleatório que passa a maior parte do tempo longe do
  // melhor lugar onde já esteve. Empate é aceito de propósito: é o que deixa a
  // busca caminhar de lado quando o custo estaciona num platô.
  //
  // Duas notas diferentes, e a distinção é o miolo disto: quem GUIA a busca é o
  // custo somado, que é suave e responde a qualquer melhora; quem escolhe o
  // resultado é o PIOR par, que é o que o olho encontra primeiro. Otimizar o
  // pior par diretamente não funciona — só ele conta, então quase toda troca
  // empata e a busca fica cega. Guiar por um e guardar pelo outro dá os dois.
  let curTile = pack(seq, tileW, rowH);
  let cur = spreadCost(curTile, goal);
  let best = curTile;
  let bestMin = cur.min;

  for (let pass = 0; pass < MURAL.SPREAD_PASSES && cur.cost > 0; pass++) {
    // sorteia entre os piores em vez de pegar sempre o pior: o pior par pode
    // não ter pra onde ir, e insistir nele trava a busca no mesmo lugar
    const alvo = cur.blame[Math.floor(rand() * Math.min(cur.blame.length, 8))];

    // Item de enchimento da última linha não tem posição na sequência pra
    // trocar; nesse caso mexe-se em duas posições quaisquer, o que muda onde as
    // linhas quebram e, com isso, o enchimento inteiro.
    const i = alvo < seq.length ? alvo : Math.floor(rand() * seq.length);
    const j = Math.floor(rand() * seq.length);
    if (i === j) continue;

    [seq[i], seq[j]] = [seq[j], seq[i]];
    const tile = pack(seq, tileW, rowH);
    const cost = spreadCost(tile, goal);

    if (cost.cost <= cur.cost) {
      curTile = tile;
      cur = cost;
    } else {
      [seq[i], seq[j]] = [seq[j], seq[i]];   // piorou: desfaz
    }

    if (cur.min > bestMin) {
      best = curTile;
      bestMin = cur.min;
    }
  }

  return best;
}
