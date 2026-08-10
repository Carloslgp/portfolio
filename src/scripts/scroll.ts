// src/scripts/scroll.ts — onde quem NÃO é dono do Lenis pede pra parar a rolagem.
//
// O Lenis tem um dono só (scripts/main.ts, numa const local), e essa regra não
// muda por causa de um modal. O que este arquivo faz é abrir uma fresta do
// tamanho exato do problema: parar e voltar a rolar, sem entregar o objeto.
//
// Por que é preciso: com o Lenis rodando, a rolagem não é a do navegador — ele
// captura a roda e move a página no braço. O `<dialog>` modal bloqueia a
// rolagem NATIVA de trás, mas não tem como bloquear isso; sem o stop() aqui, a
// página corre atrás do modal enquanto ele está aberto.
type ScrollHost = { stop(): void; start(): void };

let host: ScrollHost | null = null;

/** chamado uma vez, pelo dono (main.ts), assim que o Lenis nasce */
export function registerScroll(next: ScrollHost) {
  host = next;
}

// Um contador, e não um booleano: se dois modais chegarem a se sobrepor um dia,
// o primeiro a fechar não solta a rolagem por baixo do outro.
let locks = 0;

export function lockScroll() {
  if (locks++ === 0) host?.stop();
}

export function unlockScroll() {
  if (locks > 0 && --locks === 0) host?.start();
}
