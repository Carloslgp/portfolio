/**
 * The part of the viewport that is actually visible on a phone.
 *
 * The legacy `vh` unit follows the large mobile viewport, while browser bars
 * change the visual viewport. The carousel and every route seam must measure
 * the same box or their shared frame changes scale during navigation. Pinch
 * zoom is intentionally ignored: zooming must not resize the scene itself.
 */
export function viewportSize(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 1, height: 1 };

  const visual = window.visualViewport;
  if (visual && Math.abs(visual.scale - 1) < 0.01) {
    return {
      width: Math.max(1, visual.width),
      height: Math.max(1, visual.height),
    };
  }

  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  };
}
