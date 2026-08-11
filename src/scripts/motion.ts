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

// A escolha sobrevive à NAVEGAÇÃO: quem vai pra /photos precisa que a página
// de lá saiba o modo, e quem volta de lá não reencara a pergunta do portão.
// Mas guardar NÃO é decidir — o portão só pula a pergunta quando a chegada
// veio de dentro do site (ver main.ts → isInternalArrival); num reload ou
// numa visita nova ele pergunta de novo, mesmo com isto preenchido.
const STORE_KEY = 'motion-mode';

export function setMotionMode(next: MotionMode) {
  mode = next;
  // espelhado no <html> pra folha de estilo poder cortar transição sem
  // precisar passar por JS (ver index.astro, [data-motion='reduced'])
  document.documentElement.dataset.motion = next;
  try {
    sessionStorage.setItem(STORE_KEY, next);
  } catch (e) {}
}

/** a escolha já feita nesta sessão, se houver — o portão e a página /photos
 *  perguntam aqui antes de decidir sozinhos */
export function storedMotionMode(): MotionMode | null {
  try {
    const v = sessionStorage.getItem(STORE_KEY);
    return v === 'full' || v === 'reduced' ? v : null;
  } catch (e) {
    return null;
  }
}

export function reducedMotion(): boolean {
  return mode === 'reduced';
}
