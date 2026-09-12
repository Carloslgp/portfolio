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
//   • PÔR AS CAPTURAS    → ver o comentário de `photos` na interface abaixo
//
// O que esta página NÃO recebe: emprego, estágio, prêmio. Isso é /work. E
// nada que não seja código — a sala ao lado (/craft/creativity) é que guarda
// o resto.
import type { ImageMetadata } from 'astro';

import nock1 from '../assets/craft/nock_1.webp';
// A foto do time vem de work_photos/, e é a ÚNICA captura desta sala que mora
// fora de assets/craft/. É de propósito: é literalmente a mesma foto que a
// entrada do Nock usa na /work, e copiá-la pra cá daria dois arquivos iguais
// pra manter sincronizados — no dia em que um fosse trocado, as duas páginas
// passariam a mostrar times diferentes. O Astro gera as variantes por opções
// pedidas, então as duas páginas recortam a mesma fonte sem baixar duas vezes
// o que for igual.
import nockTeam from '../assets/work_photos/professional/nock_1.webp';
import easyRead1 from '../assets/craft/easyRead_1.webp';
import easyRead2 from '../assets/craft/easyRead_2.webp';
import portfolio1 from '../assets/craft/portfolio_1.webp';
import grimoire1 from '../assets/craft/grimoire_1.webp';
import grimoire2 from '../assets/craft/grimoire_2.webp';
import metaNoData1 from '../assets/craft/meta_no_data_1.webp';
import metaNoData2 from '../assets/craft/meta_no_data_2.webp';
import elderWatch1 from '../assets/craft/elder_watch_1.webp';
import elderWatch2 from '../assets/craft/elder_watch_2.webp';
import ghosty1 from '../assets/craft/ghosty_1.webp';
import ghosty2 from '../assets/craft/ghosty_2.webp';
import studySync1 from '../assets/craft/studysync_1.webp';
import studySync2 from '../assets/craft/studysync_2.webp';
import studySync3 from '../assets/craft/studysync_3.webp';
import floodFill1 from '../assets/craft/floodfill_1.webp';
import pokemon1 from '../assets/craft/pokemon_interactive_1.webp';
import pokemon2 from '../assets/craft/pokemon_interactive_2.webp';
import pythonDoZero1 from '../assets/craft/python_do_zero_1.webp';
import lynxEngine1 from '../assets/craft/lynx_engine_1.webp';
import myVector1 from '../assets/craft/my_vector_1.webp';
import cliCalculator1 from '../assets/craft/cli_calculator_1.webp';

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
  /** o repositório no GitHub, quando ele é público.
   *
   *  Opcional por causa do que é fechado: o Nock é produto de empresa, e o
   *  código não é meu pra abrir. A saída NÃO podia ser um link de fachada —
   *  um "GitHub ↗" que leva a um 404 (ou, pior, a um repositório que não é o
   *  que a linha descreve) é pior que linha nenhuma. Sem este campo a linha
   *  mostra só o `live`, e quem clica chega no que foi prometido. */
  repo?: string;
  /** opcional: onde o projeto está NO AR, quando está.
   *
   *  É o único link de quem não tem `repo` — e aí ele deixa de ser enfeite e
   *  vira a única porta da linha. */
  live?: { label: string; href: string };

  /** AS CAPTURAS — uma ou duas.
   *
   *  Elas mudam a FORMA da linha, e é de propósito: um projeto com captura
   *  ganha a faixa larga, com a imagem ocupando mais da metade da linha e
   *  trocando de lado a cada projeto; um projeto sem captura fica na linha
   *  compacta, com o monograma (`mark`) num campo de cor. A alternativa era
   *  dar o palco a todos e deixar metade da lista como retângulo vazio do
   *  tamanho de um palco — pior que a mistura.
   *
   *  Pra pôr:
   *    1. o arquivo em src/assets/craft/, em qualquer formato;
   *    2. `npm run images` — ele encolhe a captura pros 1120px que a página
   *       de fato pede, converte pra webp e APAGA a fonte. Pular este passo
   *       não quebra nada (o Astro gera as variantes no build de um jeito ou
   *       de outro), só deixa no repositório uma fonte que ninguém baixa;
   *    3. o import no topo deste arquivo, já apontando pro .webp;
   *    4. o campo no objeto:
   *         photos: [{ src: easyRead1, alt: 'o que a captura mostra' }]
   *
   *  TRÊS é o teto. Era duas, e o motivo estava certo pela razão errada: três
   *  EM FILA dividem o bloco em colunas de 12rem, e captura de tela a 12rem
   *  não se lê mais — vira textura. Só que fila não é o único jeito de pôr
   *  três. A primeira toma o bloco inteiro e as outras duas dividem a fileira
   *  de baixo, com 18,6rem cada — a mesma ordem de grandeza dos 21rem que o
   *  par já pratica. Medido no StudySync, a linha inteira fica em 32,8rem,
   *  contra os 37,1rem que só as duas primeiras ocupavam empilhadas: três
   *  fotos em menos altura que duas.
   *
   *  A QUARTA não tem esse truque — ela volta a pedir fila ou uma segunda
   *  fileira que empurra o texto do projeto pra um canto da linha.
   *
   *  O ARRANJO não se escolhe aqui: ele sai dos arquivos, no build (ver
   *  PAR_DEITADO no topo de pages/craft/programming.astro). Duas capturas
   *  deitadas empilham, quadradas ou em pé ficam lado a lado — um campo
   *  "layout" aqui só daria uma segunda fonte da verdade pra uma coisa que a
   *  própria imagem já sabe.
   *
   *  Com TRÊS, a única coisa que os arquivos não sabem responder é qual delas
   *  leva a largura toda — a mais larga não é a que mais precisa de largura.
   *  Essa resposta sai da ORDEM: a primeira do array lidera. Pra trocar o
   *  cabeça, reordene o array.
   *
   *  `alt` nunca vazio: é o que quem usa leitor de tela recebe no lugar da
   *  imagem, e captura de tela é justamente onde ele não tem como adivinhar.
   *  Não há campo de enquadramento porque não há corte: a imagem entra
   *  inteira, na proporção dela. */
  photos?: { src: ImageMetadata; alt: string }[];
}

