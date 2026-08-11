// src/scripts/photos/main.ts — ponto de entrada da página /photos: liga a
// fonte de dados, o tile, o canvas infinito, o blur e o lightbox.
//
// Nada de Lenis aqui, de propósito: o mural É o scroll da página. A rolagem
// suave da home vive e morre com a home (navegação MPA — sair de lá destrói
// o loop do Three.js e o Lenis juntos, sem teardown manual).
import { readPhotos } from './photos';
import { buildTile } from './layout';
import { InfiniteCanvas } from './infiniteCanvas';
import { MotionBlur } from './motionBlur';
import { Lightbox } from './lightbox';
import { MURAL } from './config';
import { storedMotionMode } from '../motion';

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
  canvas.start();

  // resize com debounce: o tile só é reconstruído quando a largura de fato
  // mudou — girar o celular reempacota, rolar a barra de endereço não
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
