// src/scripts/scramble.ts — o hover de "descriptografia": o texto vira ruído e
// se resolve da esquerda pra direita, uma letra de cada vez.
//
// Só entra em ponteiro de verdade (@media hover). Em touch o 'mouseenter' até
// dispara no toque, mas ali o efeito seria um piscar sem causa aparente — e,
// pior, o alvo do hover viraria uma área morta em cima do canvas, que é por
// onde se arrasta o carrossel.

import { reducedMotion } from './motion';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&/\\<>*+=?$';

const ROLL = 48;         // ms que cada letra ainda não resolvida segura um glifo
const STEP_MAX = 38;     // ms entre uma letra e a próxima travarem...
const TOTAL_ALVO = 1150; // ...encurtado nas frases longas, pra nenhuma passar disto

export interface ScrambleHandle {
  cancel(): void;
}

// Glifo pseudo-aleatório determinístico por (posição, passo do tempo). Sair de
// uma conta em vez de Math.random() é o que faz a letra segurar o mesmo glifo
// por ROLL inteiro: com sorteio a cada frame o embaralhado tremeria rápido
// demais pra ler como "procurando".
function glyph(i: number, tick: number) {
  const n = (i * 92_837_111 + tick * 689_287_499) >>> 0;
  return GLYPHS[n % GLYPHS.length];
}

export function scrambleOnHover(el: HTMLElement): ScrambleHandle {
  const canHover = window.matchMedia('(hover: hover)').matches;

  let raf = 0;
  let live: HTMLElement | null = null;   // a camada dos glifos (fora do fluxo)
  let original = '';

  function release() {
    if (!live) return;
    live = null;
    el.classList.remove('is-scrambling');
    // volta a ser um nó de texto puro: some o par fantasma/overlay
    el.textContent = original;
  }

  function cancel() {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
    release();
  }

  function run() {
    // Perguntado AQUI, e não lá embaixo junto do addEventListener: os listeners
    // são registrados no carregamento do script, antes de o portão resolver.
    if (reducedMotion()) return;
    if (raf) return;                       // já rodando: hover repetido não reinicia
    const text = el.textContent ?? '';
    if (!text.trim()) return;

    // DUAS CAMADAS, e nenhuma medida travada no braço.
    //
    // A tentativa anterior media a caixa e prendia width/height nela. Isso
    // parecia equivalente, mas não é: medir devolve um fracionário
    // (54.328125px), e prender esse valor faz o motor rearredondar o subpixel —
    // uma vez ao entrar e outra ao soltar. Era o tranco no "Curitiba", e nenhum
    // ajuste de clip ia curar, porque o problema era mexer na caixa.
    //
    // Aqui a caixa simplesmente não é tocada. O texto de verdade continua no
    // fluxo, sem tinta (o fantasma), segurando exatamente as medidas que já
    // tinha; os glifos são pintados por cima, fora do fluxo. Layout, linha de
    // base e subpixel ficam idênticos do primeiro ao último frame — não há o
    // que ressnapar.
    original = text;

    const ghost = document.createElement('span');
    ghost.className = 'scramble-ghost';
    ghost.textContent = text;

    live = document.createElement('span');
    live.className = 'scramble-live';
    // o fantasma é quem responde a leitor de tela; esta camada é só pintura
    live.setAttribute('aria-hidden', 'true');
    // nasce com o texto certo: assim o frame entre montar e o primeiro rAF
    // desenha exatamente o que já estava na tela
    live.textContent = text;

    el.textContent = '';
    el.append(ghost, live);
    el.classList.add('is-scrambling');

    // o +1 é pra primeira letra também nascer embaralhada: com i * step ela já
    // entraria resolvida no frame zero
    const step = Math.min(STEP_MAX, TOTAL_ALVO / (text.length + 1));
    const t0 = performance.now();

    const frame = (now: number) => {
      const t = now - t0;
      const tick = Math.floor(t / ROLL);
      let out = '';
      let done = true;

      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        // espaço fica espaço: é o que mantém o desenho das palavras enquanto o
        // resto é ruído — sem isso vira um bloco só, e não um texto cifrado
        if (c === ' ' || c === '\n') { out += c; continue; }
        if (t >= (i + 1) * step) { out += c; continue; }
        done = false;
        out += glyph(i, tick);
      }

      live!.textContent = out;

      if (done) { raf = 0; release(); return; }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
  }

  if (canHover) {
    el.addEventListener('mouseenter', run);
    // teclado também: o "Carlos Leonardo" é link e chega por Tab
    el.addEventListener('focus', run);
    // sair no meio NÃO cancela de propósito — cortar deixaria o texto em ruído
    // na tela, e o fim da animação é justamente o texto certo
  }

  return { cancel };
}

// liga tudo que estiver marcado no HTML. A frase da direita fica de fora: ela
// troca sozinha e por isso precisa do handle (ver scripts/hud.ts).
export function initScramble() {
  document
    .querySelectorAll<HTMLElement>('[data-scramble]')
    .forEach((el) => scrambleOnHover(el));
}
