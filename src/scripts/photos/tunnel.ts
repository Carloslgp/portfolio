// src/scripts/photos/tunnel.ts — a projeção do mural na parede interna de um
// tubo. O layout continua sendo um plano 2D infinito; esta classe é só a lente
// que transforma cada foto depois que a física decidiu onde ela está.
//
// A posição lógica nunca é medida do DOM. Os quatro limites do tile em tela
// saem de `mundo − câmera`, e deles vem um plano 3D que liga os mesmos pontos da
// superfície usados pelos vizinhos. Assim não existe getBoundingClientRect() no
// loop, fresta entre placas tangentes nem um segundo sistema de scroll.
import { TUNNEL } from './config';

export interface TunnelRect {
  node: HTMLElement;
  wx: number;
  wy: number;
  w: number;
  h: number;
}

interface Point {
  x: number;
  y: number;
}

interface SurfacePoint {
  position: number;
  depth: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export class TunnelProjection {
  private viewW = 1;
  private viewH = 1;
  private perspective = TUNNEL.PERSPECTIVE_MIN;
  private strength: number;
  private readonly enabled: boolean;
  private readonly coarse: boolean;

  constructor(
    private viewport: HTMLElement,
    private stage: HTMLElement,
    reduced: boolean,
    initialStrength: number,
  ) {
    this.enabled = !reduced;
    this.coarse = window.matchMedia('(pointer: coarse)').matches;
    this.strength = this.enabled ? clamp(initialStrength, 0, 1) : 0;
    this.resize();
  }

  /** Recalcula a lente. Altura também importa: barras móveis e rotação do
   * aparelho mudam o centro e o raio vertical mesmo quando a largura é igual. */
  resize() {
    this.viewW = Math.max(this.viewport.clientWidth, 1);
    this.viewH = Math.max(this.viewport.clientHeight, 1);
    this.perspective = Math.max(
      Math.hypot(this.viewW, this.viewH) * TUNNEL.PERSPECTIVE_DIAG,
      TUNNEL.PERSPECTIVE_MIN,
    );
    this.stage.style.perspective = `${this.perspective.toFixed(2)}px`;
  }

  setStrength(value: number): boolean {
    const next = this.enabled ? clamp(value, 0, 1) : 0;
    if (Math.abs(next - this.strength) < 0.0001) return false;
    this.strength = next;
    return true;
  }

  /** Posiciona um botão como o cordel 3D entre seus quatro limites na parede.
   *
   * A superfície é separável: X curva em (x, 0, zx) e Y em (0, y, zy). Por isso
   * os quatro cantos de qualquer tile formam um paralelogramo 3D e cabem numa
   * matrix3d afim, mesmo quando os dois eixos estão inclinados. O ganho sobre
   * girar uma placa pela tangente do centro é decisivo: duas fotos contíguas
   * amostram a MESMA coordenada global na emenda, então o gap continua com a
   * largura do layout enquanto a parede se curva. */
  project(rect: TunnelRect, origin: Point, offset: Point) {
    const flatX = rect.wx - origin.x;
    const flatY = rect.wy - origin.y;

    if (this.strength <= 0.0001) {
      rect.node.style.transform = `translate3d(${flatX}px, ${flatY}px, 0)`;
      return;
    }

    const maxAngle = this.coarse ? TUNNEL.MAX_ANGLE_COARSE : TUNNEL.MAX_ANGLE;
    const maxYAngle = maxAngle * TUNNEL.VERTICAL_WEIGHT;
    const left = rect.wx - offset.x - this.viewW / 2;
    const top = rect.wy - offset.y - this.viewH / 2;
    const x0 = this.blendedSurface(left, this.viewW / 2, maxAngle);
    const x1 = this.blendedSurface(left + rect.w, this.viewW / 2, maxAngle);
    const y0 = this.blendedSurface(top, this.viewH / 2, maxYAngle);
    const y1 = this.blendedSurface(top + rect.h, this.viewH / 2, maxYAngle);

    // O plano pai já carrega (origin - offset). A translação abaixo desconta
    // esse passo para o canto superior esquerdo terminar em (centro + surface).
    const parentX = origin.x - offset.x;
    const parentY = origin.y - offset.y;
    const tx = this.viewW / 2 + x0.position - parentX;
    const ty = this.viewH / 2 + y0.position - parentY;
    const tz = x0.depth + y0.depth;

    // Colunas X/Y da matrix3d: cada pixel local percorre o cordel do seu eixo.
    // A terceira coluna só mantém a matriz inversível; o elemento vive em z=0.
    const xx = (x1.position - x0.position) / rect.w;
    const xz = (x1.depth - x0.depth) / rect.w;
    const yy = (y1.position - y0.position) / rect.h;
    const yz = (y1.depth - y0.depth) / rect.h;

    rect.node.style.transform = `matrix3d(` +
      `${xx.toFixed(7)}, 0, ${xz.toFixed(7)}, 0, ` +
      `0, ${yy.toFixed(7)}, ${yz.toFixed(7)}, 0, ` +
      `0, 0, 1, 0, ` +
      `${tx.toFixed(3)}, ${ty.toFixed(3)}, ${tz.toFixed(3)}, 1)`;
  }

  /** Mistura o plano com o arco ANTES de montar os cordéis. Assim a emenda
   * entre vizinhos continua exata também nos quadros intermediários da entrada. */
  private blendedSurface(distance: number, halfView: number, maxAngle: number): SurfacePoint {
    const curved = this.axisSurface(distance, halfView, maxAngle);
    return {
      position: distance + (curved.position - distance) * this.strength,
      depth: curved.depth * this.strength,
    };
  }

  /** Um eixo do tubo como arco circular. Depois do limite do viewport a curva
   * continua pela tangente em vez de ser clampada no mesmo ponto — os tiles de
   * overscan não se empilham antes de a virtualização reciclá-los. */
  private axisSurface(distance: number, halfView: number, maxAngle: number) {
    if (maxAngle <= 0.0001) return { position: distance, depth: 0 };

    const radius = halfView / maxAngle;
    const sign = Math.sign(distance) || 1;
    const abs = Math.abs(distance);
    const arcLimit = radius * maxAngle;
    const angleAbs = Math.min(abs / radius, maxAngle);
    let position = radius * Math.sin(angleAbs);
    let depth = radius * (1 - Math.cos(angleAbs));

    if (abs > arcLimit) {
      const extra = abs - arcLimit;
      position += extra * Math.cos(maxAngle);
      depth += extra * Math.sin(maxAngle);
    }

    return {
      position: position * sign,
      depth,
    };
  }
}
