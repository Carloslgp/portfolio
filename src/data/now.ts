// src/data/now.ts — o CONTEÚDO da página /now mora aqui, e só aqui.
//
// Mesma regra do data/work.ts: o now.astro não conhece nenhuma frase desta
// página. Pra mexer no texto é sempre este arquivo.
//
// O QUE ESTA PÁGINA É: uma página "now" no sentido do nownownow.com — o que é
// verdade sobre mim HOJE, em primeira pessoa e no presente. Não é currículo
// (isso é /work) e não é quem eu sou (isso é o About). É o estado atual.
//
// POR ISSO ELA ENVELHECE, e a página assume isso em vez de disfarçar: o
// UPDATED abaixo é a data em que estas frases foram escritas, e ela aparece no
// rodapé. Uma now page sem data é só uma página desatualizada se fingindo de
// atual.
//
// SÃO DUAS LISTAS, em duas abas, com a mesma mecânica da /work: o que está
// ACONTECENDO (STRANDS) e o que ainda NÃO aconteceu (HORIZONS). A separação é
// tensa de propósito — a segunda lista é a única do site inteira escrita no
// futuro, e misturá-la com a primeira faria a página prometer no mesmo tom em
// que ela relata. Duas telas, e a aba diz em que tempo verbal você está.
//
//   • trocar texto        → editar a string
//   • novo fio            → mais um objeto em STRANDS (a ordem da lista É a
//                           ordem da página; não há ordenação automática aqui,
//                           de propósito — quem sabe o que é mais importante
//                           agora é quem escreve)
//   • virou realidade     → mover o objeto de HORIZONS pra STRANDS, trocando o
//                           `when` por um `since` e o verbo pro presente. É a
//                           manutenção que esta página pede, e ela é uma
//                           mudança de aba, não uma reescrita.
//   • acabou              → apagar o objeto e atualizar o UPDATED
//
// O relógio no alto da página NÃO vem daqui: ele é a hora de verdade, lida do
// navegador (ver scripts/nowNavigation.ts). É a única coisa desta página que
// não precisa de manutenção.

/** Quando estas frases foram escritas pela última vez, 'YYYY-MM'.
 *
 *  É o número mais importante do arquivo. A página inteira fala no presente, e
 *  a única coisa que autoriza um presente escrito é dizer de quando ele é. */
import type { ImageMetadata } from 'astro';

// As imagens das linhas. A maioria não mora numa pasta desta página: ela aponta
// pro MESMO arquivo que a /craft ou a /work já usa. É de propósito — copiar a
// foto do time do Nock (ou as capturas do project_cars) pra cá daria dois
// arquivos iguais pra manter sincronizados, e no dia em que um fosse trocado as
// duas páginas passariam a mostrar coisas diferentes. O Astro gera as variantes
// por opções pedidas, então cada página recorta a mesma fonte sem baixar duas
// vezes o que for igual.
import nockTeam from '../assets/work_photos/professional/nock_1.webp';
import projectCars from '../assets/craft/projectcar_2.webp';
import ghosty from '../assets/craft/ghosty_1.webp';
import bradesco from '../assets/work_photos/professional/bradesco_1.webp';
import buildersClub from '../assets/work_photos/professional/builders_club_1.webp';
import youtube from '../assets/work_photos/professional/youtube_1.webp';
import lynx from '../assets/craft/lynx_engine_1.webp';
import homer from '../assets/now/iliad.webp';
import pokedex from '../assets/now/pokemon-hall-of-fame.webp';

/** Uma imagem de linha, nas duas abas.
 *
 *  Era exceção de UMA linha (a Pokédex), com o argumento de que três delas
 *  virariam padrão e parariam de significar. O que mudou é que a lista deixou
 *  de ser só texto: cada fio aqui é uma coisa que existe e que dá pra VER, e
 *  mostrar o simulador rodando diz num quadro o que o parágrafo gasta três
 *  frases pra descrever. O padrão agora é o ponto — e o que sustenta o ritmo é
 *  a caixa ser a mesma pra todas (ver .strand-figure em pages/now.astro).
 *
 *  A imagem é IMPORTADA, e não um caminho em public/: é o import que traz as
 *  medidas do arquivo, e sem elas a página não tem como reservar a caixa de
 *  imagens que já não têm todas a mesma proporção — a lista inteira pularia
 *  quando cada uma chegasse.
 *
 *  `alt` nunca vazio: a imagem carrega sentido, então ela tem que existir
 *  também pra quem não a vê. */
