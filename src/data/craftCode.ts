// src/data/craftCode.ts — o CONTEÚDO da sala de Programação (/craft/programming)
// mora aqui, e só aqui.
//
// A página não conhece nenhuma frase desta lista: ela percorre CODE_PROJECTS e
// desenha. Pra mexer no texto é sempre este arquivo, nunca o markup.
//
// Por que um módulo TS e NÃO uma content collection: o mesmo motivo de
// data/work.ts e data/creations.ts. São doze registros fixos, sem corpo em
// markdown e sem arquivo por entrada — uma collection cobraria um schema, uma
// entrada no config e um carregamento assíncrono pra entregar exatamente esta
// lista. O ganho dela aparece quando o conteúdo é ESCRITO fora do código; aqui
// ele é escrito aqui.
//
//   • trocar texto       → editar a string
//   • projeto novo       → mais um objeto em CODE_PROJECTS (a ORDEM da lista
//                          É a ordem da página, e a numeração "01, 02…" sai
//                          dela — não há campo pro número)
//   • reordenar          → mover o objeto na lista
//   • tirar um projeto   → apagar (ou comentar) o objeto
//   • PÔR A FOTO         → ver o comentário de `photo` na interface abaixo
//
// O que esta página NÃO recebe: emprego, estágio, prêmio. Isso é /work. E
// nada que não seja código — a sala ao lado (/craft/creativity) é que guarda
// o resto.
import type { ImageMetadata } from 'astro';

export interface CodeProject {
  /** chave estável, só letras/números/hífen. Vira a âncora #projeto-NN e, de
   *  quebra, a COR do quadro quando ainda não há foto (ver `markHue` abaixo) */
  id: string;
  /** o nome do projeto, como ele se chama de verdade */
  title: string;
  /** as letras que o quadro mostra enquanto a foto não chega. Duas, quase
   *  sempre — é o tamanho que ainda se lê num quadro pequeno de celular.
   *  É campo, e não dedução das iniciais do título, porque "Python do Zero"
   *  daria "PD" e "Portfolio" daria "P": o dono do projeto sabe escolher
   *  melhor que uma regra. */
  mark: string;
  /** as ferramentas, viram a fileira de chips. Três a quatro: a lista aqui é
   *  pra situar quem lê num relance, não pra ser o package.json */
  stack: string[];
  /** UM parágrafo, 2 a 3 frases. É o teto que ainda se lê sem esforço ao lado
   *  de um quadro — mais que isso e a linha fica mais alta que a imagem, e a
   *  lista perde o ritmo */
  description: string;
  /** o repositório no GitHub */
  repo: string;
  /** opcional: onde o projeto está NO AR, quando está. Só três têm */
  live?: { label: string; href: string };

  /** A FOTO — o lugar já está guardado, o campo é que ainda não existe.
   *
   *  Enquanto este campo faltar, o quadro mostra o monograma (`mark`) num
   *  campo de cor. O quadro já tem o TAMANHO final, então pôr a foto não
   *  move nada de lugar na página: é uma troca de conteúdo dentro de uma
   *  moldura que já está lá.
   *
   *  Pra pôr:
   *    1. o arquivo em src/assets/craft/ (o Astro gera as variantes no build
   *       — NÃO precisa de `npm run images`, isso é só pro public/);
   *    2. o import no topo deste arquivo:
   *         import easyRead from '../assets/craft/easy-read.webp';
   *    3. o campo no objeto:
   *         photo: { src: easyRead, alt: 'o que a foto mostra' }
   *
   *  `alt` nunca vazio: é o que quem usa leitor de tela recebe no lugar da
   *  imagem. `position` é o object-position (padrão 'center'), pro dia em que
   *  o assunto de uma foto não estiver no meio dela. */
  photo?: { src: ImageMetadata; alt: string; position?: string };
}

/** Os textos fixos da sala. Ficam aqui pelo mesmo motivo dos projetos: a
 *  página desenha, este arquivo escreve. */
export const CODE_ROOM = {
  eyebrow: 'Craft · Programming',
  title: { line1: 'Things I’ve', line2: 'built.' },
  lead:
    'Tools, engines and experiments — some made for people to use, some made ' +
    'only to find out how a thing works underneath.',
  /** o rótulo do link de cada repositório */
  repoLabel: 'GitHub',
  /** a marca de link externo, depois do rótulo */
  linkMark: '↗',
} as const;

