// src/data/craftCreative.ts — o CONTEÚDO da sala de Criatividade
// (/craft/creativity) mora aqui, e só aqui.
//
// Mesmo contrato do craftCode.ts ao lado: a página percorre e desenha, este
// arquivo escreve. Pra mexer no texto é sempre aqui, nunca o markup.
//
// O QUE MUDA EM RELAÇÃO À SALA DE CÓDIGO, e por que a forma daqui é outra:
// lá são catorze coisas da mesma natureza, e por isso uma lista numerada com
// a mesma linha repetida catorze vezes é a forma certa. Aqui são três coisas
// de naturezas DIFERENTES, e tratá-las como três itens de uma lista seria
// mentir sobre elas:
//
//   • a pixel art MORA aqui. É a única que a sala mostra de verdade, e o que
//     ela tem a dizer é uma progressão no TEMPO — por isso vira uma faixa
//     datada, do primeiro desenho ao mais recente, e não um item de lista.
//   • o canal e as fotos moram FORA (YouTube, /photos). São portas, não
//     conteúdo, e uma porta que finge ser vitrine só atrasa quem ia clicar.
//   • a Coleção de Criações fecha a página. É a passagem do que cabe num
//     portfólio pro que não cabe.
//
// Ou seja: a sala tem três formas porque tem três naturezas. É de propósito.
import type { ImageMetadata } from 'astro';

import pixelart1 from '../assets/craft/creativity/pixelart_1.webp';
import pixelart2 from '../assets/craft/creativity/pixelart_2.webp';
import pixelart3 from '../assets/craft/creativity/pixelart_3.webp';
import pixelart4 from '../assets/craft/creativity/pixelart_4.webp';
import pixelart5 from '../assets/craft/creativity/pixelart_5.webp';
// As seis que vieram depois do barril. Moram em src/assets/creations/ (onde
// chegaram) e a Coleção de Criações usa os mesmos arquivos. A ordem é do mais
// simples pro mais trabalhado, não a do número do arquivo.
import pixelartSlime from '../assets/creations/pixelart_6.png';
import pixelartWolf from '../assets/creations/pixelart_4.png';
import pixelartMushroom from '../assets/creations/pixelart_1.png';
import pixelartClownfish from '../assets/creations/pixelart_5.png';
import pixelartWhale from '../assets/creations/pixelart_2.png';
import pixelartFox from '../assets/creations/pixelart_3.png';

/** Os textos fixos da sala. Mesmo papel do CODE_ROOM na sala de código. */
export const CREATIVE_ROOM = {
  eyebrow: 'Craft · Creativity',
  title: { line1: 'Made with', line2: 'hands.' },
  lead:
    'The half of Craft that is not code. Pixel art, a YouTube channel and ' +
    'photographs. None of it pays, which is most of the reason I keep doing it.',
} as const;

export interface PixelPiece {
  /** chave estável, vira a âncora e a key da lista */
  id: string;
  src: ImageMetadata;
  /** nunca vazio: quem usa leitor de tela recebe isto no lugar do desenho, e
   *  desenho é justamente onde não há como adivinhar */
  alt: string;
  /** a data como ela aparece na tela.
   *
   *  É string escrita à mão, e não um Date formatado, por um motivo simples:
   *  ela veio do carimbo de tempo do ARQUIVO, que é uma boa pista e não uma
   *  fonte. Um arquivo copiado de outra máquina chega com a data da cópia.
   *  Deixando a string aqui, corrigir uma data errada é digitar por cima, sem
   *  passar por parser nenhum. */
  date: string;
  /** a máquina lê esta, e é ela que vira o datetime do <time>. Se a de cima
   *  mudar, esta muda junto. */
  datetime: string;
  /** uma ou duas frases sobre o que esta peça ensinou. É o que transforma a
   *  faixa numa progressão em vez de cinco quadrinhos enfileirados. */
  caption: string;
}

/** A faixa da pixel art, do primeiro desenho ao mais recente.
 *
 *  A ORDEM É CRONOLÓGICA e isso não é preferência: a faixa inteira existe pra
 *  mostrar distância percorrida, e distância percorrida só se lê em ordem. A
 *  primeira peça é a primeira de verdade, e é por isso que ela fica — um
 *  portfólio que só mostra o melhor esconde exatamente a parte que interessa
 *  a quem está começando agora. */