export interface Figure {
  src: ImageMetadata;
  alt: string;
  caption?: string;
}

export const UPDATED = '2026-09';

/** Onde eu estou. Sai ao lado da hora, no cabeçalho — os dois juntos são a
 *  resposta completa de "agora": um instante e um lugar. */
export const PLACE = 'Curitiba, Brazil';

export const LEAD =
  'The first tab was true the last time I touched this page. The second one has ' +
  'not happened yet. The time above them is not decoration — it is the actual ' +
  'clock in Curitiba, which is where I am while you read this.';

/** As duas abas, na ordem em que a página as desenha.
 *
 *  O rótulo e a nota moram aqui e não no template pelo mesmo motivo de todo o
 *  resto do arquivo: são frases da página.
 *
 *  A nota do "Next" não é mais estado vazio: agora que os HORIZONS existem, ela
 *  ENQUADRA a lista, e o que ela precisa dizer é que aquilo não é cronograma.
 *  Sem essa linha, cinco itens no futuro se leem como prazo assumido — que é
 *  exatamente o que o `when` opcional lá embaixo se recusa a inventar. */
export type PanelId = 'now' | 'next';

export const PANELS: { id: PanelId; label: string; note: string }[] = [
  {
    id: 'now',
    label: 'Now',
    note: 'What has my weeks. The lighter things at the bottom are true too.',
  },
  {
    id: 'next',
    label: 'Next',
    note:
      'Things I owe myself, not a roadmap. None of them carries a date, and ' +
      'that is the honest part.',
  },
];

export interface Strand {
  id: string;
  /** O verbo, em uma palavra. É ele que faz a página ser uma lista de coisas
   *  ACONTECENDO em vez de uma lista de cargos. */
  label: string;
  title: string;
  /** 'YYYY-MM' — desde quando. Sem isto o fio é algo que está acontecendo mas
   *  não começou em lugar nenhum, o que serve pros mais leves lá embaixo. */
  since?: string;
  href?: string;
  body: string;
  /** A coisa, VISTA. Mesmo campo do Horizon — ver o comentário lá embaixo. */
  figure?: Figure;
}

/** Os fios abertos, na ordem em que eu contaria. Sem ordenação automática:
 *  quem sabe o que pesa mais nesta semana é quem escreve, não uma data. */
