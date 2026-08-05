
export const SECTIONS = [
  { id: 'work',   label: 'Work',   texture: '/textures/work.jpg' },
  { id: 'craft',  label: 'Craft',  texture: '/textures/craft.jpg' },
  { id: 'photos', label: 'Photos', texture: '/textures/photos.jpg' },
  { id: 'about',  label: 'About',  texture: '/textures/about.jpg' },
  { id: 'now',    label: 'Now',    texture: '/textures/now.jpg' },
] as const;

export const RADIUS = 3;
export const HEIGHT = 1.6;
export const GAP_RATIO = 0.06;              
export const SEG_ANGLE = (Math.PI * 2) / SECTIONS.length;
export const THETA_LEN = SEG_ANGLE * (1 - GAP_RATIO);

export const CAM = {
  top:  { radius: 0.1, height: 8, revealDur: 2.6 },
  side: { radius: 5.9, height: 0 },   // mais perto → cilindro maior (mais fiel à referência)
};

// --- input / inércia ---
export const LERP = 0.15;              // suavização current → target (por frame a 60fps)
export const WHEEL_FACTOR = 0.0008;    // deltaY do scroll → radianos de alvo
export const DRAG_FACTOR = 0.003;      // dx do arrasto → radianos de alvo
export const MOMENTUM = 1.6;           // quanto a velocidade do arrasto "arremessa" ao soltar
export const SNAP_DELAY = 140;         // ms de ociosidade antes de travar no segmento

// --- a fita (ver Ribbon.ts) ---
// Anel e fita reta são a MESMA superfície com curvaturas diferentes, então não
// existe "largura no modo reto" separada: tudo é comprimento de arco. O passo
// entre fotos na fita cai de graça, é SEG_ANGLE * RADIUS.
export const ARC_WIDTH = RADIUS * THETA_LEN;   // comprimento de arco de uma foto
export const RIBBON_SEGMENTS = 48;             // subdivisões na largura = lisura da curva

// --- reflexo "na água" (clones espelhados sob as fotos, ver Reflection.ts) ---
// Só a faixa do topo do reflexo entra no enquadramento (a câmera corta perto de
// y = -1.35, o reflexo começa em -0.8 - gap), então tudo aqui é calibrado para os
// primeiros ~25% da altura espelhada: é ali que o reflexo tem que se resolver.
export const REFLECT = {
  opacity: 0.5,      // brilho na linha d'água (antes do apagamento por profundidade)
  gap: 0.14,         // respiro entre a foto e o reflexo — 0 deixa os dois colados
  fade: 2.2,         // expoente do apagamento com a profundidade (maior = some antes)
  amp: 0.02,         // amplitude da ondulação, em UV (0.02 ≈ 7 cm de mundo na horizontal)
  freq: 46,          // nº de cristas ao longo da altura espelhada (alto = ondas curtas)
  speed: 0.8,        // velocidade com que as cristas descem
  rampDepth: 0.35,   // profundidade em que a onda atinge a amplitude cheia
  shimmer: 0.16,     // ganho de brilho nas cristas (o "vidrado" da água)
};

// --- labels 3D "liquid glass" (texto de vidro preso na frente de cada foto) ---
export const LABEL = {
  font: '/fonts/marcellus.typeface.json',  // Marcellus: romana lapidar elegante
  size: 0.3,          // altura da caixa-alta em unidades de mundo (foto tem 1.6)
  depth: 0.045,       // extrusão rasa: vidro delgado, não bloco
  bevel: 0.005,       // chanfro mínimo, só pra arredondar a borda
  bevelOffset: 0,     // NÃO usar negativo: afina o traço, mas colapsa o furo
                      // de letras como o "b" do About (contorno se auto-intersecta)
  lift: 0.16,         // quanto o texto flutua à frente da superfície da foto
  maxWidth: ARC_WIDTH * 0.72,  // labels longas encolhem pra caber na foto
};

