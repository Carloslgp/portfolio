// src/scripts/creations/config.ts — TODOS os números ajustáveis da Coleção de
// Criações (/colecaocriacoes) num lugar só, como o config.ts do mural e o do
// carrossel. Nenhum outro arquivo desta pasta pode ter número mágico: se um
// valor merece ajuste, ele mora aqui.
//
// A régua de tudo é a TELA, não o relógio. A animação é dirigida pelo scroll
// (ver main.ts): não existe "quanto tempo dura", existe "quanto preciso rolar"
// — quem decide o tempo é o dedo de quem rola. Por isso as durações abaixo
// são alturas de viewport, e as fases são frações dessas alturas.
//
// O CONTEÚDO (textos, imagens, qual efeito cada criação usa) não mora aqui:
// ver src/data/creations.ts e o guia src/data/creations.md.
//
// Quatro botões pra quatro sensações, se um dia precisar mexer sem ler tudo:
//   "ainda está rápido"        → SMOOTH.WHEEL (0.9 → 0.8)
//   "está mole, flutuando"     → SCROLL.SCRUB (0.4 → 0.25)
//   "o fundo está agitado"     → FIELD.RATE e FIELD.TEMPO
//   "a pausa está inquieta"    → HOLD.CRUISE e FIELD.INNER.BLEED
import type { Effect, Layout } from '../../data/creations';

// ——— a rolagem ———
export const SCROLL = {
  /** Quanto se rola pra atravessar UMA criação, em alturas de tela. É o
   *  botão de "comprimento" da página: mais alto = a mesma animação
   *  espalhada por mais rolagem. Com 2.9 e a roda normalizada (SMOOTH), uma
   *  criação são uns 29 dentes de roda em qualquer monitor — eram 23.
   *
   *  Subiu pouco de propósito. O "rápido demais" não era comprimento: era
   *  quanto se MEXIA por dente — a foto saindo da moldura chegava a andar
   *  188px num dente só. Isso se resolveu no encaixe (DOCK), no fundo mais
   *  lento (FIELD.RATE) e na rolagem suave; esticar a página por cima disso
   *  só a tornaria cansativa. */
  SCREENS_PER_CREATION: 2.9,

  /** A abertura (título da página) sai de cena ao longo desta rolagem, também
   *  em alturas de tela. As duas linhas do título se abrem (ver OPENING) e a
   *  primeira miniatura sobe pelo vão — uma tela é o ar que esse gesto pede. */
  HERO_SCREENS: 1.0,

  /** As três fases de cada criação, em PROPORÇÃO do trecho dela (o timing.ts
   *  normaliza, então não precisam somar exatamente 1):
   *    enter — a foto sai do canva e assenta na moldura; o texto se escreve
   *    hold  — a pausa de leitura. Não é mais parada: a composição deriva
   *            devagar (HOLD.CRUISE) e a foto anda dentro da própria janela
   *            (FIELD.INNER), então um dente de roda aqui sempre move algo
   *    exit  — o texto sai primeiro, e então a foto volta ao canva
   *  A pausa ficou um pouco maior porque deixou de ser tempo morto. */
  PHASES: { enter: 0.44, hold: 0.26, exit: 0.3 },

  /** Fração da entrada (e da saída) gasta no fade do bloco inteiro. Quase
   *  nada: o bloco só liga a visibilidade — quem revela cada linha são as
   *  máscaras e varreduras de TYPE, que começam depois disso. Com um fade
   *  longo aqui o texto passava por um cinza de fotocópia. */
  FADE: 0.06,

  /** Como a animação segue o scroll, em segundos de inércia do ScrollTrigger.
   *  Por cima do Lenis, este é o SEGUNDO amortecedor: o Lenis já troca cada
   *  dente por um deslizar, mas um lerp de primeira ordem ainda deixa um
   *  degrau de velocidade a cada dente novo — o scrub o arredonda (simulado:
   *  ondulação 2,9x → 1,8x) e esconde o passo de pixel inteiro em telas de
   *  120/165Hz. Não custa quadro a mais: enquanto o Lenis assenta a página
   *  já está renderizando de qualquer jeito. Se um dia parecer "mole", é o
   *  primeiro número a baixar. */
  SCRUB: 0.4,

  /** No toque não há Lenis (ver SMOOTH.MEDIA): a inércia é a nativa, que já é
   *  contínua. O scrub curto só costura os eventos de 60Hz do toque com telas
   *  de 120Hz. */
  SCRUB_TOUCH: 0.3,

  /** Em que ponto da criação um link direto (#criacao-NN) pousa, em fração
   *  da pausa de leitura: no MEIO dela a criação já entrou inteira e ainda não
   *  começou a sair, e há folga pros dois lados. */
  JUMP_INTO_HOLD: 0.5,

  /** A pausa de leitura de uma criação com `evolution` (hoje, a pixel art)
   *  cresce pra caber os estágios: este tanto de rolagem, em telas, por troca
   *  de desenho. 0.5 são uns 5 dentes de roda por desenho — com a pausa comum
   *  eram onze desenhos em menos de uma tela, e nenhum ficava tempo bastante
   *  pra ser visto. As outras criações não mudam (ver timing.ts → extraHold). */
  SCREENS_PER_STAGE: 0.5,

  /** Quanto de cada trecho da evolução é troca de desenho; no resto a moldura
   *  fica PARADA no desenho. Mais baixo = trocas mais secas. */
  STAGE_FADE: 0.3,

  /** Quantas criações à frente da atual têm a foto decodificada antes de
   *  chegar. Uma: a foto de uma composição `full` decodificada ocupa 15–20MB,
   *  e aquecer as oito seria memória jogada fora num celular. */
  DECODE_AHEAD: 1,
};

