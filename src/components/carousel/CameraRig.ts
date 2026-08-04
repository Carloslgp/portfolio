import * as THREE from 'three';
import { CAM, PARALLAX_AMP, PARALLAX_EASE, RADIUS, SHATTER } from './config';

// Dono ÚNICO da pose da câmera.
//
// Duas coisas mexem nela e precisam se COMPOR em vez de brigar: a entrada
// (de cima até a lateral) e o parallax do mouse. Enquanto o parallax escrevia
// camera.position direto no loop do Carousel, qualquer tween aqui era apagado
// no frame seguinte — era por isso que o reveal existia mas nunca rodava.
// Agora ele é um estado (progress) e só este update() escreve a câmera.
//
// A entrada NÃO usa GSAP: ela anda pelo relógio do próprio render loop, com o
// passo limitado por MAX_STEP. Isso é de propósito. Animação por tempo de
// parede atravessa congelamento de thread: se o primeiro frame demora, o
// relógio corre por baixo do travamento e a câmera aparece já no destino.
// Somando frame a frame, com teto no passo, um engasgo ATRASA a entrada em vez
// de comê-la — a animação é vista inteira mesmo numa máquina lenta.
const MAX_STEP = 1 / 20;   // segundos: teto do avanço por frame

// mesma curva do 'power3.inOut' que o resto do site usa
const easeInOutCubic = (t: number) =>
  (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class CameraRig {
  // Mergulho na foto da frente: 0 = pose lateral normal, 1 = colado nela.
  // Tweenado por GSAP (ver Carousel.enterAbout) — ao contrário da entrada, aqui
  // um engasgo de frame não estraga nada, porque não há cortina esperando.
  dive = 0;

  // 0 = de cima, olhando o anel de cara; 1 = na lateral, encarando a foto ativa.
  // Nasce em cima: assim o primeiro frame desenhado JÁ é a vista de topo, e a
  // cortina de carregamento abre sobre ela. Quem desce daqui é reveal().
  private progress = 0;
  private elapsed = 0;
  private entering = false;
  private onArrive: (() => void) | null = null;

  private pointer = { x: 0, y: 0 };        // mouse normalizado (-1..1)
  private eased = { x: 0, y: 0 };          // versão suavizada (o parallax segue esta)

  constructor(private camera: THREE.PerspectiveCamera) {}

  // quanto da entrada já correu (0 em cima, 1 assentado) — o Backdrop usa isto
  get revealProgress(): number {
    return this.progress;
  }

  setPointer(x: number, y: number) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  // Entrada da página: a câmera desce de cima do anel até a lateral.
  // Resolve quando assenta — o Carousel só libera o controle depois disso.
  // Exige que o render loop já esteja rodando: é ele que faz o tempo andar.
  reveal(): Promise<void> {
    this.progress = 0;
    this.elapsed = 0;
    this.entering = true;
    return new Promise((resolve) => { this.onArrive = resolve; });
  }

  // Chamado todo frame. `dt` em segundos; `viewRadius` é a distância lateral já
  // ajustada à proporção da tela (entra no lerp, então a entrada termina no
  // enquadramento certo mesmo em retrato).
  update(dt: number, viewRadius: number) {
    if (this.entering) {
      this.elapsed += Math.min(dt, MAX_STEP);
      const t = Math.min(this.elapsed / CAM.top.revealDur, 1);
      this.progress = easeInOutCubic(t);
      if (t >= 1) {
        this.entering = false;
        this.onArrive?.();
        this.onArrive = null;
      }
    }

    const p = this.progress;

    this.eased.x += (this.pointer.x - this.eased.x) * PARALLAX_EASE;
    this.eased.y += (this.pointer.y - this.eased.y) * PARALLAX_EASE;

    // o parallax entra junto com a descida: lá em cima ele vale zero, senão
    // mexer o mouse durante a entrada empurraria a câmera fora da trajetória.
    // No mergulho ele sai de cena de novo: a essa distância da foto, qualquer
    // deriva do mouse viraria um tranco lateral enorme.
    const amp = PARALLAX_AMP * p * (1 - this.dive);

    const height = THREE.MathUtils.lerp(CAM.top.height, CAM.side.height, p) * (1 - this.dive);

    // a distância lateral colapsa até quase encostar na face frontal da fita
    // (z = RADIUS), que é onde a foto ativa está
    const radius = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(CAM.top.radius, viewRadius, p),
      RADIUS + SHATTER.gap,
      this.dive,
    );

    // sinais invertidos: mover a câmera pro lado oposto faz a cena "seguir" o mouse
    this.camera.position.set(
      -this.eased.x * amp,
      height + this.eased.y * amp,
      radius,
    );
    this.camera.lookAt(0, 0, 0);
  }
}