/** A lista, na ordem em que ela aparece na página.
 *
 *  A ordem é por PESO, não por data: quem lê de cima pra baixo encontra
 *  primeiro o que tem mais o que contar, e os exercícios — que são exercícios
 *  de propósito, e valem por isso — fecham a lista sem disputar atenção com
 *  o que veio antes. */
export const CODE_PROJECTS: CodeProject[] = [
  {
    id: 'leitura-facil',
    title: 'Easy Read',
    mark: 'LF',
    stack: ['React', 'TypeScript', 'Express', 'Claude API'],
    description:
      'Rewrites contracts, medication leaflets and court rulings in plain ' +
      'language, at a reading level you pick — 1st grade to university. More ' +
      'than half of Brazilian adults can’t fully read the paperwork that ' +
      'decides their lives, and that problem is editorial, not cognitive. No ' +
      'sign-up, nothing stored, and it reads the result out loud.',
    repo: 'https://github.com/Carloslgp/EasyRead',
  },
  {
    id: 'portfolio',
    title: 'Portfolio',
    mark: 'PF',
    stack: ['Astro', 'Three.js', 'GSAP', 'Lenis'],
    description:
      'This site. The home is a 3D ring you spin with the scroll, and every ' +
      'face opens a section through a transition that is one image cut apart ' +
      'in one document and put back together in the next. No UI framework, no ' +
      'client router — just the browser doing what it already knows.',
    repo: 'https://github.com/Carloslgp/portfolio',
  },
  {
    id: 'grimoire',
    title: 'Grimoire',
    mark: 'GR',
    stack: ['Node.js', 'Express', 'Supabase'],
    description:
      'Keep track of anything your own way — books, songs, ideas, spells — ' +
      'with no forms, no menus and no drop-downs. You type, the grimoire ' +
      'answers: it boots like an old machine, types back letter by letter, and ' +
      'gets progressively more judgmental the more commands you get wrong.',
    repo: 'https://github.com/Carloslgp/grimoire',
    live: { label: 'Live', href: 'https://grimoire-hcj5.onrender.com/' },
  },
  {
    id: 'meta-no-data',
    title: 'Meta No Data',
    mark: 'MD',
    stack: ['TypeScript', 'Web Workers', 'Vite'],
    description:
      'Converts HEIC photos and strips out location, device and date before ' +
      'you share them. Everything happens in the browser: no upload, no ' +
      'account, no server — the files never leave your device. It started when ' +
      'my own phone handed me photos I couldn’t open anywhere.',
    repo: 'https://github.com/Carloslgp/Meta-No-Data',
  },
  {
    id: 'elder-watch',
    title: 'Elder Watch',
    mark: 'EW',
    stack: ['ESP32', 'MPU6050', 'C++', 'Telegram'],
    description:
      'A device that stays with an elderly person and messages the family on ' +
      'Telegram when something happens. It recognises a fall by its shape — the ' +
      'split second of free fall, then the impact — and doubles as a panic ' +
      'button and a medication reminder. The time between a fall and someone ' +
      'noticing is what separates a scare from something serious.',
    repo: 'https://github.com/Carloslgp/Elder-Watch',
  },
  {
    id: 'ghosty',
    title: 'Ghosty',
    mark: 'GH',
    stack: ['Kotlin', 'Jetpack Compose', 'Android'],
    description:
      'A personal-safety app that looks and works like a real calculator, icon ' +
      'included. A hidden code opens a vault or fires a silent alert with ' +
      'location and recording; a second, duress code opens a convincing decoy ' +
      'vault for anyone forcing you to unlock it. A red panic button already ' +
      'gives away the intent it’s supposed to hide — the disguise is the point.',
    repo: 'https://github.com/Carloslgp/Ghosty-App',
  },
  {
    id: 'lynx-engine',
    title: 'Lynx Engine',
    mark: 'LX',
    stack: ['C++20', 'OpenGL', 'SDL2', 'GLAD'],
    description:
      'A game engine built from nothing to find out what actually happens ' +
      'underneath a game: how a character moves, how an image reaches the ' +
      'screen, how time is controlled. It’s early on purpose — a window, an ' +
      'OpenGL context, a loop that answers the system — because the point here ' +
      'is the walk, not the destination.',
    repo: 'https://github.com/Carloslgp/lynx-engine',
  },
  {
    id: 'studysync',
    title: 'StudySync',
    mark: 'SS',
    stack: ['PHP', 'MySQL', 'JavaScript'],
    description:
      'One place for students to talk, instead of one group per subject ' +
      'scattered across Discord, Telegram and WhatsApp. Colleges post openings, ' +
      'students from the same institution see them, and a forum holds ' +
      'everything else.',
    repo: 'https://github.com/Carloslgp/StudySync',
    live: { label: 'Live', href: 'https://studysync.infinityfreeapp.com' },
  },
  {
    id: 'my-vector',
    title: 'MyVector',
    mark: 'MV',
    stack: ['C++17', 'CMake'],
    description:
      'std::vector rebuilt from scratch, no STL: raw pointers, manual ' +
      'allocation, 2x growth, deep copy, RAII, and a range-for that actually ' +
      'works. Written to understand what the container is doing while you’re ' +
      'not looking.',
    repo: 'https://github.com/Carloslgp/myVector',
  },
  {
    id: 'flood-fill',
    title: 'Flood Fill',
    mark: 'FF',
    stack: ['Java'],
    description:
      'The flood fill algorithm with the Queue and the Stack written by hand. ' +
      'It fills a PNG from a single seed pixel and saves every step as a frame, ' +
      'so you can watch the same image get painted two very different ways ' +
      'depending on which structure is holding the pixels.',
    repo: 'https://github.com/Carloslgp/Flood-Fill',
  },
  {
    id: 'pokemon-game',
    title: 'Pokémon Interactive Game',
    mark: 'PK',
    stack: ['Python', 'Pygame', 'CustomTkinter', 'Pandas'],
    description:
      'A Pokémon battle game with a full graphical interface, built in pairs ' +
      'for an algorithmic reasoning course. Live data from the PokéAPI, ' +
      'animations in Pygame, music all the way through — and a secret hidden ' +
      'somewhere in it.',
    repo: 'https://github.com/Carloslgp/Pokemon-Interactive-Game',
  },
  {
    id: 'python-do-zero',
    title: 'Python do Zero — Roadmap',
    mark: 'PZ',
    stack: ['HTML', 'CSS', 'JavaScript'],
    description:
      'The map for Python do Zero, the complete Python series on my YouTube ' +
      'channel. The whole path on one page, in order, so nobody learning it has ' +
      'to guess what comes next.',
    repo: 'https://github.com/Carloslgp/python-do-zero-roadmap',
    live: { label: 'Live', href: 'https://carloslgp.github.io/python-do-zero-roadmap/' },
  },
  {
    id: 'cli-calculator',
    title: 'cli-calculator',
    mark: 'CC',
    stack: ['C'],
    description:
      'Four operations, four small C programs, installed where the terminal ' +
      'can find them. Type “sum 2 2” anywhere and get 4. Small on purpose: it’s ' +
      'about compiling, installing, and making a program answer from any ' +
      'directory.',
    repo: 'https://github.com/Carloslgp/cli-calculator',
  },
];

/** A cor do quadro de um projeto sem foto.
 *
 *  Presa à POSIÇÃO na lista, e não sorteada: a mesma lista sempre dá as mesmas
 *  cores, então uma captura de tela de hoje continua valendo amanhã. O passo
 *  de 47° é primo em relação a 360 — doze projetos dão doze matizes bem
 *  separados, sem dois vizinhos parecidos, e o 258 de partida põe o primeiro
 *  no azul-violeta em vez do vermelho.
 *
 *  É a mesma conta do HUE da /work (ver o topo de pages/work.astro); mora
 *  aqui, e não lá, porque as duas páginas percorrem listas diferentes e
 *  importar uma da outra amarraria a sala de Craft ao arquivo que desenha a
 *  lista de experiência. */
export function markHue(index: number): number {
  return (index * 47 + 258) % 360;
}
