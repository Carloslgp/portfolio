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
    alt: 'Princesa Zelda de olhos fechados e mãos unidas junto ao peito, banhada por uma luz verde numa clareira de pedras cobertas de musgo',
  },
  'IMG_0430-limpa.webp': {
    alt: 'Mão enluvada de Link segurando a Master Sword pelo punho, a lâmina verde-azulada atravessando o quadro na diagonal',
  },
  'IMG_0431-limpa.webp': {
    alt: 'A Master Sword cravada no pedestal de pedra no meio da floresta, sob um facho de luz que desce entre as árvores',
  },
  'IMG_0432-limpa.webp': {
    alt: 'Retrato da princesa Zelda sorrindo, segurando um pano branco, com árvores desfocadas ao fundo',
  },
  'IMG_0433-limpa.webp': {
    alt: 'Ilustração em aquarela de cores pastel: uma criatura enorme de olhos amarelos com uma figura pequena de cabelo verde em pé sobre o focinho, cercada por outras criaturas coloridas e por uma escrita inventada',
  },
  'IMG_0434-limpa.webp': {
    alt: 'Tela do Hall da Fama de Pokémon em pixel art: Venusaur, Ninetales, Snorlax, Lapras, Alakazam e Dragonite sob a frase "Welcome to the HALL OF FAME!"',
  },
};
