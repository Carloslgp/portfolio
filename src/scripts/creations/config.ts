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

// ——— a rolagem ———
export const SCROLL = {
  /** Quanto se rola pra atravessar UMA criação, em alturas de tela. É o
   *  botão de "velocidade" da página inteira: mais alto = a mesma animação
   *  espalhada por mais rolagem, portanto mais lenta pra um mesmo gesto. Com
   *  1.6, uma criação são uns 14 dentes de roda de mouse no Chrome — dá pra
   *  parar no meio de propósito, e ainda não cansa quem quer só passar. */
  SCREENS_PER_CREATION: 1.6,

  /** A abertura (título da página) sai de cena ao longo desta rolagem, também
   *  em alturas de tela. Menos que uma criação: ela não tem nada pra ler além
   *  do título, e um trecho longo aqui é a primeira impressão da página sendo
   *  "não acontece nada". */
  HERO_SCREENS: 0.9,

  /** As três fases de cada criação, em PROPORÇÃO do trecho dela (o main.ts
   *  normaliza, então não precisam somar exatamente 1):
   *    enter — a animação de entrada, do nada até a criação inteira parada
   *    hold  — a pausa de leitura: nada se mexe, e rolar só avança o tempo
   *    exit  — a saída, até sobrar papel vazio pra próxima entrar
   *  A pausa é a fase mais importante e a menor: quem quer ler PARA de rolar
   *  (a animação para junto), então ela não precisa ser longa — precisa só
   *  existir, pra criação não começar a sair antes de ter chegado inteira. */
  PHASES: { enter: 0.36, hold: 0.28, exit: 0.36 },

  /** Fração da entrada (e da saída) gasta no fade do bloco inteiro. Sem isto,
   *  o primeiro quadro de uma criação seria um corte seco — imagem já com 20%
   *  de tamanho aparecendo do nada. Com 0.18, a criação nasce e morre num
   *  esfumado curto, e o movimento próprio dela (crescer, deslizar…) é o que
   *  se vê no resto da fase. */
  FADE: 0.18,

  /** Como a animação segue o scroll.
   *    true   — colada, 1:1. Parou de rolar, parou a animação no mesmo quadro.
   *             É o que a página promete ("é como arrastar a linha do tempo de
   *             um vídeo"), então é o padrão.
   *    número — segundos de inércia: a animação corre atrás da posição do
   *             scroll e assenta nesse tempo. 0.3 deixa a roda do mouse (que
   *             anda em dentes) mais sedosa, ao custo de a animação ainda
   *             andar um tiquinho depois de você parar. Experimentar.
   *  Com número, o salto do indicador (ver SMOOTH_JUMP) também passa a
   *  atravessar as criações do meio em câmera rápida em vez de cortar. */
  SCRUB: true as boolean | number,

  /** O clique no indicador lateral leva à criação com rolagem suave (true) ou
   *  num corte (false). Corte por padrão: a rolagem suave passa por todas as
   *  criações entre a atual e a escolhida em meio segundo — parece um erro,
   *  não um atalho. */
  SMOOTH_JUMP: false,

  /** Em que ponto da criação o salto do indicador pousa, em fração do trecho
   *  dela. No MEIO da pausa de leitura: a criação já entrou inteira e ainda
   *  não começou a sair, então quem pulou pra lá vê a criação, não uma
   *  animação pela metade — e tem folga pros dois lados. */
  JUMP_INTO_HOLD: 0.5,
};

// ——— quando o palco existe ———
export const LAYOUT = {
  /** Altura mínima do viewport, em px, pra página ligar o palco (uma criação
   *  por tela, presa enquanto se rola). Abaixo disto ela cai na versão
   *  simples — as criações empilhadas, rolagem comum, tudo visível.
   *
   *  O número vem do pior caso do layout empilhado do celular (ver o CSS da
   *  página): moldura + título de 2 linhas + descrição de 3 frases + link
   *  precisam caber numa tela SEM rolar, porque a tela está presa. Num
   *  iPhone SE (667px) ainda cabe com a tipografia reduzida; num celular
   *  deitado (~390px) não cabe de jeito nenhum, e a versão simples é a
   *  resposta certa, não uma versão espremida. A decisão é tomada UMA vez, ao
   *  carregar (ver o script inline no <head> da página). */
  MIN_STAGE_HEIGHT: 600,
};