// ——— a rolagem suave (ver smooth.ts) ———
export const SMOOTH = {
  /** Só com ponteiro fino — a mesma pergunta do @view-transition do
   *  global.css. No toque o Lenis não entra: mesmo com syncTouch desligado ele
   *  põe ouvintes de touchmove não-passivos no window, e a inércia nativa do
   *  iOS e do Android é a que o dedo conhece. */
  MEDIA: '(hover: hover) and (pointer: fine)',

  /** O lerp do Lenis. O lenis.mjs amortece com λ = LERP·60 por segundo, então
   *  0.075 é a mesma constante de tempo (~222ms) em 60, 120 e 165Hz: um dente
   *  chega em ~0,7s e dentes seguidos viram um deslizar só. Sem `duration`:
   *  com ela cada dente vira um tween reiniciado, com quebra de velocidade. */
  LERP: 0.075,

  /** Um dente de roda vale WHEEL × (altura da tela / WHEEL_REF_VH) px. A
   *  página mede o tempo em TELAS e a roda mede em px: sem esta conta a mesma
   *  criação custaria 18 dentes num notebook baixo e 34 num monitor alto.
   *  O CLAMP segura janelas absurdas nos dois sentidos. */
  WHEEL: 0.9,
  WHEEL_REF_VH: 900,
  WHEEL_CLAMP: [0.75, 1.5] as const,
};

// ——— a impaciência durante a entrada (ver intro.ts) ———
export const HURRY = {
  /** Qualquer rolagem, toque, tecla ou clique durante a entrada ACELERA a fita
   *  numa rampa, e não num degrau: saltar de 1x pra 5x de um quadro pro outro
   *  era um tranco no meio do espalhar. */
  SCALE: 3,
  RAMP: 0.4,
  EASE: 'sine.in',
  /** A rolagem feita DURANTE a entrada não é jogada fora: quando ela termina,
   *  a página desliza esse tanto (com teto, em telas). Quem rolou pra pular a
   *  abertura chega andando, em vez de ter o gesto engolido. */
  CARRY_MAX_VH: 0.25,
};

// ——— voltar pro mesmo quadro (reload, voltar do histórico) ———
export const RESTORE = {
  /** Onde a posição é guardada (sessionStorage), em TELAS e não em px: assim
   *  sobrevive a uma janela redimensionada entre a saída e a volta. */
  KEY: 'cc-t',
  /** Abaixo disto é o topo — a entrada roda normalmente. */
  MIN_T: 0.02,
};

