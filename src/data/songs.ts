// src/data/songs.ts — as músicas da vida. O conteúdo mora aqui, e só aqui.
//
// O componente (components/about/Songs.astro) percorre esta lista e desenha:
// nem o markup nem o script conhecem uma frase deste arquivo. Então:
//
//   • trocar texto        → editar a string
//   • trocar a ordem      → reordenar a lista (a ordem daqui é a ordem no
//                           carrossel, e o primeiro item é o que nasce de frente)
//   • trocar as capas     → mudar `cover` no objeto. O card é quadrado e a
//                           medida vem do CSS, não da imagem, então qualquer
//                           arquivo entra sem mexer em mais nada. As capas vão
//                           em public/images/about_albuns_photos/ (public/ é a
//                           raiz do site: public/images/x.jpg → /images/x.jpg).
//   • o verso de cada uma → `line` é OPCIONAL: quando existe, sai em itálico no
//                           alto do modal; quando não, o modal começa direto no
//                           texto. Hoje nenhuma tem — é só acrescentar a linha.
//   • tocar a música     → `youtube` é o id do vídeo: o `v=` da URL
//                           (youtube.com/watch?v=fP8ElyrwtEc → 'fP8ElyrwtEc').
//                           O player abre dentro do modal e toca a faixa
//                           INTEIRA, com barra de posição — é o player do
//                           YouTube, não um nosso.
//
//                           DUAS ARMADILHAS ao escolher o vídeo:
//                           1. nem todo vídeo aceita ser embutido. O dono pode
//                              proibir, e aí o player mostra erro 150 em vez da
//                              música. Não dá pra saber pelo link — só rodando.
//                           2. reupload de fã, versão ao vivo e vídeo com
//                              introdução falada são fáceis de pegar por
//                              engano na busca.
//                           Por isso: preferir o canal do próprio artista (ou
//                           o "<Artista> - Topic", que é da gravadora) e
//                           conferir se a duração bate com a do disco.
//                           Música sem `youtube` abre o modal normalmente, só
//                           sem player.
//
// Uma música fora: apagar o objeto. Uma a mais: acrescentar. O contador da
// legenda e as pontas do carrossel saem do tamanho da lista.

export type Song = {
  /** vira o id do modal: song-<id>. Só letras, números e hífen. */
  id: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  /** caminho da capa a partir da raiz do site */
  cover: string;
  /** descreve a capa (é o alt da imagem) */
  alt: string;
  /** o verso que fica na boca — sai em itálico no alto do modal. Opcional. */
  line?: string;
  /** o id do vídeo no YouTube (o `v=` da URL). O player entra no modal e toca
   *  a faixa inteira. Opcional: sem ele, o modal é só texto. */
  youtube?: string;
  /** o texto sobre a música, um parágrafo por item */
  note: string[];
};

export const SONGS: Song[] = [
  {
    id: 'rock-roll',
    title: 'rock + roll',
    artist: 'EDEN',
    album: 'i think you think too much of me',
    year: 2016,
    // o canal do próprio EDEN. É o vídeo oficial, e não um "official audio":
    // ele tem 5:13 contra os 4:56 do disco — a diferença é a abertura falada
    // (o diálogo de Lost in Translation que a faixa já cita), não outra versão.
    youtube: 'geZ_5Ri7ANg',
    // a MESMA capa de 'circles', de propósito: é o mesmo disco. Duas capas
    // iguais na fila é o preço de não inventar arte que a gravadora não fez —
    // e ficam a duas posições de distância, com 'End Credits' entre elas.
    cover: '/images/about_albuns_photos/1.webp',
    alt: 'Cover of EDEN’s i think you think too much of me: the title typed over and over in grey until the letters break apart',
    // TODO(Carlos): texto seu. Isto é só marcação de lugar — está em PT-BR pra
    // não passar batido num deploy: o resto da página é tudo em inglês.
    note: [
      'DRAFT: the first paragraph about this song.',
      'DRAFT: and the second, if it needs two — the modal accepts as many as necessary.',
    ],
  },
  {
    id: 'end-credits',
    title: 'End Credits',
    artist: 'EDEN',
    album: 'End Credits',
    year: 2015,
    // "EDEN - Topic" é o canal da gravadora, e os 4:00 batem com o do EP — os
    // uploads mais achados desta (MrSuicideSheep, Aminium) são de terceiros.
    youtube: 'Y34BhEOqzRY',
    cover: '/images/about_albuns_photos/4.webp',
    alt: 'Cover of EDEN’s End Credits: an empty small-town street under a pale sky, shot through a faded film border, with EDEN and END CREDITS printed over it',
    // TODO(Carlos): idem — texto seu.
    note: [
      'DRAFT: the first paragraph about this song.',
      'DRAFT: and the second, if it needs two — the modal accepts as many as necessary.',
    ],
  },
  {
    id: 'circles',
    title: 'circles',
    artist: 'EDEN',
    album: 'i think you think too much of me',
    year: 2016,
    youtube: 'fP8ElyrwtEc',
    cover: '/images/about_albuns_photos/1.webp',
    alt: 'Cover of EDEN’s i think you think too much of me: the title typed over and over in grey until the letters break apart',
    note: [
      'The one that opened the door. Before it I listened to music; after it I started listening *to* music — to what was left out, to how much room a producer can leave empty and still fill the whole song.',
      'It is the closest thing I have to a reference point for the atmospheres I keep failing to finish. Every time I sit at the KeyLab with no idea what I am doing, this is the shape my hands go looking for.',
    ],
  },
  {
    id: 'love-not-wrong',
    title: 'love; not wrong (brave)',
    artist: 'EDEN',
    album: 'vertigo',
    year: 2018,
    youtube: 'Zq-TCN3aQqM',
    cover: '/images/about_albuns_photos/2.webp',
    alt: 'Cover of EDEN’s vertigo: a pale blue sky with thin clouds and a small crescent moon',
    note: [
      'Same artist, four years later, and almost nothing in common with the one above — which is the reason both are here. One is the sound; this one is the words.',
      'It barely does anything musically, and that is the trick: it stays quiet long enough for the line to land, and then it does not overplay it. Lyrics before melody, always — this is my case in point.',
    ],
  },
  {
    id: 'obstacles',
    title: 'Obstacles',
    artist: 'Syd Matters',
    album: 'Someday We Will Foresee Obstacles',
    year: 2005,
    youtube: 'jb1SkDjaXk8',
    cover: '/images/about_albuns_photos/3.webp',
    alt: 'Cover of Syd Matters’ Someday We Will Foresee Obstacles: green and teal light with small comet-like streaks',
    note: [
      'This one arrived attached to a place, the way songs do — they take a room hostage and never give it back. I cannot hear it without the room coming with it.',
      'It is also the tidiest argument for the thing I keep saying about Zelda: the obstacle usually is not the obstacle. The title said it in 2005 and I only understood it much later.',
    ],
  },
];
