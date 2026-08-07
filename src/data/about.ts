// src/data/about.ts — o TEXTO do About mora aqui, e só aqui.
//
// O index.astro não conhece nenhuma frase desta página: ele percorre TOPICS e
// desenha. Então pra mexer no conteúdo é sempre este arquivo, nunca o markup.
//
//   • trocar texto      → editar a string
//   • novo tópico       → mais um objeto na lista (a ordem da lista é a ordem
//                         na página; o `id` vira a âncora #about-<id>)
//   • tirar um tópico   → apagar (ou comentar) o objeto
//   • foto              → { photo: 'descrição' } já reserva a moldura vazia.
//                         Quando a imagem existir, acrescentar src no MESMO
//                         objeto — a moldura passa a mostrar a foto sem mudar
//                         medida nenhuma, e a descrição vira o alt:
//                           { photo: 'o KeyLab no dia que chegou',
//                             src: '/about/keylab.jpg' }
//                         O arquivo vai em public/about/ (public/ é a raiz do
//                         site: public/about/x.jpg → /about/x.jpg).
//   • carrossel         → { carousel: 'título', items: [...] } desenha a fita 3D
//                         (a mesma superfície do anel da home, aberta — ver
//                         components/carousel/Reel.ts). A ordem de `items` é a
//                         ordem na fita; mexer nela é só reordenar a lista.
//                         As imagens vão em public/images/about/.

/** Um parágrafo. */
type Paragraph = string;

/** Uma foto. Sem `src`, é a moldura vazia com a descrição de rótulo; com
 *  `src`, a mesma descrição vira o alt da imagem. */
type Photo = { photo: string; src?: string };

/** Uma foto da fita 3D. `title` é o que aparece na legenda embaixo (e o que um
 *  leitor de tela anuncia ao trocar de foto); `alt` descreve a imagem. */
export type ReelPhoto = { src: string; title: string; alt: string };

/** A fita 3D: um título pro conjunto e as fotos que correm nela. */
type Carousel = { carousel: string; items: ReelPhoto[] };

export type Block = Paragraph | Photo | Carousel;

export type Topic = {
  /** vira o id da âncora: about-play, about-sound… */
  id: string;
  title: string;
  blocks: Block[];
};

// Os dois testes abaixo existem pro index.astro escolher o que desenhar sem
// precisar saber o formato de cada bloco.
export const isPhoto = (b: Block): b is Photo =>
  typeof b === 'object' && 'photo' in b;

export const isCarousel = (b: Block): b is Carousel =>
  typeof b === 'object' && 'carousel' in b;

/** Os jogos que correm na fita 3D do tópico "Play". */
export const GAMES: ReelPhoto[] = [
  {
    src: '/images/about/zelda_totk.jpg',
    title: 'The Legend of Zelda: Tears of the Kingdom',
    alt: 'Link planando sobre as ilhas celestes de Hyrule',
  },
  {
    src: '/images/about/rdr2.jpg',
    title: 'Red Dead Redemption 2',
    alt: 'Arthur Morgan a cavalo no oeste de Red Dead Redemption 2',
  },
  {
    src: '/images/about/ark.avif',
    title: 'ARK: Survival Evolved',
    alt: 'Dinossauros na ilha de ARK: Survival Evolved',
  },
  {
    src: '/images/about/fh3.jpg',
    title: 'Forza Horizon 3',
    alt: 'Carro em alta velocidade nas estradas de Forza Horizon 3',
  },
  {
    src: '/images/about/lis.webp',
    title: 'Life is Strange',
    alt: 'Max e Chloe em Arcadia Bay, de Life is Strange',
  },
  {
    src: '/images/about/pkm_alpha_saphire.jpg',
    title: 'Pokémon Alpha Sapphire',
    alt: 'Arte de Pokémon Alpha Sapphire',
  },
];

/** Abertura da página: fica no cabeçalho, acima do primeiro tópico. */
export const LEAD =
  'I like things that take time to get right: a chord progression, a boss pattern, ' +
  'a single 16x16 tile. I have, notably, never applied this patience to anything ' +
  'involving a deadline (except for professional reasons, obviously).';

export const TOPICS: Topic[] = [
  {
    id: 'why',
    title: 'Why',
    blocks: [
      'Answer a question with just “because” and watch my eyes twitch. I don’t need the answer, I need the why.',
    ],
  },

  {
    id: 'play',
    title: 'Play',
    blocks: [
      'I really love video games. I’ve been playing since I was seven, with my very first console, the awesome Nintendo Wii. I like a lot of different genres from indies, AAA, online. Here are my favorites:',
      { carousel: 'Favorite games', items: GAMES },
      'Dark Souls, Monster Hunter, Zelda, Forza Horizon, ARK, Hades: if it hands me a corridor and calls it a game, it’s not my type.',
      'Zelda taught me the obstacle usually isn’t the obstacle, it’s the angle. Turn it enough times and “ugh, I have to go to college” becomes “wait, I get to go to the place I used to dream about.”',
      { photo: 'games' },
    ],
  },

  {
    id: 'sound',
    title: 'Sound',
    blocks: [
      'Music’s been part of my life a lot longer than I’ve had the tools for it. As a kid, lessons were never really in the cards, so I just listened, over and over and over… and waited. My first paycheck from the internship went straight to an Arturia KeyLab, closing out a plan that had been open for about fifteen years.',
      'These days I chase atmospheres somewhere between C418 and EDEN, though “finished song” is still more of an aspiration than something real. The muse and I have a standing meeting; attendance is inconsistent on both sides. But long before I ever touched a key, I was a listener first, and I still am one: lyrics (or meaning) before melody, always — except if it has no singer.',
      { photo: 'música' },
    ],
  },

  {
    id: 'art',
    title: 'Art',
    blocks: [
      'I care about design in pretty much everything: this portfolio, the terminal glow on Grimoire, the small choices most people don’t consciously notice but would definitely notice the absence of. Notable exception: my YouTube thumbnails (don’t ask me why, I don’t know either).',
      { photo: 'arte' },
    ],
  },

  {
    id: 'nature',
    title: 'Nature',
    blocks: [
      'Give me a trail, a tent, and a few good friends and I’m happy for days. I’d love to study biology properly one day. For now I just try to learn what I can about it on the side.',
      { photo: 'natureza' },
    ],
  },

  {
    id: 'bonsai',
    title: 'Bonsai',
    blocks: [
      'One year into growing a gardenia bonsai, which mostly means losing a slow, wordless argument about who’s actually in charge. It doesn’t respond to enthusiasm or deadlines. I suspect it’s teaching me something. I just don’t know what yet.',
    ],
  },

  {
    id: 'collect',
    title: 'Collect',
    blocks: [
      'I collect physical Nintendo media. “Collect” is a strong word: collector’s prices and intern money don’t really get along, so it’s more of a slow, expensive courtship.',
      { photo: 'coleção' },
    ],
  },

  {
    id: 'closing',
    title: 'Closing',
    blocks: [
      // a piada é com o travessão que vem antes dela: ele é o tique de escrita
      // de IA, então a frase se interrompe pra apontar o dedo pro próprio hífen
      'The music, the games, the pixel art — (yes, an em dash. I was here first.) none of it is really the point. Most of what matters happens off the page, with the people I love.',
      '(The gardenia bonsai listens too. It has strong, silent opinions.)',
      'As you can see, I love to talk, but I’ll spare you the rest before this turns into a novel. If you’d like to keep talking, send me a message.',
      'And whatever page of life you’re on right now: I hope it’s a good one. And if it’s not, I hope the next chapter turns the corner soon.',
    ],
  },
];