// ——— que forma a criação toma no palco ———
//
// O efeito diz COMO a foto chega; a composição diz QUE FORMA ela toma quando
// chega. Sem a segunda metade, seis efeitos diferentes terminavam todos no
// mesmo retângulo, no mesmo lugar — e o que se lia era uma foto piscando no
// centro, com a animação de enfeite.
//
// Nada disto é lido pelo motor de encaixe, e é o que torna a coisa possível:
// o field.ts MEDE a moldura na tela (getBoundingClientRect) e leva a foto até
// onde ela estiver, do tamanho que ela for.
export const STAGE = {
  /** O ciclo de composições, percorrido pela ordem das criações (a de índice
   *  i usa CYCLE[i % tamanho]). O que cada nome é está em data/creations.ts →
   *  LAYOUT_NAMES; a geometria de cada um está no CSS da página.
   *
   *  A ORDEM aqui é a composição da página inteira: `full` ocupa a tela toda
   *  e não pode vir duas vezes seguidas nem ficar pro fim, e `quiet` só
   *  significa alguma coisa depois de uma cheia — o silêncio precisa de
   *  barulho antes. */
  CYCLE: ['duet', 'full', 'tower', 'flip', 'quiet', 'edge'] as const satisfies readonly Layout[],
};

// ——— quando o palco existe ———
export const LAYOUT = {
  /** Altura mínima do viewport, em px, pra página ligar o palco. Abaixo disto
   *  ela cai na versão simples — as criações empilhadas, rolagem comum.
   *
   *  O número vem do pior caso do layout empilhado do celular (ver o CSS da
   *  página): moldura + título de 2 linhas + descrição de 3 frases + link
   *  precisam caber numa tela SEM rolar, porque a tela está presa. A decisão
   *  é tomada UMA vez, ao carregar (ver o script inline no <head>). */
  MIN_STAGE_HEIGHT: 600,
};

// ——— a abertura e o fechamento ———
export const OPENING = {
  /** A saída da abertura, em frações do trecho dela (SCROLL.HERO_SCREENS).
   *  Cada par é [início, duração].
   *
   *  A dica de rolar se apaga primeiro — cumpriu o papel no instante em que a
   *  pessoa rolou. O rótulo e o parágrafo saem por varredura. E o título faz
   *  o gesto da abertura: as duas linhas se ABREM de novo (PART), como no
   *  vão por onde a fita correu, e cada uma escorrega pra fora da própria
   *  máscara (LINES_OUT) — a primeira miniatura sobe exatamente pelo vão.
   *
   *  Nenhuma destas peças tem a opacidade escrita pela saída: a opacidade é
   *  da ENTRADA (ver intro.ts). Um dono por propriedade — foi a disputa entre
   *  os dois que apagava a abertura no refresh do `load`. */
  HINT: [0, 0.22],
  KICKER: [0.06, 0.26],
  LEAD: [0.1, 0.36],
  PART: [0.18, 0.7],
  LINES_OUT: [0.34, 0.36],
  /** o quanto cada linha se afasta do centro (vh) e o quanto ela escorrega
   *  pra fora da máscara (% da própria altura). 165, e não 130: a altura da
   *  linha é 0.9em e o "ç" desce abaixo dela — em 130 a cauda dele ficava
   *  espiando na borda da máscara depois de a linha ter saído (visto). */
  PART_VH: 7,
  LINE_OUT_PCT: 165,
  /** o título cresce um tanto enquanto se abre, como se a câmera passasse */
  TITLE_SCALE: 1.035,
  /** o próprio bloco da abertura sai de cena (visibility) no fim do trecho,
   *  pra não ficar por baixo das criações recebendo clique */
  BLOCK: [0.92, 0.08],
  /** o indicador lateral entra nesta janela — depois que o título já está
   *  indo embora, pra não competir com ele */
  NAV: [0.55, 0.4],
} as const;

