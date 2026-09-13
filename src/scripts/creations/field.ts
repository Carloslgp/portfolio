// src/scripts/creations/field.ts — o canva de fotos ao fundo, em movimento.
//
// Tudo aqui é FUNÇÃO PURA do tempo da timeline mestra (t, em alturas de
// tela): dado t, cada foto tem uma posição, um tamanho e uma opacidade. O
// main.ts chama apply(t) a cada render da mestra. Não há um tween sequer:
// dezenas de fotos com estado encadeado quebravam no refresh do
// ScrollTrigger (ele renderiza a timeline ida e volta ao medir a página).
// Como função, o mesmo t dá sempre o mesmo canva, indo ou voltando, em reload
// no meio da página ou não — que é exatamente a promessa desta página.
//
// Três coisas acontecem em apply(t):
//
//   • o CANVA rola: toda foto comum está numa altura fixa do canva (do build,
//     ver fieldLayout.ts) e sobe na velocidade do plano dela (FIELD.DEPTH),
//     no andamento do canva (timing.ts → warp: mais devagar na leitura).
//
//   • as LUZES: fantasma ou acesa, vezes a respiração do canva — que cai
//     enquanto a foto de uma criação está no palco e volta nas passagens,
//     quando a faixa do meio também pode acender (FIELD.PASSAGE).
//
//   • o ENCAIXE: a foto de cada criação também está no canva, como
//     miniatura. Ela tem quatro canais — giro, posição, tamanho e luz —, cada
//     um com a sua janela e a sua curva (ver DOCK). Na entrada ela sai do
//     canva num arco e assenta na moldura; na pausa a moldura deriva devagar
//     (HOLD.CRUISE) e a foto anda dentro dela; na saída ela parte de ONDE FOI
//     SEGURADA — não de onde o canva estaria, que já andou a pausa inteira —
//     e volta a ser uma foto do canva. Nunca aparece nem some: só muda de
//     papel.
//
// Toda escrita no DOM é pulada quando o valor não mudou, e a opacidade é
// escrita PRONTA em cada foto. Antes ela era um calc() de variáveis herdadas
// do .cc-field, e mudar a respiração recalculava o estilo de ~160 figuras (e
// das <img> dentro delas) a cada quadro — medido: 9,5ms por quadro com a CPU
// a 4x. Opacidade não herda; cada foto paga só por si.
import type { Effect } from '../../data/creations';
import { DOCK, EFFECTS, FIELD, HOLD, RIBBON, SCROLL } from './config';
import { DOCKING, settle, smooth } from './effects';
import type { Phases, Timing } from './timing';

export interface FieldInput {
  field: HTMLElement;
  /** as fotos comuns ([data-cc-card]) */
  cards: HTMLElement[];
  /** as fotos das criações ([data-cc-featured]), ripas inclusas */
  featured: HTMLElement[];
  /** as molduras a medir, uma por slide, na ordem — null num intervalo, que
   *  não tem foto (ver `Interlude` em data/creations.ts) */
  frames: (HTMLElement | null)[];
  /** o vão entre as linhas do título, onde a fita da abertura corre */
  ribbon: HTMLElement | null;
  timing: Timing;
}

