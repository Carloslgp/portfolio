// src/data/creations.ts — o CONTEÚDO da Coleção de Criações (/colecaocriacoes)
// mora aqui, e só aqui.
//
// A página não conhece nenhuma frase: ela percorre CREATIONS e desenha, e o
// motor (scripts/creations/) só lê o `effect` de cada uma. Pra mexer no que
// aparece é sempre este arquivo, nunca o markup. O guia de "onde vai cada
// coisa", com desenho da tela, está ao lado: src/data/creations.md.
//
// TUDO AQUI É MOCK. Nenhum título, data ou descrição é real — são rótulos do
// TAMANHO do texto que vai entrar, pra ver se o layout aguenta. Trocar o mock
// pelo real é editar as strings; a página se atualiza sozinha.
//
//   • trocar texto        → editar a string
//   • nova criação        → mais um objeto em CREATIONS (a ordem da lista É a
//                           ordem na página; a numeração "01, 02…" sai dela)
//   • reordenar           → mover o objeto na lista. Só uma regra: duas
//                           criações VIZINHAS não podem ter o mesmo `effect`
//                           — o build para e diz quais são.
//   • trocar a animação   → mudar o `effect` (os nomes estão em EFFECT_NAMES
//                           logo abaixo; o editor autocompleta e recusa erro)
//   • trocar a imagem     → importar outro arquivo de src/assets/ no topo e
//                           apontar `image` pra ele. O Astro gera as variantes
//                           no build — NÃO precisa de `npm run images`, isso é
//                           só pro public/.
//   • tirar uma criação   → apagar (ou comentar) o objeto
//
// Velocidade, duração das fases e o ajuste fino de cada efeito NÃO ficam
// aqui: ver src/scripts/creations/config.ts.
import type { ImageMetadata } from 'astro';

// ——— as imagens do mock ———
// TROCAR: são fotos que já estavam no projeto (as mesmas do mural /photos),
// escolhidas só pra ter algo na moldura. Sete são em pé e uma é deitada
// (mock07) de propósito, pra provar que a moldura aguenta os dois formatos.
import mock01 from '../assets/photos/florence-duomo-dome.webp';
import mock02 from '../assets/photos/araucaria-forest.webp';
import mock03 from '../assets/photos/brutalist-facade.webp';
import mock04 from '../assets/photos/metro-escalator.webp';
import mock05 from '../assets/photos/pantheon-oculus.webp';
import mock06 from '../assets/photos/glacier-valley.webp';
import mock07 from '../assets/photos/neon-dance.webp';
import mock08 from '../assets/photos/chapel-ceiling.webp';

/** Os efeitos disponíveis. Cada um é uma animação de entrada E de saída (a
 *  saída é o espelho da entrada):
 *    grow    — cresce do centro; sai encolhendo
 *    slide   — desliza de um lado (ver `from`) e sai pelo outro
 *    curtain — um painel de tinta cobre a tela e sobe revelando; desce na saída
 *    pieces  — a imagem chega em tiras que se encaixam; saem se soltando
 *    iris    — abertura circular a partir do centro; fecha na saída
 *    flip    — entra tombada em 3D pela base e assenta; sai tombando pelo topo
 *  Um efeito novo é uma função a mais em scripts/creations/effects.ts e um
 *  nome a mais aqui — o tipo Effect sai desta lista. */
export const EFFECT_NAMES = ['grow', 'slide', 'curtain', 'pieces', 'iris', 'flip'] as const;
export type Effect = (typeof EFFECT_NAMES)[number];

/** O que a criação é. Vira o rótulo do meio na linha de cima do texto
 *  ("Criação 03 · Projeto · 2024"). */
export type Kind = 'photo' | 'project' | 'repo' | 'other';
export const KIND_LABEL: Record<Kind, string> = {
  photo: 'Fotografia',
  project: 'Projeto',
  repo: 'Repositório',
  other: 'Outra coisa',
};

export interface Creation {
  /** chave estável, só letras/números/hífen: vira a âncora #criacao-NN junto
   *  com a posição, e é o nome que aparece nos erros do build */
  id: string;
  kind: Kind;
  /** 2 a 4 palavras. Sai em Playfair grande; mais que isso vira 3 linhas */
  title: string;
  /** texto livre, mostrado como está: '2024', 'mai 2025', '2019–2021' */
  date: string;
  /** até 3 frases (~260 caracteres). É o teto que ainda cabe num celular em
   *  pé com a tela presa — ver LAYOUT.MIN_STAGE_HEIGHT no config */
  description: string;
  /** import de src/assets/ (ver o topo do arquivo) */
  image: ImageMetadata;
  /** o que a imagem mostra, pra leitor de tela. Nunca vazio */
  alt: string;
  /** opcional: um link embaixo do texto (abre em aba nova) */
  link?: { label: string; href: string };
  effect: Effect;
  /** só pro `slide`: de que lado ele vem. Padrão 'right' */
  from?: 'left' | 'right';
}

/** Textos fixos da interface. */
export const UI = {
  /** o prefixo da numeração na linha de cima: "Criação 03" */
  item: 'Criação',
  /** rótulo do indicador lateral pra leitor de tela */
  nav: 'Posição na coleção',
  /** começo do rótulo de cada traço do indicador: "Ir para a criação 03 de 08: Título" */
  jump: 'Ir para a criação',
  /** a marca de link externo depois do rótulo do link */
  linkMark: '↗',
} as const;

/** A abertura: título da página, que sai de cena quando se começa a rolar.
 *  O título é em duas linhas; a segunda sai em itálico (é a composição que a
 *  página já tinha). */
