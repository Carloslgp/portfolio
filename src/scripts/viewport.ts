/**
 * The part of the viewport that is actually visible on a phone.
 *
 * The legacy `vh` unit follows the large mobile viewport, while browser bars
 * change the visual viewport. The carousel and every route seam must measure
 * the same box or their shared frame changes scale during navigation. Pinch
 * zoom is intentionally ignored: zooming must not resize the scene itself.
 */

/**
 * The visible box AND where it sits inside the box the browser uses to anchor
 * `position: fixed`. On every desktop browser the two coincide and the offset
 * is zero; on iOS Safari they do not — see `syncViewportVars` below.
 */
interface ViewportBox {
  width: number;
  height: number;
  top: number;
  left: number;
}

function readViewport(): ViewportBox {
  if (typeof window === 'undefined') {
    return { width: 1, height: 1, top: 0, left: 0 };
  }

  const visual = window.visualViewport;
  if (visual && Math.abs(visual.scale - 1) < 0.01) {
    return {
      width: Math.max(1, visual.width),
      height: Math.max(1, visual.height),
      top: Math.max(0, visual.offsetTop),
      left: Math.max(0, visual.offsetLeft),
    };
  }

  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
    top: 0,
    left: 0,
  };
}

export function viewportSize(): { width: number; height: number } {
  const box = readViewport();
  return { width: box.width, height: box.height };
}

/**
 * Whether the document itself can scroll.
 *
 * `body { overflow }` propagates to the viewport here (global.css keeps the
 * carousel page locked and `.is-about` unlocks it), so the document scroller is
 * the honest place to ask. It matters because a page that cannot scroll is a
 * page whose browser bars can never retract — which is exactly when the
 * mismatch below appears.
 */
function documentScrolls(): boolean {
  const doc = document.scrollingElement ?? document.documentElement;
  return doc.scrollHeight - doc.clientHeight > 1;
}

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

let written = '';

/**
 * Publishes the measured box to CSS, so the DOM layers and the WebGL scene are
 * sized from the SAME numbers. The `dvh` fallback in global.css only covers the
 * paint before this module runs.
 *
 * `--viewport-top`/`--viewport-left` carry the mismatch this exists to fix. On
 * iPhone Safari a page that cannot scroll keeps the browser bars open, and the
 * box it anchors `position: fixed` to stays the whole screen — starting BEHIND
 * the address bar. The full-screen layers are then born too high: the UI slides
 * up under the bar and an empty strip is left at the bottom. `offsetTop` is how
 * far off it is, and `data-viewport-inset` lets the stylesheet correct it only
 * in that state (see global.css) — everywhere else these are zero and nothing
 * changes.
 */
export function syncViewportVars(): void {
  if (typeof document === 'undefined') return;

  const box = readViewport();
  // A ordem importa: `documentScrolls` lê scrollHeight, e isso força layout.
  // Só existe deslocamento a corrigir quando há deslocamento, então no caminho
  // comum (desktop, Android, iPhone bem-comportado) a pergunta cara nem é feita.
  const shifted = box.top > 0.5 || box.left > 0.5;
  const inset = shifted && !documentScrolls();

  // A viewport listener that fires per frame during the bar animation must not
  // pay for a style recalc when nothing actually moved.
  const stamp = `${box.width}|${box.height}|${box.top}|${box.left}|${inset}`;
  if (stamp === written) return;
  written = stamp;

  const root = document.documentElement;
  root.style.setProperty('--viewport-w', px(box.width));
  root.style.setProperty('--viewport-h', px(box.height));
  root.style.setProperty('--viewport-top', px(box.top));
  root.style.setProperty('--viewport-left', px(box.left));
  root.toggleAttribute('data-viewport-inset', inset);
}

let watching = false;

/** Keeps the variables above in step with the browser. Idempotent. */
export function watchViewport(): void {
  if (typeof window === 'undefined' || watching) return;
  watching = true;

  let frame = 0;
  const sync = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(syncViewportVars);
  };

  // iOS reports the OLD size while its bars are still animating, and again
  // right after an orientation flip. One trailing read catches the settled
  // value; without it the page keeps the size of the state it just left.
  let settle = 0;
  const syncAndSettle = () => {
    sync();
    clearTimeout(settle);
    settle = window.setTimeout(sync, 400);
  };

  syncViewportVars();

  window.addEventListener('resize', syncAndSettle);
  window.addEventListener('orientationchange', syncAndSettle);
  // voltar pra aba/página pela bfcache restaura um layout medido noutro estado
  window.addEventListener('pageshow', syncAndSettle);
  window.addEventListener('scroll', sync, { passive: true });

  const visual = window.visualViewport;
  visual?.addEventListener('resize', syncAndSettle);
  visual?.addEventListener('scroll', sync);

  // abrir o About dá altura à página (e com ela a rolagem que recolhe as
  // barras): a correção precisa sair de cena no mesmo instante
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(sync);
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  }
}
