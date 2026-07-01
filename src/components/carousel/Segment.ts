import * as THREE from 'three';
import { RADIUS, HEIGHT, THETA_LEN, SEG_ANGLE, ARC_WIDTH } from './config';

// Um segmento = uma seção. Carrega DOIS meshes que compartilham a mesma foto:
//   - curved: fatia de cilindro (baked no ângulo do anel) — visível no modo CURVED
//   - flat:   um plano reto — visível no modo FLAT
// O crossfade de opacidade entre os dois faz a transição (ver Carousel.setMorph).
export class Segment {
  index: number;
  curved: THREE.Mesh;
  flat: THREE.Mesh;
  private curvedMat: THREE.MeshBasicMaterial;
  private flatMat: THREE.MeshBasicMaterial;

  constructor(index: number, texture: THREE.Texture) {
    this.index = index;

    // --- textura curva: face INTERNA sai espelhada e girada 90°; corrigimos aqui.
    // center/rotation/repeat/offset são os botões pra iterar ao vivo até a foto
    // ficar em pé, não-espelhada e bem enquadrada na janela curva.
    const curvedTex = texture.clone();
    curvedTex.colorSpace = THREE.SRGBColorSpace;
    curvedTex.wrapS = curvedTex.wrapT = THREE.RepeatWrapping;
    curvedTex.center.set(0.5, 0.5);
    curvedTex.rotation = -Math.PI / 2;   // desfaz o giro de 90°
    curvedTex.repeat.set(1, -1);         // desespelha / reenquadra (iterar sinais)
    curvedTex.offset.set(0, 1);
    curvedTex.needsUpdate = true;

    // thetaStart posiciona a fatia no anel; centralizamos aplicando metade do gap
    const thetaStart = index * SEG_ANGLE + (SEG_ANGLE - THETA_LEN) / 2;
    const curvedGeo = new THREE.CylinderGeometry(
      RADIUS, RADIUS, HEIGHT,
      48, 1, true,       // radialSegments alto = curva lisa; openEnded
      thetaStart, THETA_LEN,
    );
    this.curvedMat = new THREE.MeshBasicMaterial({
      map: curvedTex,
      side: THREE.DoubleSide,
      transparent: true,
    });
    this.curved = new THREE.Mesh(curvedGeo, this.curvedMat);
    this.curved.userData.segment = this;   // pra raycaster achar de volta

    // --- plano reto (modo FLAT): as fotos são armazenadas giradas 90° (retrato salvo
    // num arquivo paisagem), então aplicamos a MESMA rotação do curvo pra ficarem em pé.
    // A face plana não é espelhada, então basta a rotação (sem os flips do curvo).
    const flatTex = texture;
    flatTex.colorSpace = THREE.SRGBColorSpace;
    flatTex.center.set(0.5, 0.5);
    flatTex.rotation = -Math.PI / 2;
    flatTex.needsUpdate = true;
    const flatGeo = new THREE.PlaneGeometry(ARC_WIDTH, HEIGHT);
    this.flatMat = new THREE.MeshBasicMaterial({
      map: flatTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    this.flat = new THREE.Mesh(flatGeo, this.flatMat);
    this.flat.userData.segment = this;
  }

  // ângulo do CENTRO deste segmento — usado pelo snap e pela detecção de ativo
  get centerAngle(): number {
    return this.index * SEG_ANGLE + SEG_ANGLE / 2;
  }

  // crossfade curved↔flat: morph 0 = totalmente curvo, 1 = totalmente plano
  setMorph(morph: number) {
    this.curvedMat.opacity = 1 - morph;
    this.flatMat.opacity = morph;
    this.curved.visible = morph < 1;
    this.flat.visible = morph > 0;
  }

  setActive(_active: boolean) {
    // hover/ativo fica a cargo da camada 2D (label/card); nada no 3D por enquanto
  }
}
