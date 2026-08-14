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

// ——— a parede curva / tubo (ver tunnel.ts) ———
//
// O centro do viewport é o fundo do tubo; as bordas avançam em Z e viram suas
// faces para a câmera. São proporções, não pixels casados no olho, então a lente
// conserva a mesma presença em um notebook largo e numa janela menor.
export const TUNNEL = {
  /** distância da câmera baseada na diagonal. Sem teto: em ultrawide/4K a
   * geometria e a lente crescem juntas, conservando a mesma ampliação. */
  PERSPECTIVE_DIAG: 0.85,
  PERSPECTIVE_MIN: 900,

  /** inclinação máxima das faces (desktop / toque). A dobra precisa aparecer
   *  com clareza quando uma foto atravessa o viewport durante o pan. */
  MAX_ANGLE: 36 * Math.PI / 180,
  MAX_ANGLE_COARSE: 24 * Math.PI / 180,

  /** o tubo é levemente oval: X curva mais, Y respira sem dominar o mural */
  VERTICAL_WEIGHT: 0.86,

  /** trecho final da chegada home → photos em que a parede se curva. Começa
   * depois do crossfade da hero, quando o tile do mural já assumiu a foto. */
  ENTRY_AT: 0.76,
};

// ——— a chegada vinda do anel (ver photos/main.ts → playEntry) ———
//
// A home entrega esta página no meio de um gesto: a câmera mergulhou na foto
// até ela cobrir a tela, e o mural começa exatamente daí — a mesma foto, no
// mesmo tamanho — e RECUA até o lugar dela na parede. O que se vê é uma
// câmera só, indo e voltando; a troca de página acontece no quadro em que as
// duas telas são a mesma imagem.
export const ENTRY = {
  /** duração do recuo, em s */
  DUR: 1.4,

  /** A curva. O movimento aqui é uma INVERSÃO de sentido, não uma continuação:
   *  a home chega avançando na foto e daqui se afasta dela. Toda inversão passa
   *  por um instante de repouso, e é como esse repouso é atravessado que decide
   *  se ela é suave ou um tranco — por isso as duas pontas precisam ser moles.
   *
   *  Uma curva de saída (power3.out, a primeira versão) parte na velocidade
   *  máxima: a foto pousava, parava, e era ARRANCADA pra trás. Uma cúbica
   *  inOut (power2.inOut, a segunda) resolvia o arranco e criava o problema
   *  oposto — o primeiro terço do tempo rendia 3% do movimento, e o que era
   *  duro virou empacado, seguido de corrida.
   *
   *  A senoidal é a mais mansa das simétricas e não tem nem um nem outro: a
   *  aceleração nunca dá um salto (é a única cuja derivada segunda também é
   *  contínua nas pontas), então ela desprende do repouso sem tranco e sem
   *  fazer esperar. É literalmente o movimento de um pêndulo passando pelo
   *  ponto de retorno — que é exatamente o que a câmera faz aqui. */
  EASE: 'sine.inOut',

  /** Interpolar a escala em PROGRESSÃO GEOMÉTRICA, e não linear.
   *
   *  O olho lê zoom em proporção, não em pixels: ir de 3× pra 2,5× e de 1,5×
   *  pra 1× são a mesma fração de mudança, mas a segunda leva metade dos
   *  pixels. Numa interpolação linear a mesma velocidade numérica parece
   *  acelerar quanto mais perto do fim — o recuo terminava correndo. Elevando
   *  a escala a (1 − t), cada instante muda a imagem na MESMA proporção, e a
   *  única variação de velocidade que sobra é a da curva acima, que é a que se
   *  quer ouvir.
   *
   *  false volta ao comportamento antigo — está aqui pra poder comparar. */
  GEOMETRIC: true,

  /** Quando a foto grande dá lugar à do mural, e quanto dura o crossfade — em
   *  FRAÇÕES da duração, pra mexer no DUR não desmontar a coreografia. As duas
   *  são a MESMA imagem em resoluções diferentes, então isto não é uma
   *  transição visual: é só evitar que a troca de resolução seja um corte.
   *  Cedo o bastante pra acontecer com tudo em movimento, tarde o bastante pra
   *  a foto já ter encolhido. */
  HANDOFF_AT: 0.6,
  HANDOFF_DUR: 0.16,

  /** quando a HUD (voltar / título / dica) começa a aparecer, em fração */
  HUD_AT: 0.58,

  /** Teto da espera pelo quadro inicial ficar pronto, em ms.
   *
   *  A foto grande continua cobrindo tudo enquanto ela E os thumbs que vão
   *  aparecer durante o recuo carregam e decodificam. Assim rede/decodificação
   *  acontecem no repouso entre os dois movimentos, não no meio do zoom.
   *
   *  Mas esperar não pode virar refém de uma conexão interrompida ou imagem
   *  problemática. Depois deste teto a página segue com o que já conseguiu. */
  READY_MAX: 4000,
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

  /** fração do delta pendente consumida por frame a 60fps. Mais baixo deixa a
   *  rodinha mais macia e prolonga a cauda depois que ela para. */
  WHEEL_SMOOTH: 0.18,

  /** impulso em px/s acrescentado por px recebido da rodinha. É a inércia que
   *  permanece depois do último evento, além do amaciamento do passo bruto. */
  WHEEL_MOMENTUM: 5.0,

  /** teto da velocidade acumulada ao girar a rodinha muitas vezes seguidas */
  WHEEL_MAX_SPEED: 2400,

  /** distância pendente abaixo da qual a cauda é assentada de uma vez */
  WHEEL_STOP: 0.1,

  /** conversão de DOM_DELTA_LINE para pixels (Firefox/mouses tradicionais) */
  WHEEL_LINE_PX: 16,

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
  MAX: 9,

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