export interface FieldDriver {
  /** relê a tela: tamanhos em px e onde cada moldura está. Chamar no
   *  refresh do ScrollTrigger (a altura da tela mudou) */
  measure(): void;
  /** escreve o canva do instante t (tempo da mestra, em alturas de tela) */
  apply(t: number): void;
  /** avança a animação de ENTRADA, de 0 a 1 (ver RIBBON no config). Em 1 ela
   *  acabou e o canva volta a ser função só da rolagem. */
  setIntro(i: number): void;
  /** pra uma criação com `gallery` (ver data/creations.ts): põe a POSIÇÃO
   *  visível da galeria da criação `k` (0 é `image`, 1 é a primeira foto de
   *  `gallery`, e por aí vai) e reaplica no MESMO t. Aceita fração — é assim
   *  que o main.ts anima a troca com um tween (ver o comentário de
   *  `galleryPos` abaixo); um clique isolado pode só chamar com o inteiro. */
  setGallery(k: number, pos: number): void;
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const num = (v: string | undefined, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function createField(input: FieldInput): FieldDriver {
  const { field, frames, timing: T } = input;
  /** a deriva da criação k (ver HOLD.CRUISE). Numa de pausa esticada ela se
   *  espalha pelo trecho inteiro em vez de crescer com ele — a MESMA conta do
   *  slideTimeline no effects.ts, senão foto e texto se separariam. */
  const driftOf = (k: number) => HOLD.CRUISE * Math.min(1, T.SPC / T.lengthOf(k));

  const common = input.cards.map((el) => {
    const depth = num(el.dataset.depth, 0.5);
    return {
      el,
      x: num(el.dataset.x) / 100,
      yc: num(el.dataset.yc),
      w: num(el.dataset.w),
      ratio: num(el.dataset.ratio, 1),
      lit: el.dataset.lit === '1',
      heroOk: el.dataset.heroOk === '1',
      stageOk: el.dataset.stageOk === '1',
      /** lugar na fita da abertura; -1 não participa (ver fieldLayout.ts) */
      rank: num(el.dataset.rank, -1),
      /** a velocidade do plano desta foto (ver FIELD.DEPTH) */
      rate: FIELD.RATE * lerp(1 - FIELD.DEPTH, 1 + FIELD.DEPTH, depth),
      px: 0,
      /** escala em que ela fica no CANVA. É 1 pras fotos comuns; nas da fita é
       *  menor que 1, porque elas são deitadas no tamanho do inchaço (ver
       *  measure) e o canva é uma redução disso. */
      base: 1,
      off: false,
      /** as últimas strings escritas — pra não escrever o mesmo valor */
      tf: '',
      o: '',
    };
  });

  const ranks = common.reduce((n, c) => Math.max(n, c.rank + 1), 0);

  const stars = input.featured.map((el) => ({
    el,
    img: el.querySelector<HTMLElement>('img'),
    // o atributo é data-cc-featured → a chave do dataset é ccFeatured
    k: num(el.dataset.ccFeatured),
    strip: num(el.dataset.strip),
    strips: Math.max(1, num(el.dataset.strips, 1)),
    /** só pra criação de pixel art (ver `evolution` em data/creations.ts):
     *  em qual ESTÁGIO da evolução este elemento está, de `stages` no total.
     *  Onde `strip` fatia UMA foto no espaço, `stage` fatia N fotos no
     *  TEMPO — todos os estágios de uma criação ocupam a mesma moldura, e
     *  quem decide qual se vê é só a opacidade (ver `stageOp` em apply). */
    stage: num(el.dataset.stage),
    stages: Math.max(1, num(el.dataset.stages, 1)),
    /** true pra `gallery` (fotos do MESMO instante, escolhidas por clique) —
     *  false (o padrão) é `evolution` (instantes diferentes, avançados pela
     *  rolagem). Só importa quando `stages > 1`; ver `galleryPos` abaixo. */
    gallery: el.dataset.gallery === '1',
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
    tf: '',
    clip: '',
    op: '',
    pan: '',
    dock: -1,
    gap: -1,
  }));

  // Quanto da TELA a moldura de cada criação ocupa quando a foto está
  // encaixada (0 a 1). Vezes o encaixe, dá quanto da tela está coberto de
  // foto AGORA — é o que decide a cor do "‹ Voltar", do botão de tema e do
  // indicador lateral, que são escuros e uma foto de tela cheia apagaria.
  const covers = frames.map(() => 0);
  // Quanto da deriva (HOLD.CRUISE) cada moldura aguenta sem mostrar papel:
  // 1, a não ser que ela cubra a altura da tela — aí só o tanto que sobra
  // pra fora dela. Não é saber qual composição é qual: é uma conta sobre a
  // caixa que este arquivo já mede.
  const cruiseCap = frames.map(() => 1);
  let lastOver = false;
  const root = document.documentElement;

  let W = 0;
  let VH = 0;
  let vmin = 0;
  /** o teto de luz das fotos comuns: 1, ou FIELD.MOBILE.LIT_CAP no celular */
  let cap = 1;
  /** o vão entre as duas linhas do título, onde a fita corre */
  let band = { x: 0, y: 0, w: 0, h: 0 };

  const measure = () => {
    const rect = field.getBoundingClientRect();
    W = rect.width;
    VH = rect.height;
    vmin = Math.min(W, VH) / 100;
    cap = window.matchMedia(FIELD.MOBILE.QUERY).matches ? FIELD.MOBILE.LIT_CAP : 1;

    const slot = input.ribbon?.getBoundingClientRect();
    band = slot
      ? { x: slot.left - rect.left, y: slot.top - rect.top, w: slot.width, h: slot.height }
      : { x: 0, y: VH * 0.3, w: W, h: VH * 0.4 };
    common.forEach((c) => {
      const canva = c.w * vmin;
      // A foto da fita é deitada no MAIOR tamanho que vai ter — o do inchaço
      // — e não no tamanho de canva: ampliar o elemento além do layout é
      // rasterizar pequeno e esticar. Deitada no maior, todo o resto do
      // caminho é redução, sempre nítida.
      const inchada =
        c.rank >= 0 ? RIBBON.CARD * band.h * RIBBON.TIGHT_SIZE * (c.w / FIELD.SIZES_VMIN[1]) : 0;
      c.px = Math.max(canva, inchada);
      c.base = canva / c.px;
      c.el.style.width = `${c.px.toFixed(2)}px`;
      c.tf = '';
    });

    const boxes = frames.map((frame, i) => {
      // a deriva vai de +a a -b em torno do meio da pausa; o pior lado é o maior
      const p = T.phasesOf(i);
      const reach = driftOf(i) * Math.max(p.enter + p.hold / 2, p.hold / 2 + p.exit) * VH;
      if (!frame) {
        covers[i] = 0;
        cruiseCap[i] = 1;
        return null;
      }
      const r = frame.getBoundingClientRect();
      // a parte da moldura que cai DENTRO da tela, sobre a área da tela
      const dentro =
        Math.max(0, Math.min(r.right, rect.right) - Math.max(r.left, rect.left)) *
        Math.max(0, Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top));
      covers[i] = W && VH ? Math.min(1, dentro / (W * VH)) : 0;
      const top = r.top - rect.top;
      const bottom = r.bottom - rect.top;
      cruiseCap[i] =
        top <= 0.5 && bottom >= VH - 0.5 && reach > 0 ? clamp(Math.min(-top, bottom - VH) / reach) : 1;
      return { cx: r.left - rect.left + r.width / 2, cy: top + r.height / 2, w: r.width };
    });
    stars.forEach((s) => {
      const box = boxes[s.k];
      if (!box) return;
      s.cx = box.cx;
      s.cy = box.cy;
      s.fw = box.w;
      // O elemento é LAYOUTADO no tamanho em que a foto vai PARAR, e o
      // encaixe escala pra baixo — nunca pra cima. Ele nascia do tamanho da
      // miniatura e crescia por transform, e o navegador rasteriza a imagem na
      // caixa, não no resultado do transform: num celular era uma caixa de
      // 70px recebendo scale(6.8). Deitado no tamanho final, o caminho vira
      // uma redução, sempre nítida. O Math.max é pro caso contrário (quiet):
      // a miniatura maior que o destino manda no layout.
      s.px = Math.max(FIELD.FEATURED_VMIN * vmin, box.w);
      s.el.style.width = `${s.px.toFixed(2)}px`;
      s.tf = '';
      s.pan = '';
    });
    field.classList.add('is-ready');
  };

  const setOff = (item: { el: HTMLElement; off: boolean }, off: boolean) => {
    if (item.off === off) return;
    item.off = off;
    item.el.classList.toggle('is-off', off);
  };

  // ——— a fita da entrada ———
  //
  // Único trecho da página que NÃO é função do scroll: a entrada roda no
  // relógio, porque acontece antes de haver o que rolar (ver RIBBON no
  // config). Quem manda nela é `intro`, escrito de fora por setIntro; em 1 a
  // entrada acabou e nada abaixo custa nada pelo resto da vida da página.
  //
  // As curvas são smoothstep, e não retas nem potências: elas saem do
  // repouso e VOLTAM ao repouso. Uma reta chega ao fim na mesma velocidade em
  // que andou e para de vez — o olho vê a animação ser interrompida em vez de
  // terminar.

  /** 1 = entrada terminada. Começa em 1 pra que uma página sem entrada
   *  (reload no meio, salto por link) já nasça montada. */
  let intro = 1;
  let lastT = 0;

  /** A posição visível da GALERIA de cada criação (ver `gallery` em
   *  data/creations.ts), por índice `k` — a outra exceção a "tudo é função da
   *  rolagem", igual `intro` acima: quem manda é o clique nas setas, não o
   *  scroll. Ausente = posição 0 (a foto de `image`). O main.ts anima a troca
   *  com um tween chamando `setGallery` a cada quadro dele, então o valor
   *  pode ser fracionário — é a mesma conta de `near` que já faz o
   *  cross-fade contínuo da evolução, só que a posição vem de fora em vez de
   *  vir do tempo de leitura. */
  const galleryPos = new Map<number, number>();

  const montaAt = () => smooth(clamp(intro / RIBBON.MONTA));
  const juntaAt = () => smooth(clamp((intro - RIBBON.PARADA) / (RIBBON.JUNTA - RIBBON.PARADA)));
  const estouroAt = () => smooth(clamp((intro - RIBBON.JUNTA) / (1 - RIBBON.JUNTA)));

  /** Quando a foto de posto `rank` entra, durante a montagem: as de cima da
   *  curva primeiro — é o que faz a fita se DESENHAR em vez de piscar. */
  const chegadaAt = (rank: number, monta: number) => {
    const inicio = ranks > 1 ? (rank / (ranks - 1)) * RIBBON.STAGGER : 0;
    return clamp((monta - inicio) / (1 - RIBBON.STAGGER));
  };

  /** Onde a foto de posto `rank` está na curva, já apertada por `k`.
   *  x = meio - AMPLITUDE·sen(2π·u) desenhado de cima pra baixo é um S. O
   *  aperto encolhe o COMPRIMENTO em volta do meio mas mantém a onda: a curva
   *  se fecha como uma mola, sem perder as voltas. */
  const ribbonAt = (rank: number, w: number, k: number, cresce: number) => {
    const u = ranks > 1 ? rank / (ranks - 1) : 0.5;
    const inset = RIBBON.PAD + u * (1 - 2 * RIBBON.PAD);
    const g = lerp(RIBBON.SEED, 1, cresce);
    const us = 0.5 + (inset - 0.5) * lerp(1, RIBBON.TIGHT_SPAN, k) * g;
    const amp =
      Math.min(RIBBON.AMPLITUDE * band.h, RIBBON.MAX_W * W) * lerp(1, RIBBON.TIGHT_AMP, k) * g;
    const alvo =
      RIBBON.CARD * band.h * lerp(1, RIBBON.TIGHT_SIZE, k) * g * (w / FIELD.SIZES_VMIN[1]);
    return {
      cx: band.x + band.w / 2 - amp * Math.sin(Math.PI * 2 * u),
      cy: band.y + band.h * us,
      px: alvo,
    };
  };

  // ——— os canais do encaixe ———

  const easeIn = settle(DOCK.IN[0], DOCK.IN[1]);
  const easeOut = settle(DOCK.OUT[0], DOCK.OUT[1]);

  /** O andamento da saída depois da espera (DOCK.RELEASE): 0 enquanto o texto
   *  sai, e de 0 a 1 no resto da saída. u é o tempo dentro do trecho. */
  const released = (u: number, p: Phases) =>
    clamp(((u - p.enter - p.hold) / p.exit - DOCK.RELEASE) / (1 - DOCK.RELEASE));

  /** O peso de um canal da criação k em t: 0 no canva, 1 na moldura. Sobe na
   *  janela dele dentro da entrada, fica em 1 na pausa e desce na saída pela
   *  janela ESPELHADA — quem chega por último sai primeiro. */
  const channel = (k: number, t: number, w: readonly [number, number]) => {
    const u = t - T.start(k);
    if (u <= 0 || u >= T.lengthOf(k)) return 0;
    const p = T.phasesOf(k);
    const span = w[1] - w[0];
    if (u < p.enter) return easeIn(clamp((u / p.enter - w[0]) / span));
    if (u < p.enter + p.hold) return 1;
    const v = released(u, p);
    return 1 - easeOut(clamp((v - (1 - w[1])) / span));
  };

  /** O peso cru, linear: sobe na entrada, 1 na pausa, desce na saída. Só a
   *  onda das ripas usa — e por ser linear e correr ao contrário na saída, a
   *  onda da saída é o espelho da da entrada. */
  const rawWeight = (k: number, t: number) => {
    const u = t - T.start(k);
    if (u <= 0 || u >= T.lengthOf(k)) return 0;
    const p = T.phasesOf(k);
    if (u < p.enter) return u / p.enter;
    if (u < p.enter + p.hold) return 1;
    return 1 - released(u, p);
  };

  const apply = (t: number) => {
    if (!W) measure();
    lastT = t;

    // A presença da criação no palco (o canal de luz dela) decide a
    // respiração do canva e se a passagem está aberta. Suave nas duas
    // pontas — sem as quinas lineares de antes.
    const a = t < T.H || t >= T.total ? -1 : Math.floor(T.slotAt(t));
    const presence = a < 0 ? 0 : channel(a, t, DOCK.WIN.light);
    const breath = 1 - (1 - FIELD.BREATH_MIN) * presence;
    const passage = 1 - presence;

    // a troca de faixa protegida (abertura → criações) cruza linearmente
    // numa janela centrada no fim da abertura
    const mix = clamp((t - (T.H - FIELD.SWAP / 2)) / FIELD.SWAP);
    const tw = T.warp(t);
    const cull = FIELD.CULL_VH * VH;

    // a foto tomou mais da metade da tela? então é ela que manda no
    // contraste do cromo da página, não o tema (ver covers)
    let cover = 0;
    for (let k = 0; k < frames.length; k++) {
      const d = channel(k, t, DOCK.WIN.size) * covers[k];
      if (d > cover) cover = d;
    }
    const over = cover > 0.5;
    if (over !== lastOver) {
      lastOver = over;
      if (over) root.dataset.overPhoto = '';
      else delete root.dataset.overPhoto;
    }

    // a entrada: enquanto ela corre, as fotos da fita mandam na cena
    const pronta = intro >= 1;
    const monta = pronta ? 1 : montaAt();
    const junta = pronta ? 1 : juntaAt();
    const estouro = pronta ? 1 : estouroAt();

    for (const c of common) {
      const h = c.px / c.ratio;
      let cx = c.x * W;
      let cy = c.yc * VH - c.rate * tw * VH;
      let scale = c.base;
      let fita = 0;

      // Na fita, a foto é levada da curva até o lugar dela no canva, por uma
      // mistura simples entre as duas poses. O tamanho é ESCALA e nunca
      // largura: reduzir é nítido.
      if (!pronta && c.rank >= 0) {
        const r = ribbonAt(c.rank, c.w, junta, monta);
        const destino = cx;
        cx = lerp(r.cx, cx, estouro);
        cy = lerp(r.cy, cy, estouro);
        // o leque: um arco pra fora do centro, máximo no meio do trajeto
        const lado = destino >= W / 2 ? 1 : -1;
        cx += lado * RIBBON.FAN * W * Math.sin(Math.PI * estouro);
        scale = lerp(r.px / c.px, c.base, estouro);
        // some ao chegar e some de novo ao se espalhar; o quadrado atrasa o
        // sumiço em relação ao movimento, pra ela viajar inteira
        fita = chegadaAt(c.rank, monta) * (1 - estouro * estouro);
      }

      // as que não estão na fita ficam fora enquanto a curva se desenha, e
      // entram JUNTO com o espalhar (o nível é multiplicado por `estouro`)
      const hidden = !pronta && c.rank < 0 && estouro <= 0;
      const meia = h * scale;
      if (hidden || cy + meia / 2 < -cull || cy - meia / 2 > VH + cull) {
        setOff(c, true);
        continue;
      }
      setOff(c, false);

      const t3 = `translate3d(${(cx - c.px / 2).toFixed(1)}px, ${(cy - h / 2).toFixed(1)}px, 0)`;
      const tf = scale === 1 ? t3 : `${t3} scale(${scale.toFixed(4)})`;
      if (tf !== c.tf) {
        c.tf = tf;
        c.el.style.transform = tf;
      }

      const hero = c.lit && c.heroOk ? FIELD.LIT : FIELD.GHOST;
      const stage = !c.lit
        ? FIELD.GHOST
        : c.stageOk
          ? FIELD.LIT
          : lerp(FIELD.GHOST, FIELD.PASSAGE.LIT, passage);
      // durante a entrada o nível de canva é segurado e só volta com o
      // estouro: senão a fita se desenharia por cima de uma cópia pálida dela
      const nivel = lerp(hero, stage, mix);
      const agora = pronta ? nivel : nivel * estouro;
      // a fita passa POR CIMA do teto do celular: ali ela não é fundo, é a
      // página inteira, e não há texto com que competir
      const o = Math.max(fita, Math.min(agora, cap)) * breath;
      const os = o < 0.002 ? '0' : o.toFixed(3);
      if (os !== c.o) {
        c.o = os;
        c.el.style.opacity = os;
      }
    }

    const thumb = FIELD.FEATURED_VMIN * vmin;

    for (const s of stars) {
      const dock = DOCKING[s.effect];
      if (!dock || !s.fw) {
        setOff(s, true);
        continue;
      }
      const st = T.start(s.k);
      const phk = T.phasesOf(s.k);
      const wPos = channel(s.k, t, DOCK.WIN.pos);
      const wSize = channel(s.k, t, DOCK.WIN.size);
      const wTurn = channel(s.k, t, DOCK.WIN.turn);
      const wLight = channel(s.k, t, DOCK.WIN.light);

      // Onde o canva a levaria. Na entrada, a pose de canva cruza a moldura
      // em tAlign (DOCK.LEAD); na saída ela parte de onde a foto foi
      // SOLTA (tFree, depois da espera de DOCK.RELEASE), e não de onde o canva
      // estaria — ele andou a pausa inteira, e a foto teria que correr
      // centenas de px num dente pra alcançá-lo. A troca de âncora acontece
      // com wPos = 1, onde a âncora não pesa nada: sem salto.
      const tAlign = st + phk.enter * DOCK.LEAD;
      const tFree = st + phk.enter + phk.hold + phk.exit * DOCK.RELEASE;
      const anchor = t < tFree ? tAlign : tFree;
      const from = dock.offset(s.from);
      const canvasCx = s.cx + from.dx * W;
      const canvasCy = s.cy + from.dy * VH + FIELD.RATE * (T.warp(anchor) - T.warp(t)) * VH;

      // a moldura deriva devagar a criação inteira (zero no meio da pausa);
      // o texto faz a MESMA conta no effects.ts
      const cruise = driftOf(s.k) * (st + phk.enter + phk.hold / 2 - t) * VH * cruiseCap[s.k];
      const fx = s.cx;
      const fy = s.cy + cruise;

      let cx = lerp(canvasCx, fx, wPos);
      let cy = lerp(canvasCy, fy, wPos);

      // O arco: a corda entre as duas poses girada 90°, sempre pro lado do
      // centro da tela, pesando sen(πw) — zero nas pontas, onde a velocidade
      // já é zero, então o arco não cria quina nenhuma.
      if (dock.arc && wPos > 0 && wPos < 1) {
        const ex = canvasCx - fx;
        const ey = canvasCy - fy;
        let nx = -ey;
        let ny = ex;
        const lado = Math.abs(W / 2 - fx) < 0.05 * W ? (s.k % 2 ? 1 : -1) : Math.sign(W / 2 - fx);
        if (Math.sign(nx || 1) !== lado) {
          nx = -nx;
          ny = -ny;
        }
        const bow = dock.arc * Math.sin(Math.PI * wPos);
        cx += nx * bow;
        cy += ny * bow;
      }

      const width = lerp(thumb, s.fw, wSize);
      const h = s.px / s.ratio;
      const sc = dock.reveal ? 1 : width / s.px;

      // as ripas: uma só foto, e cada ripa desce e se afasta das vizinhas no
      // momento dela da onda, do centro pras bordas
      let gap = 0;
      if (s.strips > 1) {
        const P = EFFECTS.PIECES;
        const mid = (s.strips - 1) / 2;
        const rank = mid ? Math.abs(s.strip - mid) / mid : 0;
        const x = clamp((rawWeight(s.k, t) - P.FROM - P.STAGGER * rank) / P.SPAN);
        const rip = Math.sin(Math.PI * x) ** 2;
        cy += rip * P.DROP * h * sc;
        gap = Math.round(((rip * P.GAP_PX) / Math.max(sc, 0.05)) * 100) / 100;
      }

      const drawn = h * sc;
      if (wPos === 0 && wSize === 0 && (cy + drawn / 2 < -cull || cy - drawn / 2 > VH + cull)) {
        setOff(s, true);
        continue;
      }
      setOff(s, false);

      // toFixed(2): as assentadas são longas e lentas, e em décimos de px elas
      // andariam em degraus
      const tx = (cx - s.px / 2).toFixed(2);
      const ty = (cy - h / 2).toFixed(2);
      let tf = `translate3d(${tx}px, ${ty}px, 0)`;
      let clip = '';
      if (dock.reveal) {
        // o iris: uma lente redonda do tamanho da miniatura que se abre até a
        // foto inteira; na pausa o recorte SAI ('none'), e com ele o repaint
        const r = lerp(thumb / 2, Math.hypot(s.px, h) / 2 + 1, wSize);
        clip = wSize >= 1 ? 'none' : `circle(${r.toFixed(1)}px at 50% 50%)`;
      } else {
        // A ordem é a correção: a perspectiva vem DEPOIS da translação, então
        // o ponto de fuga é o centro da própria foto — antes ele ficava no
        // canto do layout e a foto girada se via de esguelha (o paralelogramo).
        // E a escala vem por último, pra profundidade escalar com o tamanho
        // desenhado.
        const side: 1 | -1 = fx < W / 2 ? 1 : -1;
        const rot = dock.rotate?.(wTurn, side);
        if (rot) {
          const hg = dock.hinge?.(side) ?? { x: 0, y: 0 };
          const hx = hg.x * (s.px / 2) * sc;
          const hy = hg.y * (h / 2) * sc;
          tf +=
            ` perspective(${dock.perspective ?? 1000}px) translate(${hx.toFixed(1)}px, ${hy.toFixed(1)}px)` +
            ` rotateX(${rot.x.toFixed(2)}deg) rotateY(${rot.y.toFixed(2)}deg)` +
            ` translate(${(-hx).toFixed(1)}px, ${(-hy).toFixed(1)}px)`;
        }
        const roll = DOCK.ROLL * (s.k % 2 ? 1 : -1) * (1 - wTurn);
        if (Math.abs(roll) > 0.01) tf += ` rotate(${roll.toFixed(3)}deg)`;
        tf += ` scale(${sc.toFixed(4)})`;
      }

      if (tf !== s.tf) {
        s.tf = tf;
        s.el.style.transform = tf;
      }
      if (dock.reveal && clip !== s.clip) {
        s.clip = clip;
        s.el.style.clipPath = clip;
      }
      if (gap !== s.gap) {
        s.gap = gap;
        s.el.style.setProperty('--gap', String(gap));
      }

      // no canva ela é uma foto acesa como as outras; com a luz, é a criação
      // — opaca antes de estar grande, pra nunca haver uma foto grande fantasma
      let opNum = lerp(FIELD.LIT * breath, 1, wLight);

      // A EVOLUÇÃO (ou a GALERIA): quando há mais de um estágio, alguém
      // decide qual se vê. Na evolução é rolar a pausa de leitura (a única
      // fase em que dá pra rolar sem a criação inteira ir embora) — o mesmo
      // scroll que já revela o texto vira também a página do álbum, sempre
      // no primeiro estágio antes da pausa e no último depois dela. Na
      // galeria é o clique nas setas, via `galleryPos` (ver o comentário
      // dela lá em cima) — a criação inteira já pode estar parada, então não
      // há scroll nenhum pra ler. Os dois casos terminam na MESMA conta:
      // `pos` é a posição CONTÍNUA na fila de estágios, e cada estágio pesa o
      // triângulo de largura 2 centrado nele — só o vizinho mais próximo tem
      // peso > 0, então nunca dois estágios distantes aparecem misturados.
      if (s.stages > 1) {
        let pos: number;
        if (s.gallery) {
          pos = galleryPos.get(s.k) ?? 0;
        } else {
          // Um desenho de cada vez: a pausa é dividida em trechos iguais, um
          // por troca, e em cada trecho a moldura FICA no desenho e só troca
          // no miolo dele (SCROLL.STAGE_FADE do trecho). Um avanço contínuo
          // deixava sempre dois desenhos misturados, e nenhum parava tempo
          // bastante pra ser visto.
          const u = t - st;
          const x = clamp((u - phk.enter) / phk.hold) * (s.stages - 1);
          const seg = Math.min(s.stages - 2, Math.floor(x));
          const f = SCROLL.STAGE_FADE;
          pos = seg + smooth(clamp((x - seg - (1 - f) / 2) / f));
        }
        const near = smooth(clamp(1 - Math.abs(pos - s.stage)));
        opNum *= near;
      }

      const op = opNum.toFixed(3);
      if (op !== s.op) {
        s.op = op;
        s.el.style.opacity = op;
      }

      // O véu da composição `full` mora NA foto (ver o CSS): é --dock que diz
      // quanto dele existe. Na própria foto, ele vai aonde ela for — e não
      // fica escurecendo papel vazio quando ela sai.
      const d = Math.round(wSize * 1000) / 1000;
      if (d !== s.dock) {
        s.dock = d;
        s.el.style.setProperty('--dock', String(d));
      }

      // A foto anda DENTRO da moldura ao longo da criação: a imagem é deitada
      // FIELD.INNER.BLEED maior em cima e embaixo, e desce devagar enquanto a
      // moldura sobe — uma janela, com o que está atrás dela mais longe. Só
      // translação: nada estica.
      if (s.img) {
        const life = clamp((t - st) / T.lengthOf(s.k));
        const pan = ((2 * life - 1) * FIELD.INNER.BLEED * h).toFixed(2);
        if (pan !== s.pan) {
          s.pan = pan;
          s.img.style.transform = `translate3d(0, ${pan}px, 0)`;
        }
      }
    }
  };

  /** Move o relógio da ENTRADA (0 a 1) e redesenha no mesmo tempo de rolagem.
   *  É a única porta pra ela: o intro.ts roda um tween de 0 a 1 aqui e o resto
   *  do arquivo continua sem saber o que é um segundo. */
  const setIntro = (i: number) => {
    intro = clamp(i);
    apply(lastT);
  };

  /** Move a posição da GALERIA da criação `k` e redesenha no mesmo t (ver o
   *  comentário de `galleryPos` lá em cima). Fora do scroll — por isso
   *  reaplica explicitamente, do mesmo jeito que `setIntro`. */
  const setGallery = (k: number, pos: number) => {
    galleryPos.set(k, pos);
    apply(lastT);
  };

  return { measure, apply, setIntro, setGallery };
}
