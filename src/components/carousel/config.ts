
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

// --- layout FLAT / reflexo ---
export const ARC_WIDTH = RADIUS * THETA_LEN;   // largura do plano no modo FLAT
export const FLAT_GAP = ARC_WIDTH * GAP_RATIO; // respiro entre planos na fita reta
export const FLAT_STEP = ARC_WIDTH + FLAT_GAP; // passo horizontal entre segmentos
export const FLAT_Z = 3.0;             // quão pra frente (rumo à câmera) a fita avança no FLAT
export const REFLECT_OPACITY = 0.16;   // opacidade do reflexo espelhado

// --- parallax: a cena "olha" pro mouse de leve ---
export const PARALLAX_AMP = 0.5;       // deslocamento máx. da câmera (unidades de mundo)
export const PARALLAX_EASE = 0.06;     // suavização do parallax (baixo = preguiçoso/suave)