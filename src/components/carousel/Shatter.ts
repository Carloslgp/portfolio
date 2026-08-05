import * as THREE from 'three';
import gsap from 'gsap';
import { ARC_WIDTH, BORDER, HEIGHT, RADIUS, SHATTER } from './config';
import { ribbonPose } from './Ribbon';

// A foto do About se quebrando — e o que sobra virando o CABEÇALHO da página.
//
// O padrão é o estrelado de para-brisa: anéis cortados por setores a partir do
// ponto de impacto, que é para onde a câmera está olhando. Por isso a fratura
// nasce no meio da foto e se abre pra fora, e não numa grade uniforme (grade lê
// como azulejo caindo, não como vidro quebrando).
//
// Três coisas fazem esse padrão parar de PARECER um padrão:
//
//  1. As fronteiras dos anéis são poligonais onduladas, não círculos. O raio de
//     cada fronteira é sorteado por ÂNGULO — fracAt[anel][setor] — e as células
//     vizinhas compartilham esses cantos. Com uma fração única por anel saíam
//     aros concêntricos perfeitos, e o olho acha um aro num piscar de olhos por
//     mais jitter que se ponha nos setores.
//  2. Os anéis-base não são igualmente espaçados: SHATTER.ringWander desloca
//     cada um, então nem a espessura das faixas se repete.
//  3. Nem toda fronteira propaga (SHATTER.weld): quando ela morre, as duas
//     células dos dois lados viram uma peça só. Sem isto, TODA peça tinha
//     exatamente um anel de comprimento — dezenas de quadriláteros da mesma
//     ordem de tamanho, que é o que fazia o vidro parecer ladrilho arredondado
//     em vez de caco. É daqui que vêm as cunhas compridas e as junções em T.
//
// O ladrilhamento continua EXATO — sem sobra nem falta — porque cada anel mede
// a distância até a borda do retângulo no ângulo em que está: as frações são
// dessa distância, não de um raio fixo. Um padrão radial de raio constante
// deixaria buraco nos cantos e transbordaria nos lados.
//
// Cada caco é um PRISMA, não um plano: a extrusão vai pra trás, deixando a face
// da frente exatamente onde a foto estava. São as paredes laterais que pegam o
// clearcoat de raspão e dão a leitura de espessura — sem elas o caco é um
// adesivo, por mais reflexo que o material tenha.
//
// No fim, BORDER.keep cacos param numa faixa no ALTO da tela — o cabeçalho da
// página — e o resto apaga no voo. A faixa não fica imóvel: cada peça flutua no
// seu próprio tempo (ver pose()).

// PRNG determinístico: a fratura tem que dar o MESMO desenho a cada abertura e
// a cada recarga, senão não dá pra calibrar o efeito olhando — cada teste sairia
// um vidro diferente.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// folga mínima entre fronteiras de anéis consecutivos, em fração do raio. Com o
// jitter alto duas fronteiras podem se cruzar e inverter a célula; isto garante
// que não aconteça, independente de como os números acima sejam calibrados.
const MIN_RING_GAP = 0.05;

// Arredonda os cantos de um polígono, substituindo cada vértice por um arco.
//
// O arco é uma Bézier quadrática cujo ponto de controle é o próprio canto: é a
// forma mais barata de tirar o bico e a única que não precisa de trigonometria
// por vértice. O raio é limitado a 40% da menor aresta adjacente, então uma
// lasca fina arredonda pouco em vez de se dobrar sobre si mesma.
function roundPoly(poly: THREE.Vector2[], radius: number, segs: number): THREE.Vector2[] {
  const out: THREE.Vector2[] = [];
  const n = poly.length;

  for (let i = 0; i < n; i++) {
    const cur = poly[i];
    const v1 = poly[(i - 1 + n) % n].clone().sub(cur);
    const v2 = poly[(i + 1) % n].clone().sub(cur);
    const l1 = v1.length() || 1e-6;
    const l2 = v2.length() || 1e-6;
    const r = Math.min(radius, l1 * 0.4, l2 * 0.4);

    const p1 = cur.clone().addScaledVector(v1.divideScalar(l1), r);
    const p2 = cur.clone().addScaledVector(v2.divideScalar(l2), r);

    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const m = 1 - t;
      out.push(new THREE.Vector2(
        m * m * p1.x + 2 * m * t * cur.x + t * t * p2.x,
        m * m * p1.y + 2 * m * t * cur.y + t * t * p2.y,
      ));
    }
  }

  return out;
}