// --- palavra gigante do fundo, agora dentro da cena (ver Backdrop.ts) ---
// As medidas saíram do que a versão em DOM ocupava na tela: ~86% da largura
// visível naquela profundidade e o centro a ~3 unidades acima do eixo.
export const BACKDROP = {
  text: 'PORTFOLIO',
  width: 13.4,        // largura em unidades de mundo (a geometria é escalada pra isto)
  y: 3.0,             // altura do centro da palavra
  z: -4.5,            // atrás do anel, que vai de z = -3 a +3
  color: 0x1a1a1a,    // mesmo cinza da <div> que ela substitui
  // Faixa do progresso da entrada em que ela acende. Vai no fim de propósito:
  // enquanto a câmera está alta ela aponta pra DENTRO do anel, e a palavra
  // (alta e ao fundo) fica fora do enquadramento. Ela só entra no quadro no
  // trecho final, quando a câmera nivela — então é ali que faz sentido acender,
  // senão o fade acontece todo com ela invisível e a chegada vira um corte.
  fade: [0.6, 1],
};

// --- abertura do About: mergulho da câmera + estilhaçamento da foto ---
// A coreografia é UMA descida só: a câmera avança até a foto cobrir a tela, a
// foto se abre em cacos a partir do ponto de impacto, os cacos ASSENTAM num
// mosaico — e é esse mosaico que vira o cabeçalho do About, enquanto a câmera
// recua e panoramiza pra baixo e a página sobe por trás.
// (ver Shatter.ts, CameraRig.descent e Carousel.enterAbout)
export const SHATTER = {
  // Distância câmera↔foto no fim da aproximação. Ela SÓ chega perto do anel —
  // não entra na foto. Em 0.85 (como era) o enquadramento mostrava metade da
  // imagem esticada na curvatura do cilindro, e isso se lia como defeito, não
  // como zoom. Aqui a foto ocupa ~87% da altura da tela e continua inteira.
  approach: 2.0,
  diveDur: 1.0,     // segundos da aproximação
  alignDur: 0.55,   // giro que traz a foto do About pra frente antes

  // Padrão de fratura: anéis × setores a partir do ponto de impacto, como o
  // estrelado de um para-brisa.
  //
  // O que denunciava o padrão não era o jitter fraco — era os anéis serem
  // CÍRCULOS. Uma fração radial única por anel, valendo para todos os setores,
  // desenha aros concêntricos perfeitos, e o olho acha um aro num piscar. Agora
  // a fronteira de cada anel é uma poligonal ondulada: o raio é sorteado por
  // ÂNGULO, e as células vizinhas compartilham esses cantos — o ladrilhamento
  // continua exato e o aro some.
  rings: 5,
  sectors: 13,      // primo: evita que setores se alinhem com os anéis
  jitter: 0.9,      // ondulação da fronteira de cada anel
  ringWander: 0.5,  // o quanto os anéis-base fogem do espaçamento regular

  // Espessura do vidro. Os cacos eram planos de uma face só — daí lerem como
  // adesivo, e não como caco. Agora são prismas: a extrusão vai toda pra TRÁS,
  // com a face da frente exatamente em z = 0, no plano onde a foto estava.
  // Extrudar pros dois lados empurraria a face visível pra frente da foto e a
  // troca daria um pulinho de paralaxe.
  thickness: 0.05,

  // Arredondamento dos cantos. Canto vivo é o que faz a quebra parecer bruta —
  // e, de perto, denuncia o polígono. O raio é limitado pelo tamanho de cada
  // caco (ver roundPoly), então as lascas pequenas arredondam menos em vez de
  // colapsarem. Como os cantos recuam, os cacos deixam de ladrilhar a foto com
  // exatidão: sobram frestas finas onde três ou quatro peças se encontram, e é
  // isso que se vê no instante da troca — trincas, que é justamente o que
  // deveria estar ali.
  corner: 0.055,
  cornerSegs: 3,

  // Compensação do arredondamento. Os cantos recuam, e com stagger de 0.32 os
  // cacos de fora passam uns 16 frames parados no lugar antes de sair — tempo
  // de sobra pra se ver um furo em cada encontro de peças. O outset devolve o
  // que o arredondamento tirou, fazendo as peças se SOBREPOREM um pouco: no
  // instante da troca elas ainda estão opacas, então sobreposição não se vê,
  // enquanto buraco se vê. Os pontos são grampeados ao retângulo da foto, pra
  // a silhueta de fora continuar reta e a textura não borrar além da borda.
  outset: 0.04,

  // Opacidade do vidro DEPOIS de quebrar. No instante da troca eles valem 1,
  // porque ali precisam bater pixel a pixel com a foto opaca que substituem;
  // a translucidez entra durante o voo, como se o caco só virasse vidro ao se
  // soltar da imagem.
  glassOpacity: 0.8,

  // A quebra. Menos "explosão", mais "a foto se desfaz": os cacos abrem e já
  // saem viajando para as bordas da tela, não voltam pro lugar.
  spread: 1.2,      // afastamento radial (unidades de mundo)
  toward: 0.9,      // avanço na direção da câmera
  fall: 0.75,       // queda durante a abertura
  spin: 1.0,        // tombo máximo, em radianos
  dur: 0.9,         // duração da abertura
  stagger: 0.32,    // atraso do centro até a borda (a trinca se propaga)
};