/** Os textos fixos da sala. Ficam aqui pelo mesmo motivo dos projetos: a
 *  página desenha, este arquivo escreve. */
export const CODE_ROOM = {
  eyebrow: 'Craft · Programming',
  title: { line1: 'Things I’ve', line2: 'built.' },
  lead:
    'Tools, engines and experiments. Some of them I made for people to use. ' +
    'Some I made just to find out how the thing works underneath.',
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
    // O Nock aparece na /work também, e as duas linhas não são a mesma coisa:
    // lá está o CARGO (Founder & CDO, com o que ele rendeu), aqui está o
    // PRODUTO. É a distinção que o cabeçalho deste arquivo já fazia — "esta
    // página não recebe emprego" continua valendo, e o que entrou não foi o
    // emprego. Por isso a descrição aqui fala do que o produto faz, e não de
    // cargo, incubadora ou prêmio: isso é assunto da outra sala.
    id: 'nock',
    title: 'Nock',
    mark: 'NK',
    stack: ['Next.js', 'Node.js', 'SQL', 'GEO'],
    description:
      'B2B lead enrichment for the Brazilian market: it finds the ' +
      'decision-makers inside a company, enriches the contacts, runs the ' +
      'sequences and drops the opportunities straight into a CRM. I work ' +
      'across the product, and I built the blog to be accessible in a way ' +
      'most marketing sites are not: 99 on Lighthouse, typefaces that are ' +
      'kinder to dyslexic readers, and it works end to end with a screen ' +
      'reader.',
    live: { label: 'Live', href: 'https://usenock.com/' },
    photos: [
      {
        src: nock1,
        alt: 'The Nock home: “Let Nock find your next customer” in large ' +
          'type, over a field where you drop your own domain and the row of ' +
          'tools it delivers into.',
      },
      {
        src: nockTeam,
        alt: 'The four of us at Hotmilk, PUCPR’s innovation ecosystem, in ' +
          'front of the painted wall.',
      },
    ],
  },
  {
    id: 'leitura-facil',
    title: 'Easy Read',
    mark: 'LF',
    stack: ['React', 'TypeScript', 'Express', 'Claude API'],
    description:
      'Rewrites contracts, medication leaflets and court rulings in plain ' +
      'language, at whatever reading level you pick, from 1st grade to ' +
      'university. More than half of Brazilian adults can’t fully read the ' +
      'paperwork that decides their lives. That is a writing problem, not a ' +
      'thinking one. No sign-up, nothing stored, and it reads the result ' +
      'out loud.',
    repo: 'https://github.com/Carloslgp/EasyRead',
    photos: [
      {
        src: easyRead1,
        alt: 'The Easy Read page: an empty box for the original text on the ' +
          'left, the simplified version on the right, and a reading-level ' +
          'scale from very easy to legalese underneath.',
      },
      {
        src: easyRead2,
        alt: 'A dense court notice on the left and its rewrite on the right, ' +
          'broken into short sentences and bullet points under the headings ' +
          '“What you need to do” and “What can happen”.',
      },
    ],
  },
  {
    id: 'portfolio',
    title: 'Portfolio',
    mark: 'PF',
    stack: ['Astro', 'Three.js', 'GSAP', 'Lenis'],
    description:
      'This site. The home is a 3D ring you spin with the scroll, and every ' +
      'face opens a section through a transition that is one image cut apart ' +
      'in one document and put back together in the next. No UI framework ' +
      'and no client router. Just the browser doing what it already knows ' +
      'how to do.',
    repo: 'https://github.com/Carloslgp/portfolio',
    photos: [
      {
        src: portfolio1,
        alt: 'The home of this site: the word PORTFOLIO in large type behind ' +
          'the 3D ring, stopped on the Craft face, reflected on the floor.',
      },
    ],
  },
  {
    id: 'grimoire',
    title: 'Grimoire',
    mark: 'GR',
    stack: ['Node.js', 'Express', 'Supabase'],
    description:
      'Keep track of anything your own way: books, songs, ideas, spells. No ' +
      'forms, no menus, no drop-downs. You type and the grimoire answers. It ' +
      'boots like an old machine, types back letter by letter, and gets ruder ' +
      'the more commands you get wrong.',
    repo: 'https://github.com/Carloslgp/grimoire',
    live: { label: 'Live', href: 'https://grimoire-hcj5.onrender.com/' },
    photos: [
      {
        src: grimoire1,
        alt: 'Grimoire booting in green phosphor type: “Getting the rinnegan…”, ' +
          '“Loading Mjölnir…”, then a prompt offering to enter or create a ' +
          'grimoire.',
      },
      {
        src: grimoire2,
        alt: 'A list of games returned by the listByCategory command, followed ' +
          'by the grimoire growing ruder at every repeat of a command that ' +
          'does not exist.',
      },
    ],
  },
  {
    id: 'meta-no-data',
    title: 'Meta No Data',
    mark: 'MD',
    stack: ['TypeScript', 'Web Workers', 'Vite'],
    description:
      'Converts HEIC photos and strips out location, device and date before ' +
      'you share them. Everything happens in the browser: no upload, no ' +
      'account, no server. The files never leave your device. I built it ' +
      'because my own phone kept handing me photos I couldn’t open anywhere.',
    repo: 'https://github.com/Carloslgp/Meta-No-Data',
    live: { label: 'Live', href: 'https://carloslgp.github.io/Meta-No-Data/' },
    photos: [
      {
        src: metaNoData1,
        alt: 'The Meta No Data home: “Remova os metadados das suas fotos” in ' +
          'large type, next to a map of Brazil drawn out of characters, and ' +
          'the promise underneath that the files never leave your device.',
      },
      {
        src: metaNoData2,
        alt: 'The app working on a queue of five photos: the selected one ' +
          'shows 187 metadata fields found and 187 marked for removal, with ' +
          'the pixels left untouched.',
      },
    ],
  },
  {
    id: 'elder-watch',
    title: 'Elder Watch',
    mark: 'EW',
    stack: ['ESP32', 'MPU6050', 'C++', 'Telegram'],
    description:
      'A device that stays with an elderly person and messages the family on ' +
      'Telegram when something happens. It knows a fall by its shape: the ' +
      'split second of free fall, then the impact. It also works as a panic ' +
      'button and a medication reminder. How long someone lies there before ' +
      'anyone notices is often what turns a scare into something serious.',
    repo: 'https://github.com/Carloslgp/Elder-Watch',
    photos: [
      {
        src: elderWatch1,
        alt: 'The Elder Watch dashboard: a fall monitor chart where the line ' +
          'of ordinary movement around 1 g drops to 0.6 and then spikes past ' +
          '2.4, which is the fall, above a list of scheduled reminders for ' +
          'blood pressure medication and lunch.',
      },
      {
        src: elderWatch2,
        alt: 'The device itself, in its cardboard case, strapped with a belt ' +
          'to a life-size panda plush standing in for the person wearing it.',
      },
    ],
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
      'vault for anyone forcing you to unlock it. A red panic button gives ' +
      'away the very thing it’s supposed to hide, so the disguise is the ' +
      'whole idea.',
    repo: 'https://github.com/Carloslgp/Ghosty-App',
    photos: [
      {
        src: ghosty1,
        alt: 'Ghosty running in the Android emulator beside its Kotlin source: ' +
          'the vault screen, with a red Emergency button that only answers if ' +
          'held down.',
      },
      {
        src: ghosty2,
        alt: 'The same app showing what everyone else sees, a working ' +
          'calculator, with the first-run hint that typing 1984 opens the ' +
          'setup.',
      },
    ],
  },
  {
    id: 'lynx-engine',
    title: 'Lynx Engine',
    mark: 'LX',
    stack: ['C++20', 'OpenGL', 'SDL2', 'GLAD'],
    description:
      'A game engine built from nothing to find out what actually happens ' +
      'underneath a game: how a character moves, how an image reaches the ' +
      'screen, how time is controlled. It’s early on purpose. So far it is a ' +
      'window, an OpenGL context and a loop that answers the system, and that ' +
      'is fine: I’m doing this for the walk, not the destination.',
    repo: 'https://github.com/Carloslgp/lynx-engine',
    photos: [
      {
        src: lynxEngine1,
        alt: 'All the Lynx Engine does so far, and on purpose: its own window ' +
          'open on a flat green field, with one sprite sitting in the middle ' +
          'of it.',
      },
    ],
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
    photos: [
      {
        src: studySync1,
        alt: 'The StudySync home: the word “Sync.” over a photograph of a ' +
          'vaulted library reading room, with the two ways in, Instituição ' +
          'and Aluno, in the top corner.',
      },
      {
        src: studySync3,
        alt: 'A subject inside StudySync, Matemática I, with its general ' +
          'forum open: a box to write a message, a field to attach a PDF, and ' +
          'buttons to show the members or switch to the admin forum.',
      },
      {
        src: studySync2,
        alt: 'The team that built StudySync, with the professor, after ' +
          'presenting it in the classroom where it was marked.',
      },
    ],
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
    photos: [
      {
        src: myVector1,
        alt: 'The test run in the terminal, section by section: pushBack, ' +
          'popBack, at() refusing index 99 with “Index out of range”, ' +
          'operator[], a size of 3 against a capacity of 4, and a copy that ' +
          'leaves the original untouched.',
      },
    ],
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
    photos: [
      {
        src: floodFill1,
        alt: 'The fill running: an outline drawing of Pikachu on white, ' +
          'painted yellow from a single seed pixel, the colour spreading ' +
          'until it fills the body and stops at the lines that close it.',
      },
    ],
  },
  {
    id: 'pokemon-game',
    title: 'Pokémon Interactive Game',
    mark: 'PK',
    stack: ['Python', 'Pygame', 'CustomTkinter', 'Pandas'],
    description:
      'A Pokémon battle game with a full graphical interface, built in pairs ' +
      'for an algorithmic reasoning course. Live data from the PokéAPI, ' +
      'animations in Pygame, music all the way through, and a secret hidden ' +
      'somewhere in it.',
    repo: 'https://github.com/Carloslgp/Pokemon-Interactive-Game',
    photos: [
      {
        src: pokemon1,
        alt: 'The Batalha Pokémon window choosing a fighter: nine sprites in ' +
          'a grid, Charmander in the middle inside the selection frame.',
      },
      {
        src: pokemon2,
        alt: 'A battle underway on a grass field, Charmander against Seel ' +
          'with an HP bar above each, and Flamethrower, Scratch, Rage and ' +
          'Slash to choose from underneath.',
      },
    ],
  },
  {
    id: 'python-do-zero',
    title: 'Python do Zero Roadmap',
    mark: 'PZ',
    stack: ['HTML', 'CSS', 'JavaScript'],
    description:
      'The map for Python do Zero, the complete Python series on my YouTube ' +
      'channel. The whole path on one page, in order, so nobody learning it has ' +
      'to guess what comes next.',
    repo: 'https://github.com/Carloslgp/python-do-zero-roadmap',
    live: { label: 'Live', href: 'https://carloslgp.github.io/python-do-zero-roadmap/' },
    photos: [
      {
        src: pythonDoZero1,
        alt: 'The Python do Zero roadmap: forty videos across colour-coded ' +
          'modules, with Controle de Fluxo opened to show its four lessons: ' +
          'if, while, for, and a guessing game as the project that closes it.',
      },
    ],
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
    photos: [
      {
        src: cliCalculator1,
        alt: 'A terminal answering from a plain directory: “sum 2 2” returns ' +
          '4, “mult 2 2” returns 4, “sub 4 6” returns −2. Each one is a ' +
          'separate program the shell found on its own.',
      },
    ],
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
