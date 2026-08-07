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
import {
  SECTIONS, RADIUS, HEIGHT, REFLECT, CAM, BASE_ASPECT, LABEL, SEG_ANGLE, SHATTER, ABOUT,
} from './config';

const ABOUT_INDEX = SECTIONS.findIndex((s) => s.id === 'about');

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
  private idle = false;                // mosaico rolou pra fora: nada a desenhar

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
    this.shatter.init(textures[ABOUT_INDEX]);
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
    this.backdrop.fit(this.camera, this.viewRadius);   // depende do viewRadius: vem depois

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

  // entrada sem descida (baixa animação): já assentado na foto inicial
  revealInstant() {
    this.rig.revealInstant();
    this.input.enabled = true;
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
  private alignGoal(i: number): number {
    const n = SECTIONS.length;
    const m0 = Math.round((this.input.target + SEG_ANGLE / 2) / SEG_ANGLE);
    // a seção i fica de frente quando m ≡ -i (mod n); pega o representante mais
    // próximo do m atual pra girar o mínimo, e não dar a volta inteira
    let m = m0 + ((((-i - m0) % n) + n) % n);
    if (m - m0 > n / 2) m -= n;
    return m * SEG_ANGLE - SEG_ANGLE / 2;
  }

  // A abertura do About, inteira, numa timeline só: alinha a foto, mergulha
  // nela, troca a foto pelos cacos, os cacos se abrem e assentam no mosaico do
  // cabeçalho — e no meio disso a câmera já começou a recuar e descer.
  //
  // Devolve a timeline em vez de uma Promise, com o label 'descent' marcando o
  // instante em que a descida começa. Esse label é o CONTRATO com o main.ts:
  // é lá que ele pendura a subida do painel HTML, e por isso os dois se movem
  // no mesmo relógio, com o mesmo ease, sem um esperar o outro. A cena continua
  // sem saber que existe um About em HTML.
  enterAbout(): gsap.core.Timeline {
    const tl = gsap.timeline();
    if (this.inAbout) return tl;
    this.inAbout = true;
    this.input.enabled = false;         // o carrossel para de responder ao gesto

    // O alinhamento só entra se houver o que alinhar. Antes ele custava
    // SHATTER.alignDur sempre — inclusive no caso comum, que é clicar na foto
    // que JÁ está de frente. Meio segundo parado bem no começo da coreografia.
    gsap.killTweensOf(this.input);
    const goal = this.alignGoal(ABOUT_INDEX);
    if (Math.abs(goal - this.input.target) > 0.01) {
      tl.to(this.input, {
        target: goal, current: goal,
        duration: SHATTER.alignDur, ease: 'power3.inOut',
      });
    }

    tl.addLabel('dive');
    tl.to(this.rig, { dive: 1, duration: SHATTER.diveDur, ease: 'power2.inOut' });

    // As labels apagam JÁ no começo do mergulho, e não com o resto do anel lá
    // no 'burst'. Elas ficam entre a câmera e a foto de destino, então segurá-las
    // acesas durante o mergulho inteiro fazia a palavra crescer até quase
    // encostar na lente antes de sumir.
    // Vai por labels.fade, e não pela opacidade dos materiais: setFacing()
    // reescreve mats[i].opacity todo frame enquanto layout() estiver rodando —
    // e ele roda até o 'burst', que é justamente o que queremos anteceder.
    tl.to(this.labels, {
      fade: 0,
      duration: ABOUT.labelFadeDur,
      ease: 'power2.in',
    }, 'dive');

    // Callbacks de GSAP disparam nos DOIS sentidos, então o estado vem de
    // tl.reversed() em vez de ser fixo: no fechar, estes mesmos pontos repõem
    // a cena em vez de apagá-la de novo.
    tl.call(() => this.setShattered(!tl.reversed()));

    // Estas duas ANTES de montar a timeline dos cacos, e não num tl.call: o
    // burstAndSettle lê a pose de repouso de cada caco na hora de MONTAR os
    // tweens, não na hora de tocá-los. Num callback, ela ainda não existiria.
    // A curvatura é lida aqui (e não no init) porque o botão curvo/reto pode
    // ter mexido nela desde então.
    this.shatter.layoutRest(1 - this.morph);
    this.syncFrame();

    tl.add(this.shatter.burstAndSettle(), 'burst');

    // A troca foto↔cacos, no label 'burst' — o único instante em que os cacos
    // estão TODOS na pose de repouso, ou seja, sobrepostos exatamente à foto.
    // Instantânea porque os cacos são uma cópia pixel a pixel dela: qualquer
    // sobreposição mostra as duas imagens, e qualquer folga mostra o buraco.
    tl.call(() => this.swapToShards(!tl.reversed()), undefined, 'burst');

    // O RESTO do anel apaga junto com a quebra — fotos vizinhas, reflexos, o
    // PORTFOLIO do fundo (as labels já saíram no mergulho, bem antes daqui, e
    // por isso não estão nesta lista). Antes ele era desligado de estalo, e dava
    // pra fazer isso porque a câmera entrava na foto e ela tapava a tela
    // inteira; agora que ela para longe, as vizinhas aparecem nas beiradas e um
    // corte ali seria visível. A foto do About fica de fora desta lista: nela o
    // fade é justamente o defeito, não a solução.
    this.addRingFade(tl, 'burst');

    // Aqui mora o fim da pausa: a descida parte com o vidro ainda voando.
    tl.addLabel('descent', `burst+=${ABOUT.overlap}`);
    tl.to(this.rig, {
      descent: 1,
      duration: ABOUT.descentDur,
      ease: ABOUT.descentEase,
    }, 'descent');

    return tl;
  }

  // Entrada direta em /#about (link compartilhado): põe a cena no estado final
  // sem coreografia nenhuma. Aproximar e quebrar aqui seria teatro vazio — o
  // visitante não viu a foto inteira antes, então não há o que quebrar pra ele.
  // Mas a moldura precisa ESTAR lá: ela é o enquadramento da página.
  enterAboutInstant() {
    if (this.inAbout) return;
    this.inAbout = true;
    this.input.enabled = false;
    this.rig.dive = 1;
    this.rig.descent = 1;
    this.shattered = true;
    this.setSceneVisible(false);
    this.labels.hideAll();      // as labels saíram do setSceneVisible
    this.shatter.layoutRest(1 - this.morph);
    this.syncFrame();
    this.swapToShards(true);
    this.shatter.snapToBorder();
  }

  // Apaga (ou reacende) fotos, reflexos e o PORTFOLIO do fundo. As labels NÃO
  // passam por aqui — quem manda nelas é o Labels.fade (ver o corpo abaixo).
  //
  // As fotos nascem OPACAS de propósito: é isso que as mantém na lista opaca do
  // three e, com ela, dentro do buffer que o vidro das labels refrata. Virar
  // `transparent` só durante o apagamento não custa recompilação — o three não
  // põe esse flag na chave do cache de programas (só muda em que balde o objeto
  // é desenhado) — e depois o flag volta ao normal no reverse.
  private addRingFade(tl: gsap.core.Timeline, at: string | number) {
    // a foto do About e o reflexo dela ficam de fora: quem cuida deles é o
    // swapToShards, de uma vez só
    const mats: THREE.Material[] = [
      ...this.segments.filter((_, i) => i !== ABOUT_INDEX).map((s) => s.mesh.material as THREE.Material),
      ...this.reflMeshes.filter((_, i) => i !== ABOUT_INDEX).map((m) => m.material as THREE.Material),
      // as labels NÃO entram mais aqui: elas já saíram no começo do mergulho
      // (ver enterAbout → label 'dive')
      this.backdrop.mesh.material as THREE.Material,
    ];

    const wasTransparent = mats.map((m) => m.transparent);

    tl.call(() => {
      const out = !tl.reversed();
      mats.forEach((m, i) => { m.transparent = out ? true : wasTransparent[i]; });
    }, undefined, at);

    for (const m of mats) {
      tl.to(m, { opacity: 0, duration: ABOUT.fadeDur, ease: 'power2.in' }, at);
    }

    // no fim do apagamento a cena sai de cena de vez, em vez de seguir sendo
    // desenhada a zero de opacidade. As labels não dependem mais disto: com
    // fade 0 o próprio setFacing já as tira do desenho, lá no mergulho.
    tl.call(() => this.setSceneVisible(tl.reversed()), undefined, `${at}+=${ABOUT.fadeDur}`);
  }

  // Reenquadra o cabeçalho de vidro: converte as poses normalizadas dos cacos
  // em unidades de mundo pela pose final da câmera. Chamado na abertura e a
  // cada resize.
  //
  // Não há mais correção por proporção aqui: com os cacos só no alto, a largura
  // da tela deixou de ser um problema — a faixa cobre de beirada a beirada em
  // qualquer formato, e o texto nunca passa por baixo dela.
  syncFrame() {
    const { w, h } = this.rig.frameHalf;
    this.shatter.layoutBorder(w, h);
  }

  // Volta do About pro carrossel.
  //
  // No caminho normal quem desfaz câmera e cacos é o .reverse() da timeline lá
  // no main.ts, e aqui só sobra repor o estado — daí o `animate` nascer false.
  // Ele existe pro caso sem timeline: quem entrou por /#about nunca teve
  // coreografia de ida, mas ainda assim merece uma de volta, senão o carrossel
  // aparece de estalo.
  async exitAbout(animate = false) {
    if (!this.inAbout) return;

    if (animate) {
      // a moldura apaga enquanto a câmera volta pro ponto da quebra —
      // descent vai de 1 a 0, e a opacidade acompanha
      await gsap.to(this.rig, {
        descent: 0,
        duration: ABOUT.descentDur * 0.8,
        ease: ABOUT.descentEase,
        onUpdate: () => this.shatter.setScroll(0, this.rig.descent),
      });
      // a foto inteira volta ao lugar e a câmera recua dela
      this.shatter.reset();
      this.setShattered(false);
      // as labels voltam junto com a câmera recuando, espelhando a ida — e só
      // AQUI, com a foto já remontada pelo swapToShards de setShattered
      gsap.to(this.labels, { fade: 1, duration: ABOUT.labelFadeDur, ease: 'power2.out' });
      await gsap.to(this.rig, {
        dive: 0,
        duration: SHATTER.diveDur,
        ease: 'power2.inOut',
      });
    }

    this.shatter.reset();
    this.setShattered(false);
    // rede: no caminho da timeline o reverse já repôs isto, mas quem entrou
    // por /#about (ou em baixa animação) teve o fade zerado no braço pelo
    // hideAll() e não tem tween pra desfazer
    this.labels.fade = 1;
    this.rig.dive = 0;
    this.rig.descent = 0;
    this.idle = false;
    this.input.enabled = true;
    this.inAbout = false;
  }

  // A moldura rolando junto com a página, e apagando ao sair de cena. Quando
  // apaga de vez, para de renderizar: são ~50 cacos com clearcoat desenhados a
  // 60fps atrás de uma página que a pessoa está lendo.
  setBorderScroll(px: number) {
    if (!this.inAbout) return;
    const t = px / window.innerHeight;
    const o = 1 - THREE.MathUtils.smoothstep(t, ABOUT.fadeOut, 1);
    this.shatter.setScroll(this.rig.pxToWorld(px * ABOUT.parallax), o);
    this.idle = o <= 0.001;
  }

  // O flag que trava o layout(), que senão reacenderia labels e reflexos no
  // frame seguinte (ver Labels.setFacing). Quem apaga a cena de fato é o
  // addRingFade; aqui só o caminho de volta precisa repor tudo de uma vez.
  //
  // Este é também o portão que segura as labels na volta: elas só podem
  // reacender quando layout() volta a rodar, e isso é aqui — depois do
  // swapToShards abaixo, ou seja, com a foto já inteira.
  private setShattered(on: boolean) {
    this.shattered = on;
    if (!on) {
      this.setSceneVisible(true);
      this.swapToShards(false);
    }
  }

  // Foto do About ↔ cacos: um OU outro, nunca os dois, nunca nenhum.
  //
  // Os cacos ladrilham a foto exatamente, com a mesma textura e o mesmo brilho.
  // Enquanto ela participava do fade do resto do anel, isso dava os dois
  // defeitos simétricos: na ida os cacos saíam voando e a foto seguia lá,
  // apagando por baixo deles; na volta ela reaparecia inteira, subindo de
  // opacidade, com os cacos ainda a meio caminho de casa. Um fade é a coisa
  // certa para o que os cacos não substituem, e a coisa errada para o que eles
  // substituem.
  private swapToShards(on: boolean) {
    this.segments[ABOUT_INDEX].mesh.visible = !on;
    this.reflMeshes[ABOUT_INDEX].visible = !on;
    this.shatter.group.visible = on;
  }

  // Liga/desliga a cena — MENOS a foto do About, que é do swapToShards. Se ela
  // entrasse aqui, o reacendimento no meio do caminho de volta traria a imagem
  // inteira de volta antes de os cacos chegarem.
  private setSceneVisible(v: boolean) {
    this.segments.forEach((s, i) => { if (i !== ABOUT_INDEX) s.mesh.visible = v; });
    this.reflect.visible = v;
    this.backdrop.mesh.visible = v;
    // As LABELS não entram aqui, e é isso que conserta a volta.
    //
    // Este método é chamado com `true` no reverse em burst+fadeDur — que, de
    // trás pra frente, cai ANTES de os cacos terminarem o caminho de casa e
    // antes do swapToShards. Acender as labels aqui punha a palavra de volta na
    // tela com a foto ainda desmontada.
    //
    // Agora quem manda na visibilidade delas é só o setFacing(), via `fade`.
    // Como o setFacing só roda dentro de layout(), e layout() só volta quando
    // shattered vira false (depois da foto remontada), a palavra não tem COMO
    // aparecer antes da imagem. O apagar continua de graça: com fade 0 o
    // próprio setFacing põe visible = false.
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
    this.backdrop.fit(this.camera, this.viewRadius);
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

    // Os cacos compõem a própria pose aqui, e não dentro dos tweens: a
    // flutuação da moldura precisa se SOMAR ao que a timeline manda, e duas
    // coisas escrevendo mesh.position no mesmo frame brigariam. Sai de graça
    // quando o grupo está apagado.
    this.shatter.update(time * 0.001);

    // O lenis.raf lá em cima é inegociável — é ele que rola a página, então o
    // corte por ociosidade vem só AQUI, depois dele. Cortar antes travaria a
    // rolagem do About junto com o desenho.
    if (this.idle) return;
    this.renderer.render(this.scene, this.camera);
  };
}
