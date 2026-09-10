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
//   • fotos do fundo      → a lista FIELD_PHOTOS logo abaixo (só os imports)
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

// ——— as fotos do canva de fundo ———
// TROCAR à vontade: são fotos do mural que não estão nas criações. A ordem
// não importa (a posição de cada uma é sorteada no build). Quantas cabem, o
// tamanho, a velocidade e as luzes ficam em scripts/creations/config.ts →
// FIELD.
import field01 from '../assets/photos/florence-duomo-marble.webp';
import field02 from '../assets/photos/dinosaur-skeleton.webp';
import field03 from '../assets/photos/primavera-graces.webp';
import field04 from '../assets/photos/mclaren-cobblestones.webp';
import field05 from '../assets/photos/dome-ring-of-lights.webp';
import field06 from '../assets/photos/snow-texture.webp';
import field07 from '../assets/photos/alpine-lake.webp';
import field08 from '../assets/photos/cat-in-doorway.webp';
import field09 from '../assets/photos/michelangelo-david.webp';
import field10 from '../assets/photos/milan-duomo.webp';
import field11 from '../assets/photos/lone-tree-bw.webp';
import field12 from '../assets/photos/waterfall-bw.webp';
import field13 from '../assets/photos/clouds-at-dusk.webp';
import field14 from '../assets/photos/fresco-ceiling.webp';
import field15 from '../assets/photos/sea-sparkle.webp';
import field16 from '../assets/photos/train-window-fields.webp';
import field17 from '../assets/photos/bare-tree-blossoms.webp';
import field18 from '../assets/photos/vertical-forest-tower.webp';
import field19 from '../assets/photos/alpine-valley.webp';
import field20 from '../assets/photos/angel-lute-detail.webp';
import field21 from '../assets/photos/clear-water-stones.webp';
import field22 from '../assets/photos/florence-duomo-alley.webp';
import field23 from '../assets/photos/lake-and-cliff-bw.webp';
import field24 from '../assets/photos/skylight-clouds.webp';
import field25 from '../assets/photos/life-is-strange-triptych.webp';
import field26 from '../assets/photos/minecraft-torchlight.webp';
import field27 from '../assets/photos/rdr2-snow-rider.webp';
import field28 from '../assets/photos/primavera-flora.webp';
import field29 from '../assets/photos/IMG_0430-limpa.webp';
import field30 from '../assets/photos/IMG_0433-limpa.webp';

/** As fotos comuns do canva de fundo. Decorativas: não têm alt nem legenda,
 *  e a versão simples da página não as mostra. O canva tem mais lugares que
 *  fotos (uns 90 no desktop), então a lista REPETE — quanto mais fotos aqui,
 *  menos repetição. A das criações entra no canva por conta própria. */
export const FIELD_PHOTOS: ImageMetadata[] = [
  field01, field02, field03, field04, field05, field06, field07, field08, field09,
  field10, field11, field12, field13, field14, field15, field16, field17, field18,
  field19, field20, field21, field22, field23, field24, field25, field26, field27,
  field28, field29, field30,
];

/** Os efeitos disponíveis. A foto de toda criação já está no canva de fundo
 *  como miniatura; o efeito é COMO ela sobe e se encaixa na moldura (a saída
 *  é o espelho: ela volta ao canva e segue subindo):
 *    grow   — sobe do canva crescendo até a moldura
 *    slide  — vem de um lado da tela (ver `from`)
 *    tilt   — sobe deitada pra trás e se levanta
 *    pieces — se encaixa em tiras verticais, uma depois da outra
 *    iris   — a miniatura é um recorte da foto, que se abre até a foto inteira
 *    flip   — sobe girando ao redor do eixo vertical
 *  Um efeito novo é uma entrada a mais em scripts/creations/effects.ts e um
 *  nome a mais aqui — o tipo Effect sai desta lista. */
export const EFFECT_NAMES = ['grow', 'slide', 'tilt', 'pieces', 'iris', 'flip'] as const;
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
    effect: 'tilt',
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
