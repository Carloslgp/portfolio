// src/scripts/photos/photos.ts — a fonte de dados do lado do cliente.
//
// A lista nasce no BUILD (frontmatter de pages/photos.astro): é lá que o glob
// descobre os arquivos e o pipeline do Astro gera thumb + full e mede
// width/height. Aqui só se lê o JSON que a página serializou — o layout nunca
// depende de um onload de imagem no cliente.
//
// A única decisão tomada aqui é qual das duas variantes de thumb esta tela
// merece (ver pickThumb): é o primeiro ponto do cliente que conhece a tela, e o
// último antes de todo o resto passar a tratar `thumb` como uma coisa só.

import { sourcePixelsFor } from './resolution';

export interface Photo {
  /** nome do arquivo — identidade estável da foto */
  id: string;
  /** a variante que o mural desenha, JÁ escolhida pra esta tela (ver pickThumb
   *  abaixo). Quem consome — mural, tubo, primeiro quadro do lightbox — lê só
   *  este campo e não precisa saber que existem duas. */
  thumb: string;
  /** as duas candidatas e a largura real de cada uma, como o build as gerou */
  thumbW: number;
  wide: string;
  wideW: number;
  /** variante grande (~2400px WebP) que o lightbox carrega */
  full: string;
  /** dimensões REAIS do arquivo original — a régua do packing */
  w: number;
  h: number;
  alt: string;
  title: string | null;
  place: string | null;
  year: number | null;
}

/**
 * Qual das duas variantes esta tela merece.
 *
 * A conta de quanto o tile pede está em resolution.ts, junto com a do canvas —
 * são a mesma conta. Aqui só se compara com o que cada arquivo tem de fato.
 *
 * A comparação é POR FOTO, e não uma chave por dispositivo: numa mesma tela a
 * foto em pé faz tile estreito e a deitada faz tile largo, então quem estica é
 * só a segunda. Trocar as duas junto faria o telefone baixar o dobro pra
 * consertar metade.
 *
 * Vale pra sessão: girar o aparelho depois de carregado não rebaixa nem promove
 * ninguém. Trocar aqui significaria descartar e rebaixar texturas já
 * decodificadas no meio do uso, e o que se ganharia é o que a página já era
 * antes desta mudança — não vale o solavanco.
 */
function pickThumb(photo: Photo): string {
  if (photo.wide === photo.thumb) return photo.thumb;
  const asked = sourcePixelsFor(photo.w / photo.h);
  return asked > photo.thumbW ? photo.wide : photo.thumb;
}

export function readPhotos(): Photo[] {
  const el = document.getElementById('photos-data');
  if (!el?.textContent) return [];
  try {
    const photos = JSON.parse(el.textContent) as Photo[];
    for (const photo of photos) photo.thumb = pickThumb(photo);
    return photos;
  } catch {
    return [];
  }
}
