// src/scripts/creations/nav.ts — o contador lateral ("03 / 28").
//
// No palco ele é função do tempo da mestra, como o resto: nada de estado
// acumulado entre quadros e nada de transição CSS correndo atrás da rolagem.
// O número ROLA de um pro outro (--roll) numa janela centrada na fronteira
// entre duas criações — onde o olho está livre.
//
// O que é discreto continua discreto: o texto que o leitor de tela anuncia só
// muda quando o slide ativo muda.
import { NAV, OPENING } from './config';
import { smooth } from './effects';
import type { Timing } from './timing';

const round3 = (v: number) => Math.round(v * 1000) / 1000;
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export interface IndicatorInput {
  /** o contador inteiro: entra com a saída da abertura e sai no fim */
  nav: HTMLElement | null;
  /** o número de cada slide, na ordem ("01", "02"…) — vazio num intervalo
   *  (ver `Interlude` em data/creations.ts), que ocupa um lugar na rolagem
   *  sem ser uma criação */
  labels: string[];
  /** o texto escondido que o leitor de tela anuncia (aria-live) */
  sr: HTMLElement | null;
  /** a coluna de números que rola */
  roll: HTMLElement | null;
  /** avisado quando o slide ativo muda (o main.ts aquece as fotos e mostra as
   *  setas da galeria) */
  onActive?: (index: number) => void;
}

export function createIndicator({ nav, labels, sr, roll, onActive }: IndicatorInput) {
  const N = labels.length;
  let active = -2;
  let lastRoll = NaN;
  let lastAlpha = NaN;
  let lastOut = NaN;

  const setActive = (index: number) => {
    if (index === active) return;
    active = index;
    if (sr) sr.textContent = (index >= 0 && labels[index]) || '—';
    onActive?.(index);
  };

  const setRoll = (value: number) => {
    if (value === lastRoll) return;
    lastRoll = value;
    roll?.style.setProperty('--roll', String(value));
  };

  return {
    /** o palco: tudo sai de t */
    at(t: number, T: Timing) {
      // Entrar e sair também são conta, e não tween: um tween de variável na
      // ponta da mestra ficava preso no valor FINAL depois do refresh do
      // ScrollTrigger (medido: --nav-out em 0 desde o primeiro quadro, e o
      // contador sumido a página inteira). Como função de t não há o que
      // ficar preso.
      const alpha = round3(clamp((t - OPENING.NAV[0] * T.H) / (OPENING.NAV[1] * T.H)));
      const out = round3(clamp((T.total - t) / (T.phases.exit * NAV.OUT)));
      if (alpha !== lastAlpha) nav?.style.setProperty('--nav-alpha', String((lastAlpha = alpha)));
      if (out !== lastOut) nav?.style.setProperty('--nav-out', String((lastOut = out)));

      // o número mais próximo e o quanto já rolou pra ele, só dentro da janela
      const k = (t - T.H) / T.SPC;
      const c = Math.round(k);
      const u = clamp((k - c + NAV.ROLL_WINDOW / 2) / NAV.ROLL_WINDOW);
      setRoll(round3(Math.min(N - 1, Math.max(-1, c - 1 + smooth(u)))));
      setActive(t < T.H ? -1 : Math.min(N - 1, Math.floor(k)));
    },
    /** a versão simples: a ativa é quem cruza o meio da tela, e o CSS dá a
     *  transição (lá não há linha do tempo pra seguir) */
    still(index: number) {
      setRoll(index);
      setActive(index);
    },
  };
}
