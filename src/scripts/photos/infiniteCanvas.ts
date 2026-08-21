// src/scripts/photos/infiniteCanvas.ts — o plano infinito: pan em qualquer
// direção, wrap modular do tile, virtualização com pool de nós.
//
// ——— o modelo ———
// Existe uma CÂMERA (offset, em px de mundo) passeando sobre um plano onde o
// tile se repete em grade. Nada disso vira scroll de página: o container é
// fixo e a câmera continua sendo UM transform por frame nele (translate3d).
// A lente do tubo atualiza os filhos na mesma passada que já virtualiza o
// enquadramento, sem leituras de layout (ver tunnel.ts).
//
// ——— a aritmética do wrap ———
// A cópia (c, r) do tile vive em (c·tileW, r·tileH + shift), onde shift
// desloca colunas ímpares em meio tile — é o que quebra o alinhamento das
// linhas entre colunas vizinhas e disfarça a repetição. Quais cópias são
// visíveis sai de uma divisão inteira: o intervalo [offset − margem,
// offset + viewport + margem] dividido pelo passo do tile dá o range de c/r.
// Não há "teletransporte" de conteúdo nem normalização do offset: ele cresce
// livre (float64 aguenta), e o que vai pra tela é sempre mundo − offset, que
// é pequeno. A única concessão é a ORIGEM local dos nós, reancorada de tempos
// em tempos (rebase) pra os transforms dos filhos não acumularem coordenadas
// gigantes.
//
// ——— virtualização ———
// A cada passada, o conjunto de instâncias desejadas (item do tile × cópia) é
// comparado com o que está no DOM: quem saiu volta pro pool escondido, quem
// entrou pega um nó reciclado. Trocar a foto de um nó reciclado é só trocar
// src/alt — o navegador já tem os thumbs em cache depois da primeira volta.
import type { Photo } from './photos';
import type { Tile, TileItem } from './layout';
import { MURAL, PAN, TUNNEL } from './config';
import { TunnelProjection } from './tunnel';
import { TunnelRenderer, type RenderPlacement } from './tunnelRenderer';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

interface Placed {
  node: HTMLButtonElement;
  /** posição de mundo da instância (constante enquanto ela está no DOM) */
  wx: number;
  wy: number;
  w: number;
  h: number;
  photoId: string;
  thumb: string;
}

/** O lugar de uma instância dentro do plano, em px LOCAIS (já descontada a
 *  âncora): é o mesmo sistema em que os nós do mural são posicionados, então
 *  quem receber isto pode pôr um elemento exatamente por cima do ladrilho. */
export interface PlacedRect {
  left: number;
  top: number;
  w: number;
  h: number;
}

/** Um PlacedRect mais a pose de câmera que põe aquela instância no centro da
 *  tela. É o que a saída precisa saber de uma vez só: onde encostar a foto
 *  grande, e para onde a câmera tem que caminhar. */
export interface Seat extends PlacedRect {
  camX: number;
  camY: number;
}

export interface CanvasOptions {
  /** baixa animação: sem inércia (o gesto para quando o dedo para) */
  reduced: boolean;
  /** clique/Enter num tile — recebe a foto e o nó, pro FLIP do lightbox */
  onOpen(photo: Photo, node: HTMLButtonElement): void;
  /** velocidade REAL do conteúdo neste frame, em px/s — alimenta o blur */
  onVelocity(vx: number, vy: number, dt: number): void;
  /** A INTENÇÃO da coreografia para a lente: 0 durante a emenda; 1 numa
   *  chegada direta. Não é a curvatura que aparece — quem decide isso é a
   *  velocidade do pan (ver drive, abaixo). Em reduced vira 0 na lente. */
  tunnelStrength: number;
  /** camada subdividida opcional; sem WebGL os próprios botões seguem visíveis */
  renderer?: TunnelRenderer | null;
}

export class InfiniteCanvas {
  private tile: Tile | null = null;

  // câmera e física
  private offset = { x: 0, y: 0 };
  private vel = { x: 0, y: 0 };          // px/s (momentum / wheel / setas)
  private wheelPending = { x: 0, y: 0 }; // px de wheel ainda por amortecer
  private origin = { x: 0, y: 0 };       // âncora local dos nós (ver rebase)