// ——— a fita da abertura ———
//
// A ENTRADA da página, e a única coisa nela que não é dirigida pelo scroll.
// Roda sozinha ao carregar: as fotos se montam numa curva em S entre as duas
// linhas do título, a curva se junta, e então elas se soltam e se espalham
// pela tela — e o que sobra espalhado JÁ É o canva de fundo. A referência é a
// mesma que deu origem ao canva, a "Tracing Art" do Getty.
//
// Por que aqui o relógio manda, se a página inteira jura que o scroll é a
// linha do tempo: porque isto acontece ANTES de haver o que rolar. É o
// carregamento se mostrando, não um trecho da página.
//
// A fita não é uma animação separada que some pra dar lugar à página: ela é o
// canva em outra pose. As fotos da curva são as MESMAS que ficam no fundo, e
// o que se vê é elas indo pro lugar delas.
//
// Onde a fita fica não está aqui: é MEDIDO (o [data-cc-ribbon] no markup).
export const RIBBON = {
  /** Quantas fotos formam a curva. Dessa densidade vem a leitura de "fita",
   *  com as fotos se encavalando. O fieldLayout.ts garante que o canva tenha
   *  fotos elegíveis suficientes pra isto, e o build confere. */
  COUNT: 60,

  /** O S: `x = meio - AMPLITUDE * sen(2π·u)`, u de 0 no topo a 1 na base. A
   *  amplitude é fração da ALTURA DA FAIXA, pra curva ter a mesma forma em
   *  qualquer tela; MAX_W é o freio pra janela estreita. */
  AMPLITUDE: 0.3,
  MAX_W: 0.17,

  /** Recuo da curva dentro do vão, em fração da altura dele: a conta põe o
   *  CENTRO da foto na curva, e sem recuo as pontas encostariam no título. */
  PAD: 0.08,

  /** Tamanho de uma foto na fita, em fração da altura da faixa (pelo mesmo
   *  motivo da amplitude), vezes o quanto ela é maior ou menor que a média. */
  CARD: 0.09,

  /** ——— o relógio da entrada ———
   *  Quanto dura a coisa toda, em segundos, e onde ficam as emendas das
   *  QUATRO fases (frações do total):
   *
   *    0 → MONTA         as fotos chegam e a curva cresce de um toco (SEED)
   *    MONTA → PARADA    o S fica PARADO, inteiro. Nada se mexe
   *    PARADA → JUNTA    a curva se fecha e as fotos incham
   *    JUNTA → 1         elas se soltam, se espalham e assentam no canva
   *
   *  A PARADA é o único momento da entrada em que nada acontece, e é por isso
   *  que ele conta: é ali que a curva existe.
   *
   *  4,4s é mais do que se pede a quem abriu uma página, e é deliberado:
   *  quem não quiser esperar interrompe e a entrada ACELERA numa rampa
   *  (ver HURRY). */
  SECONDS: 4.4,
  MONTA: 0.3,
  PARADA: 0.5,
  JUNTA: 0.62,

  /** Do que a curva parte, no primeiro quadro: fração do tamanho final. */
  SEED: 0.34,

  /** Fração da montagem gasta escalonando a entrada das fotos, de cima da
   *  curva pra baixo: escalonada, a fita se DESENHA em vez de piscar. */
  STAGGER: 0.55,

  /** O aperto: quanto a curva encolhe em amplitude e comprimento, e quanto as
   *  fotos INCHAM ao se juntarem. A curva do espalhar é a smoothstep (ver
   *  field.ts): sai do repouso e volta ao repouso. */
  TIGHT_AMP: 0.62,
  TIGHT_SPAN: 0.66,
  TIGHT_SIZE: 1.65,

  /** O LEQUE do espalhar: quanto cada foto é empurrada pra FORA do centro no
   *  meio do caminho, em fração da largura da tela. Sem ele as fotos
   *  escorriam pelo pé da tela em vez de abrir. */
  FAN: 0.26,
} as const;

