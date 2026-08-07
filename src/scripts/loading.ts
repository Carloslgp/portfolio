// src/scripts/loading.ts — a cortina que cobre a cena até tudo estar pronto.
//
// Ela existe por um motivo concreto, não por enfeite: as fotos somam ~9 MB e o
// vidro das labels (transmission + dispersion) é caro de compilar. Sem a
// cortina, esse custo todo caía DENTRO da entrada da câmera — a thread travava
// no primeiro frame enquanto o relógio do GSAP seguia correndo por baixo, e
// quando o próximo frame saía a animação já tinha acabado. Dava exatamente a
// impressão de que a câmera não desce: ela descia, sem ninguém ver.
import { setMotionMode, type MotionMode } from './motion';

const el = () => document.querySelector<HTMLElement>('[data-loader]');

// O portão: a cortina não sai enquanto a pessoa não disser como quer ver o
// site. Fica DENTRO da cortina de propósito — a escolha acontece enquanto as
// fotos ainda baixam, então perguntar não custa nada ao tempo de carregamento.
//
// Sem elemento no HTML isto resolve na hora, e o site segue no modo completo:
// um portão quebrado não pode ser uma porta trancada.
export function awaitGate(): Promise<void> {
  const gate = document.querySelector<HTMLElement>('[data-gate]');
  if (!gate) return Promise.resolve();

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

    // o foco entra no portão: quem chega por teclado ou leitor de tela precisa
    // achar a pergunta, e não uma cortina muda sem saída aparente
    gate.querySelector<HTMLButtonElement>('[data-gate-motion]')?.focus();
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

  setProgress(1);
  node.classList.add('is-done');

  return new Promise((resolve) => {
    const done = () => {
      node.remove();
      resolve();
    };
    node.addEventListener('transitionend', done, { once: true });
    // rede de segurança: em aba de fundo (ou com transições zeradas) o
    // transitionend pode nunca vir, e travar o boot seria pior que cortar seco
    setTimeout(done, 900);
  });
}
