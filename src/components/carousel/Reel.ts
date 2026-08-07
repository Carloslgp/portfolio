import * as THREE from 'three';
import gsap from 'gsap';
import { REEL, REEL_PHOTO_W, REEL_STEP, REEL_REFLECT } from './config';
import {
  makeRibbonGeometry, captureRest, bendRibbon, ribbonPose, placeOnRibbon,
} from './Ribbon';
import { makeReflectionMaterial } from './Reflection';

// O carrossel que vive DENTRO do texto do About.
//
// É a mesma superfície do anel da home (Ribbon.ts) na sua segunda forma: a fita.
// Mesma água por baixo (Reflection.ts), mesma inércia no gesto. O que muda é que
// aqui ela não fecha — e é isso que dita o resto do arquivo:
//
//   • a fita tem PONTAS, então o gesto encosta no fim e volta em vez de dar a
//     volta (clampSoft), e as setas se desabilitam nos extremos;
//   • ela vive numa página que ROLA, então o deltaY da roda é da página, nunca
//     nosso (ver onWheel) — capturá-lo prenderia a rolagem toda vez que o
//     ponteiro passasse por cima do carrossel;
//   • ela tem cena, canvas e relógio próprios: quando o About está aberto, o loop
//     do anel já parou com a cena apagada, e pendurar o reflexo daqui no relógio
//     de lá congelaria a água.
//
// A geometria é dobrada UMA vez, no init: ao contrário da home, aqui a curvatura
// não muda nunca. Girar o carrossel só desliza as fotos por uma fita já dobrada.

export type ReelItem = { src: string; title: string; alt?: string };

type Opts = {
  /** baixa animação: sem ondulação na água e sem tween no snap */
  reduced?: boolean;
  /** avisa quando a foto de frente muda (a legenda em HTML escuta isto) */
  onActive?: (index: number) => void;
};

export class Reel {
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(REEL.fov, 1, 0.1, 100);

  private geo!: THREE.PlaneGeometry;     // geometria ÚNICA, compartilhada pelas fotos
  private meshes: THREE.Mesh[] = [];
  private reflMeshes: THREE.Mesh[] = [];
  private reflect = new THREE.Group();   // reflexo espelhado (clones translúcidos)

  // Relógio próprio das ondas — ver o cabeçalho do arquivo.
  private clock = { value: 0 };

  // Posição ao longo da fita, em unidades de mundo de comprimento de arco.
  // `target` é o destino do gesto; `current` o persegue por lerp (a inércia).
  private target = 0;
  private current = 0;
  private max: number;

  private ready = false;
  private onScreen = false;
  private raf = 0;
  private lastFrame = performance.now();
  private lastActive = -1;

  // Conversão pixel → mundo no plano da fita. Sai do enquadramento (ver frame()),
  // e não de uma constante: é o que faz o arrasto acompanhar o dedo exatamente,
  // em qualquer largura de canvas.
  private pxToWorld = 0.01;

  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();

