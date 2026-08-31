// src/scripts/photos/main.ts — ponto de entrada da página /photos: liga a
// fonte de dados, o tile, o canvas infinito, o blur e o lightbox.
//
// Nada de Lenis aqui, de propósito: o mural É o scroll da página. A rolagem
// suave da home vive e morre com a home (navegação MPA — sair de lá destrói
// o loop do Three.js e o Lenis juntos, sem teardown manual).
import gsap from 'gsap';
import { readPhotos, type Photo } from './photos';
import { buildTile, targetRowHeight } from './layout';
import { InfiniteCanvas, type PlacedRect } from './infiniteCanvas';
import { MotionBlur } from './motionBlur';
import { Lightbox } from './lightbox';
import { TunnelRenderer } from './tunnelRenderer';
import { ENTRY, EXIT, MURAL, TUNNEL } from './config';
import { storedMotionMode } from '../motion';
import {
  PHOTOS_RETURN_KEY, SEAM_ASPECT, SEAM_BACK_KEY, SEAM_OVERSCAN, SEAM_PHOTO,
} from '../../data/gallery';
import { viewportSize } from '../viewport';

export function initMural() {
  const viewport = document.querySelector<HTMLElement>('[data-mural]');
  const fx = document.querySelector<HTMLElement>('[data-mural-fx]');
  const glCanvas = document.querySelector<HTMLCanvasElement>('[data-mural-gl]');
  const plane = document.querySelector<HTMLElement>('[data-mural-plane]');
  const gaussian = document.querySelector<SVGFEGaussianBlurElement>('[data-blur-gaussian]');
  const photos = readPhotos();
  if (!viewport || !fx || !glCanvas || !plane || !gaussian || !photos.length) return;

  // A resposta de "quer movimento?" nesta página: a escolha feita no portão da
  // home (sessionStorage) manda; quem entrou direto por /photos nunca viu o
  // portão, então vale a preferência do sistema. Só o dataset local — persistir
  // aqui roubaria a pergunta do portão de quem ainda não a respondeu.
  const stored = storedMotionMode();
  const reduced = stored
    ? stored === 'reduced'
    : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';

  // O filtro fica FORA da árvore que compõe a perspectiva. Assim ele borra o
  // quadro 3D já pronto, sem achatar os filhos e apagar a profundidade.
  const blur = new MotionBlur(fx, gaussian, reduced);

  const seamEntry = document.documentElement.dataset.entry === 'seam' && !reduced;
  let canvas: InfiniteCanvas | null = null;
  let rendererUsable = false;
  let rendererActive = false;
  let desiredTunnelStrength = seamEntry ? 0 : 1;
  const renderer = new TunnelRenderer(
    glCanvas,
    reduced,
    () => {
      rendererUsable = false;
      rendererActive = false;
      canvas?.setTunnelStrength(0);
    },
    () => {
      rendererActive = true;
      canvas?.setTunnelStrength(desiredTunnelStrength);
    },
  );
  rendererUsable = renderer.init();

  const lightbox = new Lightbox(photos, document.body, {
    reduced,
    freeze: () => {
      blur.reset();
      canvas?.freeze();
    },
    unfreeze: () => canvas?.unfreeze(),
  });

  canvas = new InfiniteCanvas(viewport, plane, {
    reduced,
    onOpen: (photo, node) => lightbox.show(photo, node),
    onVelocity: (vx, vy, dt) => blur.update(vx, vy, dt),
    // Na chegada direta, o DOM fica plano até o primeiro frame GPU estar
    // pronto. O callback de ativação acima curva proxies e canvas na mesma
    // pintura, sem mostrar por um instante a aproximação CSS entre os dois.
    tunnelStrength: 0,
    renderer: rendererUsable ? renderer : null,
  });

  // A curvatura da parede tem um dono só, e as duas coreografias (chegada e
  // saída) passam por aqui. `desiredTunnelStrength` guarda a INTENÇÃO; o que
  // chega à lente é zero enquanto não houver quadro de GPU pra sustentá-la.
  const setTunnel = (strength: number) => {
    desiredTunnelStrength = strength;
    canvas?.setTunnelStrength(rendererActive ? strength : 0);
  };

  // ——— o Voltar ———
  // Quem chegou aqui vindo da home volta PELA HISTÓRIA, não pelo href: o
  // BFCache do navegador restaura a home viva — anel no lugar, sem cortina —
  // que é a melhor volta possível. (E se o BFCache não servir a página, o
  // reboot da home reconhece a volta e entra sem pergunta nem descida: ver
  // main.ts → isInternalArrival.) O href="/" fica de rede pra quem entrou
  // direto em /photos por link — aí não há história pra voltar.
  //
  // A origem é uma marca explícita da home. `document.referrer` não serve de
  // contrato: ele pode vir vazio por Referrer-Policy ou configuração de
  // privacidade, e nesse caso o código antigo caía no href e recarregava tudo.
  let returnToRing = false;
  try {
    returnToRing = !!sessionStorage.getItem(PHOTOS_RETURN_KEY);
    if (returnToRing) {
      history.replaceState({ ...history.state, returnToRing: true }, '');
    } else {
      returnToRing = history.state?.returnToRing === true;
    }
  } catch {}

  // A saída, montada no clique e não antes: ela precisa da câmera onde a pessoa
  // parou, e isso só existe na hora. `exit` de pé também é a trava do clique
  // duplo — o mesmo papel do `leaving` da home.
  let exit: Exit | null = null;
  let entering = false;   // a chegada ainda anda? (ver o enterFromSeam lá embaixo)

  document.querySelector<HTMLAnchorElement>('[data-back]')?.addEventListener('click', (e) => {
    if (!returnToRing || history.length <= 1) return;
    e.preventDefault();
    if (exit || !canvas) return;

    // A emenda pede a foto da emenda. Sem ela na pasta (basta alguém renomear o
    // arquivo), em baixa animação, e com a CHEGADA ainda em curso, voltar
    // continua sendo só voltar.
    const seamPhoto = reduced || entering
      ? null
      : photos.find((p) => p.id === SEAM_PHOTO);
    exit = seamPhoto
      ? leaveToSeam(canvas, plane, seamPhoto, blur, desiredTunnelStrength, setTunnel)
      : null;

    if (!exit) return void history.back();

    exit.done.then(() => {
      // O recado pra home, escrito só agora: o quadro que ela vai receber é a
      // foto cobrindo a tela, e não o mural. Escrever antes seria prometer uma
      // emenda que uma saída interrompida no meio não entregaria.
      try { sessionStorage.setItem(SEAM_BACK_KEY, '1'); } catch {}
      history.back();
    });
  });

  // O navegador pode devolver ESTA página pelo BFCache — é o "avançar" logo
  // depois da volta. Ela voltaria congelada dentro da foto, no último quadro da
  // saída, e sem gesto nenhum. É o mesmo remendo que a home faz do outro lado
  // (ver scripts/main.ts → pageshow), e o único lugar que sabe desfazer isto.
  window.addEventListener('pageshow', (e) => {
    if (!(e as PageTransitionEvent).persisted || !exit) return;
    // a home não chegou a consumir a marca (a volta virou um avançar): limpa
    // aqui pra ela não valer numa saída futura, que talvez nem aconteça
    try { sessionStorage.removeItem(SEAM_BACK_KEY); } catch {}
    exit.undo();
    exit = null;
  });

  const tileWidth = () =>
    Math.round(Math.max(window.innerWidth * MURAL.TILE_W_SCREENS, MURAL.MIN_TILE_W));
  // A largura do TILE e a altura da LINHA vêm de lugares diferentes de
  // propósito: o tile é largo pra repetição não gritar, e a linha é fração da
  // TELA pra um celular ver um MURAL, e não uma foto por vez (ver layout.ts).
  const rowHeight = () => targetRowHeight(window.innerWidth);
  let lastTileW = tileWidth();
  let lastRowH = rowHeight();
  canvas.setTile(buildTile(photos, lastTileW, lastRowH));

  // A chegada vinda do anel. Tudo o que ela muda no mural acontece AQUI, entre
  // montar o tile e ligar o loop: são escritas de estilo numa tacada só, sem
  // nenhum quadro desenhado no meio — o que a tela já mostra (a foto da emenda,
  // pintada pelo HTML) continua valendo até o recuo começar.
  const seat = seamEntry
    ? canvas.centerOn(SEAM_PHOTO)
    : null;

  if (seat) {
    const arrival = enterFromSeam(canvas, plane, seat, setTunnel);
    // A HUD acende ANTES de a chegada terminar (ENTRY.HUD_AT), então existe um
    // vão de meio segundo em que dá pra clicar no "‹ Voltar" com o recuo ainda
    // andando. As duas coreografias escrevem o MESMO transform do .mural-zoom, e
    // duas donas de uma propriedade só é o defeito que este projeto inteiro
    // evita. Enquanto o recuo anda, voltar é só voltar — ver o clique acima.
    if (arrival) {
      entering = true;
      arrival.then(() => { entering = false; });
    }
  } else {
    endEntry();
  }

  canvas.start();

  // resize com debounce: o tile só é reconstruído quando a largura de fato
  // mudou — girar o celular reempacota, rolar a barra de endereço não
  //
  // (Um resize DURANTE o recuo da chegada reconstrói o tile debaixo dele e a
  // foto da emenda perde o lugar. Não há trava aqui de propósito: girar o
  // aparelho no primeiro segundo da página é raro o bastante pra não valer o
  // estado a mais, e o pior caso é a coreografia sair torta uma vez — o mural
  // se remonta certo no quadro seguinte.)
  let timer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      canvas.resize();
      const w = tileWidth();
      const rh = rowHeight();
      if (w !== lastTileW || rh !== lastRowH) {
        lastTileW = w;
        lastRowH = rh;
        canvas.setTile(buildTile(photos, w, rh));
      }
    }, MURAL.RESIZE_DEBOUNCE);
  });
}