export const OPENING = {
  kicker: 'Rótulo pequeno da abertura',
  title: { line1: 'Coleção de', line2: 'criações.' },
  lead:
    'Texto de abertura em duas frases, do tamanho do texto real. Lorem ipsum ' +
    'dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.',
  hint: 'Role para começar',
} as const;

/** O fechamento, depois da última criação: um título, uma frase e os links
 *  de volta pro resto do site. O link pra "/" é o único que a página trata
 *  diferente (ver o comentário do rel="noreferrer" no markup). */
export const CLOSING = {
  kicker: 'Rótulo do fechamento',
  title: 'Título do fechamento.',
  text:
    'Texto do fechamento em duas frases. Lorem ipsum dolor sit amet, ' +
    'consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
  links: [
    { label: 'Voltar pro início', href: '/' },
    { label: 'Work', href: '/work' },
    { label: 'Craft', href: '/craft' },
    { label: 'Photos', href: '/photos' },
    { label: 'About', href: '/#about' },
  ],
} as const;

/** As criações, na ordem da página. Oito de mock cobrindo os seis efeitos,
 *  sem repetir efeito em duas vizinhas. */
export const CREATIONS: Creation[] = [
  {
    id: 'mock-01',
    kind: 'photo',
    title: 'Título da criação 01',
    date: '2019',
    description:
      'Descrição da criação 01, em três frases do tamanho do texto real. ' +
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod ' +
      'tempor incididunt ut labore. Ut enim ad minim veniam, quis nostrud ' +
      'exercitation ullamco laboris nisi ut aliquip ex ea commodo.',
    image: mock01, // TROCAR
    alt: 'Imagem mock da criação 01: cúpula vista de baixo',
    link: { label: 'Ver a criação (link mock)', href: 'https://example.com/' },
    effect: 'grow',
  },
  {
    id: 'mock-02',
    kind: 'project',
    title: 'Título da criação 02',
    date: '2020',
    description:
      'Descrição da criação 02, em três frases do tamanho do texto real. ' +
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum ' +
      'dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non ' +
      'proident, sunt in culpa qui officia deserunt mollit anim.',
    image: mock02, // TROCAR
    alt: 'Imagem mock da criação 02: araucárias contra o céu',
    effect: 'slide',
    from: 'right',
  },
  {
    id: 'mock-03',
    kind: 'repo',
    title: 'Título da criação 03',
    date: '2021',
    description:
      'Descrição da criação 03, em três frases do tamanho do texto real. ' +
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem ' +
      'accusantium doloremque laudantium. Totam rem aperiam, eaque ipsa quae ' +
      'ab illo inventore veritatis et quasi architecto beatae vitae.',
    image: mock03, // TROCAR
    alt: 'Imagem mock da criação 03: fachada brutalista',
    link: { label: 'Ver o repositório (link mock)', href: 'https://example.com/' },
    effect: 'curtain',
  },
  {
    id: 'mock-04',
    kind: 'other',
    title: 'Título da criação 04',
    date: '2022',
    description:
      'Descrição da criação 04, em três frases do tamanho do texto real. ' +
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut ' +
      'fugit, sed quia consequuntur magni dolores. Neque porro quisquam est, ' +
      'qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.',
    image: mock04, // TROCAR
    alt: 'Imagem mock da criação 04: escada rolante do metrô',
    effect: 'pieces',
  },
  {
    id: 'mock-05',
    kind: 'photo',
    title: 'Título da criação 05',
    date: '2023',
    description:
      'Descrição da criação 05, em três frases do tamanho do texto real. ' +
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui ' +
      'blanditiis praesentium voluptatum deleniti atque corrupti. Quos dolores ' +
      'et quas molestias excepturi sint occaecati cupiditate non provident.',
    image: mock05, // TROCAR
    alt: 'Imagem mock da criação 05: óculo do Panteão',
    link: { label: 'Ver a foto (link mock)', href: 'https://example.com/' },
    effect: 'iris',
  },
  {
    id: 'mock-06',
    kind: 'project',
    title: 'Título da criação 06',
    date: '2024',
    description:
      'Descrição da criação 06, em três frases do tamanho do texto real. ' +
      'Temporibus autem quibusdam et aut officiis debitis aut rerum ' +
      'necessitatibus saepe eveniet ut et voluptates repudiandae. Itaque earum ' +
      'rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus.',
    image: mock06, // TROCAR
    alt: 'Imagem mock da criação 06: vale glacial',
    effect: 'flip',
  },
  {
    id: 'mock-07',
    kind: 'repo',
    title: 'Título da criação 07',
    date: '2025',
    description:
      'Descrição da criação 07, em três frases do tamanho do texto real. ' +
      'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil ' +
      'impedit quo minus id quod maxime placeat. Facere possimus, omnis ' +
      'voluptas assumenda est, omnis dolor repellendus et molestiae non.',
    image: mock07, // TROCAR — a única deitada do mock
    alt: 'Imagem mock da criação 07: luzes de neon',
    link: { label: 'Ver o repositório (link mock)', href: 'https://example.com/' },
    effect: 'slide',
    from: 'left',
  },
  {
    id: 'mock-08',
    kind: 'project',
    title: 'Título da criação 08',
    date: '2026',
    description:
      'Descrição da criação 08, em três frases do tamanho do texto real. ' +
      'Et harum quidem rerum facilis est et expedita distinctio. Nam libero ' +
      'tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo ' +
      'minus id quod maxime placeat facere possimus, omnis voluptas.',
    image: mock08, // TROCAR
    alt: 'Imagem mock da criação 08: teto de capela',
    effect: 'grow',
  },
];