export const CLOSING = {
  /** O fechamento é o único trecho FORA do palco preso. Ele se escreve (ver
   *  TYPE.CLOSING) enquanto sobe pela tela: começa no instante em que o pin
   *  solta — 'top 100%', sem uma faixa de papel morto antes — e termina com
   *  o topo dele a 35% da tela. */
  START: 'top 100%',
  END: 'top 35%',
} as const;

export const STATIC = {
  /** Na versão simples (sem palco), quem está "ativa" no indicador é a
   *  criação que cruza uma faixa no meio da tela, desta fração da altura. */
  ACTIVE_BAND: 0.1,
} as const;

// ——— as variantes de imagem geradas no build ———
export const IMAGE = {
  /** Larguras pedidas ao pipeline do Astro. 2160 é pra composição `full` num
   *  notebook retina; o Astro não amplia, então pedir 2160 não inventa pixel
   *  — só deixa de jogar fora os que existem. */
  WIDTHS: [720, 1440, 2160],
  FORMAT: 'webp',
  QUALITY: 76,

  /** Quanto da largura da tela a foto ocupa, pro navegador escolher a
   *  variante. 10% acima da moldura porque no palco a imagem é deitada 10%
   *  maior que ela e anda por dentro (ver FIELD.INNER): a variante escolhida
   *  tem que cobrir essa sobra, senão a sobra é pixel esticado. */
  SIZES: '(max-width: 46rem) 110vw, 51vw',

  /** A composição `full` cobre a tela em qualquer largura — mais a sobra. */
  SIZES_FULL: '110vw',
} as const;

