// src/scripts/creations/field.ts — o campo de fotos ao fundo, em movimento.
//
// Recebe o campo já montado pelo build (ver fieldLayout.ts: posição, tamanho,
// deriva e níveis por trecho vêm nos data-attributes) e devolve duas coisas
// que o main.ts liga à timeline mestra:
//
//   • uma timeline com a DERIVA — cada foto anda do ponto de partida até o de
//     chegada ao longo da PÁGINA INTEIRA, linear. Um tween por foto, sem
//     cadeia. É o "fundo rodando";
//   • uma função apply(t) com as LUZES — dado o tempo da mestra (em alturas
//     de tela), o nível de cada foto e a respiração do campo. O main.ts a
//     chama a cada render da mestra. É o "fundo mudando".
//
// Por que as luzes NÃO são tweens: são dezenas de trocas encadeadas na mesma
// variável de cada foto (uma por fronteira), e o refresh do ScrollTrigger
// renderiza a timeline ida e volta ao medir a página — no retorno, cada
// fromTo "rebobina" o valor que gravou como anterior, e com inicialização
// preguiçosa esses valores saem da ordem e o campo nascia todo apagado.
// Como função pura do tempo não existe estado gravado: o mesmo t dá sempre o
// mesmo campo, indo ou voltando, em reload no meio da página ou não — que é
// exatamente a promessa desta página.
//
// Níveis e respiração são variáveis CSS (--level em cada foto, --breath no
// campo) e a opacidade é o PRODUTO delas, calculado no CSS.
import gsap from 'gsap';
import { FIELD, SCROLL } from './config';
import type { Phases } from './effects';

export interface FieldDriver {
  /** a deriva, pra encaixar na mestra no tempo 0 */
  timeline: gsap.core.Timeline;
  /** escreve as luzes do instante t (tempo da mestra, em alturas de tela) */
  apply: (t: number) => void;
}

export function createField(
  field: HTMLElement,
  cards: HTMLElement[],
  creations: number,
  ph: Phases,
  total: number,
): FieldDriver {
  const H = SCROLL.HERO_SCREENS;
  const SPC = SCROLL.SCREENS_PER_CREATION;
  const LEVEL = [0, FIELD.GHOST, FIELD.LIT];
  const half = FIELD.SWAP / 2;

  // ——— deriva ———
  const timeline = gsap.timeline();
  cards.forEach((card) => {
    timeline.fromTo(
      card,
      { x: 0, y: 0 },
      {
        x: `${card.dataset.dx ?? 0}vh`,
        y: `${card.dataset.dy ?? 0}vh`,
        duration: total,
        ease: 'none',
        immediateRender: true,
      },
      0,
    );
  });

  // ——— luzes ———
  // os níveis de cada foto por trecho: [abertura, criação 1, criação 2, …]
  const levels = cards.map((card) =>
    (card.dataset.levels ?? '').split(',').map((n) => LEVEL[Number(n)] ?? 0),
  );

  /** Em que trecho o instante t está: 0 é a abertura, s ≥ 1 é a criação s. */
  const segmentAt = (t: number, count: number) =>
    t < H ? 0 : Math.min(count - 1, 1 + Math.floor((t - H) / SPC));

  /** A fronteira entre o trecho s-1 e o trecho s. */
  const boundary = (s: number) => H + (s - 1) * SPC;

  /** O nível de uma foto em t: o do trecho, exceto dentro da janela de troca
   *  centrada numa fronteira, onde ele cruza linearmente de um pro outro. As
   *  janelas não se encostam (SWAP é menor que a abertura e que uma criação),
   *  então no máximo uma vale por vez. */
  const levelAt = (lv: number[], t: number) => {
    const s = segmentAt(t, lv.length);
    if (s + 1 < lv.length && t > boundary(s + 1) - half) {
      const k = Math.min(1, (t - (boundary(s + 1) - half)) / FIELD.SWAP);
      return lv[s] + (lv[s + 1] - lv[s]) * k;
    }
    if (s >= 1 && t < boundary(s) + half) {
      const k = Math.max(0, (t - (boundary(s) - half)) / FIELD.SWAP);
      return lv[s - 1] + (lv[s] - lv[s - 1]) * k;
    }
    return lv[s];
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

  const apply = (t: number) => {
    field.style.setProperty('--breath', breathAt(t).toFixed(4));
    cards.forEach((card, i) => {
      card.style.setProperty('--level', levelAt(levels[i], t).toFixed(4));
    });
  };

  return { timeline, apply };
}
