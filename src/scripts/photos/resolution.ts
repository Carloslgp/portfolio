// src/scripts/photos/resolution.ts — quantos pixels reais esta tela merece.
//
// Duas perguntas, uma conta só:
//
//   • quantos pixels o canvas DESENHA por pixel de CSS  (tunnelRenderer.ts)
//   • qual variante da foto ele BAIXA pra desenhar      (photos.ts)
//
// Elas moram juntas porque são a mesma conta lida de duas pontas. Separadas,
// divergiriam na primeira vez que alguém mexesse num dos dois lados — e as duas
// formas de divergir são desperdício: ou o mural desenha detalhe que não baixou
// (borrão), ou baixa detalhe que não desenha (dado jogado fora).

import { GL } from './config';
import { targetRowHeight } from './layout';

/** "O ponteiro é um dedo?" — a pergunta que de fato acompanha uma GPU de
 *  orçamento apertado, e a mesma que o blur do mural já faz (BLUR
 *  .DISABLE_ON_COARSE) e o carrossel da home também. */
export const coarsePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/**
 * Quantos pixels reais por pixel de CSS o canvas do mural desenha.
 *
 * O teto vem do ponteiro. O orçamento, só no touch, é o que impede o teto de
 * virar cheque em branco numa tela grande: um tablet de 1024×1366 em dpr 2
 * desenharia 5,6 megapixels, mais que um notebook. Os três números e o motivo
 * de cada um estão em config.ts → GL.
 */
export function canvasPixelRatio(
  viewW: number,
  viewH: number,
  coarse = coarsePointer(),
): number {
  const ratio = Math.min(window.devicePixelRatio || 1, coarse ? GL.PIXEL_RATIO_COARSE : GL.PIXEL_RATIO);
  if (!coarse) return ratio;

  // a razão entra ao QUADRADO na conta de pixels, então quem cabe no orçamento
  // é a raiz dele — e nunca menos que 1, senão uma tela enorme acabaria
  // desenhando abaixo do próprio CSS
  const area = Math.max(1, viewW * viewH);
  return Math.max(1, Math.min(ratio, Math.sqrt(GL.PIXEL_BUDGET_COARSE / area)));
}

/**
 * Quantos pixels de FONTE o tile desta foto pede NESTA tela.
 *
 * O tile tem a altura da linha justificada e a largura que a proporção da foto
 * pedir — é por isso que a mesma tela pede coisas muito diferentes de uma foto
 * em pé e de uma deitada, e por que um número único de thumb serve mal às duas.
 *
 * A altura da linha é a mesma função que o layout usa (nunca uma cópia dela): é
 * ela que faz o celular em pé pedir menos, com linha de ~175px onde a tela
 * grande tem 300 — e é daí que sai o telefone não pagar pela variante grande.
 */
export function sourcePixelsFor(aspect: number): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return targetRowHeight(w) * aspect * canvasPixelRatio(w, h);
}

