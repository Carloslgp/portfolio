// src/data/simple.ts — o que a versão simples (/simple) precisa e que não dá
// pra importar do site completo.
//
// A versão simples lê os MESMOS arquivos de dados do site completo — about.ts,
// songs.ts, work.ts, now.ts, craftCode.ts, craftCreative.ts, creations.ts e
// photos.ts. Mexeu no texto de lá, as duas versões mudam juntas, e nada aqui
// precisa ser tocado.
//
// O que mora neste arquivo é o resto: as frases que o site completo escreve
// direto no markup de uma página ou de um componente (o "is a developer from
// Brazil" do index.astro, o título e a abertura da work.astro, as portas da
// craft.astro, os perfis do SocialLinks.astro, os retratos do Portrait.astro…).
// Elas não são exportadas de lugar nenhum, e exportá-las seria mexer nas
// páginas do site completo.
//
// Então são CÓPIAS, e cada bloco diz de onde veio: mudou a frase lá, muda aqui.
// Os `href` ficam escritos como no site completo; quem os traduz pro endereço
// da versão simples é o `simpleHref`, logo abaixo.

// ——— os endereços ———

/** Cada página do site completo e a sua versão simples. É a única tabela de
 *  endereços desta versão: os links do conteúdo passam por `simpleHref`, e o
 *  "Full version" do topo, por `fullHref`. Página simples nova é uma linha
 *  aqui. */
const ROUTES = [
  { full: '/', simple: '/simple' },
  { full: '/work', simple: '/simple/work' },
  { full: '/craft', simple: '/simple/craft' },
  { full: '/craft/programming', simple: '/simple/craft/programming' },
  { full: '/craft/creativity', simple: '/simple/craft/creativity' },
  { full: '/photos', simple: '/simple/photos' },
  { full: '/now', simple: '/simple/now' },
  { full: '/colecaocriacoes', simple: '/simple/colecaocriacoes' },
] as const;

/** Um link escrito pro site completo, apontado pra versão simples. O About de
 *  lá é a home aberta (/#about); aqui ele é a própria home. Link de fora
 *  (GitHub, YouTube, mailto) passa intacto. */
export function simpleHref(href: string): string {
  if (href === '/#about') return '/simple';
  return ROUTES.find((route) => route.full === href)?.simple ?? href;
}

/** O caminho de volta: desta página simples pro mesmo lugar no site completo. */
export function fullHref(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  return ROUTES.find((route) => route.simple === path)?.full ?? '/';
}

/** A navegação do topo, na ordem das seções do anel da home — com o About na
 *  frente, porque aqui ele é a home. A Coleção de Criações fica de fora de
 *  propósito: no site completo ela não é linkada em lugar nenhum. */
export const SIMPLE_NAV = [
  { label: 'About', href: '/simple' },
  { label: 'Work', href: '/simple/work' },
  { label: 'Craft', href: '/simple/craft' },
  { label: 'Photos', href: '/simple/photos' },
  { label: 'Now', href: '/simple/now' },
] as const;

// ——— o contato ———

/** Cópia do index.astro (o "Let’s talk" do fim do About) e do
 *  components/SocialLinks.astro (os dois perfis). */
export const CONTACT = {
  email: 'carloslgp3585@gmail.com',
  profiles: [
    { name: 'GitHub', href: 'https://github.com/Carloslgp' },
    { name: 'LinkedIn', href: 'https://www.linkedin.com/in/carlos-leonardo-garcia-pscheidt/' },
  ],
} as const;

// ——— as páginas ———

/** Cópia do index.astro: a linha do topo da home e o rótulo da moldura sem
 *  foto; e do components/about/Songs.astro, o nome do botão do player. */
export const HOME = {
  name: 'Carlos Leonardo',
  intro: 'is a developer from Brazil.',
  photoSlot: 'Photo —',
  playOnYouTube: (title: string) => `Play ${title} on YouTube`,
} as const;

/** Cópia do components/about/Portrait.astro: os cinco retratos que o About
 *  espalha em volta dos tópicos. Só o que a versão simples usa deles — o
 *  `position` é o enquadramento de cada um na moldura 4/5. */