export const PIXEL_PIECES: PixelPiece[] = [
  {
    id: 'apple-first',
    src: pixelart1,
    date: '16 April 2026',
    datetime: '2026-04-16',
    alt:
      'A red apple drawn as a rough circle of flat red, with a pale pink ' +
      'patch where the highlight should be and a dark wedge along the bottom.',
    caption:
      'The first one. A red circle with a pale patch where I guessed the ' +
      'light should sit.',
  },
  {
    id: 'apple-next-day',
    src: pixelart2,
    date: '17 April 2026',
    datetime: '2026-04-17',
    alt:
      'The same apple redrawn: a dark outline, a green leaf and stem, ' +
      'shading stepped down the right side, on a chequered grey background.',
    caption:
      'The same apple, one day later, once I understood what an outline and ' +
      'a cast shadow are actually for.',
  },
  {
    id: 'light-study',
    src: pixelart3,
    date: '2 May 2026',
    datetime: '2026-05-02',
    alt:
      'An orange sphere beside a blue cylinder, each with a smooth ramp from ' +
      'lit to shaded and a soft shadow pooled on the ground.',
    caption:
      'A sphere and a cylinder. Nothing to look at, everything to learn: ' +
      'where light lands, where it leaves, where it comes back.',
  },
  {
    id: 'stone-tile',
    src: pixelart4,
    date: '12 May 2026',
    datetime: '2026-05-12',
    alt:
      'A grey cobblestone tile, stones of several shapes packed together ' +
      'with thin green growth in the gaps between them.',
    caption:
      'A stone tile that repeats without a seam. All of the work is in ' +
      'hiding the edges.',
  },
  {
    id: 'barrel',
    src: pixelart5,
    // 9 de julho, e NÃO a data do arquivo. O print foi tirado em setembro, o
    // desenho é de julho — é exatamente o caso que o comentário de `date` lá
    // em cima descreve: carimbo de tempo é pista, não fonte.
    date: '9 July 2026',
    datetime: '2026-07-09',
    alt:
      'A wooden barrel seen head on, reddish staves bound by grey metal ' +
      'bands, lit from the upper left.',
    caption:
      'A barrel. Wood, metal, rust, and a light source that finally stays ' +
      'where I put it.',
  },
  // Estas seis foram exportadas no mesmo dia, então o carimbo do arquivo não
  // serve nem de pista (ver o comentário de `date`): as datas são
  // aproximadas, e a ordem é a do mais simples pro mais trabalhado.
  {
    id: 'slime',
    src: pixelartSlime,
    date: '21 July 2026',
    datetime: '2026-07-21',
    alt:
      'A green slime with a small face, shaded in three greens with a darker ' +
      'green outline.',
    caption:
      'A slime. The first time the outline took the colour of the thing ' +
      'instead of plain black.',
  },
  {
    id: 'wolf',
    src: pixelartWolf,
    date: '2 August 2026',
    datetime: '2026-08-02',
    alt: 'A grey wolf lying down with its ears up and a pale muzzle, painted in four greys.',
    caption:
      'A wolf lying down. Four greys doing the work of fur, which is fewer ' +
      'than I thought it would take.',
  },
  {
    id: 'mushroom',
    src: pixelartMushroom,
    date: '11 August 2026',
    datetime: '2026-08-11',
    alt: 'A mushroom with a red cap covered in white spots, on a pale grey stem.',
    caption: 'A spotted mushroom. The spots had to bend with the cap, or it read as a sticker.',
  },
  {
    id: 'clownfish',
    src: pixelartClownfish,
    date: '19 August 2026',
    datetime: '2026-08-19',
    alt: 'An orange clownfish with white stripes edged in black.',
    caption: 'A clownfish, small on purpose. At this size every stripe is a decision.',
  },
  {
    id: 'whale',
    src: pixelartWhale,
    date: '28 August 2026',
    datetime: '2026-08-28',
    alt: 'A blue whale blowing a spout of water, with a pale belly and a dark outline.',
    caption:
      'A whale and its spout. Clean edges, and a highlight that finally ' +
      'makes a body look round.',
  },
  {
    id: 'fox',
    src: pixelartFox,
    date: '6 September 2026',
    datetime: '2026-09-06',
    alt: 'An orange fox sitting upright, with a white chest and a white tip on its tail.',
    caption:
      'A fox. The most recent one, and the first where the shading, the fur ' +
      'and the pose all hold together.',
  },
];