  // arrasto
  private dragging = false;
  private pointerId = -1;
  private last = { x: 0, y: 0, t: 0 };
  private down = { x: 0, y: 0 };
  private dragVel = { x: 0, y: 0 };      // px/s suavizado, pro arremesso
  private suppressClick = false;

  private frozen = false;                // lightbox aberto: gesto e física param
  private placedAt = { x: NaN, y: NaN }; // offset da última passada de place()

  private placed = new Map<string, Placed>();
  private pool: HTMLButtonElement[] = [];

  private raf = 0;
  private lastFrame = 0;
  private tunnel: TunnelProjection;

  // ——— a lente, em duas metades ———
  // `choreo` é a INTENÇÃO (a chegada e a saída abrem e fecham a lente pelo
  // setTunnelStrength); `drive` é quanto dessa intenção a VELOCIDADE do pan
  // pede agora. O que vai pra parede é o produto: sem coreografia não há
  // curvatura nenhuma, e com ela a dobra ainda espera o movimento acontecer.
  private choreo: number;
  private driveT = 0;                    // a curva velocidade→dobra, suavizada
  private drive: number;
  private tunnelStrength: number;

  /** Nós criados agora entram com carregamento ANSIOSO. Vale só na chegada
   *  vinda do anel: ali o mural nasce ampliado e encolhe até caber na tela, e
   *  os ladrilhos que o `lazy` deixaria pra depois — porque a ampliação os
   *  empurrou pra fora do enquadramento — apareceriam um a um durante o recuo,
   *  exatamente como uma página carregando. É o que a emenda inteira existe
   *  pra não parecer. */
  private eager = false;

  constructor(
    private viewport: HTMLElement,
    private plane: HTMLElement,
    private opts: CanvasOptions,
  ) {
    this.choreo = clamp01(this.opts.tunnelStrength);
    this.drive = TUNNEL.REST;            // o mural nasce parado, logo quase reto
    this.tunnelStrength = this.opts.reduced ? 0 : this.choreo * this.drive;
    const stage = this.viewport.querySelector<HTMLElement>('[data-mural-stage]');
    if (!stage) throw new Error('InfiniteCanvas: [data-mural-stage] ausente');
    this.tunnel = new TunnelProjection(
      this.viewport,
      stage,
      this.opts.reduced,
      this.tunnelStrength,
    );
    this.bindPointer();
    this.bindWheel();
    this.bindKeys();
    this.bindScrollGuard();
  }

  /** (re)define o tile — no boot e a cada resize com debounce. O DOM inteiro é
   *  devolvido ao pool e a próxima passada remonta o enquadramento do zero. */
  setTile(tile: Tile) {
    this.tunnel.resize();
    this.tile = tile;
    for (const p of this.placed.values()) this.release(p.node);
    this.placed.clear();
    this.syncRenderer();
    this.placedAt.x = NaN;
    this.place();
  }

  /** Atualiza centro/perspectiva mesmo num resize que não reempacota o tile. */
  resize() {
    this.tunnel.resize();
    this.opts.renderer?.resize();
    this.drawTiles();
    this.renderTunnel();
  }

  /** Usado pela emenda: a parede nasce plana sob a hero e ganha curvatura só
   * quando a foto já está voltando ao lugar dela. É a INTENÇÃO da lente — o
   * quanto dela chega à parede continua sendo assunto da velocidade do pan. */
  setTunnelStrength(value: number) {
    this.choreo = clamp01(value);
    if (this.applyStrength()) this.drawTiles();
    this.renderTunnel();
  }

