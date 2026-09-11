// src/scripts/creations/type.ts — o ferramental da tipografia em movimento.
//
// Três coisas, todas só do palco (a versão simples nunca importa isto em
// execução — o main.ts sai antes):
//
//   • as curvas (CustomEase) com nome, pra effects.ts e opening.ts falarem a
//     mesma língua. Os números estão em config.ts → TYPE.EASE.
//   • a divisão dos TÍTULOS em palavras mascaradas (SplitText). Só palavras,
//     e só títulos, por três motivos:
//       — palavra reflui sozinha quando a janela muda ou a fonte chega; LINHA
//         precisaria ser redividida, e a redivisão automática do SplitText
//         recria a animação no relógio dela, não no da mestra;
//       — letra a letra, a Playfair perde o kerning;
//       — o aria-label que o SplitText põe no elemento dividido é confiável
//         num <h2>, e não num <p> ou num <a>. A descrição e o link não se
//         dividem: eles se revelam por máscara e recorte (ver o CSS).
//   • a pergunta "este navegador sabe mask-image com calc() nas paradas?",
//     que decide entre a lavagem da descrição e a opacidade de reserva. É a
//     MESMA condição do @supports do CSS da página — as duas têm que concordar.
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { SplitText } from 'gsap/SplitText';
import { TYPE } from './config';

gsap.registerPlugin(SplitText, CustomEase);

export const EASE = { INK: 'cc-ink', LIFT: 'cc-lift', WASH: 'cc-wash' } as const;
CustomEase.create(EASE.INK, TYPE.EASE.INK);
CustomEase.create(EASE.LIFT, TYPE.EASE.LIFT);
CustomEase.create(EASE.WASH, TYPE.EASE.WASH);

const splits: SplitText[] = [];

/** Divide um título em palavras, cada uma dentro de uma máscara
 *  (`.cc-wd-mask > .cc-wd`), e devolve as palavras. */
export function splitHeading(el: HTMLElement): HTMLElement[] {
  const split = SplitText.create(el, {
    type: 'words',
    mask: 'words',
    tag: 'span',
    wordsClass: 'cc-wd',
    aria: 'auto',
    autoSplit: false,
  });
  splits.push(split);
  return split.words as HTMLElement[];
}

/** Desfaz todas as divisões — pra quando o palco falha e a página volta pra
 *  versão simples, que tem que receber o texto como ele era. */
export function revertSplits() {
  splits.splice(0).forEach((split) => split.revert());
}

const PROBE = 'linear-gradient(#000 calc(1% + 1em), #000)';
export const WASH =
  typeof CSS !== 'undefined' &&
  (CSS.supports('mask-image', PROBE) || CSS.supports('-webkit-mask-image', PROBE));
