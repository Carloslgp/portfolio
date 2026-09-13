// src/scripts/creations/timing.ts — ONDE cada criação está no tempo da página.
//
// A conta "abertura + k criações" morava em três arquivos (main.ts, field.ts,
// fieldLayout.ts), e cada ajuste de ritmo precisava achar as três. Agora mora
// aqui, e só aqui. Função pura, sem DOM: roda no cliente e no BUILD (a página
// confere antes de publicar que o andamento do canva nunca anda pra trás).
//
// A unidade é a da mestra: 1 segundo de timeline = 1 altura de tela de
// rolagem.
//
// Quase toda criação tem o mesmo trecho (SCROLL.SCREENS_PER_CREATION). A
// exceção é a que tem `evolution`: a pausa de leitura dela cresce pra caber os
// estágios (ver extraHold), e por isso nada fora daqui pode supor que a
// criação k começa em H + k·SPC — é pra isso que existem start, lengthOf,
// phasesOf e slotAt.
import { FIELD, SCROLL } from './config';

/** As três fases de uma criação, em alturas de tela. */
export interface Phases {
  enter: number;
  hold: number;
  exit: number;
}

export interface Timing {
  /** quantas criações */
  n: number;
  /** o trecho da abertura */
  H: number;
  /** o trecho de uma criação COMUM (a de pausa esticada é mais longa, ver
   *  lengthOf) */
  SPC: number;
  /** as fases de uma criação comum */
  phases: Phases;
  /** o fim da sequência presa */
  total: number;
  /** onde a criação k começa */
  start(k: number): number;
  /** o trecho inteiro da criação k */
  lengthOf(k: number): number;
  /** as fases da criação k: as de `phases`, com a pausa esticada quando ela
   *  tem (ver extraHold) */
  phasesOf(k: number): Phases;
  /** onde t cai, contado em criações: k exato no começo da criação k, e a
   *  fração do trecho dela no meio. Negativo na abertura, n ou mais depois do
   *  fim. */
  slotAt(t: number): number;
  /** o meio da pausa de leitura da criação k — onde os saltos pousam */
  holdOf(k: number): number;
  /** o tempo do CANVA no instante t (ver FIELD.TEMPO) */
  warp(t: number): number;
}

/** Quanto a pausa de leitura de uma criação com `stages` estágios (a foto
 *  mais os de `evolution`) cresce além da comum, em telas: SCROLL.
 *  SCREENS_PER_STAGE por troca de desenho. Zero quando a pausa comum já
 *  basta. A página chama isto no build e escreve o resultado no slide
 *  (data-cc-hold), que o main.ts lê — as duas pontas usam a mesma conta. */
export function extraHold(stages: number): number {
  const sum = SCROLL.PHASES.enter + SCROLL.PHASES.hold + SCROLL.PHASES.exit;
  const base = (SCROLL.SCREENS_PER_CREATION * SCROLL.PHASES.hold) / sum;
  return Math.max(0, (stages - 1) * SCROLL.SCREENS_PER_STAGE - base);
}

const s01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** @param holds quantas criações há — ou, quando alguma tem a pausa esticada,
 *  a pausa A MAIS de cada uma, em telas (0 nas comuns; ver extraHold) */
export function timing(holds: number | readonly number[]): Timing {
  const extra = typeof holds === 'number' ? Array.from({ length: holds }, () => 0) : [...holds];
  const n = extra.length;
  const H = SCROLL.HERO_SCREENS;
  const SPC = SCROLL.SCREENS_PER_CREATION;
  // as proporções do config não precisam somar 1 pra serem proporções
  const sum = SCROLL.PHASES.enter + SCROLL.PHASES.hold + SCROLL.PHASES.exit;
  const phases: Phases = {
    enter: (SPC * SCROLL.PHASES.enter) / sum,
    hold: (SPC * SCROLL.PHASES.hold) / sum,
    exit: (SPC * SCROLL.PHASES.exit) / sum,
  };

  const starts: number[] = [];
  let at = H;
  for (let k = 0; k < n; k++) {
    starts.push(at);
    at += SPC + extra[k];
  }
  const total = at;

  const start = (k: number) => (k <= 0 ? H + k * SPC : k >= n ? total + (k - n) * SPC : starts[k]);
  const lengthOf = (k: number) => SPC + (extra[k] ?? 0);
  const phasesOf = (k: number): Phases => (extra[k] ? { ...phases, hold: phases.hold + extra[k] } : phases);
  const slotAt = (t: number) => {
    if (t < H || !n) return (t - H) / SPC;
    if (t >= total) return n + (t - total) / SPC;
    let k = n - 1;
    while (k > 0 && starts[k] > t) k--;
    return k + (t - starts[k]) / lengthOf(k);
  };
  const holdOf = (k: number) => {
    const p = phasesOf(k);
    return start(k) + p.enter + p.hold * SCROLL.JUMP_INTO_HOLD;
  };

  // O andamento do fundo: devagar na leitura, ligeiro nas passagens.
  //
  // É o tempo da página menos uma senoide que dá UMA volta por criação, com o
  // vale da velocidade no meio da pausa. Cada criação faz a volta no próprio
  // trecho, então o desvio começa e termina em zero em toda fronteira — é o
  // que deixa a criação de pausa esticada conviver com as outras sem degrau no
  // fundo (com trechos iguais a conta é a mesma de quando a senoide era uma só
  // pra página inteira). Por construção warp(H) = H e warp(total) = total,
  // então o canva tem a mesma altura de antes e a abertura e a soltura do pin
  // não mudam de lugar. O envelope `env` liga o andamento aos poucos depois da
  // abertura e o desliga antes do fim, pra velocidade do fundo não ter quina
  // justo onde o palco prende e solta.
  const A = FIELD.TEMPO;
  const R = SPC * FIELD.TEMPO_RAMP;
  const TAU = Math.PI * 2;
  const warp = (t: number) => {
    if (!A || t <= H || t >= total) return t;
    const k = Math.min(n - 1, Math.floor(slotAt(t)));
    const L = lengthOf(k);
    const p = phasesOf(k);
    const mid = p.enter + p.hold / 2;
    const th = (u: number) => (TAU * (u - mid)) / L;
    const env = s01((t - H) / R) * s01((total - t) / R);
    return t - ((A * L) / TAU) * (Math.sin(th(t - starts[k])) - Math.sin(th(0))) * env;
  };

  return { n, H, SPC, phases, total, start, lengthOf, phasesOf, slotAt, holdOf, warp };
}
