// src/scripts/portraits.ts — os retratos do About reagindo ao ponteiro.
//
// A ideia é a mesma superfície do anel da home: a foto não é um adesivo chapado
// na página, é um plano com frente e costas. Aqui, porém, ela NÃO persegue o
// mouse pela tela — só responde enquanto ele está DENTRO dela. Quem passa longe
// não mexe em nada; quem encosta no canto de cima recebe aquele canto inclinado
// pra trás, como se o dedo tivesse afundado o papel ali.
//
// O JS faz o mínimo: anota onde o ponteiro está e escreve duas variáveis
// (--mx/--my, ambas em -1..1 a partir do centro). Quem monta o transform é a
// folha de estilo do Portrait.astro — é lá que a regra convive com o :hover
// antigo, com o drift e com o corte de baixa animação.
//
// Duas economias que valem o parágrafo:
//
//   • um mouse de 1000Hz dispara mil pointermove por segundo, e cada escrita de
//     custom property invalida estilo. O evento só ANOTA a posição; a escrita
//     acontece uma vez por quadro, no rAF — mesmo acordo do hover do carrossel.
//   • o rect é lido DENTRO do rAF, antes das escritas. Ler no evento faria o
//     navegador refazer layout no meio do fluxo de eventos, e um rect guardado
//     na entrada envelheceria: o retrato flutua (drift) e a página rola.
import { reducedMotion } from './motion';

// O efeito é do desktop: no mobile os retratos viram grade e não há ponteiro
// fino pra apontar canto de foto (a colagem inclusive é pointer-events: none).
const FINE = '(min-width: 68rem) and (hover: hover) and (pointer: fine)';

const clamp = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

export function initPortraitTilt() {
  const portraits = document.querySelectorAll<HTMLElement>('.portrait');
  if (!portraits.length) return;

  const fine = window.matchMedia(FINE);

  // quem está sob o ponteiro agora (no máximo um) e o último ponto visto
  let active: HTMLElement | null = null;
  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;

  const write = () => {
    frame = 0;
    const el = active;
    if (!el) return;

    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;

    // -1..1 a partir do centro, preso na borda: um pointermove pode chegar
    // alguns pixels fora depois do último quadro (e o rect da figure inclui a
    // inclinação do --tilt, então a foto real acaba um tico antes dele).
    const mx = clamp(((pointerX - r.left) / r.width) * 2 - 1);
    const my = clamp(((pointerY - r.top) / r.height) * 2 - 1);

    el.style.setProperty('--mx', mx.toFixed(3));
    el.style.setProperty('--my', my.toFixed(3));
    // o brilho: mesma posição, dita em porcentagem pro radial-gradient
    el.style.setProperty('--gx', `${(mx * 50 + 50).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(my * 50 + 50).toFixed(1)}%`);
  };

  const queue = () => {
    if (!frame) frame = requestAnimationFrame(write);
  };

  // Sair zera as variáveis e tira a classe no MESMO recálculo: a transição
  // longa volta a valer junto com o repouso, e o retrato desinclina sozinho.
  const release = (el: HTMLElement) => {
    if (active === el) active = null;
    el.classList.remove('is-tilting');
    el.style.setProperty('--mx', '0');
    el.style.setProperty('--my', '0');
  };

  portraits.forEach((el) => {
    el.addEventListener('pointerenter', (e) => {
      // O portão é perguntado AQUI, não no registro: initPortraitTilt roda no
      // carregamento do script, antes de a escolha existir (ver motion.ts).
      if (!fine.matches || reducedMotion() || e.pointerType === 'touch') return;
      active = el;
      pointerX = e.clientX;
      pointerY = e.clientY;
      // a posição vai junto do primeiro quadro; entrar já inclinado no ponto
      // certo é o que faz a borda parecer que cedeu ao ponteiro
      write();
      el.classList.add('is-tilting');
    });

    el.addEventListener('pointermove', (e) => {
      if (active !== el) return;
      pointerX = e.clientX;
      pointerY = e.clientY;
      queue();
    });

    el.addEventListener('pointerleave', () => release(el));
    // gesto abortado pelo sistema: não vem pointerleave, e o retrato ficaria
    // torto pra sempre
    el.addEventListener('pointercancel', () => release(el));
  });

  // Girar o tablet / arrastar a janela pra uma tela menor tira o efeito do ar:
  // sem isto o retrato congelaria na última inclinação recebida.
  fine.addEventListener('change', () => {
    if (!fine.matches && active) release(active);
  });
}
