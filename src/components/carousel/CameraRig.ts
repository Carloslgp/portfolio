import * as THREE from 'three';
import gsap from 'gsap';
import { CAM } from './config';

// Anima um ESTADO, não a câmera direto. A cada frame recalculamos position a partir de {radius, height}.
export class CameraRig {
  camera: THREE.PerspectiveCamera;
  // nascemos já na vista lateral (sem reveal por enquanto — fica pra um prompt futuro)
  state = { radius: CAM.side.radius, height: CAM.side.height };

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.apply();
  }

  apply() {
    // posição fica num plano; a câmera sempre olha o centro
    this.camera.position.set(0, this.state.height, this.state.radius);
    this.camera.lookAt(0, 0, 0);
  }

  // PRESERVADO para um prompt futuro: topo (olhando pra baixo) → lateral.
  // Hoje NÃO é chamado — a câmera já entra na lateral pelo state inicial.
  reveal(): Promise<void> {
    this.state.radius = CAM.top.radius;
    this.state.height = CAM.top.height;
    this.apply();
    return new Promise((resolve) => {
      gsap.to(this.state, {
        radius: CAM.side.radius,
        height: CAM.side.height,
        duration: CAM.top.revealDur,
        ease: 'power3.inOut',
        onUpdate: () => this.apply(),
        onComplete: () => resolve(),
      });
    });
  }
}
