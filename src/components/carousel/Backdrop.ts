import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { BACKDROP } from './config';

// A palavra gigante do fundo.
//
// Era uma <div> fixa atrás do canvas: plana e imune à câmera, então ficava
// parada enquanto a cena inteira se mexia. Aqui ela vira geometria de verdade,
// ganha perspectiva e entra na descida da entrada junto com o resto.
//
// O material é MeshBasicMaterial na mesma cor da <div> antiga, de propósito:
// sem luz, a silhueta continua chapada igual antes — o que muda é só o fato de
// agora ela viver no espaço, não colada no vidro da tela.
export class Backdrop {
  mesh!: THREE.Mesh;
  private mat!: THREE.MeshBasicMaterial;

  init(font: Font) {
    const geo = new TextGeometry(BACKDROP.text, {
      font,
      size: 1,          // tamanho real vem do escalonamento abaixo
      depth: 0.04,      // extrusão mínima; com material sem luz é só silhueta
      curveSegments: 12,
      bevelEnabled: false,
    });

    // escala pela largura medida: assim trocar a fonte ou o texto não exige
    // recalcular tamanho na mão — a palavra sempre ocupa BACKDROP.width
    geo.center();
    geo.computeBoundingBox();
    const w = geo.boundingBox!.max.x - geo.boundingBox!.min.x;
    const fit = BACKDROP.width / w;
    geo.scale(fit, fit, fit);

    this.mat = new THREE.MeshBasicMaterial({
      color: BACKDROP.color,
      transparent: true,
      opacity: 0,
    });

    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.set(0, BACKDROP.y, BACKDROP.z);
  }

  // Acende conforme a câmera desce. Lá de cima a palavra está fora do
  // enquadramento (e seria vista de fio, já que a normal aponta pra +z), então
  // sem isto ela entraria no quadro de supetão pela borda quando a câmera cai.
  setReveal(p: number) {
    const [a, b] = BACKDROP.fade;
    const o = THREE.MathUtils.smoothstep(p, a, b);
    this.mat.opacity = o;
    this.mesh.visible = o > 0.001;
  }
}