// ——— a chegada vinda do anel ———
//
// A home desenrola o segmento, para com a foto plana cobrindo a tela e navega.
// Quem termina o gesto é esta página, RECUANDO daquela mesma foto até o lugar
// dela na parede. Durante o recuo, a largura da fita também volta à proporção
// natural do arquivo — uma correção pequena absorvida pelo próprio movimento.
//
// A emenda é possível porque os dois documentos usam SEAM_ASPECT e
// SEAM_OVERSCAN para construir o mesmo retângulo. Não há medida casada no olho:
// o último quadro da home e o primeiro daqui saem da mesma conta.
function enterFromSeam(
  canvas: InfiniteCanvas,
  plane: HTMLElement,
  seat: PlacedRect,
  setTunnelStrength: (strength: number) => void,
): gsap.core.Timeline | null {
  const zoom = document.querySelector<HTMLElement>('[data-mural-zoom]');
  const hero = document.querySelector<HTMLImageElement>('[data-mural-hero]');
  if (!zoom || !hero) {
    endEntry();
    return null;
  }

  // A home entrega a foto na proporção da fita. O ladrilho já tem a proporção
  // natural; scaleX recompõe a largura da fita no primeiro quadro, e os dois
  // valores voltam a 1 juntos enquanto a câmera recua.
  const tileAspect = seat.w / seat.h;
  const startAspectX = SEAM_ASPECT / tileAspect;
  const viewport = viewportSize();
  const seamW = Math.max(viewport.width, viewport.height * SEAM_ASPECT)
    * SEAM_OVERSCAN;
  const seamH = seamW / SEAM_ASPECT;
  const scale = seamH / seat.h;

  // o gesto fica de fora do recuo — é o mesmo congelamento do lightbox
  canvas.freeze();

  // Promove o portador do zoom enquanto a foto ainda cobre a tela. Sem este
  // aquecimento, alguns navegadores criam a camada compositada só no primeiro
  // quadro em movimento — exatamente onde a pausa era percebida.
  zoom.style.willChange = 'transform';

  // O zoom é escrito no braço, sem o plugin de transform do GSAP: a escala de
  // cada quadro sai de uma conta própria (ver ENTRY.GEOMETRIC), e o que o GSAP
  // anima é o PROGRESSO, não a escala. Uma propriedade só, um dono só.
  const at = { t: 0 };
  const draw = () => {
    const s = ENTRY.GEOMETRIC
      ? Math.pow(scale, 1 - at.t)          // mesma proporção por instante
      : scale + (1 - scale) * at.t;
    zoom.style.transform = `scale(${s})`;

    // A proporção natural volta por multiplicação, como o zoom: nenhuma das
    // duas dimensões muda de velocidade de repente no meio do recuo.
    const aspectX = Math.pow(startAspectX, 1 - at.t);
    hero.style.transform =
      `translate3d(${seat.left}px, ${seat.top}px, 0) scaleX(${aspectX})`;
  };

  // A foto em tela cheia passa a viver DENTRO do plano, no lugar exato do
  // ladrilho dela. Daí em diante ela não tem animação própria: anda, encolhe e
  // assenta junto com o mural, porque é o mesmo transform que carrega os dois.
  // (A troca de `fixed` pra dentro do plano não se vê justamente porque os dois
  // enquadramentos são o mesmo — ver o comentário do bloco acima.)
  hero.classList.add('is-placed');
  hero.style.width = `${seat.w}px`;
  hero.style.height = `${seat.h}px`;
  hero.style.left = '0px';
  hero.style.top = '0px';
  plane.appendChild(hero);
  draw();

  // Nasce PARADA. Ver ENTRY.READY_MAX: o recuo só pode começar depois de a tela
  // ter mostrado, num quadro de verdade, a foto cobrindo tudo.
  const tl = gsap.timeline({
    paused: true,
    onComplete: () => {
      hero.remove();
      zoom.style.transform = '';                     // devolve o <div> inerte
      zoom.style.willChange = '';
      canvas.unfreeze();
      endEntry();                                    // rede: o HUD_AT já passou
    },
  });

  tl.to(at, { t: 1, duration: ENTRY.DUR, ease: ENTRY.EASE, onUpdate: draw }, 0);
  tl.to(hero, {
    opacity: 0,
    duration: ENTRY.HANDOFF_DUR * ENTRY.DUR,
    ease: 'none',
  }, ENTRY.HANDOFF_AT * ENTRY.DUR);
  const tunnel = { t: 0 };
  tl.to(tunnel, {
    t: 1,
    duration: (1 - TUNNEL.ENTRY_AT) * ENTRY.DUR,
    ease: 'sine.inOut',
    onUpdate: () => setTunnelStrength(tunnel.t),
  }, TUNNEL.ENTRY_AT * ENTRY.DUR);
  tl.call(endEntry, undefined, ENTRY.HUD_AT * ENTRY.DUR);

  // A foto grande segura a tela enquanto TODO o enquadramento que vai aparecer
  // no recuo carrega e decodifica. Antes esperávamos só `hero.decode()`: como a
  // hero já vinha no cache da home, o movimento começava imediatamente e os
  // thumbs eram decodificados no meio dele — a travada observada na entrada.
  //
  // Depois da prontidão ainda damos dois quadros ao navegador: um para montar a
  // camada promovida acima e outro para pintá-la antes de o relógio andar.
  const play = () => requestAnimationFrame(() => requestAnimationFrame(() => tl.play()));
  let started = false;
  let guard = 0;
  const once = () => {
    if (started) return;
    started = true;
    clearTimeout(guard);
    play();
  };
  const heroReady = hero.decode?.().catch(() => {}) ?? Promise.resolve();
  Promise.all([heroReady, canvas.readyForEntry()]).then(once);
  guard = window.setTimeout(once, ENTRY.READY_MAX);

  return tl;
}

