// src/scripts/photos/config.ts — TODAS as constantes ajustáveis do mural num
// lugar só, como o config.ts do carrossel. Nenhum outro arquivo desta pasta
// pode ter número mágico: se um valor merece ajuste, ele mora aqui.

// ——— o mural (layout do tile) ———
export const MURAL = {
  /** altura-alvo das linhas justificadas, em px, na tela larga. As linhas
   *  reais variam em torno disto: a justificação estica/encolhe cada linha
   *  pra fechar a largura exata do tile.
   *
   *  É um TETO, não um valor fixo — ver ROW_HEIGHT_VW logo abaixo. */
  TARGET_ROW_HEIGHT: 300,

  /** ——— a altura da linha é uma fração da TELA, não um número absoluto ———
   *
   *  O tile é sempre largo (MIN_TILE_W abaixo), então uma altura fixa de 300px
   *  significa coisas opostas em telas diferentes: num notebook de 1440px cabem
   *  ~7 fotos de ponta a ponta; num celular de 390px cabem DUAS, e o mural
   *  deixa de ser um mural — vira uma foto por vez, com zoom.
   *
   *  Aqui a altura-alvo passa a ser uma fração da largura do viewport, presa
   *  entre um piso (senão numa tela minúscula as fotos viram selo) e o teto
   *  acima (senão num ultrawide as linhas cresceriam sem parar). A conta
   *  reproduz o teto a partir de ~670px de largura: do tablet pra cima nada
   *  muda, e só as telas estreitas ganham mais fotos por tela — num celular de
   *  390px a fração leva de ~2 fotos visíveis de ponta a ponta para ~3, com
   *  ~12 na tela em vez de ~5. */
  ROW_HEIGHT_VW: 0.45,
  MIN_ROW_HEIGHT: 120,

  /** respiro entre fotos, em px — o MESMO valor vale dentro do tile e na
   *  costura entre cópias (o passo do tile já embute um gap no fim de cada
   *  eixo, ver layout.ts), então a emenda é invisível por construção. */
  GAP: 10,

  /** o tile precisa de pelo menos tantas fotos pra repetição não gritar: com
   *  poucas fotos na pasta, a lista é repetida (embaralhada por semente a cada
   *  repetição) até passar deste mínimo. Com fotos suficientes, vale 1x.
   *
   *  O que este número compra NÃO é foto nova na tela — quantas cabem por tela
   *  é a pasta que decide. É o tamanho do PADRÃO: com uma repetição só, o
   *  arranjo inteiro voltava a cada ~2,6 telas de caminhada, e um mural que se
   *  repete tão perto deixa de parecer um mural infinito. */
  TILE_MIN_PHOTOS: 160,

  /** semente do embaralhamento determinístico — mesmo build, mesmo mural */
  SEED: 7,

  /** a mesma foto não pode reaparecer a menos de tantas posições na sequência
   *  do tile: é o que impede a fronteira entre duas repetições embaralhadas de
   *  colar a foto do lado (ou quase do lado) dela mesma numa linha.
   *
   *  Uma linha tem ~13 fotos, então a janela cobre a linha inteira e sobra:
   *  duas cópias nunca caem na mesma linha. Isto é só a primeira defesa, em
   *  UMA dimensão — quem cuida da distância de verdade, no plano, é o
   *  espalhamento abaixo. */
  REPEAT_WINDOW: 16,

  /** ——— espalhamento em 2D (layout.ts) ———
   *
   *  A janela acima conta POSIÇÕES na sequência, e a sequência é uma fita: ela
   *  não sabe que a posição 20 pode cair exatamente embaixo da posição 4. O
   *  empacotamento é refeito algumas vezes, medindo a distância real entre as
   *  cópias no plano (com o ladrilhamento e o meio tile das colunas ímpares
   *  inclusos) e sorteando outro lugar pra quem ficou perto demais.
   *
   *  A distância mínima é medida em ALTURAS DE LINHA e não em px, pra régua
   *  acompanhar o tamanho que as fotos têm naquela tela. */
  /**  A distância é medida em ALTURAS DE LINHA, não em px, pra régua acompanhar
   *  o tamanho que as fotos têm naquela tela. Seis é uma MIRA, e uma que não se
   *  alcança: com esta pasta o melhor arranjo achado põe as cópias a ~4 alturas
   *  uma da outra. Isso é de propósito — como ninguém chega no alvo, o custo
   *  continua empurrando todo mundo pra longe até o fim das passadas, em vez de
   *  parar assim que o último par cruza uma linha arbitrária. */
  MIN_COPY_DIST: 6,

  /** Teto de passadas. Custa ~60ms no desktop e a busca estaciona por volta
   *  daqui: 1500 passadas devolvem exatamente o mesmo mural que 800. */
  SPREAD_PASSES: 800,

  /** quantas TELAS de largura tem o tile.
   *
   *  Ele nascia com a largura EXATA do viewport, que é o pior valor possível:
   *  cada foto tinha uma cópia a exatamente uma tela de distância, e andar de
   *  lado devolvia o mural inteiro igualzinho. Mais largo que a tela, a volta
   *  não fecha em lugar nenhum que a pessoa consiga reconhecer. */
  TILE_W_SCREENS: 1.6,

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

// ——— resolução do canvas (a conta que usa estes números: resolution.ts) ———
//
// Quantos pixels REAIS o mural desenha por pixel de CSS. É o número que decide
// a nitidez das fotos, e ele estava vindo emprestado do lugar errado: o teto de
// 1.5 no touch é o do carrossel da home (components/carousel/config.ts → GPU),
// uma cena com refração de vidro — que faz o three desenhar tudo uma SEGUNDA
// vez por quadro —, reflexo n'água e estilhaço. O mural é quad texturizado com
// uma curva no vertex shader, e o blur já se desliga sozinho no touch
// (BLUR.DISABLE_ON_COARSE). Ele pagava um orçamento que não gasta.
//
// O que 1.5 custava: num celular de dpr 3, o canvas saía com METADE dos pixels
// da tela em cada eixo — um quarto no total — e o compositor esticava o que
// sobrou de volta. A densidade que deveria deixar a foto nítida era exatamente
// a que fazia a conta piorar.
export const GL = {
  /** Teto do devicePixelRatio. Cada ponto acima de 1 custa o QUADRADO em
   *  pixels, então dois é onde quase todo mundo para: o que se ganharia de 2
   *  pra 3 já está abaixo do que o olho separa a um braço de distância, e
   *  custaria mais 125% de pixels pra chegar lá. */
  PIXEL_RATIO: 2,

  /** ——— e por que o mesmo teto no touch ———
   *
   *  Não é generosidade: no celular ele desenha MENOS que no desktop. Um
   *  aparelho de 390×844 em dpr 2 dá 1.3 megapixels; a mesma página num
   *  notebook de 1440×900 em dpr 2 dá 5.2. O aparelho pequeno estava sendo
   *  punido pelo tamanho da tela dele, que é justamente o que o torna barato
   *  de desenhar.
   *
   *  Quem cuida do caso caro é o orçamento abaixo, e não o teto — porque o
   *  caso caro não é o celular, é o tablet grande e denso. */
  PIXEL_RATIO_COARSE: 2,

  /** Teto de pixels do canvas em ponteiro grosso, para o teto acima não virar
   *  um cheque em branco numa tela grande: um tablet de 1024×1366 em dpr 2
   *  desenharia 5.6 megapixels, mais que o notebook. Aqui a razão cede até
   *  caber no orçamento — o celular nunca chega perto dele e fica com os 2
   *  inteiros. Só no touch: no desktop o dpr 2 já se provou. */
  PIXEL_BUDGET_COARSE: 2_600_000,
};

// ——— a parede curva / tubo (ver tunnel.ts) ———
//
// O centro do viewport é o fundo do tubo; as bordas avançam em Z e viram suas
// faces para a câmera. São proporções, não pixels casados no olho, então a lente
// conserva a mesma presença em um notebook largo e numa janela menor.
export const TUNNEL = {
  /** distância da câmera baseada na diagonal. Sem teto: em ultrawide/4K a
   * geometria e a lente crescem juntas, conservando a mesma ampliação.
   *
   * Quanto MENOR, mais curta a distância focal — e a mesma profundidade do
   * arco rende mais encolhimento nas beiradas. É a metade ÓPTICA da distorção;
   * a outra é o MAX_ANGLE abaixo, que é a geométrica. As duas juntas porque
   * arco fundo com lente longa vira uma curva mole, e lente curta sobre parede
   * quase plana só afunila o mural sem dobrar nada. */
  PERSPECTIVE_DIAG: 0.62,
  PERSPECTIVE_MIN: 700,

  /** inclinação máxima das faces (desktop / toque). A dobra precisa aparecer
   *  com clareza quando uma foto atravessa o viewport durante o pan — a foto
   *  entra pela beirada quase de perfil e só se abre de frente ao passar pelo
   *  centro. O raio do tubo é halfView/ângulo: mais ângulo = tubo mais
   *  apertado, mais profundidade nas bordas. */
  MAX_ANGLE: 54 * Math.PI / 180,
  MAX_ANGLE_COARSE: 38 * Math.PI / 180,

  /** o tubo é levemente oval: X curva mais, Y respira sem dominar o mural */
  VERTICAL_WEIGHT: 0.86,

  /** ——— o teto de profundidade ———
   *
   *  Depois da beirada do viewport a parede segue pela TANGENTE, e a tangente
   *  de um tubo apertado sobe em Z sem limite: o canto diagonal do overscan
   *  (margem de render + a foto inteira que ainda cabe nela) pode acumular mais
   *  profundidade do que a distância da câmera. Passar da câmera não é "mais
   *  distorção", é o vértice indo parar ATRÁS do olho — a divisão perspectiva
   *  inverte de sinal e a foto se espalha rasgada pela tela.
   *
   *  Sobra de segurança em fração da distância da câmera. O tubo pode chegar a
   *  esta fração e não passa dela nunca. */
  DEPTH_CEIL: 0.55,

  /** Onde o teto começa a agir, em fração dele. Até o joelho a profundidade é
   *  a do arco, ao pé da letra; dali em diante ela se aproxima do teto por uma
   *  exponencial que encosta na reta com a MESMA inclinação, então não existe
   *  quina — e a curva sai igual dos dois lados de qualquer emenda, que é o que
   *  mantém vizinhos colados. O joelho fica alto de propósito: o que está na
   *  tela passa quase inteiro por baixo dele e não é tocado; quem é amansado é
   *  o overscan fundo, que só aparece espremido junto ao ponto de fuga. */
  DEPTH_KNEE: 0.7,

  /** ——— a curvatura obedece à VELOCIDADE ———
   *
   *  Parado, o mural é uma parede quase reta: é assim que se olha uma foto. O
   *  tubo é o que o MOVIMENTO faz com ela — quanto mais rápido a câmera corre,
   *  mais a parede se enrola em volta de quem olha, e ao soltar ela se desenrola
   *  de volta pro plano. Os números abaixo são a mesma família de constantes do
   *  BLUR (velocidade → efeito), e de propósito: são os dois lados da mesma
   *  leitura de velocidade, e casá-los é o que faz o pan rápido parecer UMA
   *  coisa só em vez de dois enfeites somados.
   *
   *  O que sai daqui MULTIPLICA a intenção da coreografia (ver
   *  infiniteCanvas.ts): a chegada e a saída continuam donas do liga/desliga da
   *  lente, a velocidade decide só o quanto dela aparece.
   */

  /** curvatura em repouso, em fração do tubo cheio. Não é zero: um resto de
   *  dobra guarda a profundidade do mural (e a lente já montada) sem chegar a
   *  distorcer a foto que a pessoa parou pra ver. */
  REST: 0.12,

  /** velocidade (px/s) do tubo cheio — a régua da curva, como o SPEED_FULL do
   *  blur. Mais baixa que a dele: a dobra tem que estar madura no pan
   *  comum, não só no arremesso. */
  SPEED_FULL: 2600,

  /** expoente da curva velocidade→curvatura. Acima de 1 segura a dobra nas
   *  velocidades baixas, pra um arrasto de ajuste não entortar o mural. */
  SPEED_EXP: 1.35,

  /** Sobe e desce por low-pass ASSIMÉTRICO (0..1 por frame a 60fps): a parede
   *  se enrola no tempo da mão e se desenrola devagar, sozinha. Simétrico, o
   *  desenrolar chegava junto com a parada e a dobra virava um pisca; a cauda
   *  lenta é o que faz o movimento ter RESÍDUO, como toda massa tem. */
  SPEED_ATTACK: 0.18,
  SPEED_RELEASE: 0.07,

  /** trecho final da chegada home → photos em que a parede se curva. Começa
   * depois do crossfade da hero, quando o tile do mural já assumiu a foto. */
  ENTRY_AT: 0.76,

  /** trecho INICIAL da saída em que a parede volta a ser plana — o espelho do
   * ENTRY_AT (a chegada curva nos últimos 24%; a saída endireita nos primeiros
   * 22%). Cedo de propósito: a foto que atravessa a troca de página é plana, e
   * a foto grande que a substitui no fim não passa pela lente do tubo. Enquanto
   * a parede ainda estiver curva, o ladrilho de baixo tem uma matrix3d que a
   * foto grande não tem — e as duas só podem coincidir em cima de um plano. */
  EXIT_AT: 0.22,
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

// ——— a saída de volta pro anel (ver photos/main.ts → leaveToSeam) ———
//
// A chegada e a saída são o MESMO pêndulo. A home avança na foto e para; o
// mural recua dela até a parede. Aqui o movimento se inverte outra vez: a
// câmera desliza até a foto da emenda, mergulha nela até ela cobrir a tela no
// enquadramento exato em que a home a deixou, e só então a navegação acontece.
// Quem termina o gesto é a home, rebobinando o avanço dela a partir daquele
// quadro (ver Carousel.returnFromDeparture).
//
// Existem DUAS coisas acontecendo, e é bom nomeá-las: o DESLIZE (a câmera anda
// pela parede até a foto certa) e o MERGULHO (a parede inteira se aproxima).
// Elas não são duas animações em fila — correm no mesmo relógio, o deslize
// terminando enquanto o mergulho ainda cresce, que é o que uma câmera de
// verdade faz quando vai até um assunto e entra nele.
//
// Só roda pra quem chegou pelo anel: sem uma home logo atrás no histórico não
// há emenda pra costurar, e o "‹ Voltar" volta a ser um link comum.
export const EXIT = {
  /** duração do gesto, em s. Mais curta que os 1,4 do recuo da chegada, pelo
   *  mesmo motivo do CLOSE_DUR do lightbox: a ida é uma escolha, a volta é um
   *  passo atrás — e passo atrás não pode arrastar. */
  DUR: 1.05,

  /** A mesma senoidal da chegada, e pela mesma razão (ver ENTRY.EASE): as duas
   *  pontas precisam ser moles porque nas duas há uma inversão de sentido. Esta
   *  tem uma em cada extremidade — o mural está parado quando ela começa, e a
   *  home começa a recuar quando ela termina. */
  EASE: 'sine.inOut',

  /** Fração do gesto em que o DESLIZE acaba, ou seja, em que a foto da emenda
   *  chega ao centro da tela.
   *
   *  Tem que sobrar mergulho depois dele. A ampliação de um instante multiplica
   *  tudo que ainda está fora do centro, então uma foto que ainda estivesse
   *  caminhando no fim atravessaria a tela em vez de crescer nela. Aqui o
   *  deslize fecha com o mural a ~2x, ou seja, com o mergulho ainda pela metade:
   *  a chegada ao centro acontece em movimento, não numa parada. */
  GLIDE_UNTIL: 0.55,

  /** Quando a foto GRANDE entra por cima do ladrilho, e quanto dura a troca —
   *  em frações da duração, como na chegada.
   *
   *  A ida faz isto ao contrário (a foto grande já está lá e dá lugar ao
   *  ladrilho), e por um motivo que aqui não existe: lá a foto grande É o quadro
   *  que chega, então ela carrega desde o primeiro instante a proporção da FITA,
   *  e o crossfade acontece com as duas imagens em larguras diferentes. Aqui ela
   *  entra por cima de um ladrilho que já está na tela, e pode entrar do tamanho
   *  exato dele — o crossfade vira o que ele sempre quis ser: uma troca de
   *  resolução, sem nenhuma imagem dobrada. O esticamento pra proporção da fita
   *  começa DEPOIS, com só ela na tela (ver ASPECT_FROM abaixo). */
  HANDOFF_AT: 0.26,
  HANDOFF_DUR: 0.16,

  /** Teto da espera pela foto grande decodificar antes de o gesto começar.
   *
   *  Curtíssimo, ao contrário do READY_MAX da chegada. Quem volta pelo anel já
   *  tem essa foto no cache (foi ela que cobriu a tela na ida), então o decode
   *  resolve em poucos ms e o clique responde na hora. E se ela NÃO estiver
   *  quente, esperar não adianta nada: por baixo dela está a mesma imagem em
   *  thumb, no mesmo lugar, então uma foto grande que chega atrasada não deixa
   *  buraco nenhum — ela só aparece mais nítida um pouco depois. */
  READY_MAX: 240,

  /** O POUSO, em s: um respiro com a foto já cobrindo a tela antes de navegar.
   *  É o mesmo DEPART.hold do outro lado, e existe pela mesma razão — no quadro
   *  seguinte a este o movimento inverte de sentido, e inversão sem repouso é
   *  tranco. */
  HOLD: 0.06,
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
  /** o quarto de volta do botão de girar, em s */
  ROTATE_DUR: 0.32,
  ROTATE_EASE: 'power2.inOut',
  /** fração do viewport que a foto ampliada pode ocupar */
  MAX_W: 0.92,
  MAX_H: 0.88,
};