  /** Põe a câmera com uma instância desta foto no CENTRO do viewport e devolve
   *  o lugar dela dentro do plano. É a chegada vinda do anel: o mural não abre
   *  numa posição qualquer, abre na foto em que a home mergulhou.
   *
   *  Escolhe a instância mais próxima do centro do tile por um motivo prático:
   *  as das beiradas têm metade dos vizinhos do outro lado da costura, e a
   *  costura é perfeita mas não custa nada evitá-la no quadro de abertura.
   *
   *  Exige o tile já montado (setTile antes) e devolve `null` se esta foto não
   *  estiver nele — aí quem chamou segue sem coreografia, com o mural normal. */
  centerOn(photoId: string): PlacedRect | null {
    const tile = this.tile;
    if (!tile) return null;

    let best: TileItem | null = null;
    let bestDist = Infinity;
    for (const item of tile.items) {
      if (item.photo.id !== photoId) continue;
      const d = Math.hypot(
        item.x + item.w / 2 - tile.w / 2,
        item.y + item.h / 2 - tile.h / 2,
      );
      if (d < bestDist) { bestDist = d; best = item; }
    }
    if (!best) return null;

    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight;
    this.offset.x = best.x + best.w / 2 - vw / 2;
    this.offset.y = best.y + best.h / 2 - vh / 2;
    // âncora EXATAMENTE no offset (sem arredondar, ao contrário do rebase do
    // place): a foto da emenda precisa cair no centro sem meio pixel de folga,
    // senão a troca da imagem em tela cheia pela do plano dá um tranco
    this.rebase(this.offset.x, this.offset.y);

    // Os ladrilhos que o setTile já pôs no DOM foram criados com preguiça, e o
    // recuo os deixaria fora do enquadramento justamente enquanto o navegador
    // decide se vale a pena baixá-los. Tirar a preguiça agora recomeça o
    // carregamento dos adiados (é o que a especificação manda: lazy → eager
    // dispara o load), pra parede já estar inteira quando ela aparecer.
    for (const p of this.placed.values()) {
      const img = p.node.firstElementChild as HTMLImageElement;
      if (img.loading === 'lazy') img.loading = 'eager';
    }

    this.eager = true;
    this.placedAt.x = NaN;      // força uma passada nova, mesmo se a câmera não andou
    this.place();
    this.eager = false;

    return {
      left: best.x - this.origin.x,
      top: best.y - this.origin.y,
      w: best.w,
      h: best.h,
    };
  }

  /** A instância desta foto mais próxima do CENTRO DA TELA — o alvo do
   *  mergulho de saída. Não move nada: só diz onde ela está e qual pose de
   *  câmera a centraliza; quem caminha até lá é quem chamou, pelo panTo.
   *
   *  Ao contrário do centerOn, a busca não é dentro do tile: é sobre o plano
   *  INFINITO, com as cópias e o deslocamento de meio tile das colunas ímpares.
   *  A diferença importa porque quem sai pode estar em qualquer lugar do mural,
   *  e a instância certa é sempre a mais perto de onde a pessoa parou — nunca a
   *  do "tile original", que pode estar a três telas de distância.
   *
   *  A cópia mais próxima sai de uma divisão arredondada (o inverso exato do
   *  wrap do place()); os vizinhos ±1 entram na conta porque o deslocamento das
   *  colunas ímpares muda qual linha é a melhor conforme a paridade da coluna,
   *  e a metade de um tile é longe demais pra se resolver no chute. */
  seatNearest(photoId: string): Seat | null {
    const tile = this.tile;
    if (!tile) return null;

    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight;
    const cx = this.offset.x + vw / 2;
    const cy = this.offset.y + vh / 2;

    let best: { wx: number; wy: number; w: number; h: number } | null = null;
    let bestDist = Infinity;

    for (const item of tile.items) {
      if (item.photo.id !== photoId) continue;
      const c0 = Math.round((cx - item.x - item.w / 2) / tile.w);
      for (let c = c0 - 1; c <= c0 + 1; c++) {
        const shift = (((c % 2) + 2) % 2) ? tile.h / 2 : 0;
        const r0 = Math.round((cy - item.y - item.h / 2 - shift) / tile.h);
        for (let r = r0 - 1; r <= r0 + 1; r++) {
          const wx = c * tile.w + item.x;
          const wy = r * tile.h + shift + item.y;
          const d = Math.hypot(wx + item.w / 2 - cx, wy + item.h / 2 - cy);
          if (d < bestDist) {
            bestDist = d;
            best = { wx, wy, w: item.w, h: item.h };
          }
        }
      }
    }
    if (!best) return null;

    // Reancora a origem no offset ATUAL. Daqui até o fim da saída a câmera anda
    // no máximo meio tile, e partindo de distância zero nenhum rebase pode
    // acontecer no meio do caminho — um rebase reescreve as posições locais de
    // todo mundo, e a foto grande da saída mora nesse mesmo sistema sem passar
    // pela virtualização que o conserta.
    this.rebase(this.offset.x, this.offset.y);

    // Mesmo motivo do centerOn: o mergulho empurra ladrilhos pra fora do
    // enquadramento, e o que o `lazy` adiar agora aparece um a um durante o
    // deslize — exatamente como uma página carregando.
    for (const p of this.placed.values()) {
      const img = p.node.firstElementChild as HTMLImageElement;
      if (img.loading === 'lazy') img.loading = 'eager';
    }

    this.eager = true;
    this.placedAt.x = NaN;      // a âncora mudou: força a passada de reposição
    this.place();
    this.eager = false;

    return {
      left: best.wx - this.origin.x,
      top: best.wy - this.origin.y,
      w: best.w,
      h: best.h,
      camX: best.wx + best.w / 2 - vw / 2,
      camY: best.wy + best.h / 2 - vh / 2,
    };
  }

