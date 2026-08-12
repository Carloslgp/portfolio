// src/data/photos.ts — metadados OPCIONAIS das fotos do mural (/photos).
//
// A pasta src/assets/photos/ é a fonte da verdade: jogar um arquivo lá e
// buildar já o põe no mural, sem tocar aqui. Este arquivo só existe pra quem
// QUISER dar nome às coisas — a chave é o nome do arquivo, e foto sem entrada
// funciona normalmente (o alt sai do nome do arquivo).
//
// Campos, todos opcionais:
//   title — aparece no lightbox
//   place / year — a legenda fina embaixo do título
//   alt — descrição pra leitores de tela (sem ela, vale title; sem os dois,
//         o nome do arquivo limpo)

export interface PhotoMeta {
  title?: string;
  place?: string;
  year?: number;
  alt?: string;
}

export const PHOTO_META: Record<string, PhotoMeta> = {
  // A foto da emenda com a home (ver data/gallery.ts): é a mesma do segmento
  // "Photos" do anel. Só o alt — título, lugar e ano são seus pra preencher.
  'anjo.jpg': { alt: 'Pintura de um anjo de cabelos ruivos tocando alaúde' },
  // 'IMG_0053.jpeg': { title: 'Fim de tarde', place: 'Curitiba', year: 2025 },
};
