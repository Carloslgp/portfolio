import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Segment } from './Segment';
import { CameraRig } from './CameraRig';
import { Input } from './Input';
import { Labels } from './Labels';
import { Backdrop } from './Backdrop';
import { Shatter } from './Shatter';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { makeReflectionMaterial, reflectTime } from './Reflection';
import {
  makeRibbonGeometry, captureRest, bendRibbon, ribbonPose, placeOnRibbon,
  type RibbonRest,
} from './Ribbon';
import { SECTIONS, RADIUS, HEIGHT, REFLECT, CAM, BASE_ASPECT, LABEL, SEG_ANGLE, SHATTER } from './config';

const ABOUT = SECTIONS.findIndex((s) => s.id === 'about');

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

  private rig!: CameraRig;             // dono da pose da câmera (entrada + parallax)
  private input!: Input;
  private labels = new Labels();       // textos 3D "liquid glass" presos às fotos
  private backdrop = new Backdrop();   // o PORTFOLIO gigante, agora dentro da cena
  private shatter = new Shatter();     // a foto do About quebrando em cacos de vidro
  private inAbout = false;             // abertura do About em curso ou aberta
  private shattered = false;           // cena já apagada: o loop para de mexer nela

  private morph = 0;                 // 0 = anel, 1 = fita (tweenado por GSAP)
  private lastK = NaN;               // última curvatura dobrada (evita redobrar à toa)
  private lastFrame: number | null = null;   // timestamp do frame anterior (dt do rig)
  private lenis: any;
  private lastActive = -1;

  private viewRadius = CAM.side.radius;    // distância lateral, ajustada pela proporção da tela

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

    // --- carregar texturas + fonte, reportando progresso pra cortina ---
    // fotos e fonte carregam JUNTAS: em série o total do manager saltava de 5
    // pra 6 no meio, e a barra recuava depois de encher
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => {
      window.dispatchEvent(new CustomEvent('carousel:progress', { detail: { loaded, total } }));
    };
    const loader = new THREE.TextureLoader(manager);
    const [textures, font] = await Promise.all([
      Promise.all(SECTIONS.map((s) => loader.loadAsync(s.texture))),
      new FontLoader(manager).loadAsync(LABEL.font),   // serve labels E backdrop
    ]);

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
    this.labels.init(font);
    this.scene.add(...this.labels.meshes);

    // a palavra do fundo vive na cena: pega perspectiva e desce com a câmera
    this.backdrop.init(font);
    this.scene.add(this.backdrop.mesh);

    // os cacos usam a MESMA textura da foto do About (rotação já aplicada pelo
    // Segment), então a troca foto→vidro no instante do impacto não pisca
    this.shatter.init(textures[ABOUT]);
    this.scene.add(this.shatter.group);

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
      this.rig.setPointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1,
      );
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
      if (!seg) return;
      // quem decide o que abrir é o main.ts: a cena não conhece o DOM do About
      window.dispatchEvent(new CustomEvent('section:open', {
        detail: { id: SECTIONS[seg.index].id, index: seg.index },
      }));
    });

    // --- aquecimento: paga o custo do primeiro frame AQUI, atrás da cortina ---
    // Compilar o vidro das labels (transmission + dispersion) trava a thread por
    // um bom tempo. Se isso acontecesse durante a entrada, o relógio do GSAP
    // correria por baixo do travamento e a câmera chegaria no fim antes do
    // primeiro frame sair — a animação rodava, só que ninguém via.
    await this.renderer.compileAsync(this.scene, this.camera);
    this.rig.update(0, this.viewRadius);              // pose de topo (dt 0: nada avança)
    this.renderer.render(this.scene, this.camera);    // aloca o alvo de transmissão
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

  // liga o render loop na pose de topo — a cena fica viva (a água ondulando)
  // já atrás da cortina, então ela não abre sobre um quadro congelado
  run() {
    this.emitActive(this.input.activeIndex);
    this.loop();
  }

  // a entrada em si; chamar DEPOIS que a cortina saiu, senão a câmera desce escondida
  async reveal() {
    await this.rig.reveal();       // de cima até a foto inicial
    this.input.enabled = true;     // controle só depois que a câmera assenta
  }

  // alterna anel (false) ↔ fita (true) animando o desenrolar com GSAP
  setMode(flat: boolean) {
    gsap.to(this, { morph: flat ? 1 : 0, duration: 0.9, ease: 'power3.inOut' });
  }

  // Traz o segmento `i` para a frente da câmera pelo caminho mais curto.
  //
  // Tweena target E current juntos: `current` normalmente persegue `target` por
  // lerp no update(), e esse rastro deixaria a foto alguns graus torta bem na
  // hora do mergulho — de perto, isso é a diferença entre bater de frente no
  // vidro e raspar nele de lado.
  private faceSection(i: number): Promise<void> {
    const n = SECTIONS.length;
    const m0 = Math.round((this.input.target + SEG_ANGLE / 2) / SEG_ANGLE);
    // a seção i fica de frente quando m ≡ -i (mod n); pega o representante mais
    // próximo do m atual pra girar o mínimo, e não dar a volta inteira
    let m = m0 + ((((-i - m0) % n) + n) % n);
    if (m - m0 > n / 2) m -= n;

    gsap.killTweensOf(this.input);
    const goal = m * SEG_ANGLE - SEG_ANGLE / 2;
    return gsap.to(this.input, {
      target: goal,
      current: goal,
      duration: SHATTER.alignDur,
      ease: 'power3.inOut',
    }).then(() => {});
  }

  // A abertura do About: alinha a foto, mergulha nela, troca a foto pelos cacos
  // e os estoura. Resolve quando o último caco sai de quadro — a partir dali a
  // cena está vazia e o branco da página é tudo que sobra na tela.
  async enterAbout() {
    if (this.inAbout) return;
    this.inAbout = true;
    this.input.enabled = false;         // o carrossel para de responder ao gesto

    await this.faceSection(ABOUT);
    await gsap.to(this.rig, { dive: 1, duration: SHATTER.diveDur, ease: 'power2.inOut' });

    // A essa altura a foto do About cobre a tela inteira, então apagar TODO o
    // resto da cena aqui é invisível — e é o que garante que, quando o vidro
    // quebrar, atrás dele não haja carrossel nenhum, só o branco.
    this.shattered = true;   // trava o layout(): daqui em diante ele reacenderia tudo
    this.setSceneVisible(false);
    await this.shatter.play();
  }

  // Entrada direta em /#about (link compartilhado): põe a cena no estado final
  // sem coreografia nenhuma. Mergulhar e quebrar aqui seria teatro vazio — o
  // visitante não viu a foto inteira antes, então não há o que quebrar pra ele.
  enterAboutInstant() {
    if (this.inAbout) return;
    this.inAbout = true;
    this.shattered = true;
    this.input.enabled = false;
    this.rig.dive = 1;
    this.setSceneVisible(false);
  }

  // volta do About pro carrossel: repõe a cena e a câmera recua de dentro da foto
  async exitAbout() {
    if (!this.inAbout) return;
    this.shatter.reset();
    this.shattered = false;
    this.setSceneVisible(true);
    await gsap.to(this.rig, { dive: 0, duration: SHATTER.diveDur * 0.9, ease: 'power2.inOut' });
    this.input.enabled = true;
    this.inAbout = false;
  }

  // liga/desliga tudo que não são os cacos (fotos, reflexos, labels, backdrop)
  private setSceneVisible(v: boolean) {
    for (const s of this.segments) s.mesh.visible = v;
    this.reflect.visible = v;
    this.backdrop.mesh.visible = v;
    for (const m of this.labels.meshes) m.visible = v;
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

    // dt em segundos. O primeiro frame vem da chamada manual de run() com
    // time = 0, então só passa a contar quando há dois timestamps de verdade.
    const dt = this.lastFrame === null ? 0 : (time - this.lastFrame) / 1000;
    this.lastFrame = time;

    // com a cena apagada (About aberto) só os cacos e a câmera seguem vivos:
    // layout() e setReveal() escrevem .visible todo frame e reacenderiam tudo
    if (!this.shattered) {
      this.input.update();                 // inércia
      this.layout();                       // dobra a fita e distribui as fotos
      this.backdrop.setReveal(this.rig.revealProgress);
      this.emitActive(this.input.activeIndex);
    }

    this.rig.update(dt, this.viewRadius);  // entrada + parallax; único a mexer na câmera
    this.renderer.render(this.scene, this.camera);
  };
}
