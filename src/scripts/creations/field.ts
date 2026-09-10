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
import { EFFECTS, FIELD, RIBBON, SCROLL } from './config';
import { DOCKING, smooth, type Phases } from './effects';

export interface FieldInput {
  field: HTMLElement;
  /** as fotos comuns ([data-cc-card]) */
  cards: HTMLElement[];
  /** as fotos das criações ([data-cc-featured]), tiras inclusas */
  featured: HTMLElement[];
  /** as molduras a medir, uma por criação, na ordem */
  frames: HTMLElement[];
  /** o vão entre as linhas do título, onde a fita da abertura corre */
  ribbon: HTMLElement | null;
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
    /** lugar na fita da abertura; -1 não participa (ver fieldLayout.ts) */
    rank: num(el.dataset.rank, -1),
    px: 0,
    off: false,
  }));

  const ranks = common.reduce((n, c) => Math.max(n, c.rank + 1), 0);

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

  // A criação a que cada moldura pertence, e o último --dock escrito nela.
  //
  // --dock é o quanto a foto JÁ CHEGOU (0 no canva, 1 encaixada), publicado
  // no elemento da criação pro CSS poder reagir. Existe por causa do véu da
  // composição `full`: ele escurece a tela pro texto branco ser legível sobre
  // a foto, e sem isto estaria em força total desde o primeiro quadro da
  // entrada — uma cortina preta sobre a página com a foto ainda a caminho,
  // longe dali. Amarrado ao peso, o véu só existe na medida em que a foto
  // existe, e desmancha na saída junto com ela.
  //
  // É a ÚNICA coisa que este arquivo sabe sobre composição: ele não lê qual
  // é, não trata `full` diferente de `duet`. Publica um número; o CSS decide
  // se usa.
  const hosts = frames.map((f) => f.closest<HTMLElement>('[data-cc-slide]'));
  const docked = hosts.map(() => -1);

  // Quanto da TELA a moldura de cada criação ocupa quando a foto está
  // encaixada (0 a 1), medido junto com o resto em measure().
  //
  // Isto não é saber qual composição é qual — é uma conta sobre a caixa que
  // este arquivo já mede de qualquer jeito. Vezes o encaixe, dá quanto da
  // tela está coberto de foto AGORA, e é o que a página precisa saber pra
  // decidir a cor do "‹ Voltar", do botão de tema e do indicador lateral:
  // eles são escuros, e uma foto ocupando a tela inteira os apaga. Sem isto a
  // composição `full` sairia bonita e sem navegação visível.
  const covers = frames.map(() => 0);
  let lastOver = false;
  const root = document.documentElement;

  let W = 0;
  let VH = 0;
  let vmin = 0;
  /** o vão entre as duas linhas do título, onde a fita corre. Medido, e não
   *  calculado, pelo mesmo motivo da moldura das criações: a tipografia decide
   *  onde o vão cai, e o motor só precisa saber a caixa. */
  let band = { x: 0, y: 0, w: 0, h: 0 };

  const measure = () => {
    const rect = field.getBoundingClientRect();
    W = rect.width;
    VH = rect.height;
    vmin = Math.min(W, VH) / 100;

    const slot = input.ribbon?.getBoundingClientRect();
    band = slot
      ? { x: slot.left - rect.left, y: slot.top - rect.top, w: slot.width, h: slot.height }
      : { x: 0, y: VH * 0.3, w: W, h: VH * 0.4 };
    common.forEach((c) => {
      c.px = c.w * vmin;
      c.el.style.width = `${c.px.toFixed(2)}px`;
    });
    const boxes = frames.map((frame, i) => {
      const r = frame.getBoundingClientRect();
      // a parte da moldura que cai DENTRO da tela, sobre a área da tela: uma
      // moldura que sangra pra fora (tower, edge, full) conta só o que se vê
      const dentro =
        Math.max(0, Math.min(r.right, rect.right) - Math.max(r.left, rect.left)) *
        Math.max(0, Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top));
      covers[i] = W && VH ? Math.min(1, dentro / (W * VH)) : 0;
      return { cx: r.left - rect.left + r.width / 2, cy: r.top - rect.top + r.height / 2, w: r.width };
    });
    stars.forEach((s) => {
      const box = boxes[s.k];
      if (!box) return;
      s.cx = box.cx;
      s.cy = box.cy;
      s.fw = box.w;
      // O elemento é LAYOUTADO no tamanho em que a foto vai PARAR, e o
      // encaixe escala pra baixo — nunca pra cima.
      //
      // A ordem importa e custou qualidade: antes ele nascia do tamanho da
      // miniatura (18vmin) e crescia por transform. Num celular isso é uma
      // caixa de 70px recebendo scale(6.8) pra cobrir a tela — e o navegador
      // rasteriza a imagem na caixa, não no resultado do transform. A GPU
      // então estica 70px de pixels rasterizados por 6.8, com o arquivo de
      // 1153px baixado e sem uso. O `backface-visibility: hidden` do .cc-card
      // sela isso: força camada própria, que é rasterizada uma vez.
      //
      // Deitado no tamanho final, o mesmo caminho vira uma redução — que é
      // sempre nítida — e a miniatura no canva passa a ser a foto grande
      // desenhada pequena, que é o que ela sempre foi conceitualmente.
      //
      // O Math.max é pro caso contrário: numa composição de moldura pequena
      // (quiet) a miniatura pode ser MAIOR que o destino, e aí quem manda no
      // layout é ela, pra continuar valendo "nunca ampliar".
      //
      // O iris não usa escala nenhuma (abre um recorte no tamanho da
      // moldura), e a conta acima já lhe dá exatamente isso.
      s.px = Math.max(FIELD.FEATURED_VMIN * vmin, box.w);
      s.el.style.width = `${s.px.toFixed(2)}px`;
    });
    field.classList.add('is-ready');
  };

  const setOff = (item: { el: HTMLElement; off: boolean }, off: boolean) => {
    if (item.off === off) return;
    item.off = off;
    item.el.classList.toggle('is-off', off);
  };

  // ——— a fita da abertura ———
  //
  // Três funções puras de t, como todo o resto deste arquivo. A abertura
  // inteira acontece em t ∈ [0, H]; depois disso `open` devolve 1 e nada aqui
  // custa nada.
  //
  // O tempo se parte em dois: o APERTO (até GATHER), em que a curva se fecha —
  // encolhe em amplitude, em comprimento e em tamanho de foto — e o ESTOURO,
  // em que cada foto vai da curva até o lugar dela no canva. O aperto existe
  // pra dar de onde partir: sem ele o estouro é só um espalhar, com ele é uma
  // coisa que se soltou.
  //
  // O estouro é uma potência, não uma reta: começa devagar (a fita ainda
  // parece inteira, o olho tem tempo de ver que ela É a página) e termina
  // rápido, com as fotas de fora indo embora depressa.

  /** Quanto da abertura já passou, 0 a 1. */
  const openAt = (t: number) => clamp(t / H);

  /** O aperto: 0 no início, 1 no instante em que o estouro começa. */
  const gatherAt = (p: number) => clamp(p / RIBBON.GATHER);

  /** O estouro: 0 enquanto ainda aperta, 1 quando a foto chegou ao canva. */
  const burstAt = (p: number) => {
    const u = clamp((p - RIBBON.GATHER) / (1 - RIBBON.GATHER));
    return Math.pow(u, RIBBON.FALL); // parte devagar, chega acelerando
  };

  /** Onde a foto de posto `rank` está na curva, já apertada por `k`.
   *
   *  x = meio - AMPLITUDE·sen(2π·u) é um período completo de senoide, que
   *  desenhado de cima pra baixo é um S: sai do meio, bojo pra um lado, cruza,
   *  bojo pro outro, volta ao meio. `u` é a posição na fita, 0 no topo.
   *
   *  O aperto encolhe o COMPRIMENTO em volta do meio (por isso `us`, e não
   *  `u`, na altura) mas mantém a onda em `u`: a curva se fecha como uma mola,
   *  sem perder as voltas. */
  const ribbonAt = (rank: number, w: number, k: number) => {
    const u = ranks > 1 ? rank / (ranks - 1) : 0.5;
    // recuado dentro do vão (PAD) porque a conta dá o CENTRO da foto: sem
    // isso metade da primeira e da última sobra pra fora, sobre o título
    const inset = RIBBON.PAD + u * (1 - 2 * RIBBON.PAD);
    const us = 0.5 + (inset - 0.5) * lerp(1, RIBBON.TIGHT_SPAN, k);
    // as duas medidas saem da ALTURA da faixa, pra curva ter a mesma forma em
    // qualquer tela (ver AMPLITUDE e CARD no config); a largura só entra como
    // freio, pra janela estreita
    const amp =
      Math.min(RIBBON.AMPLITUDE * band.h, RIBBON.MAX_W * W) * lerp(1, RIBBON.TIGHT_AMP, k);
    // o tamanho relativo entre as fotos se mantém: cada uma é o tamanho-base
    // vezes o quanto ela é maior ou menor que a foto média do canva
    const alvo = RIBBON.CARD * band.h * lerp(1, RIBBON.TIGHT_SIZE, k) * (w / FIELD.SIZES_VMIN[1]);
    return {
      cx: band.x + band.w / 2 - amp * Math.sin(Math.PI * 2 * u),
      cy: band.y + band.h * us,
      // nunca acima de 1: o caminho até o canva é uma ampliação, e passar do
      // tamanho natural do elemento custaria nitidez
      scale: Math.min(1, alvo / (w * vmin)),
    };
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

    // o quanto cada criação está encaixada, pro CSS da composição (ver hosts).
    // Só escreve quando o valor MUDA: as criações paradas são a maioria a
    // cada quadro, e escrever o mesmo número nelas é recálculo de estilo à toa
    let cover = 0;
    for (let k = 0; k < hosts.length; k++) {
      const d = Math.round(smooth(rawWeight(k, t)) * 1000) / 1000;
      if (d * covers[k] > cover) cover = d * covers[k];
      const host = hosts[k];
      if (!host || d === docked[k]) continue;
      docked[k] = d;
      host.style.setProperty('--dock', String(d));
    }

    // a foto tomou mais da metade da tela? então é ela que manda no
    // contraste do cromo da página, não o tema (ver covers). Marca, e não
    // número, porque o CSS só precisa do sim/não: a suavização vem das
    // transições de cor que o cromo já tinha pra troca de tema.
    const over = cover > 0.5;
    if (over !== lastOver) {
      lastOver = over;
      if (over) root.dataset.overPhoto = '';
      else delete root.dataset.overPhoto;
    }

    // a abertura: enquanto ela corre, as fotos da fita mandam na cena
    const p = openAt(t);
    const aberta = p >= 1;
    const gather = aberta ? 1 : gatherAt(p);
    const burst = aberta ? 1 : burstAt(p);

    for (const c of common) {
      const h = c.px / c.ratio;
      let cx = c.x * W;
      let cy = c.yc * VH - shift;
      let scale = 1;
      let fita = 0;

      // Na fita, a foto é levada da curva até o lugar dela no canva. O
      // caminho é uma mistura simples entre as duas poses, e é ele que faz o
      // "junta e cai": no fim do estouro a maioria já está fora da tela,
      // porque o lugar delas no canva é lá embaixo.
      //
      // O tamanho é ESCALA e nunca largura: o elemento continua deitado no
      // tamanho de canva, e a fita é ele desenhado menor (SCALE < 1). Reduzir
      // é nítido; o contrário custaria a qualidade que a foto das criações já
      // ensinou a não perder.
      if (!aberta && c.rank >= 0) {
        const r = ribbonAt(c.rank, c.w, gather);
        cx = lerp(r.cx, cx, burst);
        cy = lerp(r.cy, cy, burst);
        scale = lerp(r.scale, 1, burst);
        fita = 1 - burst;
      }

      // as que não estão na fita só entram quando ela já se desfez: durante a
      // abertura a cena é a curva, e um canva normal por baixo dela seria
      // ruído competindo com o gesto
      const hidden = !aberta && c.rank < 0;
      const meia = h * scale;
      if (hidden || cy + meia / 2 < -cull || cy - meia / 2 > VH + cull) {
        setOff(c, true);
        continue;
      }
      setOff(c, false);

      const t3 = `translate3d(${(cx - c.px / 2).toFixed(1)}px, ${(cy - h / 2).toFixed(1)}px, 0)`;
      c.el.style.transform = scale === 1 ? t3 : `${t3} scale(${scale.toFixed(4)})`;

      const hero = c.lit && c.heroOk ? FIELD.LIT : FIELD.GHOST;
      const stage = c.lit && c.stageOk ? FIELD.LIT : FIELD.GHOST;
      c.el.style.setProperty('--level', lerp(hero, stage, mix).toFixed(4));
      // na fita ela é a página inteira, então acesa por cima de qualquer
      // regra do canva — inclusive do teto do celular (ver o CSS do .cc-card)
      c.el.style.setProperty('--ribbon-a', fita.toFixed(4));
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