type Vec3 = { x: number; y: number; z: number };

// Os escalares que a timeline anima. Ela NÃO escreve mesh.position nem
// mesh.rotation: quem compõe a pose é o pose(), uma vez por frame. Enquanto o
// GSAP escrevia a posição direto, não havia onde somar a flutuação — os dois
// disputariam a propriedade e o último a rodar no frame ganharia.
type Anim = { burst: number; drop: number; rest: number; rx: number; ry: number; rz: number };

type Shard = {
  mesh: THREE.Mesh;
  cx: number;           // centroide no espaço da foto (x = comprimento de arco)
  cy: number;
  dir: THREE.Vector3;   // direção radial a partir do impacto (normalizada)
  dist: number;         // distância ao impacto, 0 (centro) a 1 (borda)
  jig: number;          // variação por caco — a MESMA em todas as fases, senão
                        // a peça muda de personalidade no meio do caminho
  phase: number;        // fase própria da flutuação
  keep: boolean;        // sobrevive até o cabeçalho, ou apaga no voo?
  bu: number;           // pose na faixa, normalizada (-1..1) sobre a tela
  bv: number;
  settled: Vec3;        // a mesma pose já convertida em unidades de mundo
  settledRot: Vec3;
  burstRot: Vec3;       // eixo do tombo no pico da quebra
  restPose: { x: number; y: number; z: number; yaw: number };
  anim: Anim;
};

export class Shatter {
  group = new THREE.Group();
  private shards: Shard[] = [];
  private mats: THREE.MeshPhysicalMaterial[] = [];
  private tl: gsap.core.Timeline | null = null;