// Onde os cacos param: uma MOLDURA. Poucos pedaços, jogados em cima e nas duas
// laterais, com o texto passando no meio.
//
// As posições são normalizadas (-1..1) sobre o retângulo visível no plano do
// vidro, e só viram unidades de mundo quando a câmera assenta — é assim que a
// borda encosta na beirada da tela em qualquer proporção, do celular ao
// monitor largo, sem uma constante chutada por breakpoint.
export const BORDER = {
  keep: 26,               // quantos cacos sobram na moldura
  topCount: 12,           // destes, quantos vão pra faixa de cima
  topBand: [0.55, 1.12],  // v da faixa de cima (>1 = meio pra fora da tela)
  sideBand: [0.84, 1.12], // |u| das laterais
  sideSpan: [-0.4, 0.7],  // v que as laterais cobrem
  wander: 0.5,            // bagunça na distribuição ao longo de cada faixa
  spin: 0.5,              // rotação em repouso, em radianos
  depth: 0.35,            // desencontro em Z (cada peça pega a luz diferente)
  dur: 1.05,              // tempo de voar da quebra até a moldura

  // A flutuação da moldura parada. Cada eixo oscila numa frequência diferente e
  // incomensurável com as outras, e cada caco entra numa fase própria: é isso
  // que impede o conjunto de respirar junto, que leria como um só objeto
  // balançando em vez de cacos soltos no ar.
  floatAmp: 0.055,        // deriva máxima, em unidades de mundo
  floatSpeed: 0.45,       // velocidade da deriva
  floatSpin: 0.09,        // giro somado à pose de repouso, em radianos
  floatSpinSpeed: 0.3,
};

// A descida: a câmera recua enquanto o painel HTML sobe. Os dois andam na MESMA
// timeline (ver Carousel.enterAbout → label 'descent').
export const ABOUT = {
  frameGap: 4.2,    // distância câmera↔plano do vidro no fim: define a moldura
  descentDur: 1.2,
  descentEase: 'power2.inOut',
  // Quando a descida começa, contada do início da quebra. É o número que mata a
  // pausa: a câmera parte com o vidro ainda voando, então nunca existe um frame
  // em que nada se move.
  overlap: 0.85,
  fadeDur: 0.45,    // o anel apagando atrás da quebra (a foto do About NÃO
                    // entra nesse fade: ver Carousel.swapToShards)
  parallax: 0.8,    // a moldura rola quase junto com a página, e sai de cena
  fadeOut: 0.1,     // fração da tela rolada antes de a moldura começar a apagar
  exitScale: 1.7,   // o fechar é a mesma timeline em reverse, mais rápida
};

// --- responsividade da cena ---
// abaixo desta proporção (largura/altura), a câmera se afasta na mesma medida
// para o segmento ativo continuar cabendo na largura visível (retrato/estreito)
export const BASE_ASPECT = 1.4;

// --- parallax: a cena "olha" pro mouse de leve ---
export const PARALLAX_AMP = 0.5;       // deslocamento máx. da câmera (unidades de mundo)
export const PARALLAX_EASE = 0.06;     // suavização do parallax (baixo = preguiçoso/suave)