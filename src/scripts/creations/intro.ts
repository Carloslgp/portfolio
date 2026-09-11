// src/scripts/creations/intro.ts — a ENTRADA: a fita se monta, se junta e se
// espalha, e a página fica pronta.
//
// É a única animação da página que roda no relógio, e o motivo é que ela
// acontece ANTES de haver o que rolar — é o carregamento se mostrando, não um
// trecho da página. Quem desenha continua sendo o field.ts, que não sabe o que
// é um segundo: aqui só se empurra um número de 0 a 1 pra dentro dele.
//
// A ORDEM mudou, e a razão vale registrar. O palco (e o pin, que é o que dá
// altura à página) era criado só DEPOIS da entrada, pra um refresh do
// ScrollTrigger não reescrever a abertura no meio dela. Só que criar o pin
// custa — medido: 339ms de quadro congelado com a CPU a 4x — e esse
// congelamento caía exatamente no fim da entrada, quando a página convida a
// rolar. Agora o pin nasce ANTES do primeiro quadro da fita, e o que evita a
// disputa é uma regra de dono:
//
//   a ENTRADA escreve só --intro-title e --intro-rest, na raiz da abertura;
//   a SAÍDA (a mestra, ver opening.ts) nunca escreve essas duas nem a
//   opacidade das peças — o CSS da página multiplica as duas coisas.
//
// Com a página já alta desde o começo, a rolagem precisa ser TRAVADA durante
// a entrada: no desktop o Lenis parado (que cancela a roda e põe overflow:
// clip no html), no toque o CSS de html.is-intro mais um touchmove cancelado.
//
// E qualquer sinal de impaciência — rolar, tocar, teclar, clicar — ACELERA a
// entrada numa rampa (ver HURRY). A rolagem feita durante ela é guardada e
// devolvida quando ela acaba, com teto: quem rolou chega andando.
import gsap from 'gsap';
import type Lenis from 'lenis';
import { viewportSize } from '../viewport';
import { HURRY, RIBBON, SMOOTH } from './config';
import type { FieldDriver } from './field';

export interface IntroInput {
  driver: FieldDriver;
  html: HTMLElement;
  hero: HTMLElement;
  lenis: Lenis | null;
  /** chamado no meio da PARADA — a hora de aquecer as primeiras fotos */
  onPause?: () => void;
  /** chamado quando a entrada acabou e a página está solta */
  onDone?: () => void;
}

export function prepararEntrada({ driver, html, hero, lenis, onPause, onDone }: IntroInput) {
  const D = RIBBON.SECONDS;
  const state = { i: 0 };

  // A tela da entrada tem DUAS coisas: o título e a fita. O rótulo, o
  // parágrafo e a dica de rolar entram só quando as fotos saem do caminho —
  // a dica convidando a rolar durante a entrada seria um convite pra perder
  // justamente o que ela está mostrando.
  driver.setIntro(0);
  html.classList.add('is-intro');
  lenis?.stop();
  const block = (event: TouchEvent) => {
    if (event.cancelable) event.preventDefault();
  };
  window.addEventListener('touchmove', block, { passive: false });

  let pending = 0;
  let hurried = false;

  const tween = gsap.timeline({ paused: true, onComplete: finish });
  tween.to(
    state,
    {
      i: 1,
      duration: D,
      ease: 'none',
      onUpdate: () => {
        driver.setIntro(state.i);
        // o vão entre as linhas do título se fecha junto com o estouro: as
        // fotos saem dali e o título se junta atrás delas, no mesmo gesto
        if (state.i >= RIBBON.JUNTA) html.classList.add('is-intro-done');
      },
    },
    0,
  );
  // o título nasce junto com as primeiras fotos; o resto quando elas saem
  tween.fromTo(hero, { '--intro-title': 0 }, { '--intro-title': 1, duration: D * 0.24, ease: 'power1.out' }, 0);
  tween.fromTo(
    hero,
    { '--intro-rest': 0 },
    { '--intro-rest': 1, duration: D * 0.3, ease: 'power1.out' },
    D * RIBBON.JUNTA,
  );
  if (onPause) tween.call(onPause, [], D * RIBBON.PARADA);

  const apressar = () => {
    if (hurried) return;
    hurried = true;
    gsap.to(tween, { timeScale: HURRY.SCALE, duration: HURRY.RAMP, ease: HURRY.EASE });
  };
  // o Lenis parado continua emitindo virtual-scroll: é por ele que a roda
  // chega aqui (o evento nativo ele cancela)
  const offWheel = lenis?.on('virtual-scroll', ({ deltaY }) => {
    pending += Math.max(0, deltaY);
    apressar();
  });
  const sinais = lenis
    ? (['touchstart', 'keydown', 'pointerdown'] as const)
    : (['wheel', 'touchstart', 'keydown', 'pointerdown'] as const);
  sinais.forEach((s) => window.addEventListener(s, apressar, { passive: true }));

  function finish() {
    offWheel?.();
    sinais.forEach((s) => window.removeEventListener(s, apressar));
    window.removeEventListener('touchmove', block);
    driver.setIntro(1);
    html.classList.remove('is-intro');
    html.classList.add('is-intro-done');
    // as duas variáveis voltam ao padrão do CSS (1): a entrada terminou e não
    // é mais dona de nada
    hero.style.removeProperty('--intro-title');
    hero.style.removeProperty('--intro-rest');
    lenis?.start();
    if (lenis && pending > 0) {
      lenis.scrollTo(Math.min(pending, HURRY.CARRY_MAX_VH * viewportSize().height), {
        programmatic: false,
        lerp: SMOOTH.LERP,
      });
    }
    onDone?.();
  }

  return { play: () => tween.play() };
}