/** O texto que abre e o que fecha a faixa. Ficam fora da lista porque falam
 *  DA faixa, não de uma peça. */
export const PIXEL = {
  label: 'Pixel art',
  /** o título da faixa. Fala do que a faixa FAZ — guardar o primeiro desenho
   *  em vez de escondê-lo — e não do assunto dela, que o rótulo acima já deu. */
  heading: 'The first one is still here.',
  intro:
    'I started in April 2026. The first two are the same apple, drawn one ' +
    'day apart, and that pair says more than anything I could write here.',
  /** A nota fecha a faixa, e ela LEVA — tem link próprio, não só uma frase
   *  apontando pro fim da página.
   *
   *  Cheguei a deixar sem link, pra não ter duas portas pro mesmo lugar. Era
   *  o raciocínio errado: as duas portas vão ao mesmo endereço mas atendem a
   *  perguntas diferentes, e quem faz uma não está fazendo a outra. Aqui a
   *  pergunta é "quero ver mais DESSES desenhos", e ela nasce olhando a
   *  faixa; o fechamento responde "quero saber quem é essa pessoa", que só
   *  aparece depois de a página inteira ter passado. Obrigar quem quer a
   *  primeira a rolar até a segunda é cobrar pedágio por uma resposta que já
   *  estava pronta. */
  note:
    'Eleven pieces is a sample, not the set. There is a lot more pixel art ' +
    'than fits on one page, and the first picture here is nowhere near ' +
    'where I am now: I got a great deal better at this, and I am still ' +
    'going. To see the rest of it you have to go to the collection.',
  noteLink: { label: 'See the rest of the pixel art', href: '/colecaocriacoes' },
} as const;

export interface Door {
  id: string;
  /** o rótulo pequeno em caixa alta */
  label: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  /** true abre em aba nova e ganha a marca de link externo. É campo e não
   *  dedução do href começar com "http" porque a regra existe pra ser LIDA
   *  aqui: quem escreve a porta decide onde o clique leva a pessoa. */
  external?: boolean;
}

/** As duas coisas que existem fora desta sala.
 *
 *  Elas não ganham galeria aqui de propósito. Repetir o mural de /photos
 *  dentro do Craft daria duas versões da mesma parede pra manter iguais, e a
 *  de cá seria sempre a pior. Uma porta é honesta: diz o que tem do outro
 *  lado e sai da frente. */
export const DOORS: Door[] = [
  {
    id: 'sudocarlos',
    label: 'YouTube',
    title: '@sudocarlos',
    body:
      'A small channel, and one I make with care. I teach Python and ' +
      'computer architecture, and I talk about what a path through tech ' +
      'looks like from the inside instead of from a job ad. Six videos in, I ' +
      'still write every one of them out before I record.',
    href: 'https://www.youtube.com/@sudocarlos/videos',
    linkLabel: 'Watch the channel',
    external: true,
  },
  {
    id: 'photos',
    label: 'Photography',
    title: 'The mural',
    body:
      'Photographs taken with no plan, mostly of light doing something I had ' +
      'not noticed until it did it. They have a page of their own here, hung ' +
      'as a wall you walk along rather than a grid you scroll past.',
    href: '/photos',
    linkLabel: 'Walk the wall',
  },
];

/** O fechamento: a passagem pra Coleção de Criações.
 *
 *  Fica no FIM e sozinho, sem concorrer com as portas acima, porque é de
 *  outra ordem: as portas levam a mais coisas que eu faço, esta leva a quem
 *  eu sou quando a parte profissional para de falar. Duas naturezas, dois
 *  lugares na página. */
export const CLOSING = {
  kicker: 'Beyond the portfolio',
  title: 'This is the edited half.',
  text:
    'Everything above is the part that behaves itself on a portfolio. The ' +
    'Coleção de Criações is the rest of it: what I make, what I keep, what I ' +
    'love, arranged for nobody in particular. If you want to know who Carlos ' +
    'is once the professional half stops talking, that is the door.',
  link: { label: 'Coleção de Criações', href: '/colecaocriacoes' },
} as const;