  /** Onde a câmera está agora, em px de mundo — o ponto de partida da saída. */
  cameraOffset(): { x: number; y: number } {
    return { x: this.offset.x, y: this.offset.y };
  }

  /** Põe a câmera aqui, no braço. É o que o tick faria, para quem está
   *  CONGELADO: a saída é uma coreografia com relógio próprio (GSAP), e não
   *  física — mas o plano, a virtualização, a lente e a camada 3D continuam
   *  precisando da mesma passada de sempre, que é a que o place() dá. */
  panTo(x: number, y: number) {
    this.offset.x = x;
    this.offset.y = y;
    this.place();
  }

  /** Espera os thumbs do primeiro enquadramento estarem decodificados.
   *
   * O canvas está congelado durante a chegada, portanto `placed` não muda
   * enquanto esta Promise resolve. URLs repetidas são esperadas uma vez só: as
   * cópias do tile compartilham os mesmos bytes e o mesmo bitmap decodificado. */
  readyForEntry(): Promise<void> {
    const unique = new Map<string, HTMLImageElement>();
    for (const p of this.placed.values()) {
      const img = p.node.firstElementChild as HTMLImageElement;
      if (img.src && !unique.has(img.src)) unique.set(img.src, img);
    }

    const ready = [...unique.values()].map((img) => {
      if (img.decode) return img.decode().catch(() => {});
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    });

    const rendererReady = this.opts.renderer?.readyForEntry() ?? Promise.resolve();
    return Promise.all([...ready, rendererReady]).then(() => {});
  }

