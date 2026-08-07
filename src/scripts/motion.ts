// src/scripts/motion.ts — quem responde "esta visita quer movimento?".
//
// A resposta NÃO vem do prefers-reduced-motion do sistema: vem da escolha
// explícita que a pessoa faz na cortina de carregamento (o portão, em
// loading.ts). Como o portão é a única porta de entrada do site, quando
// qualquer animação pergunta aqui a resposta já está decidida.
//
// É função, e não constante exportada: initHud() e initScramble() rodam no
// carregamento do script, ANTES de o portão resolver, e um valor capturado ali
// nasceria com o padrão e nunca mais mudaria. Todo chamador pergunta na hora de
// animar, não na hora de se registrar.

export type MotionMode = 'full' | 'reduced';

let mode: MotionMode = 'full';

export function setMotionMode(next: MotionMode) {
  mode = next;
  // espelhado no <html> pra folha de estilo poder cortar transição sem
  // precisar passar por JS (ver index.astro, [data-motion='reduced'])
  document.documentElement.dataset.motion = next;
}

export function reducedMotion(): boolean {
  return mode === 'reduced';
}
