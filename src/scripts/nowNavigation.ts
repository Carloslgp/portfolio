// src/scripts/nowNavigation.ts — o CONTRATO entre a home e a /now.
//
// Mesmo papel do workNavigation.ts, e pelo mesmo motivo: as duas páginas
// desenham o mesmo quadro no instante da troca de documento, e isso só funciona
// se as duas fizerem a mesma conta. Ela mora aqui, e não no frontmatter de cada
// uma, porque é um acordo entre dois documentos.
//
// A DIFERENÇA para a emenda da /work é o que atravessa a troca.
//
// Lá é uma pintura: um arquivo que os dois lados carregam e desenham no mesmo
// retângulo. Aqui é a HORA — e ela não é copiada de um documento para o outro.
// Os dois perguntam `new Date()` e formatam pela MESMA função, deste arquivo.
// No quadro da troca a string é idêntica porque o instante é o mesmo, não
// porque alguém guardou o valor. Uma emenda que não precisa de emenda.
//
// (E se o minuto virar no meio da transição — dá uns 2% de chance, a coisa toda
// dura pouco mais de um segundo — os dois lados viram junto, porque os dois
// estão lendo o mesmo relógio. Um valor copiado é que ficaria velho.)
import { SEAM_ASPECT } from '../data/gallery';
import { viewportSize } from './viewport';

export const NOW_ENTRY_KEY = 'portfolio:now-entry';
export const NOW_RETURN_KEY = 'portfolio:now-return';
export const NOW_HOME_KEY = 'portfolio:now-home';

/** O fuso do relógio. É o MESMO de scripts/hud.ts, e a duplicação é de
 *  propósito: aquele arquivo é a HUD da home e este é o contrato de navegação.
 *  Importar um do outro amarraria a /now, que não carrega o main.ts, ao módulo
 *  que desenha os cantos do carrossel.
 *
 *  Nome de zona e não offset fixo, pelo mesmo motivo de lá: a tabela de horário
 *  de verão é do navegador, não nossa. */
export const NOW_TZ = 'America/Sao_Paulo';

/** A hora de Curitiba para QUALQUER visitante — de Tóquio sai a mesma string
 *  que daqui. É esta função que faz a emenda existir: as duas pontas da troca
 *  chamam ela, no mesmo segundo, e recebem o mesmo texto.
 *
 *  O formato tem que bater até no espaço antes do AM/PM, porque o que atravessa
 *  a troca é a CAIXA do texto: a hora gigante do último quadro da home e a do
 *  primeiro quadro da /now são medidas em px, e uma diferença de um caractere
 *  já move o centro. */
export function nowTime(at = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: NOW_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(at);
}

/** A data por extenso, que a /now assenta ao lado da hora. Só a página usa —
 *  mora aqui porque é a mesma leitura de relógio, e separar as duas deixaria
 *  meia dúzia de linhas de fuso horário em dois arquivos. */
export function nowDate(at = new Date()): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: NOW_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(at);
}

/** Quantos ms faltam para a virada do minuto. Os dois documentos agendam o
 *  próximo tique pela virada, e não por 60s corridos: assim o relógio não fica
 *  devendo quase um minuto quando a aba dorme e o timer atrasa. (Mesma conta do
 *  hud.ts — ver o comentário do NOW_TZ sobre por que não é importada de lá.) */
export function msToNextMinute(): number {
  return 60_000 - (Date.now() % 60_000) + 50;
}

