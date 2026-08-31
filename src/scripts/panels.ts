// src/scripts/panels.ts — duas telas na mesma página, e a troca entre elas.
//
// A /work e a /now dividem este arquivo porque dividem o desenho: a página rola
// de cima a baixo como qualquer outra, e o que é horizontal é só a TROCA de
// grupo — um painel sai pra esquerda enquanto o outro entra pela direita. O
// desenho inteiro (o recorte, o deslize, a régua embaixo da aba) vive no CSS de
// cada página; o que este arquivo faz é o que CSS não faz sozinho:
//
//   • dizer QUAL painel está na tela (--panel no rail)
//   • dar ao rail a altura do painel ativo, senão a fileira flex fica com a
//     altura do maior e o grupo curto ganha um rodapé de branco
//   • manter o estado ARIA das abas e o foco no lugar certo
//   • tirar o painel escondido do caminho de quem navega por teclado ou leitor
//     de tela (inert) — ele continua no DOM, só que fora da tela
//   • medir a régua, porque a largura das abas é texto e texto não se prevê
//   • o arrasto no toque
//
// O modo painel em si é ligado antes do primeiro paint, pelo script inline de
// cada página (html[data-work-panels], html[data-now-panels]). Aqui já se
// assume ligado.
//
// O que este arquivo NÃO sabe é o nome das coisas: os seletores chegam por
// parâmetro, e as classes que ele acende (is-entering, is-dragging) são
// respondidas pelo CSS de cada página. Duas cópias deste comportamento seriam
// duas chances de o arrasto da /now e o da /work divergirem no próximo ajuste.

import { storedMotionMode } from './motion';

/** Quanto do painel o dedo precisa arrastar pra troca valer no soltar. Um
 *  quinto é generoso de propósito: quem arrasta com intenção passa disso sem
 *  pensar, e quem só encostou de lado enquanto rolava a lista não passa. */
const DRAG_COMMIT = 0.2;

/** O atalho da velocidade: um lance rápido troca de painel mesmo sem chegar ao
 *  quinto — é assim que se vira uma página, num peteleco, e exigir distância de
 *  quem foi rápido faz o gesto parecer ignorado. Em px por ms. */
const DRAG_FLICK = 0.45;

/** Distância que decide se o gesto é horizontal ou é a lista rolando. Enquanto
 *  não passar disto o arrasto não começa — começar antes rouba o gesto de quem
 *  ia rolar o painel. */
const DRAG_INTENT = 10;

/** As três peças da página, por seletor: a fileira de abas, a janela que
 *  recorta, e a fileira que anda por dentro dela. */
export interface PanelDeck {
  tabs: string;
  track: string;
  rail: string;
}

