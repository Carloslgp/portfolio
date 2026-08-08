import * as THREE from 'three';
import gsap from 'gsap';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { BACKDROP, CAM } from './config';
import { reducedMotion } from '../../scripts/motion';

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

    // Tema. O fundo atrás da palavra é o --paper do <body> (o canvas é
    // transparente), então quando o CSS inverte a página, a palavra tem que
    // inverter junto — quase-preta sobre quase-preto simplesmente some.
    // O estado mora no <html> (data-theme, ver scripts/theme.ts); aqui só se
    // lê na criação e se ouve a troca.
    this.applyTheme(document.documentElement.dataset.theme === 'dark');
    window.addEventListener('theme:change', (e) => {
      this.applyTheme((e as CustomEvent).detail.dark, true);
    });
  }

  // A troca ao vivo atravessa em tween, não num corte: o resto da página faz o
  // fade pelo --theme-fade do CSS (0.6s, global.css), e a palavra trocando de
  // cor num frame no meio dele leria como um defeito. Mesma dupla de números lá
  // e aqui, de propósito.
  private applyTheme(dark: boolean, animate = false) {
    const target = new THREE.Color(dark ? BACKDROP.colorDark : BACKDROP.color);
    gsap.killTweensOf(this.mat.color);
    if (!animate || reducedMotion()) {
      this.mat.color.copy(target);
      return;
    }
    gsap.to(this.mat.color, {
      r: target.r,
      g: target.g,
      b: target.b,
      duration: 0.6,
      ease: 'power1.inOut',
    });
  }

  // Encaixa a palavra na tela. Chamado na abertura e a cada resize, com o
  // viewRadius já atualizado — é ele que diz onde a câmera vai PARAR.
  //
  // Sem isto a palavra tinha largura fixa no mundo enquanto a janela visível
  // naquela profundidade dependia da proporção da tela: em retrato ela some
  // pelos dois lados (a 9:19,5 sobra menos da metade da largura de que precisa).
  // Recuar a câmera, que é o que resolve o enquadramento das fotos, aqui não
  // ajuda — afastar aumenta a distância, mas a largura visível cresce pela
  // proporção, e em retrato ela continua estreita.
  //
  // A câmera pousa em y = 0 olhando na horizontal (CAM.side.height), então a
  // faixa visível no plano da palavra é simétrica em torno do eixo — daí a
  // conta de altura ser só o meio-campo do fov.
  fit(camera: THREE.PerspectiveCamera, viewRadius: number) {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);

    // meia-janela visível no plano da palavra, na pose final (câmera olha em -z)
    const halfH = (viewRadius - BACKDROP.z) * tan;
    const halfW = halfH * camera.aspect;

    // Só encolhe, nunca aumenta: a medida do config é o tamanho pretendido, e
    // em tela larga ela já cabe — deixá-la crescer mudaria o desenho de quem
    // não tem problema nenhum.
    const s = Math.min(1, (halfW * 2 * BACKDROP.maxWidthFrac) / BACKDROP.width);
    this.mesh.scale.setScalar(s);

    // A altura vira fração da janela em vez de valor fixo. Em retrato a câmera
    // recua (pra foto caber), a janela cresce em altura — e um y fixo faria a
    // palavra escorregar pro meio do quadro, em cima do anel. Com a razão, ela
    // fica sempre na mesma altura RELATIVA em que está na tela larga.
    const halfRef = (CAM.side.radius - BACKDROP.z) * tan;
    this.mesh.position.y = BACKDROP.y * (halfH / halfRef);
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
