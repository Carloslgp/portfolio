// src/scripts/photos/main.ts — ponto de entrada da página /photos: liga a
// fonte de dados, o tile, o canvas infinito, o blur e o lightbox.
//
// Nada de Lenis aqui, de propósito: o mural É o scroll da página. A rolagem
// suave da home vive e morre com a home (navegação MPA — sair de lá destrói
// o loop do Three.js e o Lenis juntos, sem teardown manual).
import gsap from 'gsap';
import { readPhotos } from './photos';
import { buildTile } from './layout';
import { InfiniteCanvas, type PlacedRect } from './infiniteCanvas';
import { MotionBlur } from './motionBlur';
import { Lightbox } from './lightbox';
import { ENTRY, MURAL } from './config';
import { storedMotionMode } from '../motion';
import { SEAM_ASPECT, SEAM_OVERSCAN, SEAM_PHOTO } from '../../data/gallery';

export function initMural() {
  const viewport = document.querySelector<HTMLElement>('[data-mural]');
  const plane = document.querySelector<HTMLElement>('[data-mural-plane]');
  const gaussian = document.querySelector<SVGFEGaussianBlurElement>('[data-blur-gaussian]');
  const photos = readPhotos();
  if (!viewport || !plane || !gaussian || !photos.length) return;

  // A resposta de "quer movimento?" nesta página: a escolha feita no portão da
  // home (sessionStorage) manda; quem entrou direto por /photos nunca viu o
  // portão, então vale a preferência do sistema. Só o dataset local — persistir
  // aqui roubaria a pergunta do portão de quem ainda não a respondeu.
  const stored = storedMotionMode();
  const reduced = stored
    ? stored === 'reduced'
    : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';

  const blur = new MotionBlur(plane, gaussian, reduced);

  const lightbox = new Lightbox(photos, document.body, {
    reduced,
    freeze: () => {
      blur.reset();
      canvas.freeze();
    },
    unfreeze: () => canvas.unfreeze(),
  });

  const canvas = new InfiniteCanvas(viewport, plane, {
    reduced,
    onOpen: (photo, node) => lightbox.show(photo, node),
    onVelocity: (vx, vy, dt) => blur.update(vx, vy, dt),
  });

  // ——— o Voltar ———
  // Quem chegou aqui vindo da home volta PELA HISTÓRIA, não pelo href: o
  // BFCache do navegador restaura a home viva — anel no lugar, sem cortina —
  // que é a melhor volta possível. (E se o BFCache não servir a página, o
  // reboot da home reconhece a volta e entra sem pergunta nem descida: ver
  // main.ts → isInternalArrival.) O href="/" fica de rede pra quem entrou
  // direto em /photos por link — aí não há história pra voltar.
  document.querySelector<HTMLAnchorElement>('[data-back]')?.addEventListener('click', (e) => {
    try {
      if (
        history.length > 1 &&
        document.referrer &&
        new URL(document.referrer).origin === location.origin
      ) {
        e.preventDefault();
        history.back();
      }
    } catch {}
  });

  const tileWidth = () => Math.max(window.innerWidth, MURAL.MIN_TILE_W);
  let lastTileW = tileWidth();
  canvas.setTile(buildTile(photos, lastTileW));

  // A chegada vinda do anel. Tudo o que ela muda no mural acontece AQUI, entre
  // montar o tile e ligar o loop: são escritas de estilo numa tacada só, sem
  // nenhum quadro desenhado no meio — o que a tela já mostra (a foto da emenda,
  // pintada pelo HTML) continua valendo até o recuo começar.
  const seat = document.documentElement.dataset.entry === 'seam' && !reduced
    ? canvas.centerOn(SEAM_PHOTO)
    : null;

  if (seat) enterFromSeam(canvas, plane, seat);
  else endEntry();

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
      const w = tileWidth();
      if (w !== lastTileW) {
        lastTileW = w;
        canvas.setTile(buildTile(photos, w));
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
function enterFromSeam(canvas: InfiniteCanvas, plane: HTMLElement, seat: PlacedRect) {
  const zoom = document.querySelector<HTMLElement>('[data-mural-zoom]');
  const hero = document.querySelector<HTMLImageElement>('[data-mural-hero]');
  if (!zoom || !hero) return endEntry();

  // A home entrega a foto na proporção da fita. O ladrilho já tem a proporção
  // natural; scaleX recompõe a largura da fita no primeiro quadro, e os dois
  // valores voltam a 1 juntos enquanto a câmera recua.
  const tileAspect = seat.w / seat.h;
  const startAspectX = SEAM_ASPECT / tileAspect;
  const seamW = Math.max(window.innerWidth, window.innerHeight * SEAM_ASPECT)
    * SEAM_OVERSCAN;
  const seamH = seamW / SEAM_ASPECT;
  const scale = seamH / seat.h;

  // o gesto fica de fora do recuo — é o mesmo congelamento do lightbox
  canvas.freeze();

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

  // Nasce PARADA. Ver ENTRY.HOLD_MAX: o recuo só pode começar depois de a tela
  // ter mostrado, num quadro de verdade, a foto cobrindo tudo.
  const tl = gsap.timeline({
    paused: true,
    onComplete: () => {
      hero.remove();
      zoom.style.transform = '';                     // devolve o <div> inerte
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
  tl.call(endEntry, undefined, ENTRY.HUD_AT * ENTRY.DUR);

  // dois quadros: o primeiro é o que PINTA a foto em tela cheia, o segundo já
  // pode se mexer. Um só não bastaria — o callback do primeiro roda ANTES do
  // desenho dele, e o recuo começaria no mesmo quadro da chegada.
  const play = () => requestAnimationFrame(() => requestAnimationFrame(() => tl.play()));
  const decoded = hero.decode?.().catch(() => {}) ?? Promise.resolve();
  let started = false;
  const once = () => { if (!started) { started = true; play(); } };
  decoded.then(once);
  setTimeout(once, ENTRY.HOLD_MAX);
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