// ——— a abertura e o fechamento ———
export const OPENING = {
  /** Em que ordem as peças da abertura somem, em frações do trecho dela
   *  (SCROLL.HERO_SCREENS). A dica de rolar some primeiro — ela já cumpriu o
   *  papel no instante em que a pessoa rolou; o rótulo e o parágrafo vão em
   *  seguida; o título fica por último, crescendo um pouco enquanto esmaece,
   *  como se a câmera passasse por ele. Cada par é [início, duração]. */
  HINT: [0, 0.25],
  SOFT: [0.1, 0.5],
  TITLE: [0.2, 0.7],
  /** o próprio bloco da abertura sai de cena (visibility) no fim do trecho,
   *  pra não ficar por baixo das criações recebendo clique */
  BLOCK: [0.92, 0.08],
  /** o indicador lateral entra nesta janela — depois que o título já está
   *  indo embora, pra não competir com ele */
  NAV: [0.6, 0.35],
  /** quanto o título cresce e sobe (vh) enquanto some; quanto o rótulo e o
   *  parágrafo sobem (px) */
  TITLE_SCALE: 1.06,
  TITLE_LIFT_VH: 8,
  SOFT_LIFT: 24,
} as const;

export const CLOSING = {
  /** O fechamento sobe e aparece enquanto entra na tela, também dirigido pelo
   *  scroll: começa quando o topo dele cruza START da altura da tela e termina
   *  em END. É o único trecho da página FORA do palco preso — vem depois que
   *  ele solta — e o fade é o que costura a última criação (que sai pra papel
   *  vazio) com a página voltando a rolar normalmente. */
  START: 'top 85%',
  END: 'top 45%',
  RISE: 40,
} as const;

export const STATIC = {
  /** Na versão simples (sem palco), quem está "ativa" no indicador é a
   *  criação que cruza uma faixa no meio da tela. A faixa é esta fração da
   *  altura do viewport, centrada: fina o bastante pra só uma criação caber
   *  nela por vez (cada uma tem pelo menos uma tela de altura). */
  ACTIVE_BAND: 0.1,
} as const;

// ——— as variantes de imagem geradas no build ———
export const IMAGE = {
  /** Larguras pedidas ao pipeline do Astro. A moldura ocupa no máximo ~46vw
   *  no desktop e a tela inteira no celular; 1440 cobre um notebook de dpr 2
   *  e 720 cobre o celular sem baixar o dobro à toa. O navegador escolhe pelo
   *  `sizes` abaixo. */
  WIDTHS: [720, 1440],
  FORMAT: 'webp',
  QUALITY: 76,
  SIZES: '(max-width: 46rem) 100vw, 46vw',
} as const;

