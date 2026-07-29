import gsap from 'gsap';
import { SEG_ANGLE, SECTIONS, LERP, WHEEL_FACTOR, DRAG_FACTOR, MOMENTUM, SNAP_DELAY } from './config';

const N = SECTIONS.length;

// Fonte da verdade da rotação (em radianos). Input mexe em target; o loop faz o
// lerp (inércia). O mesmo target serve pros dois modos: o Carousel mapeia pra
// group.rotation.y (CURVED) ou pra offset horizontal (FLAT).
export class Input {
  // nasce numa POSIÇÃO DE SNAP (centros ficam a meio segmento da origem);
  // -SEG_ANGLE/2 deixa a seção 0 de frente pra câmera desde o primeiro frame
  target = -SEG_ANGLE / 2;
  current = -SEG_ANGLE / 2;
  enabled = false;
  private dragging = false;
  private lastX = 0;
  private velocity = 0;          // média suavizada do delta de arrasto (pro arremesso)
  private snapTimer = 0;
  private lastTime = performance.now();

  constructor(private el: HTMLElement, private lenis: any) {
    // Scroll → gira. Canvas é fixo (sem página rolável), então lemos wheel direto.
    //
    // Vale o eixo DOMINANTE do gesto, não um fixo: o trackpad manda deltaX no
    // gesto lateral (que é o natural pra empurrar uma fita pro lado), mas a
    // roda do mouse só manda deltaY. Escolhendo o maior dos dois, o gesto
    // lateral passa a funcionar sem tirar a roda de quem usa mouse.
    //
    // O X entra com sinal trocado pra bater com o arrasto logo abaixo: passar
    // os dedos pra direita manda as fotos pra direita, igual a puxar com o
    // dedo. Em deltaX, ir pra direita é negativo.
    el.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      // sem consumir o evento, o gesto lateral vira "voltar página" no Chrome
      // (overscroll do histórico) — por isso passive: false + preventDefault
      e.preventDefault();
      gsap.killTweensOf(this);          // não deixa um snap em curso brigar com o scroll
      const lateral = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      this.target += (lateral ? -e.deltaX : e.deltaY) * WHEEL_FACTOR;
      this.scheduleSnap();
    }, { passive: false });

    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.velocity = 0;
      clearTimeout(this.snapTimer);
      gsap.killTweensOf(this);          // pega o anel exatamente onde ele está
      this.el.setPointerCapture?.(e.pointerId);
    });

    el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      this.lastX = e.clientX;
      const d = dx * DRAG_FACTOR;        // arrastar → o anel acompanha o dedo
      this.target += d;
      this.velocity = this.velocity * 0.7 + d * 0.3;   // suaviza pra estimar o "throw"
    });

    const endDrag = (e: PointerEvent) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.el.releasePointerCapture?.(e.pointerId);
      this.target += this.velocity * MOMENTUM;          // arremesso proporcional à velocidade
      this.snap();
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }

  // chamado no loop: aproxima current de target (a inércia mora aqui).
  // Suavização independente de framerate: mesmo feel em 60/120/144Hz.
  update() {
    const now = performance.now();
    const frames = Math.min((now - this.lastTime) / 16.667, 4);   // dt em "frames de 60fps"
    this.lastTime = now;
    const t = 1 - Math.pow(1 - LERP, frames);
    this.current += (this.target - this.current) * t;
    return this.current;
  }

  // avança um segmento (setas da UI / card)
  step(dir: number) {
    if (!this.enabled) return;
    gsap.killTweensOf(this);
    this.target += dir * SEG_ANGLE;
    this.snap();
  }

  private scheduleSnap() {
    clearTimeout(this.snapTimer);
    this.snapTimer = window.setTimeout(() => this.snap(), SNAP_DELAY);
  }

  // trava no segmento mais próximo. A malha é deslocada de SEG_ANGLE/2 porque o
  // centro de cada fatia fica no meio da sua célula.
  snap() {
    const m = Math.round((this.target + SEG_ANGLE / 2) / SEG_ANGLE);
    const snapped = m * SEG_ANGLE - SEG_ANGLE / 2;
    gsap.to(this, { target: snapped, duration: 0.7, ease: 'power3.out', overwrite: true });
  }

  // seção que está de frente para a câmera, derivada da rotação suavizada
  get activeIndex(): number {
    const m = Math.round((this.current + SEG_ANGLE / 2) / SEG_ANGLE);
    return ((-m) % N + N) % N;
  }
}
