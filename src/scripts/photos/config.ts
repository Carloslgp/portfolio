// src/scripts/photos/config.ts — TODAS as constantes ajustáveis do mural num
// lugar só, como o config.ts do carrossel. Nenhum outro arquivo desta pasta
// pode ter número mágico: se um valor merece ajuste, ele mora aqui.

// ——— o mural (layout do tile) ———
export const MURAL = {
  /** altura-alvo das linhas justificadas, em px. As linhas reais variam em
   *  torno disto: a justificação estica/encolhe cada linha pra fechar a
   *  largura exata do tile. */
  TARGET_ROW_HEIGHT: 300,

  /** respiro entre fotos, em px — o MESMO valor vale dentro do tile e na
   *  costura entre cópias (o passo do tile já embute um gap no fim de cada
   *  eixo, ver layout.ts), então a emenda é invisível por construção. */
  GAP: 10,

  /** o tile precisa de pelo menos tantas fotos pra repetição não gritar: com
   *  poucas fotos na pasta, a lista é repetida (embaralhada por semente a cada
   *  repetição) até passar deste mínimo. Com fotos suficientes, vale 1x. */
  TILE_MIN_PHOTOS: 24,

  /** semente do embaralhamento determinístico — mesmo build, mesmo mural */
  SEED: 7,

  /** a mesma foto não pode reaparecer a menos de tantas posições na sequência
   *  do tile: é o que impede a fronteira entre duas repetições embaralhadas de
   *  colar a foto do lado (ou quase do lado) dela mesma numa linha */
  REPEAT_WINDOW: 2,

  /** largura mínima do tile, em px. O tile nasce com a largura do viewport,
   *  mas nunca menor que isto: num celular estreito um tile da largura da
   *  tela repetiria a cada ~400px e o padrão saltaria aos olhos. */
  MIN_TILE_W: 1400,

  /** margem além do viewport que ainda ganha DOM, em px: é o que impede o
   *  branco de aparecer na beirada num pan rápido antes do próximo place() */
  RENDER_MARGIN: 320,

  /** px de deriva acumulada do container antes de reancorar a origem local
   *  (os nós ficam em coordenadas pequenas; ver infiniteCanvas.ts → rebase) */
  REBASE_DIST: 16000,

  /** ms de espera depois do último resize antes de reconstruir o tile */
  RESIZE_DEBOUNCE: 180,
};

// ——— gesto / física do pan ———
export const PAN = {
  /** decaimento do momentum por frame (base 60fps; corrigido por dt).
   *  Mais perto de 1 = desliza mais longe depois de soltar. */
  DAMPING: 0.94,

  /** quanto a velocidade do arrasto "arremessa" ao soltar (1 = exatamente a
   *  velocidade do dedo no último instante) */
  MOMENTUM: 1.0,

  /** média móvel da velocidade do arrasto (0..1, maior = mais reativa) —
   *  é a mesma ideia do velocity do Input.ts do anel */
  VELOCITY_SMOOTH: 0.3,

  /** px/s abaixo dos quais o momentum é zerado (senão nunca "para") */
  STOP_SPEED: 12,

  /** ganho do wheel/trackpad (1 = os deltas do navegador, ao pé da letra) */
  WHEEL_FACTOR: 1.0,

  /** velocidade que uma seta do teclado imprime, em px/s — decai pelo mesmo
   *  DAMPING, então segurar a tecla (auto-repeat) sustenta o movimento */
  ARROW_SPEED: 1400,

  /** em baixa animação as setas viram passos secos deste tamanho, em px */
  ARROW_STEP: 240,

  /** px de tolerância entre clique e arrasto (o clickSlop do resto do site) */
  CLICK_SLOP: 6,
};

// ——— motion blur direcional (ver motionBlur.ts) ———
export const BLUR = {
  /** desvio máximo do feGaussianBlur, em px. O clamp de tudo. */
  MAX: 14,

  /** velocidade (px/s) que atinge o blur máximo — a régua da curva */
  SPEED_FULL: 3200,

  /** expoente da curva velocidade→blur: 1 = linear; >1 segura o blur nas
   *  velocidades baixas e o solta só no pan rápido */
  CURVE_EXP: 1.6,

  /** low-pass da velocidade que alimenta o blur (0..1 por frame a 60fps).
   *  Menor = mais manso: o blur cresce e morre sem piscar. */
  SMOOTH: 0.14,

  /** desvio abaixo do qual o filtro é REMOVIDO do elemento — parado, o mural
   *  não paga nem a passada de filtro vazia */
  MIN_DEV: 0.25,

  /** desliga o blur em ponteiro grosso (touch): o custo de rasterizar o filtro
   *  num viewport inteiro não cabe no orçamento de GPU de celular */
  DISABLE_ON_COARSE: true,
};

// ——— lightbox (ver lightbox.ts) ———
export const LIGHTBOX = {
  /** duração do FLIP de abertura, em s */
  OPEN_DUR: 0.5,
  OPEN_EASE: 'power3.inOut',
  /** o retorno é mais rápido — fechar não pode arrastar */
  CLOSE_DUR: 0.38,
  CLOSE_EASE: 'power2.inOut',
  /** crossfade da troca de foto pelas setas, em s */
  SWAP_DUR: 0.22,
  /** fração do viewport que a foto ampliada pode ocupar */
  MAX_W: 0.92,
  MAX_H: 0.88,
};