  private dragging = false;
  private lastX = 0;
  private downX = 0;
  private downY = 0;
  private velocity = 0;
  private snapTimer = 0;
  private ro?: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private items: ReelItem[],
    private opts: Opts = {},
  ) {
    this.max = (items.length - 1) * REEL_STEP;
  }

  // Monta a cena e carrega as fotos. Rejeita se não houver WebGL ou se alguma
  // imagem faltar — quem chama repõe a lista em HTML (ver scripts/reel.ts).
  async init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,        // o branco da página é o fundo, não uma cor nossa
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // Dobrada aqui e nunca mais: a curvatura desta fita é fixa.
    this.geo = makeRibbonGeometry(REEL_PHOTO_W, REEL.photoH, REEL.segments);
    bendRibbon(this.geo, captureRest(this.geo), REEL.curve, 0, 1);
    this.geo.computeBoundingSphere();    // o raycaster do clique depende dela

    // espelha em Y na base da fita e afunda mais o respiro — mesma conta do anel
    this.reflect.scale.y = -1;
    this.reflect.position.y = -REEL.photoH - REEL.reflectGap;
    this.scene.add(this.reflect);

    const loader = new THREE.TextureLoader();
    const textures = await Promise.all(this.items.map((it) => loader.loadAsync(it.src)));
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    textures.forEach((tex, i) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      // nitidez: a fita curva comprime a textura na horizontal nas pontas
      tex.anisotropy = maxAniso;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;

      // Sem rotação de textura aqui — ao contrário das fotos do anel, que estão
      // guardadas giradas 90° (ver Segment.ts), estas já vêm em paisagem.
      const mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ map: tex }));
      mesh.userData.index = i;
      this.meshes[i] = mesh;
      this.scene.add(mesh);

      const refl = new THREE.Mesh(this.geo, makeReflectionMaterial(mesh, {
        ...REEL_REFLECT,
        time: this.clock,
      }));
      this.reflMeshes[i] = refl;
      this.reflect.add(refl);
    });

    this.frame();
    this.layout();
    await this.renderer.compileAsync(this.scene, this.camera);

    this.ready = true;
    this.bind();
    this.canvas.tabIndex = 0;        // vira parada de Tab só quando existe de fato
    this.emitActive();
    this.renderer.render(this.scene, this.camera);   // primeiro quadro já composto
    this.setVisible(this.onScreen);
  }

  /** Liga/desliga o loop. Quem chama é o IntersectionObserver: um carrossel no
   *  meio de uma página longa não tem por que desenhar fora da tela. */
  setVisible(on: boolean) {
    this.onScreen = on;
    if (on && this.ready && !document.hidden) this.start();
    else this.stop();
  }

  /** avança uma foto (as setas da legenda e as teclas ← →) */
  step(dir: number) {
    this.goTo(this.activeIndex + dir);
  }

  /** traz a foto `i` para a frente */
  goTo(i: number) {
    const clamped = THREE.MathUtils.clamp(i, 0, this.items.length - 1);
    gsap.killTweensOf(this);
    clearTimeout(this.snapTimer);
    gsap.to(this, {
      target: clamped * REEL_STEP,
      duration: this.opts.reduced ? 0 : REEL.snapDur,
      ease: 'power3.out',
      overwrite: true,
    });
  }

  get activeIndex(): number {
    return THREE.MathUtils.clamp(
      Math.round(this.current / REEL_STEP), 0, this.items.length - 1,
    );
  }

  // ——— enquadramento ———
  //
  // A câmera é DERIVADA do que precisa caber no quadro, e não posta a uma
  // distância fixa: a composição (ar em cima, foto, um naco do reflexo embaixo)
  // é a mesma do celular ao monitor largo, sem constante por breakpoint.
  //
  // Duas distâncias são calculadas e vence a MAIOR: uma faz a altura caber,
  // a outra impede a foto de sangrar pelos lados quando o canvas fica estreito.
  private frame() {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(w, h, false);   // false: o CSS é que manda no tamanho

    const aspect = w / h;
    const halfFov = THREE.MathUtils.degToRad(REEL.fov) / 2;
    const tan = Math.tan(halfFov);

    const top = REEL.photoH / 2 + REEL.padTop;
    const bottom = -REEL.photoH / 2 - REEL.reflectGap - REEL.reflectShow;

    const distH = ((top - bottom) / 2) / tan;
    const distW = REEL_PHOTO_W / (2 * REEL.fill * tan * aspect);
    const dist = Math.max(distH, distW);

    const cy = (top + bottom) / 2;
    this.camera.aspect = aspect;
    this.camera.position.set(0, cy, dist);
    this.camera.lookAt(0, cy, 0);        // de frente, sem inclinar: quem dá o volume é a curva
    this.camera.updateProjectionMatrix();

    this.pxToWorld = (2 * dist * tan * aspect) / w;
  }

  // Uma passada: distribui as fotos ao longo da fita já dobrada.
  private layout() {
    this.meshes.forEach((mesh, i) => {
      const s = i * REEL_STEP - this.current;   // comprimento de arco até o centro do quadro

      const far = Math.abs(s) / REEL_STEP;
      const visible = far < REEL.cull;
      mesh.visible = visible;
      this.reflMeshes[i].visible = visible;
      if (!visible) return;

      const pose = ribbonPose(s, REEL.curve, 1, 0);
      placeOnRibbon(mesh, pose);
      placeOnRibbon(this.reflMeshes[i], pose);

      // só a foto de frente fica acesa; as vizinhas recuam para a penumbra
      const focus = 1 - THREE.MathUtils.clamp(far, 0, 1);
      const lit = THREE.MathUtils.lerp(REEL.dim, 1, focus);
      (mesh.material as THREE.MeshBasicMaterial).color.setScalar(lit);
      (this.reflMeshes[i].material as THREE.MeshBasicMaterial).color.setScalar(lit);
    });
  }

  private emitActive() {
    const i = this.activeIndex;
    if (i === this.lastActive) return;
    this.lastActive = i;
    this.opts.onActive?.(i);
  }

  // ——— loop ———
  private start() {
    if (this.raf) return;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private stop() {
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = (time: number) => {
    this.raf = requestAnimationFrame(this.tick);

    // em baixa animação a água fica parada — ela continua sendo um reflexo,
    // só que sem marola
    if (!this.opts.reduced) this.clock.value = time * 0.001;

    // inércia independente de framerate: mesmo feel em 60/120/144Hz
    const now = performance.now();
    const frames = Math.min((now - this.lastFrame) / 16.667, 4);
    this.lastFrame = now;
    this.current += (this.target - this.current) * (1 - Math.pow(1 - REEL.lerp, frames));

    this.layout();
    this.emitActive();
    this.renderer.render(this.scene, this.camera);
  };

  // ——— gesto ———

  // Resistência nas pontas. A fita não dá a volta, então em vez de uma parede
  // seca (que lê como travamento) o excedente entra dividido: dá pra passar do
  // fim, mas custa caro, e o snap traz de volta.
  private clampSoft(v: number): number {
    if (v < 0) return v * REEL.rubber;
    if (v > this.max) return this.max + (v - this.max) * REEL.rubber;
    return v;
  }

  private bind() {
    const c = this.canvas;
    c.addEventListener('wheel', this.onWheel, { passive: false });
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onUp);
    c.addEventListener('keydown', this.onKey);

    this.ro = new ResizeObserver(() => this.frame());
    this.ro.observe(c);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private onVisibility = () => this.setVisible(this.onScreen);

  // Só o gesto HORIZONTAL é nosso.
  //
  // Este é o ponto em que o carrossel do About difere mais do da home: lá o
  // deltaY gira o anel porque a página não rola. Aqui ela rola, e o carrossel
  // está no meio de um texto — consumir o deltaY prenderia a leitura toda vez
  // que o ponteiro passasse por cima dele. Então o eixo vertical é da página,
  // sempre, e nós só olhamos o lateral.
  private onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    // sem consumir, o gesto lateral vira "voltar página" no Chrome
    e.preventDefault();
    gsap.killTweensOf(this);
    // Mesmo sentido do arrasto logo abaixo: passar os dedos pra direita manda as
    // fotos pra direita, igual a puxar com o dedo. Em deltaX, ir pra direita é
    // negativo — e mover as fotos pra direita é DIMINUIR o avanço na fita, daí
    // os dois sinais se cancelarem e isto virar uma soma.
    this.target = this.clampSoft(this.target + e.deltaX * this.pxToWorld * REEL.wheelGain);
    this.scheduleSnap();
  };

  private onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.velocity = 0;
    clearTimeout(this.snapTimer);
    gsap.killTweensOf(this);          // pega a fita exatamente onde ela está
    this.canvas.setPointerCapture?.(e.pointerId);
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = (e.clientX - this.lastX) * this.pxToWorld;
    this.lastX = e.clientX;
    this.target = this.clampSoft(this.target - dx);
    this.velocity = this.velocity * 0.7 - dx * 0.3;   // suaviza pra estimar o arremesso
  };

  private onUp = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    this.canvas.releasePointerCapture?.(e.pointerId);

    // quase não moveu: foi clique, e clicar numa vizinha a traz pra frente
    if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) <= REEL.clickSlop) {
      const hit = this.pick(e);
      if (hit !== null) this.goTo(hit);
      else this.snap();
      return;
    }

    this.target = this.clampSoft(this.target + this.velocity * REEL.momentum);
    this.snap();
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') this.step(-1);
    else if (e.key === 'ArrowRight') this.step(1);
    else return;
    e.preventDefault();
  };

  private pick(e: PointerEvent): number | null {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.meshes, false)[0];
    return hit ? (hit.object.userData.index as number) : null;
  }

  private scheduleSnap() {
    clearTimeout(this.snapTimer);
    this.snapTimer = window.setTimeout(() => this.snap(), REEL.snapDelay);
  }

  // trava na foto mais próxima — e sempre numa que EXISTE, o que também é o que
  // devolve a fita quando o gesto passou de uma das pontas
  private snap() {
    this.goTo(Math.round(this.target / REEL_STEP));
  }
}
