import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Segment } from './Segment';
import { CameraRig } from './CameraRig';
import { Input } from './Input';
import { Labels } from './Labels';
import { makeReflectionMaterial, reflectTime } from './Reflection';
import {
  makeRibbonGeometry, captureRest, bendRibbon, ribbonPose, placeOnRibbon,
  type RibbonRest,
} from './Ribbon';
import {
  SECTIONS, RADIUS, HEIGHT, REFLECT,
  CAM, BASE_ASPECT, PARALLAX_AMP, PARALLAX_EASE,
} from './config';

const TAU = Math.PI * 2;
// menor ângulo equivalente, em (-π, π]. É o que embrulha a fita: o segmento que
// passa de um extremo pro outro faz isso no ponto mais distante da câmera, e em
// k=1 (anel) nem é um salto — é literalmente o mesmo ponto do círculo.
const wrapAngle = (a: number) => a - TAU * Math.round(a / TAU);

export class Carousel {
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;

  private ribbon = makeRibbonGeometry();   // geometria ÚNICA, dobrada 1x por frame
  private ribbonRest!: RibbonRest;         // pose esticada de referência
  private reflect = new THREE.Group();     // reflexo espelhado (clones translúcidos)

  private segments: Segment[] = [];
  private reflMeshes: THREE.Mesh[] = [];

  private rig!: CameraRig;             // posiciona a câmera; guardado para o reveal futuro
  private input!: Input;
  private labels = new Labels();       // textos 3D "liquid glass" presos às fotos

  private morph = 0;                 // 0 = anel, 1 = fita (tweenado por GSAP)
  private lastK = NaN;               // última curvatura dobrada (evita redobrar à toa)
  private lenis: any;
  private lastActive = -1;

  private pointer = { x: 0, y: 0 };        // mouse normalizado (-1..1)
  private pointerEased = { x: 0, y: 0 };   // versão suavizada (o parallax segue esta)

  private viewRadius = CAM.side.radius;    // distância da câmera, ajustada pela proporção da tela

  // clicar numa foto navega pra seção dela; hover mostra cursor pointer
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private downX = 0;
  private downY = 0;

  async init(canvas: HTMLCanvasElement, lenis: any) {
    this.lenis = lenis;

    // --- renderer: alpha ligado + clear transparente pra o "PORTFOLIO" do DOM aparecer atrás ---
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // ambiente PMREM: dá os reflexos/brilhos do vidro das labels.
    // Só afeta materiais físicos — as fotos (MeshBasicMaterial) ficam intactas.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // --- câmera (posição vem do rig, já na lateral) ---
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

    this.ribbonRest = captureRest(this.ribbon);

    // reflexo: espelha em Y no plano da base da fita (y = -HEIGHT/2) e afunda
    // mais REFLECT.gap — o espelhamento exato deixa foto e reflexo colados, e o
    // respiro é o que faz o de baixo ler como reflexo na água, não como continuação
    this.reflect.scale.y = -1;
    this.reflect.position.y = -HEIGHT - REFLECT.gap;
    this.scene.add(this.reflect);

    this.rig = new CameraRig(this.camera);
    this.input = new Input(canvas, lenis);

    // --- carregar texturas + criar segmentos (mantém a ordem de SECTIONS) ---
    const loader = new THREE.TextureLoader();
    const textures = await Promise.all(
      SECTIONS.map((s) => loader.loadAsync(s.texture)),
    );
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    textures.forEach((tex, i) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      // nitidez: anisotropia máxima (parede curva vista de lado comprime a textura na
      // horizontal) + mipmaps trilinear. Setado na base ANTES do clone → o Segment herda.
      tex.anisotropy = maxAniso;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      const seg = new Segment(i, tex, this.ribbon);
      this.segments[i] = seg;
      this.scene.add(seg.mesh);

      // reflexo: mesma fita dobrável, material de água próprio (Reflection.ts)
      const refl = new THREE.Mesh(this.ribbon, makeReflectionMaterial(seg.mesh));
      this.reflMeshes[i] = refl;
      this.reflect.add(refl);
    });

    // cada label é posicionada junto com a sua foto no layout()
    await this.labels.init();
    this.scene.add(...this.labels.meshes);

    this.layout();  // pose inicial (anel)

    // --- UI ↔ carrossel via CustomEvent ---
    window.addEventListener('carousel:step', (e: Event) => {
      this.input.step((e as CustomEvent).detail?.dir ?? 1);
    });
    window.addEventListener('carousel:mode', (e: Event) => {
      this.setMode(!!(e as CustomEvent).detail?.flat);
    });