export const PORTRAITS = [
  {
    src: '/images/about/Me/Me1.webp',
    alt: 'Mirror self-portrait of Carlos Leonardo wearing a light jacket',
    width: 563,
    height: 1000,
    position: '50% 34%',
  },
  {
    src: '/images/about/Me/Me2.webp',
    alt: 'Mirror self-portrait of Carlos Leonardo wearing a light suit',
    width: 630,
    height: 1000,
    position: '50% 44%',
  },
  {
    src: '/images/about/Me/Me3.webp',
    alt: 'Black-and-white mirror self-portrait of Carlos Leonardo in sunglasses',
    width: 906,
    height: 1000,
    position: '50% 50%',
  },
  {
    src: '/images/about/Me/Me4.webp',
    alt: 'Mirror self-portrait of Carlos Leonardo smiling',
    width: 563,
    height: 1000,
    position: '50% 58%',
  },
  {
    src: '/images/about/Me/Me5.webp',
    alt: 'Carlos Leonardo in front of a waterfall surrounded by forest',
    width: 1000,
    height: 1000,
    position: '50% 50%',
  },
] as const;

/** O rótulo das ferramentas. A /work o escreve (work.astro); a sala de
 *  programação mostra as mesmas fileiras sem rótulo, e numa página simples uma
 *  fileira de palavras soltas não diz o que é — então as duas usam este. */
const STACK_LABEL = 'Tools & technologies';

/** Cópia do work.astro. */
export const WORK_PAGE = {
  eyebrow: 'Work',
  title: 'Experience',
  description: "Carlos Leonardo's professional experience, projects and recognition.",
  lead: 'A concise view of the roles, projects and communities I’ve helped build.',
  entryType: { role: 'Experience', build: 'Project', recognition: 'Recognition' },
  present: 'Present',
  photosFrom: 'Photos from',
  impact: 'What I did',
  stack: STACK_LABEL,
  visit: 'Visit',
  craftNote: 'Personal experiments and things made for the joy of making live on',
  // lá o rótulo é o próprio endereço ("/craft"), que aqui levaria pra fora
  // da versão simples
  craftLink: { label: 'Craft', href: '/craft' },
} as const;

/** Cópia do now.astro. */
export const NOW_PAGE = {
  eyebrow: 'Now',
  title: 'Now, and next',
  description: 'What Carlos Leonardo is working on, building and learning right now.',
  since: 'Since',
  by: 'By',
  inspiredIn: 'Inspired in',
  doors: [
    { label: 'the record', href: '/work' },
    { label: 'the person', href: '/#about' },
  ],
  updated: 'Last updated',
  clockIsLive: 'The clock above it is live.',
} as const;

/** Cópia do craft.astro. */
export const CRAFT_PAGE = {
  eyebrow: 'Craft',
  title: { line1: 'Made by', line2: 'curiosity.' },
  lead: 'Personal experiments and things made for the joy of making.',
  description: 'Personal experiments and things made for the joy of making.',
  doors: [
    {
      name: 'Programming',
      note: 'Tools, engines and experiments, built in code.',
      href: '/craft/programming',
    },
    {
      name: 'Creativity',
      note: 'Everything made away from a keyboard.',
      href: '/craft/creativity',
    },
  ],
  footNote: 'And there is more of the site beyond these two.',
  footLinks: [
    { label: 'Work', href: '/work' },
    { label: 'Photos', href: '/photos' },
    { label: 'About', href: '/#about' },
  ],
} as const;

/** Cópia do craft/programming.astro. */
export const PROGRAMMING_PAGE = {
  title: 'Programming',
  description:
    'Tools, engines and experiments built in code. Some for people to use, some to find out how a thing works.',
  moreOn: "There's a lot more on my",
  github: { label: 'GitHub', href: 'https://github.com/Carloslgp' },
  aiNote: 'AI helped write some parts of this one.',
  stack: STACK_LABEL,
  footNote: 'The other half of Craft is next door.',
  footLinks: [
    { label: 'Creativity', href: '/craft/creativity' },
    { label: 'Craft', href: '/craft' },
    { label: 'Work', href: '/work' },
  ],
} as const;

/** Cópia do craft/creativity.astro. */
export const CREATIVITY_PAGE = {
  title: 'Creativity',
  description: 'The half of Craft that is not code: pixel art, a YouTube channel and photographs.',
  firstOne: 'the first one',
  elsewhere: 'Things that live elsewhere',
  footNote: 'The other half of Craft is next door.',
  footLinks: [
    { label: 'Programming', href: '/craft/programming' },
    { label: 'Craft', href: '/craft' },
    { label: 'Photos', href: '/photos' },
  ],
} as const;

/** Cópia do photos.astro. */
export const PHOTOS_PAGE = {
  title: 'Photos',
  noticeTitle: 'About the photos',
  notice: 'Every photo on this site either features me or was taken by me.',
} as const;

/** Cópia do colecaocriacoes.astro. */
export const COLLECTION_PAGE = {
  title: 'Coleção de Criações',
  closingNav: 'Voltar pro resto do site',
} as const;