// ——— o campo de fotos ao fundo (ver field.ts e fieldLayout.ts) ———
//
// Atrás da abertura e das criações há um campo de fotos espalhadas, quase
// todas apagadas e algumas acesas, que se desloca e troca de constelação
// conforme se rola — a referência é a página "Tracing Art" do Getty. Ele é
// preso à MESMA timeline do scroll que o resto (1:1, reversível), e existe só
// no palco: na versão simples não há campo nenhum.
//
// Quais fotos entram é conteúdo, e mora em data/creations.ts (FIELD_PHOTOS).
// Onde cada uma cai é decidido no BUILD por semente fixa (mesmo build, mesmo
// campo), então não há layout sendo calculado no cliente nem salto ao carregar.
export const FIELD = {
  /** Quantas fotos aparecem. Se FIELD_PHOTOS tiver menos que isto, a lista é
   *  repetida; se tiver mais, sobram. Nunca passa do número de células da
   *  grade abaixo. */
  COUNT: 16,

  /** Semente da dispersão e das constelações — trocar é sortear outro campo. */
  SEED: 11,

  /** A dispersão: uma grade de células sobre a tela, cada foto no centro de
   *  uma célula sorteada, deslocada por até JITTER da célula pra cada lado.
   *  Grade com jitter em vez de sorteio livre porque garante espaçamento sem
   *  laço de rejeição — e é o que faz o campo parecer "espalhado" em vez de
   *  aglomerado num canto. */
  GRID: { COLS: 6, ROWS: 4, JITTER: 0.34 },

  /** Larguras em vmin, da mais longe pra mais perto. As fotos são distribuídas
   *  por igual entre os tamanhos; o tamanho também define a profundidade, e a
   *  profundidade define quanto a foto se move (perto anda mais). */
  SIZES_VMIN: [8, 13, 19],

  /** ——— o movimento ———
   *  Cada foto deriva ao longo da página inteira numa órbita lenta ao redor
   *  do centro da tela — é isso que faz o campo "rodar" com o scroll. O
   *  número é o quanto uma foto PERTO anda no total, em alturas de tela; as
   *  de longe andam DRIFT_FAR disto. Pequeno o bastante pra ninguém sair da
   *  própria região, grande o bastante pra se notar entre uma criação e a
   *  seguinte. */
  DRIFT_VH: 40,
  DRIFT_FAR: 0.4,

  /** ——— as luzes ———
   *  Cada foto está, em cada trecho (abertura e cada criação), em um de três
   *  níveis: apagada (0), fantasma (GHOST) ou acesa (LIT). O que muda de um
   *  trecho pro outro é a CONSTELAÇÃO: quais acendem, quais somem — e uma
   *  foto acesa num trecho não acende no seguinte, pra troca ser visível.
   *
   *  Por cima disso, a RESPIRAÇÃO: o campo inteiro é multiplicado por um
   *  fator que vai de 1 (nas passagens entre criações, quando o palco está
   *  vazio) a BREATH_MIN (durante a pausa de leitura). É o que impede o fundo
   *  de competir com a criação em foco — a regra da página é uma coisa por
   *  vez, e o campo obedece a ela ficando quase invisível justamente quando
   *  há algo pra ler. Na abertura ele fica em 1: lá o centro é só o título. */
  GHOST: 0.1,
  LIT: 0.85,
  BREATH_MIN: 0.35,

  /** Quantas acendem por trecho (a abertura ganha mais: é a tela de
   *  apresentação do campo) e quantas somem de todo. */
  LIT_PER: { hero: 5, creation: 3 },
  OFF_PER: 4,

  /** Quanto se rola atravessando a troca de constelação, em alturas de tela,
   *  centrada na fronteira entre dois trechos. Mais longo que o respiro vazio
   *  entre criações de propósito: as fotos são fracas e uma troca curta se
   *  perde; esticada, ela se lê como o fundo se rearranjando. */
  SWAP: 0.6,

  /** Onde uma foto NÃO pode acender, em frações da tela [[x0, x1], [y0, y1]],
   *  uma lista de caixas por trecho: na abertura, o título e a dica de rolar
   *  embaixo; nas criações, moldura + texto; nos dois, os cantos do cromo
   *  fixo (Voltar e o botão de tema — texto sobre foto acesa não se lê).
   *  Fantasmas podem cair em qualquer lugar (a 10% ninguém atrapalha
   *  leitura); acesa, só fora de todas as caixas. Medido no layout de
   *  desktop — no celular a regra é outra, ver MOBILE. */
  SAFE: {
    hero: [
      [[0, 0.5], [0.2, 0.8]],
      [[0.38, 0.62], [0.82, 1]],
      [[0, 0.12], [0, 0.12]],
      [[0.9, 1], [0, 0.12]],
    ],
    stage: [
      [[0.22, 0.9], [0.1, 0.9]],
      [[0, 0.12], [0, 0.12]],
      [[0.9, 1], [0, 0.12]],
    ],
  },

  /** No celular o conteúdo ocupa a tela inteira, então não há margem onde
   *  acender: o nível acesso é limitado a LIT_CAP e só as primeiras COUNT
   *  fotos entram (as outras saem por CSS). */
  MOBILE: { COUNT: 8, LIT_CAP: 0.35 },
};

