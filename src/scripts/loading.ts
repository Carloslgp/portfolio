// src/scripts/loading.ts — a cortina que cobre a cena até tudo estar pronto.
//
// Ela existe por um motivo concreto, não por enfeite: o vidro das labels
// (transmission + dispersion) é caro de compilar, e as fotos ainda precisam
// chegar. Sem a cortina, esse custo todo caía DENTRO da entrada da câmera — a
// thread travava no primeiro frame enquanto o relógio do GSAP seguia correndo
// por baixo, e quando o próximo frame saía a animação já tinha acabado. Dava
// exatamente a impressão de que a câmera não desce: ela descia, sem ninguém ver.
//
// As fotos já foram ~9 MB; hoje são 1,3 MB (WebP de 2048px, ver
// scripts/optimize-images.mjs) e ainda por cima começam a baixar na análise do
// HTML, pelo preload do index.astro. Quem manda no tempo de cortina agora é a
// compilação dos shaders, não a rede — e é por isso que ela continua aqui.
import { setMotionMode, storedMotionMode, type MotionMode } from './motion';
import { refreshViewport, syncViewportVars } from './viewport';

const el = () => document.querySelector<HTMLElement>('[data-loader]');

// O portão: a cortina não sai enquanto a pessoa não disser como quer ver o
// site. Fica DENTRO da cortina de propósito — a escolha acontece enquanto as
// fotos ainda baixam, então perguntar não custa nada ao tempo de carregamento.
//
// Sem elemento no HTML isto resolve na hora, e o site segue no modo completo:
// um portão quebrado não pode ser uma porta trancada.
export function awaitGate(skipIfChosen = false): Promise<void> {
  const gate = document.querySelector<HTMLElement>('[data-gate]');
  if (!gate) return Promise.resolve();

  // O pulo da pergunta NÃO é automático: quem decide se esta chegada é uma
  // "volta de dentro do site" é o chamador (main.ts → isInternalArrival), e só
  // nela a escolha guardada vale sem perguntar. Visita nova e reload perguntam
  // SEMPRE — a escolha é do portão, e o portão é a porta de entrada, não uma
  // preferência de conta. A cortina continua nas voltas: as fotos ainda
  // precisam carregar; é só a pergunta que sai do caminho.
  const stored = storedMotionMode();
  if (skipIfChosen && stored) {
    setMotionMode(stored);
    gate.classList.add('is-chosen');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    gate.querySelectorAll<HTMLButtonElement>('[data-gate-motion]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setMotionMode(btn.dataset.gateMotion as MotionMode);
        // trava o portão antes de resolver: um segundo clique depois daqui
        // trocaria o modo com a coreografia de abertura já em curso
        gate.classList.add('is-chosen');
        resolve();
      });
    });

    // O foco entra no PORTÃO, não no primeiro botão: quem chega por teclado ou
    // leitor de tela precisa achar a pergunta, mas focar uma das opções pinta
    // ela de anel de foco e ela passa a parecer já escolhida — as duas têm que
    // chegar iguais, porque nenhuma é o padrão.
    gate.focus();
  });
}

export function setProgress(v: number) {
  const bar = document.querySelector<HTMLElement>('[data-loader-bar]');
  if (bar) bar.style.transform = `scaleX(${Math.min(Math.max(v, 0), 1)})`;
}

// Resolve só depois que a cortina terminou de sair, pra entrada da câmera não
// começar escondida atrás dela.
export function hideLoader(): Promise<void> {
  const node = el();
  if (!node) return Promise.resolve();

  // Mobile Safari can keep the visual viewport offset of a focused control
  // when that control is removed with its parent. Release focus while the gate
  // still exists so the fixed scene does not inherit a displaced viewport.
  const active = document.activeElement;
  if (active instanceof HTMLElement && node.contains(active)) active.blur();
  window.scrollTo(0, 0);
  // O Chrome iOS pode manter a altura provisória da primeira abertura mesmo
  // depois de o portão perder foco, sem disparar resize. A sequência de
  // estabilização mede de novo enquanto as barras do navegador se acomodam.
  syncViewportVars();
  refreshViewport();

  setProgress(1);
  node.classList.add('is-done');

  return new Promise((resolve) => {
    let removed = false;
    let guard = 0;

    const done = () => {
      if (removed) return;
      removed = true;
      clearTimeout(guard);
      node.removeEventListener('transitionend', onTransitionEnd);
      node.remove();
      // A remoção da cortina é a última mudança grande da caixa inicial. Outra
      // leitura síncrona atualiza também o cache que o Carousel vai usar logo
      // depois desta Promise; a sequência cobre a acomodação tardia das barras.
      syncViewportVars();
      refreshViewport();
      resolve();
    };

    const onTransitionEnd = (event: TransitionEvent) => {
      // O transform da barra interna termina antes do fade da cortina e o
      // evento borbulha. Remover no evento do filho cortaria a entrada cedo.
      if (event.target === node && event.propertyName === 'opacity') done();
    };

    node.addEventListener('transitionend', onTransitionEnd);
    // rede de segurança: em aba de fundo (ou com transições zeradas) o
    // transitionend pode nunca vir, e travar o boot seria pior que cortar seco
    guard = window.setTimeout(done, 900);
  });
}
