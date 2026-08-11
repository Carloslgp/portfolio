// src/scripts/photos/motionBlur.ts — o borrão de movimento do mural.
//
// O blur() do CSS é isotrópico e não serve: borrar igual nos dois eixos lê
// como "desfocou", não como "está passando rápido". Aqui o desvio do
// feGaussianBlur é escrito POR EIXO (stdDeviation aceita "x y"), então o
// borrão fica alinhado ao vetor de movimento: pan horizontal borra só na
// horizontal, vertical só na vertical.
//
// Honestidade técnica: um feGaussianBlur não gira. Numa diagonal, a
// decomposição por eixos dá um borrão levemente mais "gordo" que o motion
// blur verdadeiro (que seria uma linha na direção do movimento). É a
// aproximação estável — a alternativa fiel (canvas/WebGL com kernel
// direcional) custaria uma segunda pipeline de render só pra este detalhe.
//
// Custo: com o filtro aplicado, o navegador rasteriza o container inteiro
// através do filtro a cada frame. Duas defesas moram aqui:
//   • parado (desvio < MIN_DEV), o atributo `filter` é REMOVIDO — o custo em
//     repouso é zero, não "um filtro que borra nada";
//   • em ponteiro grosso (touch/celular) o módulo nasce desligado
//     (BLUR.DISABLE_ON_COARSE) — é a degradação graciosa do plano.
import { BLUR } from './config';

export class MotionBlur {
  private vx = 0;              // velocidade suavizada (low-pass), px/s
  private vy = 0;
  private active = false;      // o filtro está aplicado agora?
  private enabled: boolean;

  constructor(
    private target: HTMLElement,
    private gaussian: SVGFEGaussianBlurElement,
    reduced: boolean,
  ) {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    // baixa animação desliga o blur por inteiro — é exatamente o tipo de
    // enfeite que a escolha do portão pediu pra não ver
    this.enabled = !reduced && !(BLUR.DISABLE_ON_COARSE && coarse);
  }

  /** chamada uma vez por frame com a velocidade real do conteúdo (px/s) */
  update(vx: number, vy: number, dt: number) {
    if (!this.enabled) return;

    // low-pass independente de framerate: o blur cresce e morre suave em vez
    // de piscar a cada tremida do dedo
    const a = 1 - Math.pow(1 - BLUR.SMOOTH, dt * 60);
    this.vx += (vx - this.vx) * a;
    this.vy += (vy - this.vy) * a;

    const speed = Math.hypot(this.vx, this.vy);

    // a curva velocidade→blur: normaliza pela velocidade de blur cheio,
    // aplica o expoente (segura o blur no pan lento) e clampa no MAX
    const t = Math.min(speed / BLUR.SPEED_FULL, 1);
    const dev = BLUR.MAX * Math.pow(t, BLUR.CURVE_EXP);

    if (dev < BLUR.MIN_DEV) {
      // parado: o filtro sai do elemento e o mural volta a custar zero
      if (this.active) {
        this.active = false;
        this.target.style.filter = '';
        this.gaussian.setAttribute('stdDeviation', '0 0');
      }
      return;
    }

    // reparte o desvio entre os eixos na proporção do vetor de movimento —
    // é isto que torna o borrão DIRECIONAL
    const devX = dev * (Math.abs(this.vx) / (speed || 1));
    const devY = dev * (Math.abs(this.vy) / (speed || 1));
    this.gaussian.setAttribute('stdDeviation', `${devX.toFixed(2)} ${devY.toFixed(2)}`);

    if (!this.active) {
      this.active = true;
      this.target.style.filter = 'url(#motion-blur)';
    }
  }

  /** corte seco (lightbox abrindo): o mural congela nítido */
  reset() {
    this.vx = this.vy = 0;
    this.active = false;
    this.target.style.filter = '';
    this.gaussian.setAttribute('stdDeviation', '0 0');
  }
}