/** A variante das fotos do campo. Pequena e com menos qualidade que as das
 *  criações de propósito: a maior delas tem ~19vmin de largura e passa a
 *  página quase toda a 10% de opacidade — pixel a mais aqui é só download. */
export const FIELD_IMAGE = { width: 480, format: 'webp', quality: 62 } as const;

// ——— os efeitos (ver effects.ts) ———
//
// Cada bloco é o ajuste FINO de um efeito. Qual criação usa qual efeito não
// se decide aqui: é o campo `effect` de cada criação em data/creations.ts.
export const EFFECTS = {
  /** crescer: a moldura nasce com esta fração do tamanho e sai encolhendo até
   *  a outra. Não sai até zero: os últimos por cento de escala são
   *  indistinguíveis de nada, e o fade do bloco já cuida de apagar. */
  GROW: { FROM: 0.18, TO: 0.62 },

  /** deslizar: de quantas larguras de TELA a moldura vem (e pra quantas vai).
   *  Mais que 1 de propósito — a moldura mora na metade esquerda da tela, e
   *  uma tela inteira de deslocamento a partir dali ainda a deixaria com a
   *  ponta aparecendo. O texto acompanha com um deslocamento pequeno, em px,
   *  pra se ler como "veio junto" e não como um segundo objeto voando. */
  SLIDE: { DISTANCE_VW: 110, COPY_SHIFT: 48 },

  /** cortina: quanto a imagem está ampliada enquanto ainda está coberta. Ela
   *  assenta em 1 conforme a cortina sobe — sem isto a revelação era só um
   *  recorte andando sobre uma imagem parada. */
  CURTAIN: { ZOOM: 1.06 },

  /** pedaços: em quantas tiras verticais a imagem chega, de quantas alturas
   *  de moldura elas vêm (alternando de cima e de baixo), o giro máximo de
   *  cada uma em graus, e que fração da fase é gasta escalonando as tiras
   *  (0 = todas juntas, 1 = a última só começa quando a primeira termina).
   *  O COUNT também é lido no BUILD (a página desenha as tiras em HTML), e
   *  ímpar de propósito: com uma tira no centro exato o "encaixe" tem um
   *  eixo, e o olho lê a imagem se fechando em vez de duas metades. */
  PIECES: { COUNT: 7, DISTANCE: 110, TILT: 7, STAGGER: 0.55 },

  /** íris: o raio final do círculo, em % (a referência de % do clip-path
   *  circle() é a diagonal dividida por √2, então 71% cobre os cantos exatos
   *  de qualquer retângulo; a sobra é pra borda antisserrilhada do círculo
   *  não roçar o canto). */
  IRIS: { RADIUS: 76 },

  /** virar: o ângulo de que a moldura vem tombada (em graus, ao redor da
   *  base) e a distância da "câmera" em px — perspectiva menor = tombo mais
   *  dramático. Também quanto ela sobe (em vh) enquanto assenta, pra não
   *  parecer que girou no lugar. */
  FLIP: { ANGLE: 74, PERSPECTIVE: 1200, LIFT_VH: 6 },

  /** o texto, comum a todos os efeitos: quanto cada linha sobe (px) ao
   *  entrar, o escalonamento entre linhas (fração da duração de UMA linha) e
   *  a partir de que ponto da entrada o texto começa (fração) — depois da
   *  imagem, sempre, porque o efeito é dela e o texto é legenda. */
  COPY: { RISE: 26, STAGGER: 0.12, DELAY: 0.4 },
};