  // `texture` é a MESMA da foto do About (já com a rotação de -90° que o
  // Segment aplica), então os cacos entram na cena com a imagem idêntica à que
  // estava ali um frame antes — a troca foto→cacos não pisca.
  init(texture: THREE.Texture) {
    const a = ARC_WIDTH / 2;
    const b = HEIGHT / 2;
    const { rings, sectors, jitter, ringWander, thickness } = SHATTER;
    const rand = rng(0x5eed1e);

    // distância do centro até a borda do retângulo no ângulo th
    const edge = (th: number) => {
      const c = Math.abs(Math.cos(th));
      const s = Math.abs(Math.sin(th));
      return Math.min(c < 1e-6 ? Infinity : a / c, s < 1e-6 ? Infinity : b / s);
    };

    // ângulos dos setores, com jitter (o último fecha a volta no primeiro)
    const angles: number[] = [];
    const step = (Math.PI * 2) / sectors;
    for (let j = 0; j < sectors; j++) {
      angles.push(j * step + (rand() - 0.5) * step * jitter);
    }
    angles.push(angles[0] + Math.PI * 2);

    // ——— fronteiras dos anéis, onduladas ———
    // fracAt[i][j] = fração radial da fronteira do anel i no ângulo j.
    // O anel 0 é o ponto de impacto (tudo 0) e o último é a borda (tudo 1).
    const bases = [0];
    for (let i = 1; i < rings; i++) {
      bases.push(i / rings + (rand() - 0.5) * (1 / rings) * ringWander);
    }
    bases.push(1);

    const fracAt: number[][] = [];
    for (let i = 0; i <= rings; i++) {
      fracAt.push(new Array(sectors + 1).fill(i === rings ? 1 : 0));
    }
    for (let i = 1; i < rings; i++) {
      for (let j = 0; j < sectors; j++) {
        fracAt[i][j] = bases[i] + (rand() - 0.5) * (1 / rings) * jitter;
      }
      fracAt[i][sectors] = fracAt[i][0];   // fecha a volta no mesmo canto
    }

    // Monotonicidade por ângulo: duas passadas, uma de dentro pra fora e outra
    // de fora pra dentro, empurrando o que estiver fora de ordem. Sem isto, um
    // jitter agressivo cruza fronteiras e produz células invertidas — que
    // renderizam como triângulos pretos, não como vidro.
    for (let j = 0; j <= sectors; j++) {
      for (let i = 1; i < rings; i++) {
        fracAt[i][j] = Math.max(fracAt[i][j], fracAt[i - 1][j] + MIN_RING_GAP);
      }
      for (let i = rings - 1; i >= 1; i--) {
        fracAt[i][j] = Math.min(fracAt[i][j], fracAt[i + 1][j] - MIN_RING_GAP);
      }
    }

    // ——— quais fronteiras propagam em cada setor ———
    // Uma trinca que morre no meio do caminho funde as duas células vizinhas
    // numa peça só, e é daí que saem as cunhas compridas. O corte some SÓ neste
    // setor: as arestas laterais da peça continuam nos mesmos dois raios, então
    // o ladrilhamento segue exato e o setor vizinho não precisa saber de nada —
    // ele só passa a encostar num T, em vez de num X.
    const cuts: number[][] = [];
    for (let j = 0; j < sectors; j++) {
      const c = [0];
      for (let i = 1; i < rings; i++) if (rand() >= SHATTER.weld) c.push(i);
      c.push(rings);
      cuts.push(c);
    }

    const base = makeGlassPhoto(texture);
    const pt = (f: number, th: number) =>
      new THREE.Vector2(f * edge(th) * Math.cos(th), f * edge(th) * Math.sin(th));

    for (let j = 0; j < sectors; j++) {
      for (let c = 0; c < cuts[j].length - 1; c++) {
        const i = cuts[j][c];         // fronteira de dentro da peça
        const o = cuts[j][c + 1];     // fronteira de fora (pode pular anéis)

        const A = pt(fracAt[i][j], angles[j]);
        const B = pt(fracAt[i][j + 1], angles[j + 1]);
        const C = pt(fracAt[o][j + 1], angles[j + 1]);
        const D = pt(fracAt[o][j], angles[j]);

        // na peça que encosta no impacto A e B colapsam no mesmo ponto: a
        // célula é um triângulo. `raw` é o contorno EM ORDEM, que é o que o
        // arredondamento e a extrusão percorrem.
        const raw = i === 0 ? [A, D, C] : [A, D, C, B];

        // centroide do polígono ORIGINAL: é dele que o outset se afasta, e ele
        // não pode vir do arredondado (que já está encolhido)
        const rx = raw.reduce((s, p) => s + p.x, 0) / raw.length;
        const ry = raw.reduce((s, p) => s + p.y, 0) / raw.length;
        // raio típico da célula, pra o outset não engolir as lascas do miolo,
        // que são muito menores que as peças de fora
        const span = raw.reduce((s, p) => s + Math.hypot(p.x - rx, p.y - ry), 0) / raw.length;
        const out = Math.min(SHATTER.outset, span * 0.25);

        // raio de canto próprio: umas peças saem em navalha, outras levemente
        // gastas (ver SHATTER.cornerVary)
        const cr = SHATTER.corner * (1 + (rand() - 0.5) * SHATTER.cornerVary);

        const poly = roundPoly(raw, cr, SHATTER.cornerSegs).map((p) => {
          const dx = p.x - rx;
          const dy = p.y - ry;
          const l = Math.hypot(dx, dy) || 1e-6;
          return new THREE.Vector2(
            THREE.MathUtils.clamp(p.x + (dx / l) * out, -a, a),
            THREE.MathUtils.clamp(p.y + (dy / l) * out, -b, b),
          );
        });

        const n = poly.length;
        const cx = poly.reduce((s, p) => s + p.x, 0) / n;
        const cy = poly.reduce((s, p) => s + p.y, 0) / n;

        const pos: number[] = [];
        const uv: number[] = [];
        const toU = (x: number) => (x + a) / (2 * a);
        const toV = (y: number) => (y + b) / (2 * b);

        // posições relativas ao centroide → o caco tomba em torno de si mesmo,
        // e não em torno do centro da foto
        const put = (px: number, py: number, z: number, u: number, v: number) => {
          pos.push(px - cx, py - cy, z);
          uv.push(u, v);
        };
        const putFace = (p: THREE.Vector2, z: number) => put(p.x, p.y, z, toU(p.x), toV(p.y));
        const putMid = (z: number) => put(cx, cy, z, toU(cx), toV(cy));

        // Leque a partir do CENTROIDE, e não de um vértice: com os cantos
        // arredondados o contorno tem muitos pontos, e um leque preso num
        // vértice depende do polígono ser convexo visto dali. Do centroide
        // funciona para qualquer célula que a fratura possa produzir.
        for (let t = 0; t < n; t++) {              // face da frente, em z = 0
          putMid(0); putFace(poly[t], 0); putFace(poly[(t + 1) % n], 0);
        }
        for (let t = 0; t < n; t++) {              // verso, com a volta invertida
          putMid(-thickness);
          putFace(poly[(t + 1) % n], -thickness);
          putFace(poly[t], -thickness);
        }
        for (let t = 0; t < n; t++) {              // paredes: é daqui que vem a espessura
          const p = poly[t];
          const q = poly[(t + 1) % n];
          // UV CONSTANTE em toda a parede, tirada do meio da aresta. Enquanto
          // ela variava ao longo de p→q e ficava fixa na profundidade, a
          // parede exibia uma tira de 1 pixel da foto esticada pela espessura
          // — e era isso que se via de perto como um risco na borda do caco.
          // Constante, a parede vira um vidro tingido pela cor dali.
          const u = toU((p.x + q.x) / 2);
          const v = toV((p.y + q.y) / 2);
          put(p.x, p.y, 0, u, v); put(q.x, q.y, 0, u, v); put(q.x, q.y, -thickness, u, v);
          put(p.x, p.y, 0, u, v); put(q.x, q.y, -thickness, u, v); put(p.x, p.y, -thickness, u, v);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        // sem índices e com vértices próprios por triângulo, isto dá normais
        // CHAPADAS por face — é o que separa a aresta da parede da face da
        // frente em vez de arredondar as duas numa coisa só
        geo.computeVertexNormals();

        // opacidade e acabamento são por caco: nem todos sobrevivem, e um vidro
        // em que toda peça reflete igual volta a parecer padrão
        const mat = base.clone();
        mat.roughness = 0.08 + rand() * 0.16;
        mat.envMapIntensity = 0.9 + rand() * 0.5;

        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;

        const len = Math.hypot(cx, cy) || 1e-6;
        const dir = new THREE.Vector3(cx / len, cy / len, 0);

        this.shards.push({
          mesh,
          cx, cy, dir,
          dist: Math.min(1, len / Math.hypot(a, b)),
          jig: 0.6 + rand() * 0.8,
          phase: rand() * Math.PI * 2,
          keep: false,     // decidido logo abaixo
          bu: 0, bv: 0,
          settled: { x: 0, y: 0, z: 0 },
          settledRot: { x: 0, y: 0, z: 0 },
          burstRot: {
            x: (rand() - 0.5) * SHATTER.spin,
            y: (rand() - 0.5) * SHATTER.spin,
            z: (rand() - 0.5) * SHATTER.spin,
          },
          restPose: { x: 0, y: cy, z: RADIUS, yaw: 0 },
          anim: { burst: 0, drop: 0, rest: 0, rx: 0, ry: 0, rz: 0 },
        });
        this.mats.push(mat);
        this.group.add(mesh);
      }
    }

    this.pickBorder(rand);

    base.dispose();
    this.group.visible = false;
  }

  // Escolhe quem sobrevive e onde cada um para, em coordenadas normalizadas da
  // tela. O resto apaga durante o voo.
  //
  // A escolha é por sorteio com chave determinística, e não pelos N primeiros
  // do laço: os N primeiros seriam todos do anel de dentro, e o cabeçalho
  // sairia feito só das lascas pequenas do miolo.
  private pickBorder(rand: () => number) {
    const order = this.shards
      .map((_, i) => ({ i, key: rand() }))
      .sort((p, q) => p.key - q.key)
      .slice(0, Math.min(BORDER.keep, this.shards.length));

    const [v0, v1] = BORDER.topBand;
    const n = order.length;

    order.forEach(({ i }, k) => {
      const s = this.shards[i];
      s.keep = true;

      // Fatias iguais na largura + um empurrão aleatório dentro da fatia:
      // regular o bastante pra cobrir a faixa inteira sem deixar um vão óbvio,
      // bagunçado o bastante pra não ler como régua. Sorteio puro no lugar
      // disto amontoaria peças num canto e esvaziaria outro.
      s.bu = -1 + 2 * ((k + 0.5 + (rand() - 0.5) * BORDER.wander) / n);
      s.bv = v0 + (v1 - v0) * rand();

      s.settledRot = {
        x: (rand() - 0.5) * BORDER.spin,
        y: (rand() - 0.5) * BORDER.spin,
        z: (rand() - 0.5) * BORDER.spin * 2,   // giro no plano da tela: mais solto
      };
      s.settled.z = RADIUS + (rand() - 0.5) * BORDER.depth;
    });
  }

  // Põe cada caco no lugar exato que ele ocupa NA SUPERFÍCIE do anel.
  //
  // Um plano reto no lugar de uma superfície curva piscaria na troca agora que
  // a câmera para longe e a foto inteira está no quadro. Cada caco é pequeno o
  // bastante para a própria corda dele ser imperceptível (~0.03 de flecha no
  // maior deles).
  layoutRest(k: number) {
    for (const s of this.shards) {
      const pose = ribbonPose(s.cx, k);
      s.restPose = { x: pose.x, y: s.cy, z: pose.z, yaw: pose.yaw };
      s.anim = { burst: 0, drop: 0, rest: 0, rx: 0, ry: pose.yaw, rz: 0 };
      this.pose(s, 0);
    }
  }

  // Converte a faixa de coordenadas de tela para unidades de mundo. Só dá pra
  // fazer isto quando se sabe onde a câmera vai parar — por isso é um método, e
  // não uma conta no init.
  layoutBorder(halfW: number, halfH: number) {
    for (const s of this.shards) {
      if (!s.keep) continue;
      s.settled.x = s.bu * halfW;
      s.settled.y = s.bv * halfH;
    }
  }

  // A foto se quebra e os sobreviventes voam até a moldura.
  //
  // Devolve a timeline em vez de uma Promise porque quem chama precisa ANINHAR
  // isto numa timeline maior e pendurar a subida do painel HTML no meio dela
  // (ver Carousel.enterAbout). Com Promise só dava pra esperar terminar, e
  // esperar terminar é exatamente a pausa que estamos tirando.
  //
  // Note que ela NÃO acende o grupo: quem faz isso é o Carousel.swapToShards,
  // no instante exato da troca. Acender aqui significaria acender na hora de
  // MONTAR a timeline — que é logo no clique, um segundo inteiro antes da
  // quebra — e os cacos passariam toda a aproximação sobrepostos à foto.
  burstAndSettle(): gsap.core.Timeline {
    this.tl?.kill();

    const tl = gsap.timeline();
    this.tl = tl;

    for (const { anim, dist, keep, settledRot, burstRot, restPose, mesh } of this.shards) {
      // a trinca se propaga do impacto pra fora: quem está no centro sai primeiro
      const at = dist * SHATTER.stagger;

      // — fase 1: a quebra —
      // afastamento radial + avanço na direção da câmera, com curvas diferentes
      // no mesmo eixo (a abertura desacelera, a queda acelera)
      tl.to(anim, { burst: 1, duration: SHATTER.dur, ease: 'power2.out' }, at);
      tl.to(anim, { drop: 1, duration: SHATTER.dur, ease: 'power2.in' }, at);
      tl.to(anim, {
        rx: burstRot.x, ry: restPose.yaw + burstRot.y, rz: burstRot.z,
        duration: SHATTER.dur, ease: 'power1.out',
      }, at);

      // O caco só vira vidro ao se soltar. Em repouso ele vale 1, porque ali
      // precisa bater pixel a pixel com a foto OPACA que substitui; começar
      // translúcido daria um salto de brilho no instante da troca.
      tl.to(mesh.material as THREE.Material, {
        opacity: SHATTER.glassOpacity,
        duration: SHATTER.dur * 0.7,
        ease: 'power2.out',
      }, at);

      const back = at + SHATTER.dur;

      if (keep) {
        // — fase 2: a viagem até a moldura —
        // os escalares da quebra vão a zero enquanto `rest` sobe: o caco
        // descreve um arco do pico até a beirada da tela, sem parar no meio
        tl.to(anim, {
          burst: 0, drop: 0, rest: 1,
          rx: settledRot.x, ry: settledRot.y, rz: settledRot.z,
          duration: BORDER.dur, ease: 'power2.inOut',
        }, back);
      } else {
        // quem não fica some no ar, ainda em movimento — some no voo, não
        // aterrissa e desaparece
        tl.to(anim, {
          burst: 1.7, drop: 1.6, duration: BORDER.dur, ease: 'power1.out',
        }, back);
        tl.to(mesh.material as THREE.Material, {
          opacity: 0, duration: BORDER.dur * 0.6, ease: 'power2.in',
        }, back);
      }
    }

    return tl;
  }

  // Compõe a pose de UM caco a partir dos escalares + a flutuação. Chamado uma
  // vez por frame por caco (ver update). É barato: umas dez contas.
  private pose(s: Shard, t: number) {
    const { anim, restPose: r, dir, jig, dist, settled, phase } = s;
    const { spread, toward, fall } = SHATTER;
    const w = 1 - anim.rest;   // o peso do que veio do anel vai zerando

    let x = (r.x + dir.x * spread * jig * anim.burst) * w + settled.x * anim.rest;
    let y = (r.y + dir.y * spread * jig * 0.7 * anim.burst - fall * jig * anim.drop) * w
      + settled.y * anim.rest;
    let z = (r.z + toward * (1 - dist * 0.65) * jig * anim.burst) * w + settled.z * anim.rest;

    // A flutuação entra escalada por `rest`: durante a quebra ela vale zero e
    // não atrapalha a trajetória; ela nasce junto com a chegada na moldura.
    // As três frequências são incomensuráveis entre si, então o caco nunca
    // repete a mesma volta.
    const amp = anim.rest * BORDER.floatAmp * jig;
    if (amp > 1e-4) {
      const f = BORDER.floatSpeed;
      x += Math.sin(t * f + phase) * amp;
      y += Math.sin(t * f * 0.77 + phase * 1.7) * amp * 1.25;
      z += Math.sin(t * f * 0.61 + phase * 2.3) * amp * 0.7;
    }
    s.mesh.position.set(x, y, z);

    const sp = anim.rest * BORDER.floatSpin;
    const g = BORDER.floatSpinSpeed;
    s.mesh.rotation.set(
      anim.rx + Math.sin(t * g + phase) * sp,
      anim.ry + Math.sin(t * g * 0.83 + phase * 1.9) * sp,
      anim.rz + Math.sin(t * g * 1.17 + phase * 2.7) * sp,
    );
  }

  // Chamado a cada frame pelo render loop. `t` em segundos.
  update(t: number) {
    if (!this.group.visible) return;
    for (const s of this.shards) {
      // Quem apagou no voo sai da lista de desenho. Opacidade zero não é de
      // graça: o mesh continua sendo sombreado, e são ~39 peças com clearcoat
      // e iridescência desenhadas à toa o tempo todo em que o About fica
      // aberto. O critério é a própria opacidade, então isto se desfaz sozinho
      // quando a timeline roda ao contrário.
      if (!s.keep) {
        s.mesh.visible = (s.mesh.material as THREE.Material).opacity > 0.004;
        if (!s.mesh.visible) continue;
      }
      this.pose(s, t);
    }
  }

  // Moldura na hora, sem coreografia — deep-link /#about e
  // prefers-reduced-motion, onde não houve foto inteira pra ver quebrar.
  snapToBorder() {
    this.tl?.kill();
    this.tl = null;
    this.group.visible = true;
    this.group.position.y = 0;
    for (const s of this.shards) {
      const mat = s.mesh.material as THREE.Material;
      if (!s.keep) { mat.opacity = 0; s.mesh.visible = false; continue; }
      s.mesh.visible = true;
      mat.opacity = SHATTER.glassOpacity;
      s.anim = {
        burst: 0, drop: 0, rest: 1,
        rx: s.settledRot.x, ry: s.settledRot.y, rz: s.settledRot.z,
      };
      this.pose(s, 0);
    }
  }

  // A moldura rolando junto com a página, e apagando ao sair de cena.
  // Move o GRUPO, não os cacos — a pose de cada um é o desenho, e mexer nela
  // aqui atropelaria a timeline se ela ainda estiver rodando.
  //
  // Só os sobreviventes têm a opacidade escrita. Varrer `this.mats` inteiro
  // ressuscitaria os cacos que a quebra já apagou no voo: eles continuam na
  // cena, só com opacity 0, e o primeiro evento de rolagem os traria de volta.
  setScroll(worldY: number, opacity: number) {
    this.group.position.y = worldY;
    // `opacity` aqui é o quanto da moldura ainda está em cena (1 no topo da
    // página, 0 depois de rolar); a translucidez do vidro entra multiplicando
    const o = Math.min(Math.max(opacity, 0), 1) * SHATTER.glassOpacity;
    for (const { mesh, keep } of this.shards) {
      if (keep) (mesh.material as THREE.Material).opacity = o;
    }
    this.group.visible = o > 0.001;
  }

  // devolve os cacos ao lugar deles na foto inteira, pra uma próxima abertura
  reset() {
    this.tl?.kill();
    this.tl = null;
    this.group.visible = false;
    this.group.position.y = 0;
    for (const s of this.shards) {
      s.anim = { burst: 0, drop: 0, rest: 0, rx: 0, ry: s.restPose.yaw, rz: 0 };
      s.mesh.visible = true;
      (s.mesh.material as THREE.Material).opacity = 1;
      this.pose(s, 0);
    }
  }

  dispose() {
    this.tl?.kill();
    for (const { mesh } of this.shards) mesh.geometry.dispose();
    for (const m of this.mats) m.dispose();
    this.shards = [];
    this.mats = [];
  }
}

// Vidro que carrega a foto.
//
// O corpo da imagem vai no emissiveMap, não no map, e a cor difusa é preta.
// Isso faz o caco render a foto em brilho PLENO, sem depender de luz — igual
// ao MeshBasicMaterial da foto original, então a troca foto→cacos não dá salto
// de brilho. Por cima disso o clearcoat acende os reflexos do ambiente, e é daí
// que vem a leitura de vidro: o verniz especular, não a transparência.
// (Transmissão de verdade, como nas labels, seria cara demais para ~65 peças.)
//
// A iridescência é a camada fina que tira o acabamento de plástico: ela só
// aparece de raspão, nas arestas e nas peças mais tombadas, que é exatamente
// onde o vidro de verdade se denuncia.
function makeGlassPhoto(texture: THREE.Texture): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveMap: texture,
    emissiveIntensity: 1,
    roughness: 0.15,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.1,
    iridescence: 0.4,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [120, 420],
    side: THREE.DoubleSide,   // os cacos tombam e mostram o verso
    transparent: true,        // fade dos que não sobrevivem + da moldura ao rolar
  });
}
