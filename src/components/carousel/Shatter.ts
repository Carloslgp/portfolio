import * as THREE from 'three';
import gsap from 'gsap';
import { ARC_WIDTH, BORDER, HEIGHT, RADIUS, SHATTER } from './config';
import { ribbonPose } from './Ribbon';

// A foto do About se quebrando — e o que sobra virando a MOLDURA da página.
//
// O padrão é o estrelado de para-brisa: anéis cortados por setores a partir do
// ponto de impacto, que é para onde a câmera está olhando. Por isso a fratura
// nasce no meio da foto e se abre pra fora, e não numa grade uniforme (grade lê
// como azulejo caindo, não como vidro quebrando).
//
// Duas coisas fazem esse padrão parar de PARECER um padrão:
//
//  1. As fronteiras dos anéis são poligonais onduladas, não círculos. O raio de
//     cada fronteira é sorteado por ÂNGULO — fracAt[anel][setor] — e as células
//     vizinhas compartilham esses cantos. Com uma fração única por anel (como
//     era antes) saíam aros concêntricos perfeitos, e o olho acha um aro num
//     piscar de olhos por mais jitter que se ponha nos setores.
//  2. Os anéis-base não são igualmente espaçados: SHATTER.ringWander desloca
//     cada um, então nem a espessura das faixas se repete.
//
// O ladrilhamento continua EXATO — sem sobra nem falta — porque cada anel mede
// a distância até a borda do retângulo no ângulo em que está: as frações são
// dessa distância, não de um raio fixo. Um padrão radial de raio constante
// deixaria buraco nos cantos e transbordaria nos lados.
//
// No fim, poucos cacos (BORDER.keep) param nas beiradas da tela — em cima e nas
// duas laterais — e o resto apaga no voo. É essa moldura esparsa que emoldura o
// texto do About, e ela rola junto com a página até sair de cena.

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

type Vec3 = { x: number; y: number; z: number };