  start() {
    this.lastFrame = performance.now();
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      this.tick(t);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  /** O mural congela enquanto o lightbox está aberto. A curvatura fica onde
   *  está de propósito: o FLIP de abertura mede o ladrilho AGORA e o de
   *  fechamento pousa nele de novo (o unfreeze só vem depois), então a parede
   *  se desenrolando por baixo moveria o alvo dos dois. Ela volta a obedecer à
   *  velocidade no primeiro frame depois do unfreeze. */
  freeze() {
    this.frozen = true;
    this.vel.x = this.vel.y = 0;
    this.wheelPending.x = this.wheelPending.y = 0;
    this.dragging = false;
    this.opts.onVelocity(0, 0, 1 / 60);
  }

  unfreeze() {
    this.frozen = false;
    this.lastFrame = performance.now();
  }

  // ——— física + desenho, uma vez por frame ———
  private tick(t: number) {
    const dt = Math.min((t - this.lastFrame) / 1000, 1 / 20);
    this.lastFrame = t;
    if (this.frozen || !this.tile || dt <= 0) return;

    const before = { x: this.offset.x, y: this.offset.y };

    if (!this.dragging) {
      this.offset.x += this.vel.x * dt;
      this.offset.y += this.vel.y * dt;
      // decaimento com expoente em dt: o mesmo deslize em 60 e em 144Hz
      const decay = Math.pow(PAN.DAMPING, dt * 60);
      this.vel.x *= decay;
      this.vel.y *= decay;
      if (Math.hypot(this.vel.x, this.vel.y) < PAN.STOP_SPEED) {
        this.vel.x = this.vel.y = 0;
      }

      // A rodinha entrega passos discretos. Guardar esses passos e consumir
      // uma fração por quadro tira o tranco sem inventar distância: depois que
      // o usuário para, o restante continua andando e assenta exatamente na
      // soma dos deltas recebidos. O expoente deixa a duração igual em 60 e
      // 144Hz, assim como o damping do momentum acima.
      if (this.wheelPending.x || this.wheelPending.y) {
        const ease = 1 - Math.pow(1 - PAN.WHEEL_SMOOTH, dt * 60);
        const dx = this.wheelPending.x * ease;
        const dy = this.wheelPending.y * ease;
        this.offset.x += dx;
        this.offset.y += dy;
        this.wheelPending.x -= dx;
        this.wheelPending.y -= dy;

        // Fecha a cauda microscópica da exponencial sem perder os últimos
        // décimos de pixel do gesto.
        if (Math.hypot(this.wheelPending.x, this.wheelPending.y) < PAN.WHEEL_STOP) {
          this.offset.x += this.wheelPending.x;
          this.offset.y += this.wheelPending.y;
          this.wheelPending.x = this.wheelPending.y = 0;
        }
      }
    }

    // a velocidade que o blur enxerga é a REAL do frame — cobre arrasto,
    // momentum, wheel e setas de uma vez, porque todos passam pelo offset
    const vx = (this.offset.x - before.x) / dt;
    const vy = (this.offset.y - before.y) / dt;
    this.opts.onVelocity(vx, vy, dt);

    // a MESMA velocidade enrola a parede. Blur e curvatura leem o mesmo número
    // no mesmo frame, então o pan rápido chega como um efeito só.
    const curved = this.driveTunnel(Math.hypot(vx, vy), dt);

    // a câmera continua tendo um dono só; a lente dos filhos é atualizada em
    // place(), abaixo, sem disputar esta string
    this.applyTransform();

    // A lente depende da posição de tela, então qualquer movimento real precisa
    // redesenhar os cordéis. O custo continua sem leitura de layout; quando a
    // câmera assenta em zero, esta passada também para por inteiro.
    if (this.offset.x !== this.placedAt.x || this.offset.y !== this.placedAt.y) {
      this.place();
    } else if (curved) {
      // A câmera parou mas a parede ainda está se desenrolando: a cauda lenta
      // do release é movimento sem deslocamento, e sem este ramo ela congelaria
      // no meio da volta, na curvatura do último frame que andou.
      this.drawTiles();
      this.renderTunnel();
    }
  }

  /** A velocidade do pan vira curvatura (ver TUNNEL.REST e vizinhos). Devolve
   *  se a lente mudou o bastante pra pedir redesenho. */
  private driveTunnel(speed: number, dt: number): boolean {
    if (this.opts.reduced) return false;

    const target = Math.pow(Math.min(speed / TUNNEL.SPEED_FULL, 1), TUNNEL.SPEED_EXP);
    // assimétrico: enrola no tempo da mão, desenrola devagar. O expoente em dt
    // é o mesmo truque do damping da física — mesma sensação em 60 e 144Hz.
    const rate = target > this.driveT ? TUNNEL.SPEED_ATTACK : TUNNEL.SPEED_RELEASE;
    this.driveT += (target - this.driveT) * (1 - Math.pow(1 - rate, dt * 60));

    this.drive = TUNNEL.REST + (1 - TUNNEL.REST) * this.driveT;
    return this.applyStrength();
  }

  /** Recompõe o produto intenção × velocidade e o entrega às duas lentes (a
   *  matrix3d do DOM e o shader). Devolve se a mudança valeu um redesenho — o
   *  limiar é o da TunnelProjection, então DOM e canvas nunca discordam sobre
   *  qual quadro é o atual. */
  private applyStrength(): boolean {
    this.tunnelStrength = this.opts.reduced ? 0 : this.choreo * this.drive;
    return this.tunnel.setStrength(this.tunnelStrength);
  }

  /** A posição da câmera vira UM transform no container. Mora numa função
   *  porque não é só o loop que precisa dela: com o mural congelado (lightbox
   *  aberto, ou a chegada vinda do anel) o tick sai antes de desenhar, e sem
   *  isto aqui o plano ficaria no lugar antigo enquanto os nós já estariam
   *  posicionados pelo novo — o mural nasceria deslocado. */
  private applyTransform() {
    this.plane.style.transform =
      `translate3d(${this.origin.x - this.offset.x}px, ${this.origin.y - this.offset.y}px, 0)`;
  }

  // ——— virtualização ———
  private place() {
    const tile = this.tile;
    if (!tile) return;
    this.placedAt.x = this.offset.x;
    this.placedAt.y = this.offset.y;

    // longe demais da âncora: reancora e reposiciona o que está no DOM.
    // Raro (a cada REBASE_DIST px de passeio) e barato (só transforms).
    if (
      Math.abs(this.offset.x - this.origin.x) > MURAL.REBASE_DIST ||
      Math.abs(this.offset.y - this.origin.y) > MURAL.REBASE_DIST
    ) {
      this.rebase(Math.round(this.offset.x), Math.round(this.offset.y));
    }

    // a âncora pode ter mudado logo acima, e o congelado nem passa pelo tick:
    // esta passada é o único lugar que garante plano e nós no mesmo sistema
    this.applyTransform();

    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight;
    const left = this.offset.x - MURAL.RENDER_MARGIN;
    const right = this.offset.x + vw + MURAL.RENDER_MARGIN;
    const top = this.offset.y - MURAL.RENDER_MARGIN;
    const bottom = this.offset.y + vh + MURAL.RENDER_MARGIN;

    // quais cópias do tile tocam o retângulo visível — a divisão inteira que
    // É o wrap modular (floor(x / passo) dá a cópia que contém x)
    const wanted = new Map<string, { item: TileItem; wx: number; wy: number }>();
    const c0 = Math.floor(left / tile.w);
    const c1 = Math.floor(right / tile.w);
    for (let c = c0; c <= c1; c++) {
      // colunas ímpares descem meio tile ((c % 2) em JS é negativo pra c < 0,
      // daí o embrulho extra pra paridade sair certa em qualquer lado do zero)
      const shift = (((c % 2) + 2) % 2) ? tile.h / 2 : 0;
      const r0 = Math.floor((top - shift) / tile.h);
      const r1 = Math.floor((bottom - shift) / tile.h);
      for (let r = r0; r <= r1; r++) {
        const baseX = c * tile.w;
        const baseY = r * tile.h + shift;
        for (let i = 0; i < tile.items.length; i++) {
          const item = tile.items[i];
          const wx = baseX + item.x;
          const wy = baseY + item.y;
          if (wx < right && wx + item.w > left && wy < bottom && wy + item.h > top) {
            wanted.set(`${i}:${c}:${r}`, { item, wx, wy });
          }
        }
      }
    }

    // saiu do quadro → pool
    for (const [key, p] of this.placed) {
      if (!wanted.has(key)) {
        this.release(p.node);
        this.placed.delete(key);
      }
    }

    // entrou no quadro → nó reciclado (ou novo, se o pool secou)
    for (const [key, w] of wanted) {
      if (this.placed.has(key)) continue;
      const node = this.pool.pop() ?? this.makeNode();
      const p: Placed = {
        node, wx: w.wx, wy: w.wy, w: w.item.w, h: w.item.h, photoId: '', thumb: '',
      };
      this.assign(p, w.item);
      node.hidden = false;
      this.placed.set(key, p);
    }

    // A lente depende da posição EM TELA, portanto também reescreve quem já
    // estava no DOM. A travessia é só de escritas e reaproveita esta chamada da
    // virtualização; não existe leitura de layout nem um segundo RAF.
    this.drawTiles();
    this.syncRenderer();
    this.renderTunnel();
  }

  private position(p: Placed) {
    this.tunnel.project(p, this.origin, this.offset);
  }

  private drawTiles() {
    for (const p of this.placed.values()) this.position(p);
  }

  private syncRenderer() {
    if (!this.opts.renderer) return;
    const entries: RenderPlacement[] = [];
    for (const [key, p] of this.placed) {
      entries.push({
        key,
        photoId: p.photoId,
        thumb: p.thumb,
        wx: p.wx,
        wy: p.wy,
        w: p.w,
        h: p.h,
      });
    }
    this.opts.renderer.sync(entries);
  }

  private renderTunnel() {
    this.opts.renderer?.frame(this.offset, this.tunnelStrength);
  }

  /** Troca a âncora local e REPOSICIONA quem já está no DOM.
   *
   *  As duas coisas andam juntas sempre: a posição de um nó é `mundo − âncora`,
   *  escrita uma vez, na hora em que ele entra no quadro. Mexer na âncora sem
   *  reescrever essas posições deixa os nós antigos medidos por uma régua e o
   *  plano (que também desconta a âncora) por outra — e o mural inteiro sai do
   *  lugar pela diferença. Por isso mexer na âncora é ESTA função, e não uma
   *  atribuição solta. */
  private rebase(x: number, y: number) {
    this.origin.x = x;
    this.origin.y = y;
    for (const p of this.placed.values()) this.position(p);
  }

  private assign(p: Placed, item: TileItem) {
    const { node } = p;
    p.w = item.w;
    p.h = item.h;
    node.style.width = `${item.w}px`;
    node.style.height = `${item.h}px`;
    if (p.photoId === item.photo.id) return;   // nó reciclado com a MESMA foto
    p.photoId = item.photo.id;
    p.thumb = item.photo.thumb;

    const img = node.firstElementChild as HTMLImageElement;
    // a troca de src num nó reciclado mostraria a foto ANTIGA esticada até a
    // nova chegar; o is-loading a esconde e o onload (abaixo, no makeNode) a
    // revela — com o cache quente isso é um frame
    img.classList.add('is-loading');
    img.src = item.photo.thumb;
    img.alt = '';                              // quem fala é o aria-label do botão
    img.width = item.photo.w;
    img.height = item.photo.h;
    node.dataset.photo = item.photo.id;
    node.setAttribute('aria-label', `Ampliar foto: ${item.photo.alt}`);
  }

  private makeNode(): HTMLButtonElement {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'mural-tile';
    const img = document.createElement('img');
    img.loading = this.eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.draggable = false;
    img.addEventListener('load', () => img.classList.remove('is-loading'));
    node.appendChild(img);

    node.addEventListener('click', () => {
      // o click chega DEPOIS do pointerup do arrasto; a flag diz se o gesto
      // foi arrasto (aí não é clique). Enter/Espaço nunca passam por ela.
      if (this.suppressClick || this.frozen) return;
      const photo = this.photoOf(node.dataset.photo);
      if (photo) this.opts.onOpen(photo, node);
    });

    this.plane.appendChild(node);
    return node;
  }

  private photoOf(id: string | undefined): Photo | null {
    if (!id || !this.tile) return null;
    return this.tile.items.find((i) => i.photo.id === id)?.photo ?? null;
  }

  private release(node: HTMLButtonElement) {
    node.hidden = true;
    this.pool.push(node);
  }

  /** ——— o mural NUNCA rola ———
   *
   *  Aqui não existe rolagem: a câmera anda por transform, e o viewport é uma
   *  janela parada. Mas o navegador não sabe disso — tocar num tile que só
   *  aparece pela beirada dá foco no botão, e o foco vem com um "traz isso pra
   *  dentro da vista" que ele atende ROLANDO o ancestral rolável mais próximo.
   *  O resultado era o mural inteiro subindo e deixando papel no pé da tela.
   *
   *  O `overflow: clip` do CSS já tira o viewport da lista de caixas roláveis
   *  onde ele existe; esta guarda é para quem não o conhece (Safari < 16) e
   *  para o documento, que também pode ser o alvo da vez. Roda antes do
   *  próximo quadro, então o desvio nem chega a ser pintado. */
  private bindScrollGuard() {
    const pin = (el: Element) => {
      if (el.scrollTop) el.scrollTop = 0;
      if (el.scrollLeft) el.scrollLeft = 0;
    };
    this.viewport.addEventListener('scroll', () => pin(this.viewport));
    window.addEventListener('scroll', () => {
      const root = document.scrollingElement;
      if (root) pin(root);
    });
  }

  // ——— gesto: Pointer Events (mouse e touch no mesmo caminho) ———
  private bindPointer() {
    this.viewport.addEventListener('pointerdown', (e) => {
      if (this.frozen) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (this.dragging) return;              // segundo dedo: ignorado (sem pinch na v1)
      this.dragging = true;
      this.pointerId = e.pointerId;
      this.suppressClick = false;
      this.down = { x: e.clientX, y: e.clientY };
      this.last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      this.dragVel.x = this.dragVel.y = 0;
      this.vel.x = this.vel.y = 0;            // pega o mural onde ele está
      this.wheelPending.x = this.wheelPending.y = 0;
      // NÃO captura aqui: com a captura ativa o `click` deixa de nascer no
      // botão do tile e passa a mirar o viewport — o toque simples morreria.
      // A captura entra só quando o gesto se declara arrasto (abaixo).
    });

    this.viewport.addEventListener('pointermove', (e) => {
      if (!this.dragging || e.pointerId !== this.pointerId) return;
      const dx = e.clientX - this.last.x;
      const dy = e.clientY - this.last.y;
      const dtMs = e.timeStamp - this.last.t;
      this.last = { x: e.clientX, y: e.clientY, t: e.timeStamp };

      // conteúdo segue o dedo: a câmera anda pro lado CONTRÁRIO
      this.offset.x -= dx;
      this.offset.y -= dy;

      if (
        !this.suppressClick &&
        Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > PAN.CLICK_SLOP
      ) {
        // virou arrasto: daqui em diante o clique não vale e o ponteiro fica
        // preso ao viewport — soltar fora da janela ainda encerra o gesto
        this.suppressClick = true;
        this.viewport.setPointerCapture?.(e.pointerId);
      }

      // velocidade instantânea suavizada (mesma ideia do Input.ts do anel):
      // é ela que vira o arremesso no soltar
      if (dtMs > 0) {
        const s = PAN.VELOCITY_SMOOTH;
        this.dragVel.x = this.dragVel.x * (1 - s) + (-dx / (dtMs / 1000)) * s;
        this.dragVel.y = this.dragVel.y * (1 - s) + (-dy / (dtMs / 1000)) * s;
      }
    });

    const end = (e: PointerEvent) => {
      if (!this.dragging || e.pointerId !== this.pointerId) return;
      this.dragging = false;
      this.viewport.releasePointerCapture?.(e.pointerId);
      if (this.suppressClick && !this.opts.reduced) {
        this.vel.x = this.dragVel.x * PAN.MOMENTUM;
        this.vel.y = this.dragVel.y * PAN.MOMENTUM;
      }
      // o `click` do arrasto dispara logo após o pointerup, ainda com a flag
      // de pé; o timeout zera DEPOIS dele, senão um Enter futuro ficaria mudo
      setTimeout(() => { this.suppressClick = false; }, 0);
    };
    this.viewport.addEventListener('pointerup', end);
    this.viewport.addEventListener('pointercancel', end);
  }

  private bindWheel() {
    this.viewport.addEventListener('wheel', (e) => {
      if (this.frozen) return;
      // ctrl+wheel é o zoom DE PÁGINA do navegador — acessibilidade; fica com ele
      if (e.ctrlKey) return;
      e.preventDefault();

      // Alguns navegadores entregam wheel em linhas/páginas em vez de pixels.
      // Normalizar antes da física mantém a mesma sensação entre eles.
      const unit = e.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? PAN.WHEEL_LINE_PX
        : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? this.viewport.clientHeight
          : 1;
      const dx = e.deltaX * unit * PAN.WHEEL_FACTOR;
      const dy = e.deltaY * unit * PAN.WHEEL_FACTOR;

      if (this.opts.reduced) {
        // A preferência por pouco movimento continua sem inércia.
        this.vel.x = this.vel.y = 0;
        this.wheelPending.x = this.wheelPending.y = 0;
        this.offset.x += dx;
        this.offset.y += dy;
      } else {
        // Além de amaciar o passo bruto, cada evento dá um impulso à física.
        // É esse impulso que continua vivo quando a sequência de eventos acaba;
        // sem ele, uma rolagem longa alcança o alvo antes de a mão parar e parece
        // travar instantaneamente no último clique da rodinha.
        const kick = (current: number, delta: number) => {
          if (!delta) return current;
          const impulse = delta * PAN.WHEEL_MOMENTUM;
          // Inverter a roda freia e já parte na direção nova, em vez de somar
          // velocidades opostas por vários quadros.
          const next = Math.sign(current) === Math.sign(impulse)
            ? current + impulse
            : impulse;
          return Math.max(-PAN.WHEEL_MAX_SPEED, Math.min(PAN.WHEEL_MAX_SPEED, next));
        };

        this.vel.x = kick(this.vel.x, dx);
        this.vel.y = kick(this.vel.y, dy);
        this.wheelPending.x += dx;
        this.wheelPending.y += dy;
      }
    }, { passive: false });
  }

  private bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (this.frozen) return;
      const dir = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        ArrowUp: [0, -1], ArrowDown: [0, 1],
      }[e.key];
      if (!dir) return;
      e.preventDefault();
      this.wheelPending.x = this.wheelPending.y = 0;
      if (this.opts.reduced) {
        // sem inércia: passo seco, e a virtualização resolve no frame seguinte
        this.offset.x += dir[0] * PAN.ARROW_STEP;
        this.offset.y += dir[1] * PAN.ARROW_STEP;
      } else {
        // imprime velocidade (o auto-repeat da tecla sustenta; soltar deixa o
        // DAMPING assentar o movimento, igual ao fim de um arrasto)
        this.vel.x = dir[0] * PAN.ARROW_SPEED;
        this.vel.y = dir[1] * PAN.ARROW_SPEED;
      }
    });
  }
}
