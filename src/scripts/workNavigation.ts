// src/scripts/workNavigation.ts — o CONTRATO entre a home e a /work.
//
// As duas páginas desenham o mesmo quadro no instante da troca de documento, e
// isso só funciona se as duas fizerem a mesma conta. Ela mora aqui, e não no
// frontmatter de cada página, pelo mesmo motivo do data/gallery.ts: é um acordo
// entre dois documentos, não detalhe de um deles.
import { SEAM_ASPECT, SEAM_OVERSCAN } from '../data/gallery';
import { viewportSize } from './viewport';

export const WORK_ENTRY_KEY = 'portfolio:work-entry';
export const WORK_RETURN_KEY = 'portfolio:work-return';
export const WORK_HOME_KEY = 'portfolio:work-home';

// ——— o quadro da emenda ———
//
// A pintura do segmento Work atravessa a navegação: ela é o último quadro da
// home e o primeiro da /work. Para os dois serem o MESMO desenho, e não duas
// versões parecidas da mesma imagem, três coisas precisam bater.
//
// 1. A PROPORÇÃO é a da FITA, não a do arquivo. O anel estica a textura inteira
//    sobre o segmento (uv 0..1 num quad de ARC_WIDTH × HEIGHT), então é nessa
//    proporção que a pintura existe na cena — e é nela que o DOM tem que
//    continuar desenhando. É a mesma medida da emenda com /photos, porque é a
//    mesma fita: daí o reaproveitamento em vez de uma constante nova.
//
// 2. O GIRO. Toda textura da fita chega girada -90° (ver Segment.ts: os
//    arquivos estão guardados deitados). A `<img>` do DOM não passa por esse
//    giro, e sem desfazê-lo a mesma pintura aparecia EM PÉ no anel e DEITADA na
//    página — a emenda virava um tombo de 90°, que é o defeito que o /photos já
//    tinha resolvido gravando o giro num arquivo à parte (data/gallery.ts →
//    SEAM_PHOTO). Aqui o giro é feito em CSS, e a diferença é de propósito: a
//    pintura do Work é a MESMA textura que o anel acabou de baixar, então um
//    segundo arquivo custaria ~800 KB por uma imagem idêntica à que já está
//    decodificada na memória.
//
// 3. A SANGRIA. Os dois documentos passam do viewport na mesma medida, senão a
//    borda da imagem cai em pixels diferentes de cada lado da troca.
export const WORK_SEAM = {
  aspect: SEAM_ASPECT,
  overscan: SEAM_OVERSCAN,

  /** O giro que devolve a pintura à orientação da fita, em graus. */
  rotation: 90,

  /** Em que ponto do desprendimento (0 = colada na foto 3D, 1 = quadro da
   *  emenda) o título entra. Tarde de propósito: enquanto a pintura ainda está
   *  se descolando da cena, qualquer texto por cima chama atenção justamente
   *  para o ponto que a transição existe para esconder. */
  titleFrom: 0.42,

  /** Quanto o título está MAIOR quando ainda não chegou. Ele assenta na escala
   *  1 junto com a pintura — é o mesmo gesto da cortina da /work do outro lado
   *  da troca (ver --title-scale em work.astro). */
  titleScale: 0.06,

  /** A VOLTA sem BFCache: a home nasce coberta pela pintura e precisa devolvê-la
   *  ao segmento. Quando o navegador serve a home viva, quem dirige é o
   *  rebobinamento do avanço (ver Carousel.returnFromDeparture) e estes números
   *  não entram — existe um dono só de cada vez. */
  returnDur: 0.9,
  returnEase: 'power3.inOut',
};

/** O quadro da emenda NESTA janela, em px. A mesma conta roda no CSS das duas
 *  páginas (ver --seam-w / --seam-h); aqui ela existe porque o avanço precisa
 *  do número para interpolar a escala quadro a quadro. */
export function workSeamBox(): { w: number; h: number } {
  const viewport = viewportSize();
  const w = Math.max(viewport.width, viewport.height * WORK_SEAM.aspect) * WORK_SEAM.overscan;
  return { w, h: w / WORK_SEAM.aspect };
}
