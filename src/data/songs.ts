// src/data/songs.ts — o Top 5 da vida. O conteúdo mora aqui, e só aqui.
//
// O componente (components/about/Songs.astro) percorre esta lista e desenha:
// nem o markup nem o script conhecem uma frase deste arquivo. Então:
//
//   • trocar texto        → editar a string
//   • trocar a ordem      → reordenar a lista (a ordem daqui é a ordem no
//                           carrossel, e o primeiro item é o que nasce de frente)
//   • trocar as capas     → hoje as cinco apontam pro MESMO arquivo. Quando as
//                           capas de verdade existirem, é só mudar `cover` em
//                           cada objeto — mais nada muda de lugar, porque o
//                           card é quadrado e a medida vem do CSS, não da
//                           imagem. As capas vão em public/images/about_albuns_photos/
//                           (public/ é a raiz do site: public/images/x.jpg →
//                           /images/x.jpg).
//
// Uma música fora dos cinco: apagar o objeto. Uma a mais: acrescentar. O
// contador da legenda e as pontas do carrossel saem do tamanho da lista.

/** A capa provisória das cinco. Um lugar só pra trocar enquanto elas são iguais. */
const PLACEHOLDER_COVER = '/images/about_albuns_photos/vertigo.jpg';

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
  /** o texto sobre a música, um parágrafo por item */
  note: string[];
};

// ——— PLACEHOLDER ———
// Título, artista, álbum, ano e texto são de mentira, e distintos entre si só
// pra dar pra ver que cada card abre um modal diferente. Reescrever à vontade:
// nada no código depende do que está escrito abaixo.
export const SONGS: Song[] = [
  {
    id: 'one',
    title: 'Song One',
    artist: 'Artist One',
    album: 'Album One',
    year: 2009,
    cover: PLACEHOLDER_COVER,
    alt: 'Capa do álbum de Song One',
    line: 'Placeholder for the line I still hear before the song starts.',
    note: [
      'Placeholder: this is the one that got here first. I was too young to understand a single word of it, and that never mattered — it was the shape of the thing, not the meaning.',
      'Placeholder: I still put it on when I need to remember what listening felt like before I knew anything about chords, mixing, or why a snare sits where it sits.',
    ],
  },
  {
    id: 'two',
    title: 'Song Two',
    artist: 'Artist Two',
    album: 'Album Two',
    year: 2013,
    cover: PLACEHOLDER_COVER,
    alt: 'Capa do álbum de Song Two',
    line: 'Placeholder for the line that always lands on the second listen.',
    note: [
      'Placeholder: the one tied to a specific room, a specific hour, a specific set of headphones. Songs do that — they hold a place hostage and never give it back.',
      'Placeholder: musically it is barely doing anything, which is exactly the trick. Every time I try to figure out why it works, I find one more thing that was left out on purpose.',
    ],
  },
  {
    id: 'three',
    title: 'Song Three',
    artist: 'Artist Three',
    album: 'Album Three',
    year: 2016,
    cover: PLACEHOLDER_COVER,
    alt: 'Capa do álbum de Song Three',
    line: 'Placeholder for the line I would put on a wall.',
    note: [
      'Placeholder: this is the one that made me want to make something instead of just listening to it. Not to copy it — to answer it.',
      'Placeholder: it is also the reason I spent an entire month convinced I could learn to sing. I could not, and the recordings are gone. Do not ask.',
    ],
  },
  {
    id: 'four',
    title: 'Song Four',
    artist: 'Artist Four',
    album: 'Album Four',
    year: 2019,
    cover: PLACEHOLDER_COVER,
    alt: 'Capa do álbum de Song Four',
    line: 'Placeholder for the line that only works at 2am.',
    note: [
      'Placeholder: the atmosphere one. No lyrics worth quoting, no chorus to wait for, just a room slowly filling with something.',
      'Placeholder: it is the closest thing to what I keep failing to write myself, which is probably why it stays on the list.',
    ],
  },
  {
    id: 'five',
    title: 'Song Five',
    artist: 'Artist Five',
    album: 'Album Five',
    year: 2022,
    cover: PLACEHOLDER_COVER,
    alt: 'Capa do álbum de Song Five',
    line: 'Placeholder for the line that ends the list.',
    note: [
      'Placeholder: the newest one here, and the one most likely to be replaced — which is the whole point of keeping a list of five instead of a list of fifty.',
      'Placeholder: for now it earns the slot every single week, and that is the only rule this list has.',
    ],
  },
];