export const STRANDS: Strand[] = [
  {
    id: 'nock',
    label: 'Building',
    title: 'Nock',
    since: '2026-06',
    href: 'https://usenock.com/',
    body:
      'B2B lead enrichment for the Brazilian market. Right now I’m structuring ' +
      'the database with our CTO, ahead of our first paying customers. Most of ' +
      'my week that isn’t the internship is this.',
    figure: {
      src: nockTeam,
      alt:
        'The four of us on a bench in front of the Hotmilk wall at PUCPR, the ' +
        'innovation hub where Nock is being built.',
    },
  },
  {
    id: 'project-cars',
    label: 'Building',
    title: 'project_cars',
    since: '2026-05',
    href: 'https://github.com/Carloslgp/project-cars',
    body:
      'A Python simulator that puts two 3D cars nose to tail and watches the ' +
      'gap between them open or close under aerodynamic drag. Every face of ' +
      'the uploaded mesh is colored by how much air it fights, and the car ' +
      'behind only gets slipstream relief for the part of it that actually ' +
      'fits inside the leader’s wake. I’m on the PySide6 input screens; the ' +
      'physics comes once the navigation holds.',
    figure: {
      src: projectCars,
      alt:
        'The simulator running: two red cars on a dark road, one well ahead of ' +
        'the other, with elapsed time, both speeds and the gap between them ' +
        'along the bottom edge.',
    },
  },
  {
    id: 'ghosty',
    label: 'Building',
    title: 'Ghosty',
    since: '2026-08',
    href: 'https://github.com/Carloslgp/Ghosty-App',
    body:
      'An Android app in Kotlin that hides in plain sight: it wears the face ' +
      'of an ordinary app — it can imitate several — and keeps an emergency ' +
      'button underneath. The triggers call the police and open a live voice ' +
      'stream to emergency contacts. Only the front end exists so far, which ' +
      'is where I am.',
    figure: {
      src: ghosty,
      alt:
        'Ghosty open in the Android emulator, on the vault screen behind the ' +
        'disguise, with its Kotlin source beside it.',
    },
  },
  {
    id: 'bradesco',
    label: 'Working',
    title: 'Bradesco Seguros',
    since: '2025-11',
    body:
      'Data analyst intern on life insurance and private pension. I build the ' +
      'analytical bases other teams decide from, and I maintain the routine ' +
      'that reaches customers at the moment they’re about to pull their money out.',
    figure: {
      src: bradesco,
      alt:
        'The welcome kit that met me on the first day, laid out on a desk: ' +
        'notebook, bottle and card, all in Bradesco Seguros red.',
    },
  },
  {
    id: 'builders-club',
    label: 'Running',
    title: 'Builders Club, PUCPR',
    since: '2026-04',
    body:
      'PUCPR’s developer community meets every week and about fifteen people ' +
      'show up. I speak on APIs and databases. The talks are the easy part; ' +
      'keeping a room of students building on a schedule is the actual work.',
    figure: {
      src: buildersClub,
      alt:
        'Me at the projector in a PUCPR classroom, pointing at a FastAPI file ' +
        'on screen while walking the room through it.',
    },
  },
  {
    id: 'sudocarlos',
    label: 'Filming',
    title: '@sudocarlos',
    since: '2026-05',
    href: 'https://www.youtube.com/@sudocarlos/videos',
    body:
      'A small YouTube channel I make with care: Python, computer architecture, ' +
      'and what my own path through tech actually looks like. Six videos in, ' +
      'and I still write every one of them out before recording.',
    figure: {
      src: youtube,
      alt:
        'The @sudocarlos channel page, six videos in: two Python course ' +
        'episodes and one on computer architecture.',
    },
  },
];

/** As coisas mais leves, que também são verdade agora. Uma linha cada: elas
 *  existem pra página não terminar em cargo, porque a pessoa não termina em
 *  cargo. Vêm do About, e não são um resumo dele — são o recorte do que está
 *  ATIVO neste momento. */
export interface Aside {
  id: string;
  label: string;
  body: string;
}

export const ASIDES: Aside[] = [
  {
    id: 'bonsai',
    label: 'Growing',
    body:
      'A gardenia bonsai, a year in. I’m still losing the argument about who’s ' +
      'in charge.',
  },
  {
    id: 'sound',
    label: 'Playing',
    body:
      'An Arturia KeyLab, chasing atmospheres somewhere between C418 and EDEN. ' +
      '“Finished song” remains aspirational.',
  },
  {
    id: 'reading',
    label: 'Learning',
    body:
      'The data side of things, mostly by being handed problems slightly larger ' +
      'than what I know. It works.',
  },
];

// ——— a outra aba: o que ainda não aconteceu ———

export interface Horizon {
  id: string;
  /** O verbo, como o do Strand — mas o do Strand descreve, e este COMPROMETE.
   *  "Shipping" numa lista de futuro é uma frase diferente de "Shipping" numa
   *  lista de presente, e é a aba que faz essa diferença, não a palavra. */
  label: string;
  title: string;
  /** 'YYYY-MM' ou 'YYYY' — quando eu espero que isto deixe de estar nesta aba.
   *
   *  Opcional, e a ausência é informação: horizonte sem data é DIREÇÃO, não
   *  plano, e escrever uma data que eu não tenho seria a única mentira possível
   *  numa página que se defende dizendo quando foi escrita. Quem não tem data
   *  simplesmente não mostra linha nenhuma — não há "sem previsão" impresso,
   *  porque isso é ruído com cara de dado. */
  when?: string;
  /** A COISA em si, quando ela já tem endereço: o repositório do que eu vou
   *  terminar. Vira link do título, e por isso não serve pra referência — um
   *  título linkado diz "isto é aquilo". */
  href?: string;
  body: string;
  /** O que me deu a ideia, e que NÃO é meu. Existe separado do `href` por
   *  causa dessa diferença: o jogo que eu quero fazer não é o Pixel Car Racer,
   *  então pendurar o link dele no título seria a página se apropriando de uma
   *  coisa que já existe. Sai numa linha discreta embaixo do corpo, dizendo de
   *  onde veio. */
  ref?: { href: string; label: string };
  /** A coisa, VISTA — ver o comentário do Figure lá em cima.
   *
   *  Aqui ela é mais rara que na outra aba, e não por regra: um horizonte que
   *  ainda não existe não tem o que mostrar. Quem tem imagem nesta lista é
   *  quem já tem código escrito ou um acervo parado em algum lugar. */
  figure?: Figure;
}

