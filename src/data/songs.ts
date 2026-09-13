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
    note: [
      'This song makes me want to live my life to the fullest, because it’s not about how long we live, but how much we enjoy it. I want people to remember me as someone who really enjoyed their life. At the same time, I don’t know if I’ll ever “sing like Sinatra”, or, in my case, “think like Turing”. But I want to give it everything I have. I really do.',
      '“And if there is no god, I know the day I die, I lived through heaven / And that I gave it hell / And if it hurt, oh well, at least, that’s living”',
      'In this part I feel like EDEN sums up the whole song. It’s just CINEMA. I don’t even want to have to explain it, but I will: I do everything I can, and when I die, I’ll know I’m proud of every choice I made. If it hurts, that’s part of life anyway.',
      '“So I got ten minutes to be all or nothing to whoever wants to hear”',
      'Sometimes I feel exactly like this. In an interview that really matters for my future, it’s just that: “I have ten minutes to be all or nothing.” And that is a very, very strange feeling.',
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
    note: [
      'To me, this song feels like working or fighting for something as hard as I can, and if it doesn’t work out, that’s ok: for a little while, I was happy. And it has Leah Kelly on it. She is the GOAT, her voice is just awesome.',
      'I feel like this on a lot of days: not knowing the future, but still doing my best. I hate feeling anxious (I think everyone does), but that’s life anyway.',
      '“You could wish away forever, but you’ll never find a thing like today”',
      '“Rather burn out young than grow up fast / And we could be forever future-bound / ’Cause all I need is time”',
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
      'This is the one that opened the door for me. Before it, I just listened to music. After it, I started paying attention to how music is made: what gets left out, and how much empty space a producer can leave and still fill the whole song.',
      'It’s still my reference for the sound I want to make. Every time I sit at my KeyLab with no idea what I’m doing, this is the feeling I’m trying to find.',
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
      'This one feels more vulnerable than the other EDEN songs here, and I think that’s what gets me. It sounds like someone admitting they care, without trying to look cool about it. The title says it all: love is not wrong, and letting yourself feel it is brave.',
      'After all the songs about giving everything and not knowing the future, this is the one that reminds me why I do it: the people I love. It’s the same thing I say at the end of this page, just with a much better voice than mine.',
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
      'This one is tied to Life is Strange for me. I can’t hear it without being back in Arcadia Bay, and that’s not a bad place to be. It’s also the song on my GitHub profile, and the “always listening to” there is not an exaggeration.',
      'It’s also the best argument for something Zelda taught me: the obstacle usually isn’t the obstacle, it’s the angle. The album title said it back in 2005, and I only understood it much later.',
    ],
  },
];