    this.updateViewRadius();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    // --- clique na foto → navega pra seção; hover na foto → cursor pointer ---
    canvas.addEventListener('pointerdown', (e) => {
      this.downX = e.clientX;
      this.downY = e.clientY;
    });
    canvas.addEventListener('pointermove', (e) => {
      canvas.style.cursor = this.pick(e) ? 'pointer' : '';
    });
    canvas.addEventListener('pointerup', (e) => {
      // só conta como clique se quase não moveu (senão foi arrasto do carrossel)
      if (Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 6) return;
      const seg = this.pick(e);
      if (seg) window.location.hash = `#${SECTIONS[seg.index].id}`;
    });
  }

  // raycast do ponteiro contra os segmentos visíveis; retorna o Segment atingido
  private pick(e: PointerEvent): Segment | null {
    this.ndc.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.segments.map((s) => s.mesh), false)[0];
    if (!hit) return null;
    // só a metade FRONTAL conta: pelos vãos entre as fotos o raio atravessa e
    // acha a parede de trás do anel (z < 0) — ali não é "em cima da foto"
    if (hit.point.z < 0.01) return null;
    return hit.object.userData.segment as Segment;
  }

  // em telas mais estreitas que BASE_ASPECT, afasta a câmera para o segmento
  // ativo continuar cabendo na largura. O que importa é a distância até a FACE
  // frontal do cilindro (z = RADIUS), então o excedente escala a partir dela.
  private updateViewRadius() {
    const aspect = window.innerWidth / window.innerHeight;
    const fit = Math.max(1, BASE_ASPECT / aspect);
    this.viewRadius = RADIUS + (CAM.side.radius - RADIUS) * fit;
  }

  // câmera desloca de leve rumo ao mouse e continua olhando o centro → a cena "encara" o cursor
  private applyParallax() {
    this.pointerEased.x += (this.pointer.x - this.pointerEased.x) * PARALLAX_EASE;
    this.pointerEased.y += (this.pointer.y - this.pointerEased.y) * PARALLAX_EASE;
    // sinais invertidos: mover a câmera pro lado oposto faz a cena "seguir" o mouse
    this.camera.position.set(
      -this.pointerEased.x * PARALLAX_AMP,
      CAM.side.height + this.pointerEased.y * PARALLAX_AMP,
      this.viewRadius,
    );
    this.camera.lookAt(0, 0, 0);
  }

  async start() {
    this.input.enabled = true;   // câmera já na lateral; libera o controle direto
    this.emitActive(this.input.activeIndex);
    this.loop();
  }

  // alterna anel (false) ↔ fita (true) animando o desenrolar com GSAP
  setMode(flat: boolean) {
    gsap.to(this, { morph: flat ? 1 : 0, duration: 0.9, ease: 'power3.inOut' });
  }

  // Uma passada só: dobra a fita na curvatura atual e distribui as fotos ao
  // longo dela. Não existe mais "os dois modos" — existe uma superfície e um
  // parâmetro de curvatura (ver Ribbon.ts).
  private layout() {
    const cur = this.input.current;
    const k = 1 - this.morph;   // 1 = anel fechado, 0 = fita esticada

    // Dobrar é a única parte cara, e só a curvatura muda a forma: girar o anel
    // apenas desliza as fotos por uma fita que já está dobrada. Então em
    // repouso (k parado em 0 ou 1) isto não roda nenhum frame.
    if (k !== this.lastK) {
      bendRibbon(this.ribbon, this.ribbonRest, k);
      this.ribbon.computeBoundingSphere();   // o raycaster do pick() depende dela
      this.labels.bend(k);
      this.lastK = k;
    }

    this.segments.forEach((seg, i) => {
      // ângulo do segmento em relação à frente da cena → comprimento de arco.
      // wrapAngle é o que embrulha a fita: quem passa de -π vira +π, e isso
      // acontece no ponto mais longe da câmera.
      const pose = ribbonPose(wrapAngle(seg.centerAngle + cur) * RADIUS, k);
      placeOnRibbon(seg.mesh, pose);
      placeOnRibbon(this.labels.meshes[i], pose);
      placeOnRibbon(this.reflMeshes[i], pose);
      // no anel a label some quando a foto vira de perfil; na fita a guinada é
      // zero em todo mundo, então todas ficam visíveis — cai da mesma conta
      this.labels.setFacing(i, Math.cos(pose.yaw));
    });
  }

  private emitActive(index: number) {
    if (index === this.lastActive) return;
    this.lastActive = index;
    window.dispatchEvent(new CustomEvent('carousel:change', { detail: { index } }));
  }

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.updateViewRadius();
  };

  private loop = (time = 0) => {
    requestAnimationFrame(this.loop);
    this.lenis?.raf(time);
    reflectTime.value = time * 0.001;   // relógio das ondas do reflexo (segundos)
    this.input.update();          // inércia
    this.layout();                // aplica rotação/offset/morph
    this.applyParallax();         // câmera segue o mouse de leve
    this.emitActive(this.input.activeIndex);
    this.renderer.render(this.scene, this.camera);
  };
}
