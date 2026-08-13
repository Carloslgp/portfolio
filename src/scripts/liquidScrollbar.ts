// src/scripts/liquidScrollbar.ts — posição e gesto da scrollbar desenhada pelo
// site. A página continua rolando pelo documento; isto é só a representação
// branca, capaz de atrasar e deformar sem depender do visual rígido do browser.

const MIN_THUMB_HEIGHT = 52;

export function initLiquidScrollbar() {
  const track = document.querySelector<HTMLElement>('[data-liquid-scrollbar]');
  const thumb = track?.querySelector<HTMLElement>('[data-liquid-scrollbar-thumb]');
  if (!track || !thumb || track.dataset.ready === 'true') return;
  track.dataset.ready = 'true';

  let viewportHeight = 0;
  let pageHeight = 0;
  let maxScroll = 0;
  let thumbHeight = MIN_THUMB_HEIGHT;
  let travel = 0;
  let targetY = 0;
  let currentY = 0;
  let stretch = 1;
  let stretchTarget = 1;
  let lastScroll = 0;
  let frame = 0;
  let measureFrame = 0;
  let dragging = false;
  let dragPointer = 0;
  let dragScroll = 0;

  const reducedMotion = () => document.documentElement.dataset.motion === 'reduced';
  const scrollTop = () => window.scrollY || document.documentElement.scrollTop || 0;

  function setTarget() {
    const nextScroll = Math.min(maxScroll, Math.max(0, scrollTop()));
    const delta = nextScroll - lastScroll;
    lastScroll = nextScroll;
    targetY = maxScroll > 0 ? (nextScroll / maxScroll) * travel : 0;

    if (!reducedMotion() && !dragging) {
      stretchTarget = Math.max(stretchTarget, 1 + Math.min(0.18, Math.abs(delta) / 90));
    }
  }

  function render() {
    frame = 0;
    const immediate = reducedMotion() || dragging;
    currentY = immediate ? targetY : currentY + (targetY - currentY) * 0.24;
    stretch = immediate ? 1 : stretch + (stretchTarget - stretch) * 0.2;
    stretchTarget += (1 - stretchTarget) * 0.14;

    if (Math.abs(targetY - currentY) < 0.08) currentY = targetY;
    if (Math.abs(1 - stretch) < 0.002) stretch = 1;

    thumb.style.setProperty('--liquid-y', `${currentY.toFixed(2)}px`);
    thumb.style.setProperty('--liquid-stretch', stretch.toFixed(3));

    if (currentY !== targetY || stretch !== 1) frame = requestAnimationFrame(render);
  }

  function requestRender() {
    setTarget();
    if (!frame) frame = requestAnimationFrame(render);
  }

  function measure() {
    measureFrame = 0;
    viewportHeight = document.documentElement.clientHeight;
    pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    maxScroll = Math.max(0, pageHeight - viewportHeight);

    const overflow = getComputedStyle(document.body).overflowY;
    const visible = maxScroll > 1 && overflow !== 'hidden' && overflow !== 'clip';
    track.hidden = !visible;
    if (!visible) {
      targetY = currentY = 0;
      return;
    }

    thumbHeight = Math.min(
      viewportHeight,
      Math.max(MIN_THUMB_HEIGHT, (viewportHeight * viewportHeight) / pageHeight),
    );
    travel = Math.max(0, viewportHeight - thumbHeight);
    thumb.style.height = `${thumbHeight}px`;

    const wasAtRest = currentY === 0 && targetY === 0;
    setTarget();
    if (wasAtRest) currentY = targetY;
    requestRender();
  }

  function requestMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  }

  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', requestMeasure, { passive: true });
  window.addEventListener('load', requestMeasure, { once: true });

  new ResizeObserver(requestMeasure).observe(document.body);
  new MutationObserver(requestMeasure).observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
  });
  document.fonts.ready.then(requestMeasure);

  thumb.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragging = true;
    dragPointer = event.clientY;
    dragScroll = scrollTop();
    thumb.classList.add('is-dragging');
    document.documentElement.classList.add('is-scrollbar-dragging');
    thumb.setPointerCapture(event.pointerId);
  });

  thumb.addEventListener('pointermove', (event) => {
    if (!dragging || travel <= 0) return;
    const next = dragScroll + (event.clientY - dragPointer) * (maxScroll / travel);
    window.scrollTo(0, Math.min(maxScroll, Math.max(0, next)));
  });

  function endDrag(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    thumb.classList.remove('is-dragging');
    document.documentElement.classList.remove('is-scrollbar-dragging');
    if (thumb.hasPointerCapture(event.pointerId)) thumb.releasePointerCapture(event.pointerId);
    requestRender();
  }

  thumb.addEventListener('pointerup', endDrag);
  thumb.addEventListener('pointercancel', endDrag);

  track.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target === thumb || travel <= 0) return;
    const top = Math.min(travel, Math.max(0, event.clientY - thumbHeight / 2));
    window.scrollTo(0, (top / travel) * maxScroll);
  });

  measure();
}