/** O que ainda não aconteceu, na ORDEM em que eu contaria — do que já tem
 *  código escrito pro que é só vontade com data de validade. Sem ordenação
 *  automática, e aqui isso pesa mais que nos STRANDS: uma lista de futuro
 *  ordenada por data promete um cronograma, e não existe cronograma nenhum.
 *
 *  Nenhum item tem `when`, e isso é a coisa mais deliberada do bloco. Eu sei o
 *  que quero fazer e não sei quando — escrever mês em cinco linhas dessas seria
 *  inventar o único dado que a página não pode inventar, justamente na aba que
 *  fala no futuro. Quem ganhar prazo de verdade ganha o campo.
 *
 *  Quando um destes acontecer, ele NÃO é reescrito: muda de lista (pra STRANDS,
 *  com `since` no lugar do `when`) e o UPDATED lá em cima muda junto. */
export const HORIZONS: Horizon[] = [
  {
    id: 'lynx',
    label: 'Finishing',
    title: 'Lynx',
    href: 'https://github.com/Carloslgp/lynx-engine',
    body:
      'Lynx is my 2D engine in C++ with SDL2 and OpenGL. It builds and runs, ' +
      'then I stopped. I want to study OpenGL properly and rewrite the renderer ' +
      'knowing what the driver is actually doing, instead of whatever made the ' +
      'triangle appear.',
    figure: {
      src: lynx,
      alt:
        'Everything Lynx does so far: its own window open on a flat green ' +
        'field, with a single sprite sitting in the middle of it.',
    },
  },
  {
    id: 'math',
    label: 'Studying',
    title: 'Math, again',
    body:
      'It was my favorite part of the course and the first thing to fall off ' +
      'when work and side projects fill the week. Linear algebra and calculus ' +
      'show up in everything I build anyway, so I want the foundation solid ' +
      'instead of good enough.',
  },
  {
    id: 'pixel-game',
    label: 'Shipping',
    title: 'My first mobile game',
    ref: {
      href: 'https://apps.apple.com/br/app/pixel-car-racer/id1068808996',
      label: 'Pixel Car Racer',
    },
    body:
      'Pixel Car Racer was the game I played to death as a kid. Buy a car, tear ' +
      'it apart, rebuild it, race it. Development stopped and nothing replaced ' +
      'it, so I want my own take: garage, parts, tuning, drag races, pixel art ' +
      'I make myself. Small scope, actually released.',
  },
  {
    id: 'homer',
    label: 'Reading',
    title: 'The Iliad and the Odyssey',
    body:
      'Both are on my shelf. Neither has been opened. Bought them with real ' +
      'intention and let them sit there, which is somehow worse than never ' +
      'buying them.',
    figure: {
      src: homer,
      alt:
        'The Penguin Classics slipcase and both volumes, Ilíada and Odisseia, ' +
        'lying on a bed in low light, as untouched as the paragraph admits.',
    },
  },
  {
    id: 'pokedex',
    label: 'Moving',
    title: 'My Pokédex, into Pokémon Home',
    body:
      'Bank is shutting down and years of collection are still stuck on the ' +
      '3DS. This one has a deadline and no excuse.',
    figure: {
      src: pokedex,
      alt:
        'Pixel-art Pokémon Hall of Fame screen showing Venusaur, Ninetales, ' +
        'Snorlax, Lapras, Alakazam, and Dragonite beneath the words ' +
        '“Welcome to the HALL OF FAME!”',
      caption: 'Pokémon FireRed. The collection this is about starts here.',
    },
  },
];

/** A última linha da página, e as duas portas que ela abre. Mesmo papel do
 *  CRAFT_NOTE em data/work.ts: o que ficou de fora daqui precisa continuar
 *  tendo endereço. */
export const NOW_NOTE =
  'This page is the short answer. The long one is split in two:';