// ——— o quadro da emenda ———
//
// A pintura do segmento Now atravessa a navegação junto com a hora: ela é o
// fundo do último quadro da home e do primeiro da /now. Vale aqui tudo o que o
// workNavigation.ts explica sobre proporção da FITA e sobre o GIRO de -90° que
// o Segment.ts aplica em toda textura — é a mesma superfície, com a mesma
// correção feita em CSS.
//
// O que muda é a SANGRIA, e ela muda por causa do gesto. As outras duas emendas
// param quietas no quadro da troca; esta DERIVA, porque a foto do segmento Now é
// uma clarabóia e o movimento é atravessá-la. Uma pintura que se desloca precisa
// de mais borda sobrando, senão a beirada dela entra na tela justamente no
// quadro em que os dois documentos deveriam ser indistinguíveis.
//
// A direção é PARA BAIXO, e isso não é detalhe: quem sobe por uma abertura vê o
// teto descer e sair por baixo do próprio olhar. Foi a segunda tentativa — a
// primeira levava a pintura pra cima, e aí o CABEÇALHO da página era a última
// coisa a ser descoberta. Justamente onde a hora pousa: ela chegava no carimbo
// enquanto o carimbo ainda estava atrás da pintura.
export const NOW_SEAM = {
  aspect: SEAM_ASPECT,

  /** 14% além do viewport, contra os 6% das outras duas emendas. A conta que
   *  manda: na proporção da fita (2.21:1) a caixa fica mais alta que a tela por
   *  `overscan` — em 16:9, 1.14 deixa ~7vh de sobra em cima e embaixo, e a
   *  deriva gasta 2.4 deles. */
  overscan: 1.14,

  /** O giro que devolve a pintura à orientação da fita, em graus. */
  rotation: 90,

  /** Quanto a pintura desce até o quadro da emenda, em vh. Pequeno de
   *  propósito: aqui ele é só a DEIXA do movimento — quem atravessa de verdade
   *  é a /now, do outro lado da troca, onde a pintura pode sair de quadro
   *  porque já existe página atrás dela. */
  drift: 2.4,

  /** O quanto o avanço inteiro é desacelerado, como timeScale da timeline do
   *  departInto (menor = mais lento).
   *
   *  Aqui, e não no DEPART: aquele bloco é de TODAS as saídas do anel, e mexer
   *  nele mudaria também o mergulho da /photos e o da /work. Esta transição tem
   *  mais coisa acontecendo por quadro — a pintura, a hora atravessando a tela
   *  inteira — e por isso pede mais tempo que as outras duas. O timeScale dá
   *  isso sem tocar em número nenhum que não seja daqui. */
  pace: 0.85,

  /** A janela em que a hora viaja do canto até o meio da tela, em progresso do
   *  AVANÇO (não da emenda).
   *
   *  Ela não pode andar no relógio da emenda como o título da /work: a emenda
   *  ocupa só os últimos 20% do avanço, e a hora tem a tela inteira pra
   *  atravessar. Começa junto com o apagar da HUD (0.45s), que é o que faz a
   *  leitura ser "o relógio do canto DESCOLOU" em vez de "apareceu um relógio
   *  no meio". */
  clockFrom: 0.24,
  clockTo: 0.95,

  /** Quanto do trecho acima o acender da hora ocupa.
   *
   *  Curto, e a razão é a única costura de verdade deste movimento: o relógio
   *  da HUD é Inter de 0.8rem e a hora gigante é Playfair. Um mapeia a CAIXA do
   *  outro (ver clockWarp), não as letras. O que esconde a troca de tipo é o
   *  cruzamento: enquanto a hora do portal acende, a da HUD ainda está
   *  apagando (0.45s de body.is-diving), as duas quase do mesmo tamanho e no
   *  mesmo lugar. A 0.8rem, ninguém vê uma serifa nascer. */
  clockFade: 0.3,

  /** A VOLTA sem BFCache: a home nasce coberta pela pintura e precisa devolvê-la
   *  ao segmento. Quando o navegador serve a home viva, quem dirige é o
   *  rebobinamento do avanço (ver Carousel.returnFromDeparture) e estes números
   *  não entram — existe um dono só de cada vez. Mesmos valores da /work: é o
   *  mesmo passo atrás, e dois tempos diferentes para o mesmo gesto seriam duas
   *  descrições do mesmo movimento. */
  returnDur: 0.9,
  returnEase: 'power3.inOut',
};

/** O quadro da emenda NESTA janela, em px. A mesma conta roda no CSS das duas
 *  páginas (ver --now-seam-w / --now-seam-h); aqui ela existe porque o avanço
 *  precisa do número para interpolar a escala quadro a quadro. */
export function nowSeamBox(): { w: number; h: number } {
  const viewport = viewportSize();
  const w = Math.max(viewport.width, viewport.height * NOW_SEAM.aspect) * NOW_SEAM.overscan;
  return { w, h: w / NOW_SEAM.aspect };
}

/** A transformação que põe a hora GIGANTE exatamente em cima de um retângulo
 *  medido na tela — o do relógio da HUD, na ida; o da data da página, na volta.
 *
 *  É uma escala UNIFORME, e ela pode ser uniforme por um motivo que não é
 *  sorte: os dois elementos contêm a MESMA string, formatada pela mesma função
 *  daqui em cima. Mesmo texto, mesma família, mesma proporção de caixa — então
 *  um fator só mapeia um retângulo no outro sem distorcer nenhuma letra.
 *
 *  Medir em vez de calcular por constante é o que faz isto sobreviver ao
 *  responsivo: no celular a HUD desce, a hora encolhe, e a conta continua sendo
 *  a mesma porque ela pergunta onde o relógio está, não onde ele deveria estar. */
export function clockWarp(from: DOMRect, to: DOMRect): { x: number; y: number; s: number } {
  return {
    x: from.left + from.width / 2 - (to.left + to.width / 2),
    y: from.top + from.height / 2 - (to.top + to.height / 2),
    s: to.width ? from.width / to.width : 1,
  };
}
