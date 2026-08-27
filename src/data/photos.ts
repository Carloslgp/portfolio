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
  'anjo.jpg': { alt: 'Painting of a red-haired angel playing a lute' },
  // 'IMG_0053.jpeg': { title: 'Fim de tarde', place: 'Curitiba', year: 2025 },

  // ——— capturas de tela ———
  // Sem título nem `place` POR ENQUANTO: com só algumas fotos nomeadas, o
  // mural ficava metade com legenda e metade sem, e a inconsistência aparecia
  // mais que a informação. O `alt` fica: ele não é legenda, é o que o leitor
  // de tela lê, e não tem versão "vazia" aceitável.
  //
  // O que estava escrito aqui, pra quando o mural inteiro tiver nome:
  //   IMG_0429..0432 → 'Mãos postas' / 'A Master Sword' /
  //                    'A espada no pedestal' / 'Zelda'  — Zelda: Breath of the Wild
  //   IMG_0433       → 'Aquarela'    — Pokémon Legends: Z-A
  //   IMG_0434       → 'Hall of Fame' — Pokémon FireRed
  'IMG_0429-limpa.webp': {
    alt: 'Princess Zelda with her eyes closed and hands clasped to her chest, bathed in green light in a clearing of moss-covered stones',
  },
  'IMG_0430-limpa.webp': {
    alt: 'Link’s gloved hand holding the Master Sword by its hilt, its blue-green blade crossing the frame diagonally',
  },
  'IMG_0431-limpa.webp': {
    alt: 'The Master Sword embedded in a stone pedestal in the forest beneath a beam of light filtering through the trees',
  },
  'IMG_0432-limpa.webp': {
    alt: 'Portrait of Princess Zelda smiling and holding a white cloth, with blurred trees in the background',
  },
  'IMG_0433-limpa.webp': {
    alt: 'Pastel watercolor illustration of a huge yellow-eyed creature with a small green-haired figure standing on its snout, surrounded by colorful creatures and invented writing',
  },
  'IMG_0434-limpa.webp': {
    alt: 'Pixel-art Pokémon Hall of Fame screen showing Venusaur, Ninetales, Snorlax, Lapras, Alakazam, and Dragonite beneath the words "Welcome to the HALL OF FAME!"',
  },
};
