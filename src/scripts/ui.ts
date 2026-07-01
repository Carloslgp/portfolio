// src/scripts/ui.ts — a camada 2D. Só DOM: ouve 'carousel:change' e reflete a
// seção ativa; dispara 'carousel:step' / 'carousel:mode' de volta pro Carousel.
import { SECTIONS } from '../components/carousel/config';

export function initUI() {
  const label = document.querySelector<HTMLElement>('[data-active-label]');
  const cat = document.querySelector<HTMLElement>('[data-active-category]');
  const thumb = document.querySelector<HTMLImageElement>('[data-active-thumb]');
  const view = document.querySelector<HTMLAnchorElement>('[data-view]');

  function render(index: number) {
    const s = SECTIONS[index];
    if (!s) return;
    if (label) label.textContent = s.label;
    if (cat) cat.textContent = s.label.toUpperCase();
    if (thumb) { thumb.src = s.texture; thumb.alt = s.label; }
    if (view) view.href = `#${s.id}`;
  }

  window.addEventListener('carousel:change', (e) => {
    render((e as CustomEvent).detail.index);
  });

  // setas do card ‹ ›
  document.querySelectorAll<HTMLElement>('[data-step]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = Number(btn.dataset.step) || 1;
      window.dispatchEvent(new CustomEvent('carousel:step', { detail: { dir } }));
    });
  });

  // toggle CURVED / FLAT
  const toggle = document.querySelector<HTMLButtonElement>('[data-mode-toggle]');
  toggle?.addEventListener('click', () => {
    const flat = toggle.dataset.flat === 'true';
    const next = !flat;
    toggle.dataset.flat = String(next);
    toggle.setAttribute('aria-pressed', String(next));
    toggle.classList.toggle('is-flat', next);
    window.dispatchEvent(new CustomEvent('carousel:mode', { detail: { flat: next } }));
  });

  initCursor();
  render(0);
}

// luz que segue o mouse com atraso (lerp) — glow suave e preguiçoso
function initCursor() {
  const cursor = document.querySelector<HTMLElement>('[data-cursor]');
  if (!cursor) return;

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const pos = { ...mouse };
  let shown = false;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (!shown) { shown = true; cursor.style.opacity = '1'; }
  });

  const tick = () => {
    pos.x += (mouse.x - pos.x) * 0.1;
    pos.y += (mouse.y - pos.y) * 0.1;
    cursor.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  };
  tick();
}