export function initPanels(deck: PanelDeck) {
  const tabs = document.querySelector<HTMLElement>(deck.tabs);
  const track = document.querySelector<HTMLElement>(deck.track);
  const rail = document.querySelector<HTMLElement>(deck.rail);
  if (!tabs || !track || !rail) return;

  const buttons = [...tabs.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...rail.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  if (buttons.length < 2 || buttons.length !== panels.length) return;

  const mode = storedMotionMode();
  const reduced = mode === 'reduced' ||
    (!mode && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // o CSS não lê o portão de movimento do site (ele mora no sessionStorage);
  // este carimbo é o recado, e desliga o deslize do rail
  if (reduced) rail.dataset.still = '';

  let current = Math.max(0, buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true'));

  // ——— a régua ———

  const measureRule = () => {
    const active = buttons[current];
    tabs.style.setProperty('--rule-x', `${active.offsetLeft}px`);
    tabs.style.setProperty('--rule-width', `${active.offsetWidth}px`);
    tabs.dataset.ready = '';
  };

  // A fonte da aba chega depois do primeiro layout, e com ela a largura muda.
  // Medir só uma vez deixava a régua com a largura da fonte de sistema por
  // baixo da Inter — curta demais, e visivelmente. O observer cobre isso e mais
  // o redimensionamento da janela de graça.
  const observer = new ResizeObserver(measureRule);
  for (const button of buttons) observer.observe(button);
  if (document.fonts?.ready) void document.fonts.ready.then(measureRule);

  // ——— a altura ———

  /** Dá ao rail a altura do painel ATIVO.
   *
   *  Os dois painéis são uma fileira flex, e uma fileira flex tem a altura do
   *  maior: sem esta medida, o grupo curto herdaria a altura do longo e a
   *  página terminaria em centenas de pixels de branco que rolam pra lugar
   *  nenhum. O CSS não consegue perguntar "qual dos meus filhos está
   *  selecionado e quanto ele mede" — daqui é uma linha.
   *
   *  offsetHeight e não scrollHeight: o painel não rola por dentro (é a página
   *  que rola), então a caixa dele JÁ é o conteúdo inteiro — e scrollHeight
   *  arredonda pra inteiro, o que num zoom fracionário devolve meio pixel a
   *  menos e deixa a última linha raspando na borda do trilho, que recorta. */
  const measureRail = () => {
    rail.style.setProperty('--rail-height', `${panels[current].offsetHeight}px`);
  };

  for (const panel of panels) {
    // a altura do painel muda com a largura da janela (o texto reflui) e com a
    // fonte que chega depois do primeiro layout
    new ResizeObserver(measureRail).observe(panel);
  }

  // ——— a troca ———

  /** Move o rail e reescreve o estado de todo mundo.
   *
   *  `focus` só é verdade quando quem trocou foi o teclado: no clique, mandar o
   *  foco pra aba é redundante (o clique já o levou) e no arrasto seria roubo —
   *  o dedo não pediu foco em lugar nenhum. */
  const select = (next: number, { focus = false } = {}) => {
    const target = Math.min(buttons.length - 1, Math.max(0, next));
    const moved = target !== current;
    const dir = target > current ? 1 : -1;
    current = target;

    buttons.forEach((button, i) => {
      const on = i === current;
      button.setAttribute('aria-selected', on ? 'true' : 'false');
      // roving tabindex: a fileira inteira é UMA parada de Tab, e as setas
      // andam por dentro dela. Sem isto, cada aba nova acrescenta uma parada
      // entre o cabeçalho e a lista.
      button.tabIndex = on ? 0 : -1;
    });

    panels.forEach((panel, i) => {
      const on = i === current;
      // inert tira o painel escondido do foco, do leitor de tela e do ponteiro
      // de uma vez. Ele fica fora da tela, não fora do documento: aria-hidden
      // sozinho ainda deixaria o Tab entrar nos botões de lá.
      panel.inert = !on;
      panel.classList.toggle('is-entering', on && moved && !reduced);
      if (on && moved && !reduced) {
        panel.style.setProperty('--dir', String(dir));
        // sem reiniciar, trocar de aba ida e volta não reanima nada: o
        // navegador vê a mesma animação na mesma classe e não recomeça
        void panel.offsetWidth;
      }
    });

    rail.style.setProperty('--panel', String(current));
    measureRule();
    measureRail();

    if (focus) buttons[current].focus();
  };

  // estado inicial: o segundo painel já nasce inerte, antes de qualquer troca
  select(current);

  buttons.forEach((button, i) => {
    button.addEventListener('click', () => select(i));
  });

  // ——— teclado (padrão de abas: as setas andam, Home e End vão às pontas) ———

  tabs.addEventListener('keydown', (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    let next: number | null = null;

    if (step !== undefined) next = (current + step + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;

    if (next === null) return;
    event.preventDefault();
    select(next, { focus: true });
  });

  // ——— o arrasto ———

  if (reduced) return;

  let pointer: number | null = null;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let dragging = false;
  let width = 1;

  const endDrag = () => {
    pointer = null;
    dragging = false;
    rail.classList.remove('is-dragging');
    rail.style.removeProperty('--drag');
  };

  track.addEventListener('pointerdown', (event) => {
    if (pointer !== null || event.button !== 0) return;
    // o mouse tem as abas e o teclado; arrastar com ele atrapalharia selecionar
    // texto, e ninguém espera arrastar uma lista de lado com o cursor
    if (event.pointerType === 'mouse') return;
    pointer = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startTime = event.timeStamp;
    width = track.clientWidth || 1;
  });

  track.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!dragging) {
      // quem decide de quem é o gesto é o eixo que se moveu mais primeiro. Sair
      // arrastando ao primeiro pixel horizontal tornaria a lista impossível de
      // rolar com o polegar, que nunca desce em linha reta.
      if (Math.abs(dx) < DRAG_INTENT || Math.abs(dx) <= Math.abs(dy)) return;
      dragging = true;
      rail.classList.add('is-dragging');
      track.setPointerCapture(pointer);
    }

    // nas bordas o arrasto pesa: sem painel do outro lado, seguir o dedo até o
    // fim promete uma tela que não existe
    const wall = (current === 0 && dx > 0) || (current === buttons.length - 1 && dx < 0);
    rail.style.setProperty('--drag', `${wall ? dx * 0.28 : dx}px`);
  });

  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    if (!dragging) return endDrag();

    const dx = event.clientX - startX;
    const speed = Math.abs(dx) / Math.max(1, event.timeStamp - startTime);
    const commit = Math.abs(dx) > width * DRAG_COMMIT || speed > DRAG_FLICK;

    endDrag();
    if (commit) select(current - Math.sign(dx));
  };

  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', endDrag);
}