type Shard = {
  mesh: THREE.Mesh;
  cx: number;           // centroide no espaço da foto (x = comprimento de arco)
  cy: number;
  dir: THREE.Vector3;   // direção radial a partir do impacto (normalizada)
  dist: number;         // distância ao impacto, 0 (centro) a 1 (borda)
  jig: number;          // variação por caco — a MESMA em todas as fases, senão
                        // a peça muda de personalidade no meio do caminho
  keep: boolean;        // sobrevive até a moldura, ou apaga no voo?
  side: boolean;        // lateral (empurrável) ou faixa de cima (fixa)
  bu: number;           // pose na moldura, normalizada (-1..1) sobre a tela
  bv: number;
  settled: Vec3;        // a mesma pose já convertida em unidades de mundo
  settledRot: Vec3;
  burstRot: Vec3;       // eixo do tombo no pico da quebra
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
    const { rings, sectors, jitter, ringWander } = SHATTER;
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
    for (let i = 0; i <= rings; i++) fracAt.push(new Array(sectors + 1).fill(i === rings ? 1 : 0));
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

    const base = makeGlassPhoto(texture);
    const pt = (f: number, th: number) =>
      new THREE.Vector2(f * edge(th) * Math.cos(th), f * edge(th) * Math.sin(th));

    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < sectors; j++) {
        const A = pt(fracAt[i][j], angles[j]);
        const B = pt(fracAt[i][j + 1], angles[j + 1]);
        const C = pt(fracAt[i + 1][j + 1], angles[j + 1]);
        const D = pt(fracAt[i + 1][j], angles[j]);

        // no anel de dentro A e B colapsam no ponto de impacto: a célula é um
        // triângulo, e o segundo triângulo do quad seria degenerado
        const inner = i === 0;
        const tris = inner ? [[A, D, C]] : [[A, D, C], [A, C, B]];
        const corners = inner ? [A, D, C] : [A, B, C, D];

        const cx = corners.reduce((s, p) => s + p.x, 0) / corners.length;
        const cy = corners.reduce((s, p) => s + p.y, 0) / corners.length;

        const pos: number[] = [];
        const uv: number[] = [];
        for (const tri of tris) {
          for (const p of tri) {
            // posições relativas ao centroide → o caco tomba em torno de si
            // mesmo, e não em torno do centro da foto
            pos.push(p.x - cx, p.y - cy, 0);
            uv.push((p.x + a) / (2 * a), (p.y + b) / (2 * b));
          }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.computeVertexNormals();

        const mat = base.clone();   // opacidade é por caco (nem todos sobrevivem)
        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;

        const len = Math.hypot(cx, cy) || 1e-6;
        this.shards.push({
          mesh,
          cx, cy,
          dir: new THREE.Vector3(cx / len, cy / len, 0),
          dist: Math.min(1, len / Math.hypot(a, b)),
          jig: 0.6 + rand() * 0.8,
          keep: false,     // decidido logo abaixo
          side: false,
          bu: 0, bv: 0,
          settled: { x: 0, y: 0, z: 0 },
          settledRot: { x: 0, y: 0, z: 0 },
          burstRot: {
            x: (rand() - 0.5) * SHATTER.spin,
            y: (rand() - 0.5) * SHATTER.spin,
            z: (rand() - 0.5) * SHATTER.spin,
          },
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
  // tela. "Poucos cacos jogados": o resto apaga durante o voo.
  //
  // A escolha é por sorteio com chave determinística, e não pelos N primeiros
  // do laço: os N primeiros seriam todos do anel de dentro, e a moldura sairia
  // feita só das lascas pequenas do miolo.
  private pickBorder(rand: () => number) {
    const order = this.shards
      .map((_, i) => ({ i, key: rand() }))
      .sort((p, q) => p.key - q.key)
      .slice(0, Math.min(BORDER.keep, this.shards.length));

    const [tv0, tv1] = BORDER.topBand;
    const [su0, su1] = BORDER.sideBand;
    const [sv0, sv1] = BORDER.sideSpan;
    const nTop = Math.min(BORDER.topCount, order.length);
    const nSide = order.length - nTop;
    const perSide = Math.max(1, Math.ceil(nSide / 2));

    order.forEach(({ i }, n) => {
      const s = this.shards[i];
      s.keep = true;

      // distribuição em fatias iguais + um empurrão aleatório dentro da fatia:
      // regular o bastante pra cobrir a faixa toda, bagunçado o bastante pra
      // não ler como régua
      const jog = (k: number, total: number) =>
        (k + 0.5 + (rand() - 0.5) * BORDER.wander) / total;

      if (n < nTop) {
        s.side = false;
        s.bu = -1 + 2 * jog(n, nTop);
        s.bv = tv0 + (tv1 - tv0) * rand();
      } else {
        // alterna direita/esquerda pra os dois lados encherem juntos, mesmo se
        // a conta não fechar redonda
        const k = n - nTop;
        const slot = Math.floor(k / 2);
        s.side = true;
        s.bu = (k % 2 === 0 ? 1 : -1) * (su0 + (su1 - su0) * rand());
        s.bv = sv1 - (sv1 - sv0) * jog(slot, perSide);
      }

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
  // Antes os cacos eram um plano reto parado em z = RADIUS. Isso passava
  // despercebido com a câmera colada na foto, porque só o miolo aparecia; agora
  // que ela para longe e a foto inteira está no quadro, um plano reto no lugar
  // de uma superfície curva pisca na troca. Cada caco é pequeno o bastante para
  // a própria corda dele ser imperceptível (~0.03 de flecha no maior).
  layoutRest(k: number) {
    for (const { mesh, cx, cy } of this.shards) {
      const pose = ribbonPose(cx, k);
      mesh.position.set(pose.x, cy, pose.z);
      mesh.rotation.set(0, pose.yaw, 0);
      mesh.userData.rest = [pose.x, cy, pose.z, pose.yaw];
    }
  }

  // Converte a moldura de coordenadas de tela para unidades de mundo. Só dá pra
  // fazer isto quando se sabe onde a câmera vai parar — por isso é um método, e
  // não uma conta no init.
  //
  // `sidePush` empurra só os cacos laterais mais pra fora. Numa tela larga há
  // margem de sobra entre a coluna de texto e a beirada, e ele vale zero; num
  // celular não há margem nenhuma, e sem o empurrão o vidro ficaria bem debaixo
  // das palavras.
  layoutBorder(halfW: number, halfH: number, sidePush = 0) {
    for (const s of this.shards) {
      if (!s.keep) continue;
      const u = s.side ? Math.sign(s.bu) * (Math.abs(s.bu) + sidePush) : s.bu;
      s.settled.x = u * halfW;
      s.settled.y = s.bv * halfH;
    }
  }

  // A foto se quebra e os sobreviventes voam até a moldura.
  //
  // Devolve a timeline em vez de uma Promise porque quem chama precisa ANINHAR
  // isto numa timeline maior e pendurar a subida do painel HTML no meio dela
  // (ver Carousel.enterAbout). Com Promise só dava pra esperar terminar, e
  // esperar terminar é exatamente a pausa que estamos tirando.
  // Note que ela NÃO acende o grupo: quem faz isso é o Carousel.swapToShards,
  // no instante exato da troca. Acender aqui significaria acender na hora de
  // MONTAR a timeline — que é logo no clique, um segundo inteiro antes da
  // quebra — e os cacos passariam toda a aproximação sobrepostos à foto, no
  // mesmo lugar em z, disputando cada pixel com ela.
  burstAndSettle(): gsap.core.Timeline {
    this.tl?.kill();

    const { spread, toward, fall, dur, stagger } = SHATTER;
    const tl = gsap.timeline();
    this.tl = tl;

    for (const shard of this.shards) {
      const { mesh, dir, dist, jig, keep, settled, settledRot, burstRot } = shard;
      // a trinca se propaga do impacto pra fora: quem está no centro sai primeiro
      const at = dist * stagger;
      const [rx, ry, rz, ryaw] = mesh.userData.rest as number[];

      // Quebra, queda e chegada são movimentos com curvas DIFERENTES somados
      // nos mesmos eixos. Tweenar position três vezes faria os três brigarem
      // pela propriedade a cada frame, então cada um anima o próprio escalar e
      // este apply() compõe a posição final.
      const s = { burst: 0, drop: 0, rest: 0 };
      const apply = () => {
        const w = 1 - s.rest;   // o peso do que veio do anel vai zerando
        mesh.position.set(
          (rx + dir.x * spread * jig * s.burst) * w + settled.x * s.rest,
          (ry + dir.y * spread * jig * 0.7 * s.burst - fall * jig * s.drop) * w + settled.y * s.rest,
          (rz + toward * (1 - dist * 0.65) * jig * s.burst) * w + settled.z * s.rest,
        );
      };

      // — fase 1: a quebra —
      // afastamento radial + avanço na direção da câmera. Os cacos do centro
      // vêm mais pra frente e os de fora abrem pros lados — é o que dá a
      // sensação de a foto se desfazer em vez de deslizar.
      tl.to(s, { burst: 1, duration: dur, ease: 'power2.out', onUpdate: apply }, at);
      tl.to(s, { drop: 1, duration: dur, ease: 'power2.in', onUpdate: apply }, at);
      tl.to(mesh.rotation, {
        x: burstRot.x, y: ryaw + burstRot.y, z: burstRot.z,
        duration: dur, ease: 'power1.out',
      }, at);

      const back = at + dur;

      if (keep) {
        // — fase 2: a viagem até a moldura —
        // os escalares da quebra vão a zero enquanto `rest` sobe: o caco
        // descreve um arco do pico até a beirada da tela, sem parar no meio.
        tl.to(s, {
          burst: 0, drop: 0, rest: 1,
          duration: BORDER.dur, ease: 'power2.inOut', onUpdate: apply,
        }, back);
        tl.to(mesh.rotation, {
          ...settledRot, duration: BORDER.dur, ease: 'power2.inOut',
        }, back);
      } else {
        // quem não fica some no ar, ainda em movimento — some no voo, não
        // aterrissa e desaparece
        tl.to(s, { burst: 1.7, drop: 1.6, duration: BORDER.dur, ease: 'power1.out', onUpdate: apply }, back);
        tl.to(mesh.material as THREE.Material, {
          opacity: 0, duration: BORDER.dur * 0.6, ease: 'power2.in',
        }, back);
      }
    }

    return tl;
  }

  // Moldura na hora, sem coreografia — deep-link /#about e
  // prefers-reduced-motion, onde não houve foto inteira pra ver quebrar.
  snapToBorder() {
    this.tl?.kill();
    this.tl = null;
    this.group.visible = true;
    this.group.position.y = 0;
    for (const { mesh, keep, settled, settledRot } of this.shards) {
      const mat = mesh.material as THREE.Material;
      if (!keep) { mat.opacity = 0; mesh.visible = false; continue; }
      mesh.visible = true;
      mat.opacity = 1;
      mesh.position.set(settled.x, settled.y, settled.z);
      mesh.rotation.set(settledRot.x, settledRot.y, settledRot.z);
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
    const o = Math.min(Math.max(opacity, 0), 1);
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
    for (const { mesh } of this.shards) {
      const rest = mesh.userData.rest as number[] | undefined;
      if (!rest) continue;
      mesh.position.set(rest[0], rest[1], rest[2]);
      mesh.rotation.set(0, rest[3], 0);
      mesh.visible = true;
      (mesh.material as THREE.Material).opacity = 1;
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
// (Transmissão de verdade, como nas labels, seria cara demais para ~50 peças.)
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
    side: THREE.DoubleSide,   // os cacos tombam e mostram o verso
    transparent: true,        // fade dos que não sobrevivem + da moldura ao rolar
  });
}