// ——— o canva de fotos ao fundo (ver field.ts e fieldLayout.ts) ———
//
// Atrás da abertura e das criações há um canva de fotos espalhadas que ROLA
// com a página. A referência é a página "Tracing Art" do Getty. Ele é função
// do MESMO tempo de rolagem que o resto (reversível), e existe só no palco.
//
// A foto de cada criação já está no canva, como miniatura, e é de lá que ela
// vem se encaixar na moldura (o "encaixe", ver DOCK). Nunca aparece do nada.
export const FIELD = {
  /** Semente da dispersão — trocar é sortear outro canva. */
  SEED: 11,

  /** Velocidade do canva em relação à página: 1 = as fotos sobem exatamente
   *  o que se rola. Com o palco preso o fundo é a ÚNICA camada que anda o
   *  tempo todo, então a velocidade dele É a velocidade que se sente: em 0.7
   *  eram 70px por dente, em 0.5 são ~45. */
  RATE: 0.5,

  /** O ANDAMENTO do canva: mais devagar enquanto se lê, mais ligeiro nas
   *  passagens entre criações. TEMPO é quanto (0.35: ~0,65x no meio da pausa,
   *  ~1,35x no meio da passagem); TEMPO_RAMP, em fração de uma criação, é
   *  quanto leva pra entrar no andamento depois da abertura e sair dele antes
   *  do pin soltar, pra velocidade não ter quina nas duas pontas. É uma
   *  função fechada do tempo (ver timing.ts → warp): o mesmo t dá sempre o
   *  mesmo canva, e o build confere que o fundo nunca anda pra trás. */
  TEMPO: 0.35,
  TEMPO_RAMP: 0.5,

  /** A dispersão: uma grade sobre o canva — COLS colunas na largura da tela,
   *  uma linha a cada ROW_VH alturas de tela — e cada célula tem FILL de
   *  chance de receber uma foto, deslocada por até JITTER da célula. */
  COLS: 6,
  ROW_VH: 0.36,
  FILL: 0.55,
  JITTER: 0.34,

  /** Larguras das fotos comuns em vmin, sorteadas por igual. A POSIÇÃO na
   *  lista também é a profundidade (ver DEPTH): a menor é a mais distante. */
  SIZES_VMIN: [8, 12, 17],

  /** Largura da foto de uma criação enquanto ainda é miniatura no canva, em
   *  vmin. Maior que as comuns: o olho precisa achá-la antes do encaixe. */
  FEATURED_VMIN: 18,

  /** ——— as luzes ———
   *  Cada foto comum é fantasma (GHOST) ou acesa (LIT); LIT_SHARE é a fração
   *  que acende. Acesa só fora das faixas de SAFE_X. Por cima, a RESPIRAÇÃO:
   *  o canva inteiro vai de 1 (passagens) a BREATH_MIN (enquanto a foto de
   *  uma criação está no palco). 0.5, e não os 0.35 de antes: com a pausa
   *  viva o fundo pode continuar legível sem competir. */
  LIT_SHARE: 0.35,
  GHOST: 0.1,
  LIT: 0.85,
  BREATH_MIN: 0.5,

  /** Nas passagens (palco sem texto) as fotos acesas da faixa do MEIO, que
   *  ficam fantasmas enquanto há texto, sobem até este nível — a passagem
   *  ganha movimento visível em vez de ser papel quase vazio. */
  PASSAGE: { LIT: 0.45 },

  /** Três planos de profundidade a partir do tamanho: a menor foto anda
   *  (1 - DEPTH)·RATE, a maior (1 + DEPTH)·RATE. É o que tira o fundo do
   *  plano de uma folha e o faz ter volume. No tempo 0 nada muda — a abertura
   *  e a fita são as mesmas. */
  DEPTH: 0.15,

  /** Quanto se rola atravessando a troca de regra de luz entre a abertura e
   *  as criações (a faixa protegida muda de lado), em alturas de tela. */
  SWAP: 0.6,

  /** Faixas HORIZONTAIS da tela (frações de x) onde uma foto comum não
   *  acende: na abertura, o lado do título; nas criações, moldura + texto. */
  SAFE_X: { hero: [0, 0.55], stage: [0.08, 0.92] },

  /** Até quantas alturas de tela além das bordas uma foto ainda é
   *  posicionada. Fora disso ela fica escondida e não custa nada. */
  CULL_VH: 0.6,

  /** No celular só uma a cada EVERY fotos comuns entra (as outras saem por
   *  CSS) e o nível aceso é limitado a LIT_CAP. O teto é aplicado no JS (a
   *  opacidade é escrita pronta, ver field.ts); QUERY TEM que ser o mesmo
   *  breakpoint do CSS da página (46rem), senão o celular acende acima dele. */
  MOBILE: { EVERY: 2, LIT_CAP: 0.35, QUERY: '(max-width: 46rem)' },

  /** A foto de uma criação é DEITADA BLEED·2 mais alta que a moldura e anda
   *  por dentro dela ao longo da criação — janela, e não zoom: só translada,
   *  nunca estica pixel (e zoom re-rasterizaria a foto a cada quadro). */
  INNER: { BLEED: 0.05 },
};

/** A variante das fotos comuns do canva: pequena e com menos qualidade, porque
 *  passa a página quase toda como fantasma. */
export const FIELD_IMAGE = { width: 480, format: 'webp', quality: 62 } as const;

