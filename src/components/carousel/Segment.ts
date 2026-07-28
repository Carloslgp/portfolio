import * as THREE from 'three';
import { SEG_ANGLE } from './config';

// Um segmento = uma seção = UMA foto na fita.
//
// Antes eram dois meshes (fatia de cilindro + plano) com crossfade de opacidade
// entre eles. Agora existe um só: a fita dobrável do Ribbon.ts, compartilhada
// por todos os segmentos e dobrada uma vez por frame no Carousel. Cada segmento
// só carrega a própria textura e a própria pose ao longo da fita.
export class Segment {
  index: number;
  mesh: THREE.Mesh;

  constructor(index: number, texture: THREE.Texture, geometry: THREE.BufferGeometry) {
    this.index = index;

    // as fotos estão guardadas giradas 90° (retrato salvo em arquivo paisagem);
    // desfazer o giro é a única correção que a fita precisa
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.center.set(0.5, 0.5);
    texture.rotation = -Math.PI / 2;
    texture.needsUpdate = true;

    // opaco de propósito: é o que mantém a foto na lista opaca do three e, com
    // isso, dentro do buffer que o vidro das labels refrata (ver Labels.ts)
    this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,   // pelos vãos do anel se enxerga o verso das fotos
    }));
    this.mesh.userData.segment = this;   // pro raycaster achar o caminho de volta
  }

  // ângulo do CENTRO deste segmento no anel — vira comprimento de arco no layout
  get centerAngle(): number {
    return this.index * SEG_ANGLE + SEG_ANGLE / 2;
  }
}
