
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

// --- responsividade da cena ---
// abaixo desta proporção (largura/altura), a câmera se afasta na mesma medida
// para o segmento ativo continuar cabendo na largura visível (retrato/estreito)
export const BASE_ASPECT = 1.4;

// --- parallax: a cena "olha" pro mouse de leve ---
export const PARALLAX_AMP = 0.5;       // deslocamento máx. da câmera (unidades de mundo)
export const PARALLAX_EASE = 0.06;     // suavização do parallax (baixo = preguiçoso/suave)