// ——— o encaixe (ver field.ts) ———
//
// A foto não vai do canva à moldura numa curva só. Ela tem quatro CANAIS —
// giro, posição, tamanho e luz —, cada um na sua janela da entrada, e é esse
// desencontro que se lê como físico: ela endireita, chega, e só então ABRE.
// Voar e crescer juntos é zoom de câmera.
export const DOCK = {
  /** A curva da chegada: a Beta(2,3) acumulada (ver effects.ts → settle).
   *  Pico de velocidade a 1/3 do caminho, com a foto ainda pequena, e o
   *  último terço assentando. O olho mede velocidade pela ÁREA que passa —
   *  foto grande andando rápido era o "rápido demais". */
  IN: [2, 3] as const,
  /** A saída: demora a soltar (o texto sai antes) e acelera no fim até a
   *  velocidade do canva, onde volta a ser uma foto qualquer. */
  OUT: [3, 2] as const,

  /** Em que fração da entrada a pose de canva cruza a moldura. Em 0.5 a
   *  miniatura já está na borda de baixo quando a entrada começa — revezando
   *  com a foto anterior, que sai por cima — e, como o canva segue subindo,
   *  a foto passa uns px do lugar e volta: a assentada sai da própria
   *  mistura, sem mola e sem estado. */
  LEAD: 0.5,

  /** Na saída, a foto ESPERA esta fração da saída antes de se soltar: o texto
   *  sai primeiro (ver TYPE.COPY_GONE_BY) e a foto depois. Sem a espera, numa
   *  `full` a foto já encolhia com o título branco ainda na tela — texto
   *  branco sobre papel branco por um instante. */
  RELEASE: 0.3,

  /** As janelas de cada canal dentro da entrada; na saída são espelhadas
   *  (quem chega por último sai primeiro), dentro do que sobra depois de
   *  RELEASE. */
  WIN: { turn: [0, 0.8], pos: [0, 0.88], size: [0.12, 1], light: [0, 0.6] } as const,

  /** O arco do caminho, em fração da distância percorrida, sempre pro lado do
   *  centro da tela: fotos não andam em linha reta de régua. Um por efeito —
   *  o slide faz uma curva larga por baixo do texto, o tilt quase nenhuma
   *  (ele se levanta no lugar), e o iris nenhuma (ele abre, não viaja). */
  ARC: { grow: 0.12, slide: 0.2, tilt: 0.05, flip: 0.07, iris: 0, pieces: 0.08 } satisfies Record<Effect, number>,

  /** Um giro mínimo, em graus, que se desfaz junto com o canal de giro: a foto
   *  sai do canva "pegada na mão" e é assentada reta. O sentido alterna entre
   *  criações vizinhas. */
  ROLL: 2,
};

// ——— a pausa viva ———
export const HOLD = {
  /** Fração da velocidade de rolagem com que a moldura e o texto continuam
   *  subindo ao longo da criação inteira: ~3px por dente, ±20px na pausa.
   *  Legível, e nunca congelado — era o congelado que se lia como "parou".
   *  Numa moldura que sangra a tela (full) o motor reduz isto até a foto não
   *  mostrar papel na borda (ver field.ts → cruiseCap). */
  CRUISE: 0.035,
};

// ——— os efeitos (ver effects.ts) ———
//
// O efeito de uma criação é COMO a miniatura sai do canva e se encaixa na
// moldura (e, na saída, como volta). Qual criação usa qual é o campo `effect`
// em data/creations.ts.
export const EFFECTS = {
  /** slide: de que distância lateral a miniatura parte, em fração da largura
   *  da tela, e quanto ABAIXO, em fração da altura (partindo do canto de
   *  baixo ela passa por baixo do texto, não pelo meio dele). O texto
   *  acompanha com um deslocamento pequeno, em px. */
  SLIDE: { SIDE_VW: 0.42, BELOW_VH: 0.22, COPY_SHIFT: 48 },

  /** tilt: a foto vem deitada pra trás e se LEVANTA a partir da base (HINGE:
   *  onde fica a dobradiça, em fração da meia-altura a partir do centro — 0.5
   *  é a meio caminho da base). 58°, e não os 70 de antes: em 70 ela passava
   *  meia entrada quase de perfil, ilegível. */
  TILT: { ANGLE: 58, PERSPECTIVE: 1200, HINGE: 0.5 },

  /** flip: gira no eixo vertical como uma porta, com a dobradiça na borda de
   *  DENTRO (a do lado do centro da tela) e o lado de fora indo pro fundo —
   *  nunca vindo pra frente, que ampliaria a foto pela perspectiva. Menos que
   *  90 graus, senão em algum instante se vê o verso. */
  FLIP: { ANGLE: 72, PERSPECTIVE: 1400, HINGE: 0.7 },

  /** pieces: a foto é UMA só, fatiada em COUNT ripas que ondulam do centro pras
   *  bordas no meio do encaixe — cada ripa desce um tanto (DROP, fração da
   *  altura) e se afasta das vizinhas (GAP_PX) no momento dela, e volta. FROM
   *  é onde a onda começa no peso do encaixe, STAGGER o atraso da borda em
   *  relação ao centro, SPAN o quanto cada ripa leva. FROM+STAGGER+SPAN ≤ 1
   *  pra onda acabar antes da pausa. COUNT é lido também no BUILD (a página
   *  desenha as ripas em HTML); ímpar, pra haver uma ripa no centro exato. */
  PIECES: { COUNT: 7, FROM: 0.3, STAGGER: 0.3, SPAN: 0.38, DROP: 0.06, GAP_PX: 3 },
};

