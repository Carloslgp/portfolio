import * as THREE from 'three';
import { RADIUS, HEIGHT, ARC_WIDTH, RIBBON_SEGMENTS } from './config';

// O anel e a fita reta são a MESMA superfície: uma fita de comprimento FIXO cuja
// curvatura k vai de 1 (enrolada num cilindro de raio RADIUS) até 0 (esticada).
// O raio instantâneo é RADIUS/k — cresce até o infinito enquanto k → 0.
//
// Trabalhar em comprimento de arco é o que faz a animação funcionar: como o
// comprimento se conserva, nada estica nem encolhe no caminho, o anel só se
// abre. E os dois extremos caem exatamente onde os dois modos antigos viviam —
// k=1 reproduz o cilindro, k=0 entrega a fita reta em z = RADIUS.
const EPS = 1e-4;   // abaixo disso RADIUS/k estoura; usamos o caso reto direto

export type RibbonPose = { x: number; z: number; yaw: number };

// Pose de um ponto a `s` de comprimento de arco do centro da cena (o ponto da
// fita que encara a câmera). `yaw` é quanto a superfície girou ali — em k=1 é o
// ângulo no anel, em k=0 é zero (a fita inteira encara a câmera).
//
// `radius` é o raio mais fechado (o de k=1) e `front` é o plano ao qual a fita
// fica tangente no centro. Os dois nascem em RADIUS porque no anel da home eles
// são a mesma medida: a face frontal do cilindro É o raio dele. Quem separa os
// dois é o carrossel do About (ver Reel.ts), que usa uma fita muito mais aberta
// e tangente a z = 0.
export function ribbonPose(s: number, k: number, radius = RADIUS, front = radius): RibbonPose {
  if (k < EPS) return { x: s, z: front, yaw: 0 };
  const r = radius / k;
  const a = s / r;
  return { x: r * Math.sin(a), z: front - r * (1 - Math.cos(a)), yaw: a };
}

// aplica a pose num mesh (a fita é toda no plano y=0; só x, z e a guinada mudam)
export function placeOnRibbon(o: THREE.Object3D, pose: RibbonPose) {
  o.position.set(pose.x, 0, pose.z);
  o.rotation.y = pose.yaw;
}

// A geometria de repouso é a fita ESTICADA. Guardamos uma cópia dela porque a
// cada frame relemos daqui e escrevemos a versão dobrada no buffer vivo —
// dobrar em cima do que já está dobrado acumularia erro até deformar tudo.
export type RibbonRest = { position: Float32Array; normal: Float32Array | null };

// As medidas nascem nas do anel; quem passa outras é o carrossel do About, que
// tem contagem de fotos e proporção próprias.
export function makeRibbonGeometry(
  width = ARC_WIDTH,
  height = HEIGHT,
  segments = RIBBON_SEGMENTS,
): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(width, height, segments, 1);
}

export function captureRest(geo: THREE.BufferGeometry): RibbonRest {
  const normal = geo.attributes.normal;
  return {
    position: (geo.attributes.position.array as Float32Array).slice(),
    normal: normal ? (normal.array as Float32Array).slice() : null,
  };
}

// Dobra `geo` a partir da pose de repouso, com curvatura k. Cada vértice é
// tratado como estando a `x` de comprimento de arco do centro do próprio
// segmento: vira o ângulo x/r e sobe pro raio r + z.
//
// `lift` afasta a superfície radialmente antes de dobrar — é assim que o texto
// flutua à frente da foto e continua flutuando em qualquer curvatura.
//
// As normais NÃO são recalculadas (a solda de vértices que deixou o vidro liso
// se perderia): como a dobra é uma rotação em Y que varia com x, basta girar a
// normal original do mesmo ângulo.
export function bendRibbon(
  geo: THREE.BufferGeometry,
  rest: RibbonRest,
  k: number,
  lift = 0,
  radius = RADIUS,
) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const nor = geo.attributes.normal as THREE.BufferAttribute | undefined;
  const src = rest.position;
  const srcN = rest.normal;
  const straight = k < EPS;
  const r0 = straight ? 0 : radius / k;

  for (let i = 0; i < pos.count; i++) {
    const j = i * 3;
    const x = src[j];
    const y = src[j + 1];
    const z = src[j + 2] + lift;

    if (straight) {
      pos.setXYZ(i, x, y, z);
      if (nor && srcN) nor.setXYZ(i, srcN[j], srcN[j + 1], srcN[j + 2]);
      continue;
    }

    const a = x / r0;
    const sin = Math.sin(a);
    const cos = Math.cos(a);
    const r = r0 + z;
    pos.setXYZ(i, r * sin, y, r * cos - r0);

    if (nor && srcN) {
      const nx = srcN[j];
      const nz = srcN[j + 2];
      nor.setXYZ(i, nx * cos + nz * sin, srcN[j + 1], -nx * sin + nz * cos);
    }
  }

  pos.needsUpdate = true;
  if (nor) nor.needsUpdate = true;
}
