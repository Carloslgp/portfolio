// src/scripts/creations/nav.ts — o indicador lateral: um traço por criação e o
// contador.
//
// No palco ele é função do tempo da mestra, como o resto: nada de estado
// acumulado entre quadros (um salto deixava a barra de uma criação inativa
// parada no meio, pra sempre) e nada de transição CSS correndo atrás da
// rolagem. Três leituras, três canais:
//
//   --p  quanto de cada criação já passou: cheio pra trás, vazio pra frente,
//        parcial na atual — um livro-caixa, e não uma barra só
//   --f  a LENTE: um foco que desliza pelos traços com a rolagem e cresce o
//        traço debaixo dela (ver NAV.FOCUS_REACH)
//   --roll  o contador ROLA de um número pro outro, numa janela centrada na
//        fronteira entre duas criações — onde o olho está livre
//
// O que é discreto continua discreto: aria-current e o texto que o leitor de
// tela anuncia só mudam quando a criação ativa muda.
import { NAV, OPENING } from './config';
import { smooth } from './effects';
import type { Timing } from './timing';

const pad = (n: number) => String(n).padStart(2, '0');
const round3 = (v: number) => Math.round(v * 1000) / 1000;
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export interface IndicatorInput {
  /** o indicador inteiro: entra com a saída da abertura e sai no fim */
  nav: HTMLElement | null;
  items: HTMLElement[];
  /** o texto escondido que o leitor de tela anuncia (aria-live) */
  sr: HTMLElement | null;
  /** a coluna de números que rola */
  roll: HTMLElement | null;
  /** avisado quando a criação ativa muda (o main.ts aquece as fotos) */
  onActive?: (index: number) => void;
}

export function createIndicator({ nav, items, sr, roll, onActive }: IndicatorInput) {
  const N = items.length;
  let active = -2;
  const P = items.map(() => -1);
  const F = items.map(() => -1);
  let lastRoll = NaN;
  let lastAlpha = NaN;
  let lastOut = NaN;

  const setActive = (index: number) => {
    if (index === active) return;
    active = index;
    items.forEach((item, k) => {
      if (k === index) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    if (sr) sr.textContent = index < 0 ? '—' : pad(index + 1);
    onActive?.(index);
  };

  const setRoll = (value: number) => {
    if (value === lastRoll) return;
    lastRoll = value;
    roll?.style.setProperty('--roll', String(value));
  };

  const write = (k: number, p: number, f: number) => {
    if (p !== P[k]) items[k].style.setProperty('--p', String((P[k] = p)));
    if (f !== F[k]) items[k].style.setProperty('--f', String((F[k] = f)));
  };

  return {
    /** o palco: tudo sai de t */
    at(t: number, T: Timing) {
      // Entrar e sair também são conta, e não tween: um tween de variável na
      // ponta da mestra ficava preso no valor FINAL depois do refresh do
      // ScrollTrigger (medido: --nav-out em 0 desde o primeiro quadro, e o
      // indicador sumido a página inteira). Como função de t não há o que
      // ficar preso.
      const alpha = round3(clamp((t - OPENING.NAV[0] * T.H) / (OPENING.NAV[1] * T.H)));
      const out = round3(clamp((T.total - t) / (T.phases.exit * NAV.OUT)));
      if (alpha !== lastAlpha) nav?.style.setProperty('--nav-alpha', String((lastAlpha = alpha)));
      if (out !== lastOut) nav?.style.setProperty('--nav-out', String((lastOut = out)));

      const k = (t - T.H) / T.SPC;
      for (let i = 0; i < N; i++) {
        const p = round3(clamp(k - i));
        const f = round3(Math.max(0, 1 - Math.abs(k - i - 0.5) / NAV.FOCUS_REACH));
        write(i, p, f);
      }
      // o número mais próximo e o quanto já rolou pra ele, só dentro da janela
      const c = Math.round(k);
      const u = clamp((k - c + NAV.ROLL_WINDOW / 2) / NAV.ROLL_WINDOW);
      setRoll(round3(Math.min(N - 1, Math.max(-1, c - 1 + smooth(u)))));
      setActive(t < T.H ? -1 : Math.min(N - 1, Math.floor(k)));
    },
    /** a versão simples: a ativa é quem cruza o meio da tela, e o CSS dá a
     *  transição (lá não há linha do tempo pra seguir) */
    still(index: number) {
      for (let i = 0; i < N; i++) write(i, i <= index ? 1 : 0, i === index ? 1 : 0);
      setRoll(index);
      setActive(index);
    },
  };
}