// ——— a tipografia em movimento (ver effects.ts, opening.ts e type.ts) ———
//
// Texto aqui é TINTA, não fotocópia: cada linha entra por uma máscara ou por
// uma varredura, nunca passando por um cinza translúcido. Toda janela é
// [início, duração] em frações da fase (entrada ou saída).
export const TYPE = {
  /** As curvas, todas saindo do repouso com inclinação ZERO. Com a roda (que
   *  anda em dentes) uma curva que começa rápida põe metade do movimento no
   *  primeiro dente — o texto "pula". INK assenta devagar, como tinta
   *  pegando no papel; LIFT sai devagar e acelera, e a parte rápida acontece
   *  já atrás da máscara; WASH é o S simétrico das varreduras. */
  EASE: { INK: '0.33,0,0.12,1', LIFT: '0.5,0,0.75,0.35', WASH: '0.45,0,0.55,1' },

  /** O título sobe palavra por palavra de dentro de máscaras (RISE, % da
   *  altura da palavra), com uma inclinação mínima que se endireita (TILT,
   *  graus). STAGGER é o atraso entre palavras, em fração da duração de uma.
   *
   *  RISE passa bem de 100 de propósito: a máscara tem folga (pro acento e
   *  pro "ç" não serem cortados em repouso), e a palavra precisa atravessar a
   *  folga TODA pra sumir. Em 112 o acento do "Tí" espiava antes de a palavra
   *  subir, e a metade de baixo das letras (com a sombra, na `full`) ficava
   *  no alto da máscara depois de ela sair — visto nos quadros. */
  TITLE: { IN: [0.36, 0.48], OUT: [0.04, 0.36], STAGGER: 0.1, RISE: 160, TILT: 3 },
  /** o rótulo e o link se escrevem por varredura, da esquerda pra direita, e
   *  saem continuando no sentido da leitura */
  KICKER: { IN: [0.3, 0.32], OUT: [0, 0.26] },
  LINK: { IN: [0.74, 0.24], OUT: [0, 0.22] },
  /** a descrição é "lavada": um degradê de máscara desce por ela (ver o CSS
   *  da página), com opacidade de reserva onde mask-image não existe */
  DESC: { IN: [0.52, 0.42], OUT: [0.08, 0.42] },

  /** O texto inteiro sai até esta fração da saída — antes de a foto se
   *  soltar da moldura. Texto e foto nunca saem juntos. */
  COPY_GONE_BY: 0.5,

  /** O fechamento, com o mesmo vocabulário, em frações do trecho dele. */
  CLOSING: { KICKER: [0, 0.28], TITLE: [0.1, 0.45], LEAD: [0.35, 0.45], LINKS: [0.55, 0.4], STAGGER: 0.06 },

  /** O fólio: o número da criação em itálico gigante, a 6% de tinta, num
   *  plano PRÓPRIO entre o canva e as fotos. Ele atravessa a criação inteira
   *  subindo mais devagar que a foto (yPercent de FROM a TO) — uma camada de
   *  tipo com profundidade, que preenche as passagens. */
  FOLIO: { FROM: 30, TO: -30, IN: [0.1, 0.5], OUT: [0.5, 0.5] },
} as const;

// ——— o contador lateral (ver nav.ts) ———
export const NAV = {
  /** O contador rola de um número pro outro nesta fração de uma criação,
   *  centrada na fronteira entre as duas — onde o olho está livre, entre a
   *  saída de uma e a entrada da outra. */
  ROLL_WINDOW: 0.14,
  /** O contador se recolhe no fim desta fração da ÚLTIMA saída — some junto
   *  com a última foto, antes de o palco soltar. */
  OUT: 0.3,
};