// ——— a saída de volta pro anel ———
//
// O caminho inverso da chegada, e o seu espelho exato: a câmera desliza até a
// foto da emenda, mergulha nela até ela cobrir a tela no MESMO enquadramento em
// que a home a deixou, e a navegação acontece com a foto parada ali. Do outro
// lado, a home rebobina o avanço dela a partir daquele quadro. De ponta a ponta
// é uma câmera só, entrando e saindo da mesma foto duas vezes.
//
// A geometria de chegada é reaproveitada AO PÉ DA LETRA — mesma conta de
// seamW/seamH, mesma escala, mesma correção de proporção. Tem que ser: o quadro
// que termina esta página é, por construção, o quadro que a home tem congelado.
interface Exit {
  /** resolve quando a foto está parada cobrindo a tela — a hora de navegar */
  done: Promise<void>;
  /** desfaz tudo (o navegador devolveu esta página pelo BFCache) */
  undo(): void;
}

function leaveToSeam(
  canvas: InfiniteCanvas,
  plane: HTMLElement,
  photo: Photo,
  blur: MotionBlur,
  tunnelFrom: number,
  setTunnelStrength: (strength: number) => void,
): Exit | null {
  const zoom = document.querySelector<HTMLElement>('[data-mural-zoom]');
  const seat = canvas.seatNearest(photo.id);
  if (!zoom || !seat) return null;

  // Onde a foto está agora, em px de TELA, medidos do centro do viewport. É a
  // distância que o deslize tem que consumir.
  const start = canvas.cameraOffset();
  const dx = seat.camX - start.x;
  const dy = seat.camY - start.y;

  const tileAspect = seat.w / seat.h;
  const endAspectX = SEAM_ASPECT / tileAspect;
  const viewport = viewportSize();
  const seamW = Math.max(viewport.width, viewport.height * SEAM_ASPECT)
    * SEAM_OVERSCAN;
  const seamH = seamW / SEAM_ASPECT;
  const scale = seamH / seat.h;

  // A HUD sai primeiro, com o mural ainda parado (o fade é do CSS, via
  // data-exit): o quadro que atravessa a troca de página tem que ser a foto e
  // NADA mais, exatamente como na chegada.
  document.documentElement.dataset.exit = 'seam';

  // O gesto sai de cena — mesmo congelamento do lightbox e da chegada. O borrão
  // vai junto: ele responde à velocidade da MÃO, e daqui em diante quem se move
  // é a câmera. (Também não haveria como pagá-lo: o filtro rasteriza o
  // container inteiro a cada frame, e o container está sendo ampliado 4x.)
  blur.reset();
  canvas.freeze();

  // promove a camada enquanto nada se move ainda — ver o mesmo aquecimento na
  // chegada, e pelo mesmo motivo: sem ele o primeiro quadro do zoom é o quadro
  // em que o navegador decide criar a camada
  zoom.style.willChange = 'transform';

  // A foto grande, montada aqui e não no HTML: a da chegada já foi removida (e
  // quem abriu /photos por link nunca teve uma). Nasce DO TAMANHO DO LADRILHO,
  // no lugar exato dele, e invisível — ver EXIT.HANDOFF_AT.
  const hero = document.createElement('img');
  hero.className = 'mural-hero is-placed';
  hero.alt = '';
  hero.setAttribute('aria-hidden', 'true');
  hero.setAttribute('fetchpriority', 'high');
  hero.decoding = 'async';
  hero.style.opacity = '0';
  hero.style.width = `${seat.w}px`;
  hero.style.height = `${seat.h}px`;
  hero.src = photo.full;
  plane.appendChild(hero);

  // o esticamento pra proporção da fita só começa DEPOIS do crossfade, com a
  // foto grande sozinha na tela (ver EXIT.HANDOFF_AT)
  const aspectFrom = EXIT.HANDOFF_AT + EXIT.HANDOFF_DUR;

  const at = { t: 0 };
  const draw = () => {
    const t = at.t;

    // O mergulho, em progressão geométrica — a mesma conta da chegada no
    // sentido contrário (ver ENTRY.GEOMETRIC): cada instante amplia a imagem na
    // mesma PROPORÇÃO, então a única variação de velocidade que se ouve é a da
    // curva do relógio.
    const k = Math.pow(scale, t);

    // O deslize é escrito em pixels de TELA, e é por isso que ele é dividido
    // pela ampliação deste instante.
    //
    // O zoom multiplica tudo que está fora do centro: uma distância interpolada
    // em px de mundo pareceria acelerar sozinha conforme a parede se aproxima, e
    // a foto passaria correndo pelo centro em vez de assentar nele. Aqui quem
    // segue uma curva é o que o olho mede — a distância APARENTE até o centro —
    // e o quanto a câmera tem que andar em mundo pra sustentar isso sai por
    // consequência. É a mesma ideia do drawFlat da home, que mede a foto 3D na
    // tela a cada quadro em vez de interpolar às cegas.
    //
    // (1 − u)³ chega ao centro com velocidade zero: a foto pousa no meio da tela
    // em vez de bater nele e parar.
    const u = Math.min(1, t / EXIT.GLIDE_UNTIL);
    const rest = Math.pow(1 - u, 3);
    canvas.panTo(seat.camX - (dx * rest) / k, seat.camY - (dy * rest) / k);

    zoom.style.transform = `scale(${k})`;

    // A proporção da FITA volta no fim, e por multiplicação, como o zoom. A
    // rampa é smootherstep porque ela tem que partir e chegar em repouso: sair
    // do zero devagar esconde o começo do esticamento debaixo do crossfade que
    // acabou de terminar, e chegar em repouso faz a largura parar no MESMO
    // quadro em que o mergulho para — que é o quadro que a home recebe.
    const a = Math.min(1, Math.max(0, (t - aspectFrom) / (1 - aspectFrom)));
    const ramp = a * a * a * (a * (a * 6 - 15) + 10);
    hero.style.transform =
      `translate3d(${seat.left}px, ${seat.top}px, 0) scaleX(${Math.pow(endAspectX, ramp)})`;
  };
  draw();

  const tl = gsap.timeline({ paused: true });
  tl.to(at, { t: 1, duration: EXIT.DUR, ease: EXIT.EASE, onUpdate: draw }, 0);

  // A parede endireita já na largada: ela precisa estar plana ANTES de a foto
  // grande encostar no ladrilho, senão as duas não coincidem (ver TUNNEL.EXIT_AT).
  const tunnel = { t: tunnelFrom };
  tl.to(tunnel, {
    t: 0,
    duration: TUNNEL.EXIT_AT * EXIT.DUR,
    ease: 'sine.inOut',
    onUpdate: () => setTunnelStrength(tunnel.t),
  }, 0);

  tl.to(hero, {
    opacity: 1,
    duration: EXIT.HANDOFF_DUR * EXIT.DUR,
    ease: 'none',
  }, EXIT.HANDOFF_AT * EXIT.DUR);

  tl.to({}, { duration: EXIT.HOLD });   // o pouso, com a tela já coberta

  const done = new Promise<void>((resolve) => {
    tl.eventCallback('onComplete', resolve);
  });

  // O gesto não pode ficar refém do decode (ver EXIT.READY_MAX): quem volta
  // pelo anel tem a foto quente e parte no quadro seguinte; quem não tem parte
  // depois do teto, com o thumb segurando a imagem por baixo. Os dois rAF são o
  // mesmo respiro da chegada — um pra montar a camada promovida acima, outro
  // pra pintá-la antes de o relógio andar.
  let started = false;
  const play = () => {
    if (started) return;
    started = true;
    clearTimeout(guard);
    requestAnimationFrame(() => requestAnimationFrame(() => tl.play()));
  };
  const guard = window.setTimeout(play, EXIT.READY_MAX);
  (hero.decode?.().catch(() => {}) ?? Promise.resolve()).then(play);

  return {
    done,
    undo() {
      started = true;
      clearTimeout(guard);
      tl.kill();
      hero.remove();
      zoom.style.transform = '';                     // devolve o <div> inerte
      zoom.style.willChange = '';
      delete document.documentElement.dataset.exit;  // a HUD volta pelo CSS
      setTunnelStrength(tunnelFrom);
      canvas.unfreeze();
    },
  };
}

/** Fim da chegada: a HUD pode entrar (o CSS cuida do fade) e a foto em tela
 *  cheia, se a coreografia não chegou a assumi-la, sai da frente do mural —
 *  inclusive no caso comum de quem abriu /photos por link, onde ela existe no
 *  HTML mas nunca ganhou src. */
function endEntry() {
  const root = document.documentElement;
  if (root.dataset.entry) root.dataset.entry = 'done';
  document.querySelector('[data-mural-hero]:not(.is-placed)')?.remove();
}
