import * as THREE from 'three';
import gsap from 'gsap';
import { Segment } from './Segment';
import { CameraRig } from './CameraRig';
import { Input } from './Input';
import {
  SECTIONS, SEG_ANGLE, HEIGHT, FLAT_STEP, FLAT_Z, REFLECT_OPACITY,
  CAM, PARALLAX_AMP, PARALLAX_EASE,
} from './config';

const N = SECTIONS.length;
// distância mais curta (com wrap) até o segmento ativo → flat também vira um loop.
// O "salto" de N acontece em ±N/2 (fora da tela), então é imperceptível.
const wrapOffset = (v: number) => v - N * Math.round(v / N);

export class Carousel {
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;

  private curvedGroup = new THREE.Group();  // o "cilindro" — giramos ISSO no modo CURVED
  private flatGroup = new THREE.Group();     // a fita reta — planos deslizam em x no modo FLAT
  private reflect = new THREE.Group();       // reflexo espelhado (clones de baixa opacidade)
  private reflCurved = new THREE.Group();
  private reflFlat = new THREE.Group();

  private segments: Segment[] = [];
  private reflMats: THREE.MeshBasicMaterial[] = [];  // [curvedRefl_0, flatRefl_0, curvedRefl_1, ...]

  private rig!: CameraRig;             // posiciona a câmera; guardado para o reveal futuro
  private input!: Input;

  private morph = 0;                 // 0 = CURVED, 1 = FLAT (tweenado por GSAP)
  private lenis: any;
  private lastActive = -1;

  private pointer = { x: 0, y: 0 };        // mouse normalizado (-1..1)
  private pointerEased = { x: 0, y: 0 };   // versão suavizada (o parallax segue esta)

  async init(canvas: HTMLCanvasElement, lenis: any) {
    this.lenis = lenis;

    // --- renderer: alpha ligado + clear transparente pra o "PORTFOLIO" do DOM aparecer atrás ---
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // --- câmera (posição vem do rig, já na lateral) ---
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

    this.scene.add(this.curvedGroup, this.flatGroup);

    // reflexo: espelha em Y no plano da base do cilindro (y = -HEIGHT/2)
    this.reflect.scale.y = -1;
    this.reflect.position.y = -HEIGHT;
    this.reflect.add(this.reflCurved, this.reflFlat);
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
      const seg = new Segment(i, tex);
      this.segments[i] = seg;
      this.curvedGroup.add(seg.curved);
      this.flatGroup.add(seg.flat);

      // clones de reflexo: mesma geometria, material de baixa opacidade próprio
      const rc = new THREE.Mesh(seg.curved.geometry, this.makeReflMat(seg.curved));
      const rf = new THREE.Mesh(seg.flat.geometry, this.makeReflMat(seg.flat));
      this.reflCurved.add(rc);
      this.reflFlat.add(rf);
    });

    this.layout();  // pose inicial (CURVED)

    // --- UI ↔ carrossel via CustomEvent ---
    window.addEventListener('carousel:step', (e: Event) => {
      this.input.step((e as CustomEvent).detail?.dir ?? 1);
    });
    window.addEventListener('carousel:mode', (e: Event) => {
      this.setMode(!!(e as CustomEvent).detail?.flat);
    });

    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  // câmera desloca de leve rumo ao mouse e continua olhando o centro → a cena "encara" o cursor
  private applyParallax() {
    this.pointerEased.x += (this.pointer.x - this.pointerEased.x) * PARALLAX_EASE;
    this.pointerEased.y += (this.pointer.y - this.pointerEased.y) * PARALLAX_EASE;
    // sinais invertidos: mover a câmera pro lado oposto faz a cena "seguir" o mouse
    this.camera.position.set(
      -this.pointerEased.x * PARALLAX_AMP,
      CAM.side.height + this.pointerEased.y * PARALLAX_AMP,
      CAM.side.radius,
    );
    this.camera.lookAt(0, 0, 0);
  }

  private makeReflMat(src: THREE.Mesh): THREE.MeshBasicMaterial {
    const base = src.material as THREE.MeshBasicMaterial;
    const mat = new THREE.MeshBasicMaterial({
      map: base.map,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.reflMats.push(mat);
    return mat;
  }

  async start() {
    this.input.enabled = true;   // câmera já na lateral; libera o controle direto
    this.emitActive(this.input.activeIndex);
    this.loop();
  }

  // alterna CURVED (false) ↔ FLAT (true) animando o morph com GSAP
  setMode(flat: boolean) {
    gsap.to(this, { morph: flat ? 1 : 0, duration: 0.9, ease: 'power3.inOut' });
  }

  // posiciona os dois modos a partir da rotação suavizada (input.current)
  private layout() {
    const cur = this.input.current;

    // CURVED: gira o anel inteiro
    this.curvedGroup.rotation.y = cur;
    this.reflCurved.rotation.y = cur;

    // FLAT: "posição de segmento" contínua; ativo fica centrado em x = 0.
    // wrapOffset mantém o ativo no centro e embrulha os planos distantes (loop).
    // O z avança com o morph → no FLAT a fita vem em direção à câmera (fica maior).
    const s = -(cur + SEG_ANGLE / 2) / SEG_ANGLE;
    const flatZ = this.morph * FLAT_Z;
    this.segments.forEach((seg, i) => {
      const x = wrapOffset(i - s) * FLAT_STEP;
      seg.flat.position.set(x, 0, flatZ);
      (this.reflFlat.children[i] as THREE.Mesh).position.set(x, 0, flatZ);

      // crossfade curved↔flat
      seg.setMorph(this.morph);
      this.reflMats[i * 2].opacity = (1 - this.morph) * REFLECT_OPACITY;      // curved refl
      this.reflMats[i * 2 + 1].opacity = this.morph * REFLECT_OPACITY;        // flat refl
      const rc = this.reflCurved.children[i] as THREE.Mesh;
      const rf = this.reflFlat.children[i] as THREE.Mesh;
      rc.visible = this.morph < 1;
      rf.visible = this.morph > 0;
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
  };

  private loop = (time = 0) => {
    requestAnimationFrame(this.loop);
    this.lenis?.raf(time);
    this.input.update();          // inércia
    this.layout();                // aplica rotação/offset/morph
    this.applyParallax();         // câmera segue o mouse de leve
    this.emitActive(this.input.activeIndex);
    this.renderer.render(this.scene, this.camera);
  };
}
