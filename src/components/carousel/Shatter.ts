import * as THREE from 'three';
import gsap from 'gsap';
import { ARC_WIDTH, HEIGHT, RADIUS, SHATTER } from './config';

// A foto do About quebrando em cacos de vidro.
//
// O padrão é o estrelado de para-brisa: anéis concêntricos cortados por setores
// que saem do ponto de impacto — que é exatamente onde a câmera "entra" na foto.
// Por isso a fratura nasce no centro da tela e se abre pra fora, e não numa
// grade uniforme (grade lê como azulejo caindo, não como vidro estourando).
//
// O truque que faz os cacos ladrilharem a foto SEM sobra nem falta é medir,
// para cada ângulo, a distância até a borda do retângulo: os anéis são frações
// dessa distância, não de um raio fixo. Um padrão radial de raio constante
// deixaria buraco nos cantos e transbordaria nos lados.

// PRNG determinístico: o jitter tem que dar o MESMO desenho a cada abertura e a
// cada recarga, senão não dá pra calibrar o efeito olhando — cada teste sairia
// um vidro diferente.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Shard = {
  mesh: THREE.Mesh;
  dir: THREE.Vector3;   // direção radial a partir do impacto (normalizada)
  dist: number;         // distância ao impacto, 0 (centro) a 1 (borda)
};

export class Shatter {
  group = new THREE.Group();
  private shards: Shard[] = [];
  private mats: THREE.MeshPhysicalMaterial[] = [];
  private tl: gsap.core.Timeline | null = null;

  // `texture` é a MESMA da foto do About (já com a rotação de -90° que o
  // Segment aplica), então os cacos entram na cena com a imagem idêntica à que
  // estava ali um frame antes — o corte foto→cacos não pisca.
  init(texture: THREE.Texture) {
    const a = ARC_WIDTH / 2;
    const b = HEIGHT / 2;
    const { rings, sectors, jitter } = SHATTER;
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

    // frações radiais dos anéis: 0 (impacto) … 1 (borda da foto)
    const fracs = [0];
    for (let i = 1; i < rings; i++) {
      fracs.push(i / rings + (rand() - 0.5) * (1 / rings) * jitter);
    }
    fracs.push(1);

    const base = makeGlassPhoto(texture);
    const pt = (f: number, th: number) =>
      new THREE.Vector2(f * edge(th) * Math.cos(th), f * edge(th) * Math.sin(th));

    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < sectors; j++) {
        const A = pt(fracs[i], angles[j]);
        const B = pt(fracs[i], angles[j + 1]);
        const C = pt(fracs[i + 1], angles[j + 1]);
        const D = pt(fracs[i + 1], angles[j]);

        // no anel de dentro A e B colapsam no ponto de impacto: a célula é um
        // triângulo, e o segundo triângulo do quad seria degenerado
        const tris = fracs[i] === 0 ? [[A, D, C]] : [[A, D, C], [A, C, B]];
        const corners = fracs[i] === 0 ? [A, D, C] : [A, B, C, D];

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

        const mat = base.clone();   // opacidade é por caco (o fade é escalonado)
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cx, cy, 0);
        mesh.userData.rest = [cx, cy];   // pose de repouso, pra reset()
        mesh.frustumCulled = false;

        const len = Math.hypot(cx, cy) || 1e-6;
        this.shards.push({
          mesh,
          dir: new THREE.Vector3(cx / len, cy / len, 0),
          dist: Math.min(1, len / Math.hypot(a, b)),
        });
        this.mats.push(mat);
        this.group.add(mesh);
      }
    }

    base.dispose();
    this.group.visible = false;
    // a foto do About mora no centro da frente da fita; os cacos ocupam
    // exatamente o lugar dela (ver Ribbon.ribbonPose(0, k) → x=0, z=RADIUS).
    // O plano é reto enquanto a foto é curva, mas no instante da troca a câmera
    // está a SHATTER.gap dela e só o miolo aparece — ali a corda e o arco
    // diferem por ~0.02 unidades, bem abaixo do perceptível.
    this.group.position.set(0, 0, RADIUS);
  }

  // Estoura. Resolve quando o último caco some.
  play(): Promise<void> {
    this.group.visible = true;
    this.tl?.kill();

    const { spread, toward, fall, spin, dur, stagger } = SHATTER;
    const rand = rng(0x9a11ed);
    const tl = gsap.timeline();
    this.tl = tl;

    for (const { mesh, dir, dist } of this.shards) {
      // a trinca se propaga do impacto pra fora: quem está no centro sai primeiro
      const at = dist * stagger;
      const jig = 0.6 + rand() * 0.8;
      const [rx, ry] = mesh.userData.rest as [number, number];

      // Estouro e queda são dois movimentos com curvas DIFERENTES (o estouro
      // desacelera, a queda acelera) somados no mesmo eixo y. Tweenar y duas
      // vezes faria os dois brigarem pela propriedade a cada frame, então cada
      // um anima o próprio escalar e este apply() compõe a posição final.
      const s = { burst: 0, drop: 0 };
      const apply = () => {
        mesh.position.set(
          rx + dir.x * spread * jig * s.burst,
          ry + dir.y * spread * jig * 0.7 * s.burst - fall * jig * s.drop,
          toward * (1 - dist * 0.65) * jig * s.burst,
        );
      };

      // afastamento radial + avanço na direção da câmera. Os cacos do centro
      // vêm mais pra frente (passam raspando pela lente) e os de fora abrem
      // pros lados — é o que dá a sensação de atravessar o vidro.
      tl.to(s, { burst: 1, duration: dur, ease: 'power2.out', onUpdate: apply }, at);

      // a queda: é ela que dá o "rolar para baixo" — o vidro desaba, não flutua
      tl.to(s, { drop: 1, duration: dur, ease: 'power2.in', onUpdate: apply }, at);

      tl.to(mesh.rotation, {
        x: (rand() - 0.5) * spin,
        y: (rand() - 0.5) * spin,
        z: (rand() - 0.5) * spin,
        duration: dur,
        ease: 'power1.out',
      }, at);

      tl.to(mesh.material as THREE.Material, {
        opacity: 0,
        duration: dur * 0.55,
        ease: 'power2.in',
      }, at + dur * 0.42);
    }

    return new Promise((resolve) => {
      tl.eventCallback('onComplete', () => {
        this.group.visible = false;
        resolve();
      });
    });
  }

  // devolve os cacos à pose de repouso (a foto inteira), pra uma próxima abertura
  reset() {
    this.tl?.kill();
    this.tl = null;
    this.group.visible = false;
    for (const { mesh } of this.shards) {
      const [cx, cy] = mesh.userData.rest ?? [];
      if (cx === undefined) continue;
      mesh.position.set(cx, cy, 0);
      mesh.rotation.set(0, 0, 0);
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
    transparent: true,        // permite o fade escalonado
  });
}
