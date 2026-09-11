// src/scripts/creations/timing.ts — ONDE cada criação está no tempo da página.
//
// A conta "abertura + k criações" morava em três arquivos (main.ts, field.ts,
// fieldLayout.ts), e cada ajuste de ritmo precisava achar as três. Agora mora
// aqui, e só aqui. Função pura, sem DOM: roda no cliente e no BUILD (a página
// confere antes de publicar que o andamento do canva nunca anda pra trás).
//
// A unidade é a da mestra: 1 segundo de timeline = 1 altura de tela de
// rolagem.
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
  /** o trecho de uma criação */
  SPC: number;
  phases: Phases;
  /** o fim da sequência presa */
  total: number;
  /** onde a criação k começa */
  start(k: number): number;
  /** o meio da pausa de leitura da criação k — onde os saltos pousam */
  holdOf(k: number): number;
  /** o tempo do CANVA no instante t (ver FIELD.TEMPO) */
  warp(t: number): number;
}

const s01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function timing(n: number): Timing {
  const H = SCROLL.HERO_SCREENS;
  const SPC = SCROLL.SCREENS_PER_CREATION;
  // as proporções do config não precisam somar 1 pra serem proporções
  const sum = SCROLL.PHASES.enter + SCROLL.PHASES.hold + SCROLL.PHASES.exit;
  const phases: Phases = {
    enter: (SPC * SCROLL.PHASES.enter) / sum,
    hold: (SPC * SCROLL.PHASES.hold) / sum,
    exit: (SPC * SCROLL.PHASES.exit) / sum,
  };
  const start = (k: number) => H + k * SPC;
  const total = H + n * SPC;
  const holdOf = (k: number) => start(k) + phases.enter + phases.hold * SCROLL.JUMP_INTO_HOLD;

  // O andamento do fundo: devagar na leitura, ligeiro nas passagens.
  //
  // É o tempo da página menos uma senoide com um período por criação, com o
  // vale da velocidade no meio da pausa. Por construção warp(H) = H e
  // warp(total) = total (a senoide dá n voltas inteiras), então o canva tem
  // a mesma altura de antes e a abertura e a soltura do pin não mudam de
  // lugar. O envelope `env` liga o andamento aos poucos depois da abertura e
  // o desliga antes do fim, pra velocidade do fundo não ter quina justo onde
  // o palco prende e solta.
  const A = FIELD.TEMPO;
  const R = SPC * FIELD.TEMPO_RAMP;
  const TAU = Math.PI * 2;
  const mid = phases.enter + phases.hold / 2;
  const th = (t: number) => (TAU * (t - H - mid)) / SPC;
  const s0 = Math.sin(th(H));
  const warp = (t: number) => {
    if (!A || t <= H || t >= total) return t;
    const env = s01((t - H) / R) * s01((total - t) / R);
    return t - ((A * SPC) / TAU) * (Math.sin(th(t)) - s0) * env;
  };

  return { n, H, SPC, phases, total, start, holdOf, warp };
}
