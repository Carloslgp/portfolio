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
import type { Layout } from '../../data/creations';

// ——— a rolagem ———
export const SCROLL = {
  /** Quanto se rola pra atravessar UMA criação, em alturas de tela. É o
   *  botão de "velocidade" da página inteira: mais alto = a mesma animação
   *  espalhada por mais rolagem, portanto mais lenta pra um mesmo gesto. Com
   *  2.6, uma criação são uns 23 dentes de roda de mouse no Chrome. Começou
   *  em 1.6 (uns 14) e subiu porque a foto chegava à moldura antes de o olho
   *  acompanhar o caminho dela — e o caminho é o ponto desta página, não o
   *  quadro final. */
  SCREENS_PER_CREATION: 2.6,

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
   *  existir, pra criação não começar a sair antes de ter chegado inteira.
   *
   *  `enter` é o maior dos três porque é a fase que se VÊ: é nela que a foto
   *  sai do canva e faz o caminho até a moldura. Junto com o
   *  SCREENS_PER_CREATION acima, a entrada passou de 0.58 pra 1.20 alturas de
   *  tela — o dobro de rolagem pro mesmo percurso. */
  PHASES: { enter: 0.46, hold: 0.24, exit: 0.3 },

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

// ——— que forma a criação toma no palco ———
//
// O efeito diz COMO a foto chega; a composição diz QUE FORMA ela toma quando
// chega. Sem a segunda metade, seis efeitos diferentes terminavam todos no
// mesmo retângulo, no mesmo lugar — e o que se lia era uma foto piscando no
// centro, com a animação de enfeite.
//
// Nada disto é lido pelo motor de encaixe, e é o que torna a coisa possível:
// o field.ts MEDE a moldura na tela (getBoundingClientRect) e leva a foto até
// onde ela estiver, do tamanho que ela for. Uma moldura que o CSS faz cobrir
// a tela inteira é uma foto que cresce até cobrir a tela inteira, de graça,
// em qualquer um dos seis efeitos. O motor só precisou aprender UMA coisa
// nova: publicar o quanto a foto já chegou (--dock), pro véu do `full` não
// escurecer a tela antes de haver foto.
export const STAGE = {
  /** O ciclo de composições, percorrido pela ordem das criações (a de índice
   *  i usa CYCLE[i % tamanho]). O que cada nome é está em data/creations.ts →
   *  LAYOUT_NAMES; a geometria de cada um está no CSS da página, porque é
   *  layout e não número de animação.
   *
   *  A ORDEM aqui é a composição da página inteira, e é o que essa lista
   *  decide: `full` ocupa a tela toda e não pode vir duas vezes seguidas nem
   *  ficar pro fim (quem não rolar até lá nunca vê a página fazer isso), e
   *  `quiet` só significa alguma coisa depois de uma cheia — o silêncio
   *  precisa de barulho antes. Daí a segunda ser full e a quinta ser quiet.
   *
   *  Seis pra oito criações: nenhuma vizinha se repete, o ciclo não fecha
   *  dentro da página, e a sétima e a oitava voltam ao duet e ao full — que
   *  é uma boa última impressão. */
  CYCLE: ['duet', 'full', 'tower', 'flip', 'quiet', 'edge'] as const satisfies readonly Layout[],
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
   *  como se a câmera passasse por ele.
   *
   *  Estes números voltaram ao que eram quando a fita passou a ser ENTRADA e
   *  não trecho de rolagem: enquanto ela vivia aqui, o texto tinha que esperar
   *  o estouro pra não deixar o gesto acontecer numa tela vazia. Agora quando
   *  a rolagem começa a fita já acabou, e a saída da abertura volta a ser só
   *  ela mesma. Cada par é [início, duração]. */
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

// ——— a fita da abertura ———
//
// A ENTRADA da página, e a única coisa nela que não é dirigida pelo scroll.
// Roda sozinha ao carregar: as fotos se montam numa curva em S entre as duas
// linhas do título, a curva se junta, e então elas se soltam e se espalham
// pela tela — e o que sobra espalhado JÁ É o canva de fundo. Quando termina, a
// página está montada e pronta pra rolar. A referência é a mesma que deu
// origem ao canva, a "Tracing Art" do Getty.
//
// Por que aqui o relógio manda, se a página inteira jura que o scroll é a
// linha do tempo: porque isto acontece ANTES de haver o que rolar. É o
// carregamento se mostrando, não um trecho da página — quem chega não pediu
// nada ainda. Passada a entrada, o relógio some e não volta.
//
// A ideia que faz isto valer a pena: a fita não é uma animação de entrada
// separada que some pra dar lugar à página. Ela é o canva em outra pose. As
// fotos da curva são as MESMAS que ficam no fundo o resto da rolagem, e o que
// se vê é elas indo pro lugar delas — nada aparece do nada e nada é
// descartado. Um crossfade entre "abertura" e "página" seria mais fácil e
// diria outra coisa.
//
// Onde a fita fica não está aqui: é MEDIDO. Há um vão entre as duas linhas do
// título (o [data-cc-ribbon] no markup) e o field.ts lê a caixa dele, do
// mesmo jeito que lê a moldura de cada criação. Assim a curva cai entre as
// linhas em qualquer tela, sem que estes números precisem saber de tipografia.
export const RIBBON = {
  /** Quantas fotos formam a curva. O canva tem ~9 por tela, então 44 são umas
   *  cinco telas de canva reunidas num lugar só — e é dessa densidade que vem
   *  a leitura de "fita", com as fotos se encavalando. Menos que isso vira uma
   *  fileira de fotos soltas. */
  COUNT: 56,

  /** O S. A curva é `x = meio - AMPLITUDE * sen(2π·u)` com u indo de 0 no topo
   *  a 1 na base: um período completo, que é exatamente um S — sai do meio,
   *  bojo pra esquerda, cruza, bojo pra direita, volta ao meio.
   *
   *  A amplitude é fração da ALTURA DA FAIXA, e não da largura da tela. Isso
   *  não é detalhe: em fração da largura o S sai com a proporção da janela —
   *  estreito e alto no celular, e no desktop 245px pra cada lado dentro de
   *  uma faixa de 342px de altura, o que não é um S, é um borrão na diagonal.
   *  Amarrada à altura, a curva tem a MESMA forma em qualquer tela, que é o
   *  que uma assinatura visual precisa ter.
   *
   *  MAX_W é o freio pra tela estreita: numa janela fina, 0.3 da altura da
   *  faixa passaria da largura disponível. */
  AMPLITUDE: 0.3,
  MAX_W: 0.22,

  /** Recuo da curva dentro do vão, em fração da altura dele. A conta põe o
   *  CENTRO da foto na curva, então sem recuo metade da primeira e da última
   *  ficam pra fora do vão — encostando nas linhas do título, que é
   *  exatamente o que a composição não pode ter. */
  PAD: 0.14,

  /** Tamanho de uma foto na fita, em fração da altura da faixa — pelo mesmo
   *  motivo da amplitude. Em vmin (que é como o canva mede) a mesma foto sai
   *  2,3x maior no desktop que no celular, e a fita deixa de ser uma fita:
   *  vira uma pilha de fotos grandes se encavalando. Presa à altura da faixa,
   *  cabe sempre o mesmo tanto de foto na curva.
   *
   *  O tamanho relativo entre elas se mantém: cada uma é este valor vezes o
   *  quanto ela é maior ou menor que a foto média do canva. E o resultado é
   *  travado em no máximo 1x o tamanho de canva, porque o caminho até lá é
   *  uma ampliação e ampliar além do natural é perder nitidez — a mesma lição
   *  que a foto das criações já tinha ensinado. */
  CARD: 0.11,

  /** ——— o relógio da entrada ———
   *  Quanto dura a coisa toda, em segundos, e onde ficam as emendas das três
   *  fases (frações do total):
   *
   *    0 → MONTA      as fotos chegam e formam a curva, que cresce de um
   *                   toco (SEED) até o S inteiro
   *    MONTA → JUNTA  a curva se fecha e as fotos incham: é o instante em que
   *                   ela parece uma coisa só, prestes a arrebentar
   *    JUNTA → 1      elas se soltam e vão pro lugar delas no canva
   *
   *  2.6s é o teto do que se pede a alguém que acabou de abrir uma página: dá
   *  pra ler as três fases sem que a espera vire fila. Quem não quiser esperar
   *  interrompe — qualquer toque, tecla ou rolagem corta pro fim (ver main.ts).
   */
  SECONDS: 2.6,
  MONTA: 0.44,
  JUNTA: 0.64,

  /** Do que a curva parte, no primeiro quadro: fração do tamanho final. Não é
   *  zero de propósito — de zero as fotos nasceriam de um ponto, e o que se
   *  quer é uma fita pequena que CRESCE. */
  SEED: 0.34,

  /** Fração da montagem gasta escalonando a entrada das fotos, de cima da
   *  curva pra baixo. Em 0 todas aparecem juntas e o efeito é uma fita
   *  piscando; escalonado, ela se DESENHA. */
  STAGGER: 0.55,

  /** O aperto: quanto a curva encolhe em amplitude e comprimento, e quanto as
   *  fotos INCHAM (maior que 1) ao se juntarem. Elas crescerem é o que faz a
   *  fita parecer carregada logo antes de estourar — e o crescimento é seguro
   *  porque o tamanho na curva é uma fração do tamanho de canva, então mesmo
   *  inchadas elas não passam do tamanho natural do elemento (ver field.ts). */

  /** A curva do estouro. Maior que 1 é queda: começa devagar e acelera, que é
   *  o que "cai" quer dizer. Começou em 3 e estava errado — com expoente 3,
   *  na metade da abertura só 1% do caminho tinha sido feito, e o que se via
   *  era uma fita parada por meia tela e um borrão no fim. Em 1.6 o movimento
   *  se distribui pela rolagem e ainda chega acelerando. */
  FALL: 1.6,
  TIGHT_AMP: 0.5,
  TIGHT_SPAN: 0.72,
  TIGHT_SIZE: 1.5,
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
  /** Larguras pedidas ao pipeline do Astro. 720 cobre o celular sem baixar o
   *  dobro à toa; 1440 cobre um notebook de dpr 2 numa moldura comum; 2160 é
   *  pra composição `full`, que leva a foto a 100vw — num notebook retina
   *  isso são 2880 pixels de tela, e parar em 1440 seria dobrar cada pixel
   *  justamente na composição que mostra a foto maior.
   *
   *  O Astro não amplia: numa foto de origem menor que a maior largura daqui,
   *  a variante que sai é a da própria fonte, e o srcset a declara pelo
   *  tamanho real. Então pedir 2160 não inventa pixel — só deixa de jogar
   *  fora os que existem. */
  WIDTHS: [720, 1440, 2160],
  FORMAT: 'webp',
  QUALITY: 76,

  /** Quanto da largura da tela a foto ocupa, pro navegador escolher a
   *  variante. Uma moldura comum cabe em ~46vw no desktop e vai à largura
   *  toda no celular. */
  SIZES: '(max-width: 46rem) 100vw, 46vw',

  /** A composição `full` é outro caso: a foto cobre a tela em qualquer
   *  largura. Declarar 46vw ali faria o navegador baixar menos da metade do
   *  que vai mostrar — e a página escolhe entre um e outro no build, porque
   *  já sabe a composição de cada criação. */
  SIZES_FULL: '100vw',
} as const;

// ——— o canva de fotos ao fundo (ver field.ts e fieldLayout.ts) ———
//
// Atrás da abertura e das criações há um canva de fotos espalhadas que ROLA
// com a página: pra baixo, as fotos sobem e aparecem novas por baixo; pra
// cima, descem e aparecem novas por cima. A referência é a página "Tracing
// Art" do Getty. Ele é função do MESMO tempo de rolagem que o resto (1:1,
// reversível), e existe só no palco: na versão simples não há canva.
//
// A foto de cada criação já está no canva, como miniatura: conforme se rola
// ela sobe com as outras e vai crescendo até se encaixar na moldura da
// criação (o "encaixe", ver field.ts); na saída volta ao canva e segue
// subindo. Nunca aparece do nada. COMO ela se encaixa é o `effect` de cada
// criação (ver EFFECTS abaixo e data/creations.ts).
//
// Quais fotos entram é conteúdo, e mora em data/creations.ts (FIELD_PHOTOS).
// Onde cada uma cai é decidido no BUILD por semente fixa (mesmo build, mesmo
// canva), então não há layout sendo calculado no cliente nem salto ao carregar.
export const FIELD = {
  /** Semente da dispersão — trocar é sortear outro canva. */
  SEED: 11,

  /** Velocidade do canva em relação à página: 1 = as fotos sobem exatamente
   *  o que se rola; menos que 1 = mais devagar, o que dá profundidade (o
   *  fundo fica "atrás"). Também define quanto de canva existe: a altura
   *  total dele é RATE vezes a rolagem da página, mais uma tela. */
  RATE: 0.7,

  /** A dispersão: uma grade sobre o canva — COLS colunas na largura da tela,
   *  uma linha a cada ROW_VH alturas de tela — e cada célula tem FILL de
   *  chance de receber uma foto, deslocada por até JITTER da célula pra cada
   *  lado. Grade com jitter em vez de sorteio livre porque garante
   *  espaçamento sem laço de rejeição. Com estes números dá ~9 fotos por
   *  tela no desktop, como na referência. */
  COLS: 6,
  ROW_VH: 0.36,
  FILL: 0.55,
  JITTER: 0.34,

  /** Larguras das fotos comuns em vmin, sorteadas por igual. */
  SIZES_VMIN: [8, 12, 17],

  /** Largura da foto de uma criação enquanto ainda é miniatura no canva, em
   *  vmin. Maior que as comuns de propósito: é ela que vai crescer até a
   *  moldura, e o olho precisa achá-la antes de o encaixe começar. */
  FEATURED_VMIN: 18,

  /** ——— as luzes ———
   *  Cada foto comum é fantasma (GHOST) ou acesa (LIT); LIT_SHARE é a fração
   *  que acende. Acesa só fora das faixas de SAFE_X (abaixo); dentro delas,
   *  vale fantasma. Por cima, a RESPIRAÇÃO: o canva inteiro é multiplicado
   *  por um fator que vai de 1 (nas passagens entre criações, palco vazio) a
   *  BREATH_MIN (durante a pausa de leitura). É o que impede o fundo de
   *  competir com a criação em foco. Na abertura fica em 1. */
  LIT_SHARE: 0.35,
  GHOST: 0.1,
  LIT: 0.85,
  BREATH_MIN: 0.35,

  /** Quanto se rola atravessando a troca de regra de luz entre a abertura e
   *  as criações (a faixa protegida muda de lado), em alturas de tela. */
  SWAP: 0.6,

  /** Faixas HORIZONTAIS da tela (frações de x) onde uma foto comum não
   *  acende: na abertura, o lado do título; nas criações, moldura + texto.
   *  Só x, porque o canva rola: toda foto passa por todo y. Fantasmas podem
   *  estar em qualquer lugar — a 10% ninguém atrapalha leitura. Medido no
   *  desktop; no celular a regra é MOBILE.
   *
   *  A faixa das criações começa em 0.08, e não nos 0.2 de antes, porque a
   *  moldura passou a trocar de lado (ver STAGE.PLACEMENTS): quando ela está
   *  à direita, o texto ocupa a borda esquerda que antes sobrava. Como o lado
   *  varia por criação e isto é decidido no BUILD, a faixa cobre os dois
   *  arranjos — o preço é alguma foto acesa a menos por tela. */
  SAFE_X: { hero: [0, 0.55], stage: [0.08, 0.92] },

  /** Até quantas alturas de tela além das bordas uma foto ainda é
   *  posicionada. Fora disso ela fica escondida e não custa nada. */
  CULL_VH: 0.6,

  /** No celular o conteúdo ocupa a tela inteira: só uma a cada EVERY fotos
   *  comuns entra (as outras saem por CSS) e o nível aceso é limitado a
   *  LIT_CAP. */
  MOBILE: { EVERY: 2, LIT_CAP: 0.35 },
};

/** A variante das fotos comuns do canva. Pequena e com menos qualidade que as
 *  das criações de propósito: a maior tem ~17vmin e passa a página quase toda
 *  a 10% de opacidade — pixel a mais aqui é só download. As fotos das
 *  criações usam IMAGE (acima), porque crescem até a moldura. */
export const FIELD_IMAGE = { width: 480, format: 'webp', quality: 62 } as const;

// ——— os efeitos (ver effects.ts) ———
//
// O efeito de uma criação é COMO a miniatura dela sai do canva e se encaixa
// na moldura (e, na saída, como volta). Nenhum faz a foto aparecer do nada:
// ela já estava no canva. Cada bloco é o ajuste fino de um; qual criação usa
// qual não se decide aqui, é o campo `effect` em data/creations.ts.
export const EFFECTS = {
  /** slide: de que distância lateral a miniatura parte, em fração da
   *  largura da tela a partir do centro da moldura (o lado é o `from` da
   *  criação), e quanto ABAIXO dela, em fração da altura. O "abaixo" não é
   *  enfeite: a moldura fica à esquerda do texto, e uma miniatura vinda da
   *  direita na altura da moldura cruzava o título no meio do caminho —
   *  partindo do canto de baixo ela passa por baixo do texto. O texto
   *  acompanha com um deslocamento pequeno, em px. */
  SLIDE: { SIDE_VW: 0.42, BELOW_VH: 0.22, COPY_SHIFT: 48 },

  /** tilt: o ângulo de que a foto vem deitada pra trás (graus, ao redor do
   *  eixo horizontal) e a distância da "câmera" em px. */
  TILT: { ANGLE: 70, PERSPECTIVE: 1200 },

  /** flip: o mesmo, girando ao redor do eixo vertical. Menos que 90 graus,
   *  senão em algum instante se vê o verso. */
  FLIP: { ANGLE: 75, PERSPECTIVE: 1200 },

  /** pieces: em quantas tiras verticais a foto se encaixa e que fração da
   *  fase é gasta escalonando-as (0 = todas juntas). Ímpar de propósito: com
   *  uma tira no centro exato o encaixe tem um eixo. Lido também no BUILD (a
   *  página desenha as tiras em HTML). */
  PIECES: { COUNT: 7, STAGGER: 0.5 },

  /** o texto, comum a todos os efeitos: quanto cada linha sobe (px) ao
   *  entrar, o escalonamento entre linhas (fração da duração de UMA linha) e
   *  a partir de que ponto da entrada o texto começa (fração) — depois que a
   *  foto já está a caminho, porque a foto é o gesto e o texto é legenda. */
  COPY: { RISE: 26, STAGGER: 0.12, DELAY: 0.4 },
};
