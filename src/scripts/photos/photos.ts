// src/scripts/photos/photos.ts — a fonte de dados do lado do cliente.
//
// A lista nasce no BUILD (frontmatter de pages/photos.astro): é lá que o glob
// descobre os arquivos e o pipeline do Astro gera thumb + full e mede
// width/height. Aqui só se lê o JSON que a página serializou — o layout nunca
// depende de um onload de imagem no cliente.

export interface Photo {
  /** nome do arquivo — identidade estável da foto */
  id: string;
  /** variante leve (~800px WebP) que o mural desenha */
  thumb: string;
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

export function readPhotos(): Photo[] {
  const el = document.getElementById('photos-data');
  if (!el?.textContent) return [];
  try {
    return JSON.parse(el.textContent) as Photo[];
  } catch {
    return [];
  }
}
