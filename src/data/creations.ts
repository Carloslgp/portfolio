// src/data/creations.ts — o CONTEÚDO da Coleção de Criações (/colecaocriacoes)
// mora aqui, e só aqui.
//
// A página não conhece nenhuma frase: ela percorre CREATIONS e desenha, e o
// motor (scripts/creations/) só lê o `effect` de cada uma. Pra mexer no que
// aparece é sempre este arquivo, nunca o markup. O guia de "onde vai cada
// coisa", com desenho da tela, está ao lado: src/data/creations.md.
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
//   • chegou uma foto que faltava → ver o comentário de `missingPhoto` na
//                           interface Creation, logo abaixo
//
// Velocidade, duração das fases e o ajuste fino de cada efeito NÃO ficam
// aqui: ver src/scripts/creations/config.ts.
import type { ImageMetadata } from 'astro';

// ——— as fotos das criações ———
// A maioria já existia no projeto — /work, /craft e /now — e entra aqui pela
// mesma foto, sem duplicar arquivo (ver o comentário de `nockTeam` em
// data/now.ts: importar a mesma fonte de outro lugar de src/assets/ não gera
// dois arquivos pra manter sincronizados, o Astro só recorta a mesma imagem
// pras variantes que cada página pede).
import nockTeam from '../assets/work_photos/professional/nock_1.webp';
import startupWeekendAward from '../assets/work_photos/professional/tech_star_2.webp';
import buildersClubTalk from '../assets/work_photos/professional/builders_club_1.webp';
import sudocarlosChannel from '../assets/work_photos/professional/youtube_1.webp';
import portfolio1 from '../assets/craft/portfolio_1.webp';
import grimoire1 from '../assets/craft/grimoire_1.webp';
import pixelart1 from '../assets/craft/creativity/pixelart_1.webp';
import pixelart2 from '../assets/craft/creativity/pixelart_2.webp';
import pixelart3 from '../assets/craft/creativity/pixelart_3.webp';
import pixelart4 from '../assets/craft/creativity/pixelart_4.webp';
import pixelartBarrel from '../assets/craft/creativity/pixelart_5.webp';
// As seis que vieram depois do barril, em src/assets/creations/. A ordem na
// fita (`evolution` de 'aprender-pixel-art') é do mais simples pro mais
// trabalhado, e NÃO a do número do arquivo. Os prints foram tirados todos no
// mesmo dia, então nem o arquivo nem o número dizem quando cada uma foi feita:
// as datas lá embaixo são aproximadas.
import pixelartSlime from '../assets/creations/pixelart_6.png';
import pixelartWolf from '../assets/creations/pixelart_4.png';
import pixelartMushroom from '../assets/creations/pixelart_1.png';
import pixelartClownfish from '../assets/creations/pixelart_5.png';
import pixelartWhale from '../assets/creations/pixelart_2.png';
import pixelartFox from '../assets/creations/pixelart_3.png';
import pokemonHallOfFame from '../assets/now/pokemon-hall-of-fame.webp';
import feetInStream from '../assets/photos/feet-in-stream.webp';

// Os projetos de programação que vêm de /craft/programming: a mesma captura
// que abre cada um lá (a primeira de `photos` em data/craftCode.ts), importada
// da mesma fonte, sem cópia — pelo mesmo motivo de `nockTeam` acima. O nome
// do arquivo do project_cars é trocado lá também: projectcar_2 é a simulação.
import easyRead1 from '../assets/craft/easyRead_1.webp';
import metaNoData1 from '../assets/craft/meta_no_data_1.webp';
import elderWatch1 from '../assets/craft/elder_watch_1.webp';
import ghosty1 from '../assets/craft/ghosty_1.webp';
import projectCars1 from '../assets/craft/projectcar_2.webp';

// Estas três SÃO cópias: a fonte mora em public/images/about_main_photos/,
// que o Astro não otimiza (é servida como está — ver o comentário de `foto`
// em data/about.ts). getImage() só sabe medir e gerar variantes de um import
// de src/assets/, então pra esta página usar a MESMA foto que o About mostra
// ela precisa da própria cópia. Trocar a foto do About não troca esta, e
// vice-versa — são a mesma imagem hoje, não o mesmo arquivo.
import acampar from '../assets/creations/acampar.jpg';
import tecladoMidi from '../assets/creations/teclado-midi.webp';
import colecaoDeJogos from '../assets/creations/colecao-de-jogos.webp';

// A moldura reservada de quem ainda não tem foto (ver `missingPhoto` mais
// abaixo). A mesma imagem serve pra todas — ela nunca é o que se vê de
// verdade, é o quanto ainda falta. Hoje nenhuma criação usa: todas têm foto.
// O import fica pra quando entrar uma criação nova antes da foto dela.
import fotoEmFalta from '../assets/creations/foto-em-falta.webp';

// As fotos que chegaram depois — cada uma resolve um `missingPhoto` de cima,
// ou entra como a foto extra de uma criação que já tinha a sua (ver `gallery`
// mais abaixo). amigos_2/3/4, acampamento_1/2/3 e pokemon_1/2/3 são o segundo
// caso: a criação já usava outra imagem como `image`, e estas viram a galeria
// dela. construindo_futuro e primeira_musica_autoral_1 tiraram as duas
// criações que repetiam a foto da vizinha: agora nenhuma foto aparece duas
// vezes na coleção.
import quemSouEu1 from '../assets/creations/quem_sou_eu_1.webp';
import saoBentoDoSul1 from '../assets/creations/sao_bento_do_sul_1.webp';
import amigos1 from '../assets/creations/amigos_1.webp';
import amigos2 from '../assets/creations/amigos_2.webp';
import amigos3 from '../assets/creations/amigos_3.webp';
import amigos4 from '../assets/creations/amigos_4.webp';
import acampamento1 from '../assets/creations/acampamento_1.webp';
import acampamento2 from '../assets/creations/acampamento_2.webp';
import acampamento3 from '../assets/creations/acampamento_3.webp';
import ensino1 from '../assets/creations/ensino_1.webp';
import construindoFuturo from '../assets/creations/construindo_futuro.webp';
// treinador_1 é o logo recortado rente às letras, com fundo transparente — e
// quando a moldura cortava ~5% de cada borda (ver FIELD.INNER no config) isso
// comia o "L" e o "OF". Esta é a mesma imagem com 12% de margem transparente
// em volta; o original continua na pasta, intocado.
import treinador1 from '../assets/creations/treinador_1_moldura.webp';
import primeiraMusicaAutoral1 from '../assets/creations/primeira_musica_autoral_1.webp';
import bonsai1 from '../assets/creations/bonsai_1.webp';
import oradorTurma1 from '../assets/creations/oradro_turma_1.webp';
import recitarPoesia1 from '../assets/creations/recitar_poesia_1.webp';
import pokemon1 from '../assets/creations/pokemon_1.webp';
import pokemon2 from '../assets/creations/pokemon_2.webp';
import pokemon3 from '../assets/creations/pokemon_3.webp';
// livros_1 foi tirada de cima, com o celular em pé, e os títulos ficavam de
// lado. Esta é a mesma foto girada 90° pra esquerda (os títulos na horizontal);
// o original continua na pasta, intocado.
import livrosHorizontal from '../assets/creations/livros_1_horizontal.webp';
import githubPerfil from '../assets/creations/github_perfil.png';

/** As fotos comuns do canva de fundo. Decorativas: não têm alt nem legenda,
 *  e a versão simples da página não as mostra. O canva tem mais lugares que
 *  fotos (uns 90 no desktop), então a lista REPETE — quanto mais fotos aqui,
 *  menos repetição. A das criações entra no canva por conta própria. */
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

/** A COMPOSIÇÃO é a outra metade: o efeito diz como a foto chega, a
 *  composição diz que forma ela toma quando chega — e é ela que faz uma
 *  criação não parecer a anterior. Seis efeitos terminando no mesmo retângulo
 *  no mesmo lugar se leem como uma foto piscando; a mesma foto ocupando a
 *  tela inteira, depois virando uma coluna que sangra pra fora, depois um
 *  selo pequeno num canto, se lê como uma coleção.
 *
 *    duet   — foto de um lado, texto do outro. O repouso: é preciso ter pra
 *             onde voltar, senão o resto não surpreende
 *    flip   — o mesmo, espelhado
 *    full   — a foto ocupa a página inteira, sangrando nas quatro bordas; o
 *             texto entra por cima, sobre um véu que escurece só o pé
 *    tower  — mais alta que a tela, estreita, encostada na borda: sangra em
 *             cima e embaixo e o texto divide o resto
 *    quiet  — pequena num canto, com muito ar em volta e o texto no canto
 *             oposto. O silêncio entre duas cheias
 *    edge   — grande e deslocada pra fora da borda lateral: metade do
 *             assunto fica de fora, e é isso que faz olhar
 *
 *  Qual criação usa qual não precisa ser dito: o config sorteia um ciclo
 *  (STAGE.CYCLE) pela ordem da lista. `layout` abaixo é só pra quando uma
 *  criação específica PEDE uma forma — uma panorâmica que só funciona em
 *  full, por exemplo. */
export const LAYOUT_NAMES = ['duet', 'flip', 'full', 'tower', 'quiet', 'edge'] as const;
export type Layout = (typeof LAYOUT_NAMES)[number];

/** O que a criação é. Vira o rótulo do meio na linha de cima do texto
 *  ("Criação 03 · Projeto · 2024") — por isso mais vale um rótulo ESPECÍFICO
 *  do que empurrar tudo que não é foto/projeto/repositório pra `other`: oito
 *  criações bem diferentes (uma apresentação, uma presidência de clube, duas
 *  monitorias, um discurso, uma poesia, um time de esports, um hobby de arte)
 *  lidas todas como "Outra coisa" não dizem nada sobre nenhuma delas. `other`
 *  continua existindo pro que realmente não se encaixa em nenhum balde. */
export type Kind =
  | 'photo'
  | 'project'
  | 'repo'
  | 'bio'
  | 'leadership'
  | 'teaching'
  | 'speech'
  | 'art'
  | 'hobby'
  | 'other';
export const KIND_LABEL: Record<Kind, string> = {
  photo: 'Fotografia',
  project: 'Projeto',
  repo: 'Repositório',
  bio: 'Biografia',
  leadership: 'Liderança',
  teaching: 'Ensino',
  speech: 'Oratória',
  art: 'Arte',
  hobby: 'Hobby',
  other: 'Outra coisa',
};

export interface Creation {
  /** chave estável, só letras/números/hífen: vira a âncora #criacao-NN junto
   *  com a posição, e é o nome que aparece nos erros do build */
  id: string;
  kind: Kind;
  /** 2 a 4 palavras. Sai em Playfair grande; mais que isso vira 3 linhas */
  title: string;
  /** texto livre, mostrado como está: '2024', 'mai 2025', '2019–2021'.
   *  String vazia esconde — e é o normal aqui pra quem não tem uma data
   *  exata: melhor sem data do que uma inventada. */
  date: string;
  /** normalmente até 3 frases (~260 caracteres) — o teto que ainda cabe num
   *  celular em pé com a tela presa (ver LAYOUT.MIN_STAGE_HEIGHT no config).
   *  Nas criações de colecao-de-criacoes-pt.md o texto é uma CITAÇÃO do
   *  roteiro original, palavra por palavra, e algumas passam esse teto — o
   *  teto cede antes de uma palavra do roteiro ser reescrita. */
  description: string;
  /** import de src/assets/ (ver o topo do arquivo). Continua obrigatório
   *  mesmo quando a foto de verdade ainda não chegou — ver `missingPhoto` */
  image: ImageMetadata;
  /** o que a imagem mostra, pra leitor de tela. Nunca vazio */
  alt: string;
  /** opcional: um link embaixo do texto (abre em aba nova) */
  link?: { label: string; href: string };
  /** só nos repositórios: o `id` do mesmo projeto em data/craftCode.ts. É de
   *  lá que sai se houve ajuda de IA (`aiAssisted`), pra não existir uma
   *  segunda resposta aqui. O build para se o id não existir lá. */
  craftId?: string;
  effect: Effect;
  /** só pro `slide`: de que lado ele vem. Padrão 'right' */
  from?: 'left' | 'right';
  /** a forma que a criação toma no palco (ver LAYOUT_NAMES). Deixar vazio é
   *  o normal: sem isto ela pega a do ciclo, que já garante que nenhuma
   *  vizinha se repete. Preencher é pra quando ESTA foto pede uma forma. */
  layout?: Layout;
  /** true quando esta criação ainda não tem a foto de verdade — `image`
   *  aponta pra `fotoEmFalta` (a moldura reservada) só pra função o encaixe
   *  ter alguma coisa pra animar. A página mostra um aviso visível na hora de
   *  ler, pra não fingir que aquele momento já está fotografado.
   *
   *  Pra resolver: chegou a foto → jogar o arquivo em src/assets/creations/,
   *  importar no topo, trocar `image` pra ela e apagar este campo (ou pôr
   *  `false`). Nada mais muda — nem o `alt`, que já deve estar escrito pra
   *  quando a foto chegar. */
  missingPhoto?: boolean;
  /** só pra quando esta criação é um PROCESSO, não um instante: os estágios
   *  que vêm DEPOIS de `image` (o primeiro, o que chega do canva), cada um
   *  com uma data curta. No palco todos dividem a mesma moldura — rolar a
   *  pausa de leitura vai passando de um pro próximo (ver `stageOp` em
   *  scripts/creations/field.ts); na versão simples, sem rolagem presa,
   *  viram uma fileira sempre visível abaixo da descrição. A ordem é sempre
   *  cronológica, pelo mesmo motivo do PIXEL_PIECES em
   *  data/craftCreative.ts: existe pra mostrar distância percorrida.
   *  `effect` não pode ser `'pieces'` numa criação com `evolution` — ripas
   *  fatiam uma foto no espaço, não fazem sentido fatiando várias no tempo. */
  evolution?: { image: ImageMetadata; date: string; alt: string }[];
  /** só pra quando esta criação tem mais de UMA foto do MESMO momento — hoje
   *  'fazer-amigos' (4), 'acampar-com-amigos' (4) e 'apaixonado-por-pokemon'
   *  (4). Ao contrário de `evolution` (um processo no TEMPO, com data, que a
   *  rolagem avança sozinha), estas são do mesmo instante e quem escolhe qual
   *  ver é a pessoa lendo — clicando numa seta. `image`/`alt` continuam sendo
   *  a PRIMEIRA foto (a que chega do canva); `gallery` é só o resto.
   *
   *  No palco elas dividem a moldura de `image`, e um par de setas troca qual
   *  está em cima (a troca é da própria criação, não mexe na rolagem). Na
   *  versão simples, sem clique animado, viram uma fileira sempre visível
   *  abaixo da descrição — como `evolution`, mas sem data.
   *
   *  `effect` não pode ser `'pieces'` nem a criação ter `evolution` — as três
   *  ideias fatiam a MESMA moldura de jeitos que não convivem (mesmo motivo
   *  do comentário de `evolution` acima). */
  gallery?: { image: ImageMetadata; alt: string }[];
}

/** Um INTERVALO: uma tela só de texto no meio da coleção — hoje, a que abre
 *  os projetos de programação avisando que ali estão só os principais. Mora
 *  na mesma lista CREATIONS, no lugar em que aparece, e rola no mesmo ritmo de
 *  uma criação (entrada, pausa de leitura, saída). Mas não é uma: não tem
 *  efeito, composição nem número — "Criação NN", o contador e as
 *  âncoras #criacao-NN pulam ele, e a âncora dele é o próprio `id`. */
export interface Interlude {
  interlude: true;
  /** chave estável, só letras/números/hífen. É a âncora dele (#id) */
  id: string;
  /** o rótulo pequeno em caixa alta, no lugar de "Criação NN · Tipo" */
  kicker: string;
  /** 2 a 4 palavras, como o de uma criação */
  title: string;
  description: string;
  /** opcional: uma foto AO LADO do texto. Não vem do canva nem se encaixa —
   *  fica parada e entra e sai com o intervalo inteiro */
  photo?: { image: ImageMetadata; alt: string };
  /** os links embaixo do texto, lado a lado (abrem em aba nova) */
  links: { label: string; href: string }[];
}

/** O que a lista CREATIONS aceita: uma criação ou um intervalo. */
export type Entry = Creation | Interlude;

export const isInterlude = (entry: Entry): entry is Interlude => 'interlude' in entry;

/** Textos fixos da interface. */
export const UI = {
  /** o prefixo da numeração na linha de cima: "Criação 03" */
  item: 'Criação',
  /** o rótulo acima da fita de evolução (ver `evolution` na interface Creation) */
  evolutionLabel: 'A evolução, mês a mês',
  /** o rótulo acima da fita de galeria, na versão simples (ver `gallery` na
   *  interface Creation) */
  galleryLabel: 'Mais fotos deste momento',
  /** o aviso, visível, de uma criação sem foto de verdade (ver
   *  `missingPhoto` na interface Creation) */
  missingPhoto: 'Fotos em falta',
  /** no rótulo de um repositório com `craftId`: se a IA ajudou em partes do
   *  código, segundo o `aiAssisted` da página Craft */
  ai: { yes: 'Com ajuda de IA', no: 'Sem IA' },
} as const;

/** A abertura: título da página, que sai de cena quando se começa a rolar.
 *  O título é em duas linhas; a segunda sai em itálico. */
export const OPENING = {
  kicker: 'Carlos Leonardo',
  title: { line1: 'Coleção de', line2: 'criações.' },
  // A primeira frase do parágrafo de abertura de colecao-de-criacoes-pt.md,
  // exata. O resto do parágrafo é maior que o vão que sobra na tela da
  // abertura (título + fita + esta frase já ocupam ela inteira) — em vez de
  // cortar ou reescrever, virou a primeira criação da coleção ('quem-eu-sou',
  // em CREATIONS), que tem uma tela só pra ele.
  lead:
    'Coleção de criações, por onde eu começo?',
  hint: 'Role para começar',
} as const;

/** O fechamento, depois da última criação: um título, uma frase e os links
 *  de volta pro resto do site. O link pra "/" é o único que a página trata
 *  diferente (ver o comentário do rel="noreferrer" no markup). */
export const CLOSING = {
  // Os três parágrafos finais de colecao-de-criacoes-pt.md, exatos — só
  // distribuídos entre kicker/title/text/quote porque a página não tem campo
  // pra "três parágrafos": o kicker é o começo do parágrafo de agradecimento,
  // o title é a frase que fecha esse mesmo parágrafo, o text é o parágrafo do
  // índice acadêmico, e o quote é a última linha — que no arquivo original
  // fica numa linha só pra ela, separada por uma linha em branco do
  // parágrafo anterior, então mora no próprio campo aqui também.
  kicker: 'Gostaria de agradecê-lo por ler até aqui, espero que tenha gostado.',
  title: 'Eu ainda tenho muito a mostrar.',
  text:
    'Bom, mas isso é só uma parte de quem eu sou e das coisas que eu criei. ' +
    'Acho que seria legal deixar só mais uma coisa: eu adoro estudar, até ' +
    'porque um bom professor gosta de estudar tanto quanto ensinar, e para ' +
    'isso fecho com o meu índice de rendimento acadêmico, que é 9,3 ' +
    'atualmente.',
  quote: 'I\'ve spread myself under your feet, tread softly.',
  links: [
    { label: 'Voltar pro início', href: '/' },
    { label: 'Work', href: '/work' },
    { label: 'Craft', href: '/craft' },
    { label: 'Photos', href: '/photos' },
    { label: 'About', href: '/#about' },
    { label: 'GitHub', href: 'https://github.com/Carloslgp' },
  ],
} as const;

/** As criações, na ordem do roteiro (colecao-de-criacoes-pt.md). Cada
 *  `description` é o parágrafo correspondente do roteiro, EXATO — sem trocar
 *  nem reordenar palavra nenhuma, mesmo quando isso passa do teto de 3
 *  frases (ver o comentário do campo lá em cima). Quatro parágrafos do
 *  roteiro eram longos demais pra uma tela fixa só (a abertura e mais três
 *  criações) — em vez de cortar palavra, viraram DUAS criações cada, sempre
 *  numa quebra de frase que já existia no texto. Todas têm foto de verdade,
 *  e nenhuma foto se repete: cada uma tem a sua em src/assets/creations ou
 *  reaproveita uma que já existe em algum outro canto do projeto (ver o
 *  comentário de cada uma).
 *
 *  Os projetos de programação são traduções das descrições de
 *  data/craftCode.ts, abertos por um intervalo (ver `Interlude`) que avisa que
 *  ali estão só os principais. */
export const CREATIONS: Entry[] = [
  {
    // A segunda frase do parágrafo de abertura (a primeira ficou em
    // OPENING.lead) — ela sozinha já é maior que o teto de uma criação
    // comum, e MAIOR ainda que o vão que sobra na tela da abertura ao lado
    // do título e da fita. Vira a primeira criação, não um pedaço do herói.
    id: 'quem-eu-sou',
    kind: 'bio',
    title: 'Quem sou eu',
    date: '',
    description:
      'Essa é uma das primeiras vezes que não precisarei poupar palavras ' +
      'para que você entenda quem o Carlos Leonardo é, então vou começar ' +
      'pelo básico: tenho 20 anos e estou no sexto período de Engenharia de ' +
      'Software, e eu ADORO PESSOAS, adoro CONVERSAR, adoro entender ideias ' +
      'diferentes, dar risada, me divertir, e eu adoro trabalhar em grupo ' +
      '(é sério, você vai entender, eu definitivamente não falo isso da ' +
      'boca para fora).',
    image: quemSouEu1,
    alt: 'Carlos Leonardo, de óculos, sorrindo e exibindo uma pequena folha seca pendurada no punho fechado.',
    effect: 'grow',
  },
  {
    // Metade 1/2 do parágrafo de São Bento do Sul → Curitiba: nascimento e o
    // motivo da mudança. A quebra é a mesma que já separava essas duas
    // ideias no parágrafo original — nada foi reescrito pra caber.
    id: 'sao-bento-do-sul',
    // Não é "aqui está uma foto": é de onde ele veio e por que saiu de lá —
    // continuação direta do parágrafo de 'quem-eu-sou'. A foto (quando
    // chegar) ilustra a história, mas não é o assunto dela.
    kind: 'bio',
    title: 'São Bento do Sul',
    date: '',
    description:
      'Eu nasci em um dia chuvoso, numa cidade no interior de Santa Catarina ' +
      'chamada São Bento do Sul, uma cidade que, até o tempo em que vivi lá, ' +
      'tinha cerca de 80 mil habitantes. Eu fiz diversos amigos lá, mas algo ' +
      'me chamou para Curitiba, e eu acredito que foi devido a duas coisas: ' +
      'minha querida tia, que me proveu moradia, e a minha imensa vontade de ' +
      'me desenvolver.',
    image: saoBentoDoSul1,
    alt: 'Vista aérea da praça central de São Bento do Sul ao entardecer, sob um céu carregado de nuvens de tempestade.',
    effect: 'slide',
    from: 'right',
  },
  {
    // Metade 2/2 do mesmo parágrafo: por que Curitiba, além de estudar —
    // pessoas, amigos, e a oportunidade de trabalho. É o trecho que a
    // "Fotos de amigos" do roteiro está pedindo.
    id: 'fazer-amigos',
    // Mesmo caso de 'sao-bento-do-sul': termina o parágrafo de origem (por
    // que ficou em Curitiba — amigos e oportunidade de trabalho), não uma
    // foto específica. Fica junto das outras duas partes do mesmo parágrafo.
    kind: 'bio',
    title: 'Fazer amigos',
    date: '',
    description:
      'Digo isso porque eu não vim para cá apenas estudar, mas conhecer ' +
      'PESSOAS e fazer AMIGOS, e eu fiz vários, como você pode ver nas ' +
      'fotos ao lado. E, por último, mas não menos importante, pela ' +
      'oportunidade de trabalhar em grandes e originais empresas como a ' +
      'Bradesco Seguros, onde eu trabalho agora, ou talvez estudar o ' +
      'ecossistema Apple pelo Apple Developer Academy, quem sabe… Isso só o ' +
      'futuro vai dizer.',
    image: amigos1,
    alt: 'Carlos ao lado de amigos, sentados na plateia de um evento de tecnologia, com crachás pendurados no pescoço.',
    effect: 'tilt',
    // Cairia em 'tower' pelo ciclo — mas essa composição sangra ATÉ a coluna
    // do texto quando a foto não é bem magrinha (estas são bem mais largas
    // que altas), e a foto empurraria o texto pra debaixo dela. 'duet' nunca
    // sangra: a moldura nunca passa da própria coluna.
    layout: 'duet',
    // Quatro fotos de amigos diferentes, do mesmo tanto de fazer amigos em
    // Curitiba que o texto descreve — nenhuma é MAIS a foto que as outras,
    // então em vez de escolher uma e perder o resto, esta é a primeira
    // criação com `gallery` (ver a interface Creation).
    gallery: [
      {
        image: amigos2,
        alt: 'Selfie com dois amigos num corredor da faculdade, um deles fazendo positivo com a mão.',
      },
      {
        image: amigos3,
        alt: 'Selfie em grupo com cerca de dez amigos apertados num corredor.',
      },
      {
        image: amigos4,
        alt: 'Grupo de amigos de terno numa festa de formatura, erguendo um deles na horizontal entre risadas.',
      },
    ],
  },
  {
    id: 'fundar-a-nock',
    kind: 'project',
    title: 'Fundar a Nock',
    date: '2026',
    description:
      'E quando eu digo que gosto de pessoas, é a isso que me refiro: Abrir ' +
      'uma startup patrocinada pela PUCPR via PIBEP (Programa Institucional ' +
      'de Bolsas de Empreendedorismo), a Nock, com pessoas incríveis que eu ' +
      'conheci na faculdade.',
    image: nockTeam,
    alt: 'Quatro integrantes da Nock posando no Hotmilk, o polo de inovação da PUCPR.',
    link: { label: 'Ver a Nock', href: 'https://usenock.com/' },
    effect: 'pieces',
  },
  {
    id: 'startup-weekend',
    // Sem link, ao contrário de 'fundar-a-nock' — não é o produto (FuelCheck)
    // que importa aqui, é ter sido líder e apresentado o pitch ("Fui líder e
    // também fui responsável por apresentar") pra 120 pessoas e ganho.
    kind: 'leadership',
    title: 'Segundo lugar, 54 horas',
    date: '2026',
    description:
      'Ou talvez participar do Techstars Startup Weekend Curitiba durante 54 ' +
      'horas com pessoas que eu nunca tinha visto na vida, e elas acreditarem ' +
      'na minha ideia de solução e, entre 15 equipes, nós darmos um jeito de ' +
      'ganhar o segundo lugar. Fui líder e responsável por apresentar o ' +
      'pitch para os avaliadores (na frente de mais de 120 pessoas XD).',
    image: startupWeekendAward,
    alt: 'O time do FuelCheck e os organizadores do evento no palco, depois do prêmio de segundo lugar.',
    effect: 'iris',
  },
  {
    id: 'builders-club',
    kind: 'leadership',
    title: 'Presidente do Builders Club',
    date: '2026',
    description:
      'Como presidente do Builders Club, clube da PUCPR focado em ' +
      'desenvolvimento de produtos de software, posso dizer que lidero e ' +
      'participo ativamente da comunidade de desenvolvedores da ' +
      'universidade.',
    image: buildersClubTalk,
    alt: 'Carlos explicando código de FastAPI projetado numa sala de aula da PUCPR, pro Builders Club.',
    effect: 'flip',
    // Cairia em 'edge' pelo ciclo — mas essa foto é mais larga que alta
    // (1,24:1), e 'edge' só cabe sem sangrar sobre o texto com fotos bem
    // verticais. 'flip' cobre a mesma ideia (foto grande, texto do lado) sem
    // esse limite de proporção.
    layout: 'flip',
  },
  {
    id: 'canal-no-youtube',
    // "eu ENSINO... adoro ENSINAR" — o mesmo verbo de 'monitoria-academica' e
    // 'construir-o-futuro'. É outro canal pro mesmo impulso, não um produto
    // de software como a Nock ou este portfólio.
    kind: 'teaching',
    title: 'Ensinar no YouTube',
    date: '2026',
    description:
      'Poderia falar que tenho um canal no YouTube onde eu ensino computação ' +
      'para pessoas pela internet, pois adoro ENSINAR e compartilhar ideias.',
    image: sudocarlosChannel,
    alt: 'A página do canal @sudocarlos no YouTube, com a série de Python e a de arquitetura de computadores.',
    link: { label: 'Ver o canal', href: 'https://www.youtube.com/@sudocarlos/videos' },
    effect: 'grow',
  },
  {
    // Metade 1/2 do parágrafo da monitoria: o que já fiz e o que estou perto
    // de virar. A frase seguinte (ponto e vírgula no original) já falava de
    // outra coisa — quando isso vai acontecer — e virou a criação seguinte.
    id: 'monitoria-academica',
    kind: 'teaching',
    title: 'Monitoria acadêmica',
    date: '',
    description:
      'Um dia eu quero me tornar professor universitário, e eu já me ' +
      'desenvolvo para tal, pois atuei como monitor acadêmico na matéria de ' +
      'modelagem de processos e atualmente estou em contato com um ' +
      'professor para me tornar monitor acadêmico na matéria de estrutura ' +
      'de banco de dados.',
    image: ensino1,
    alt: 'Carlos, de fones de ouvido, fazendo positivo em frente ao notebook durante uma chamada de monitoria online.',
    effect: 'slide',
    from: 'left',
  },
  {
    id: 'construir-o-futuro',
    kind: 'teaching',
    title: 'Construir o futuro',
    date: '',
    description:
      'Eu e o Professor estamos apenas definindo o horário da monitoria; ' +
      'no momento em que você estiver lendo isso, provavelmente já serei, ' +
      'pela segunda vez, monitor acadêmico. Isso é uma das coisas que eu ' +
      'faço para construir o meu futuro :P',
    image: construindoFuturo,
    alt: 'Carlos apresentando o pitch do FuelCheck num auditório, apontando para o slide "Sistema integrado" projetado no telão.',
    effect: 'tilt',
    // Cairia em 'tower' pelo ciclo, que sangraria sobre o texto com esta foto
    // (bem mais larga que alta). 'quiet' nunca sangra (a moldura é sempre
    // pequena), e dá uma pausa depois da 'full' anterior.
    layout: 'quiet',
  },
  {
    id: 'treinador-da-octacore',
    kind: 'leadership',
    title: 'Treinador da Octa-core',
    date: '2025',
    description:
      'Agora, o mais inusitado: já fui treinador do time de League of ' +
      'Legends da Octa-core por 4 meses. Por motivos pessoais e por falta ' +
      'de participantes no time, tive que me despedir do time para focar ' +
      'em outras áreas da minha vida.',
    image: treinador1,
    alt: 'O logotipo de League of Legends, em letras douradas.',
    effect: 'pieces',
  },
  {
    id: 'acampar-com-amigos',
    // "eu adoro sair pra acampar... eu adoro a natureza e a biologia" — um
    // interesse que ele descreve, não um instante que a foto documenta.
    kind: 'hobby',
    title: 'Acampar com amigos',
    date: '',
    description:
      'Além disso tudo, eu adoro sair para acampar com os meus amigos, faço ' +
      'isso há muitos anos seguidos, pois, além de amigos e pessoas, eu ' +
      'adoro a natureza e a biologia, que era uma das minhas matérias ' +
      'favoritas na escola.',
    image: acampar,
    alt: 'Barracas armadas num acampamento cercado por floresta e montanhas.',
    effect: 'iris',
    // Cairia em 'quiet' pelo ciclo — pequena demais pras setas da galeria
    // (ver `gallery` abaixo) caberem sem apertar. 'duet' dá o mesmo espaço de
    // 'fazer-amigos' e 'o-grimoire' mais acima.
    layout: 'duet',
    gallery: [
      {
        image: acampamento1,
        alt: 'Mata com araucárias refletida num lago ao entardecer, perto do acampamento.',
      },
      {
        image: acampamento2,
        alt: 'Trilha entre montanhas cobertas de campo, vista do alto durante uma caminhada do acampamento.',
      },
      {
        image: acampamento3,
        alt: 'Selfie de Carlos e uma amiga em frente a uma cachoeira no meio da mata, com um amigo fazendo sinal de paz logo atrás.',
      },
    ],
  },
  {
    id: 'orador-da-turma',
    kind: 'speech',
    title: 'Orador da turma',
    date: '',
    description:
      'Acho que, para te mostrar que eu gosto de falar, vale contar que fui ' +
      'escolhido para ser o orador da turma na minha formatura do ensino ' +
      'médio. Fiquei muito feliz, pois, além de poder falar sobre a turma, ' +
      'pude montar a fala junto com os meus amigos de um jeito que deixou ' +
      'toda a turma satisfeita.',
    image: oradorTurma1,
    alt: 'Carlos falando ao microfone num pódio, sob luz azul, durante a cerimônia de formatura do ensino médio.',
    effect: 'flip',
    // Cairia em 'edge' pelo ciclo, que sangraria sobre o texto com esta foto
    // (mesmo motivo das outras — ver o comentário em 'fazer-amigos').
    layout: 'flip',
  },
  {
    id: 'recitar-uma-poesia',
    kind: 'speech',
    title: 'Recitar uma poesia',
    date: '',
    description:
      'Também sempre gostei muito de escrever. Durante o ensino médio, ' +
      'escrevi uma poesia; infelizmente a perdi, mas aí está uma foto de ' +
      'mim recitando-a em um evento extracurricular na frente de mais de ' +
      '150 pessoas.',
    image: recitarPoesia1,
    alt: 'Carlos no palco com um microfone e uma pasta na mão, recitando durante o evento "Tercerão 2023".',
    effect: 'grow',
  },
  {
    // A tela que abre os projetos de programação (ver `Interlude`): a coleção
    // mostra só os principais, e o resto mora no GitHub e em /craft.
    interlude: true,
    id: 'projetos-de-programacao',
    kicker: 'Projetos de programação',
    title: 'Só os principais',
    description:
      'O que você vai ver aqui são apenas os meus projetos principais. ' +
      'Todos os outros estão no meu GitHub, e na página Craft do portfólio ' +
      'eu reuni os mais relevantes.',
    photo: {
      image: githubPerfil,
      alt: 'O meu perfil no GitHub: a foto, o nome e a bio à esquerda e, ao lado, o README com um Abra em 3D, uma citação de David J. Wheeler sobre níveis de indireção e a seção About Me.',
    },
    links: [
      { label: 'Ver o meu GitHub', href: 'https://github.com/Carloslgp' },
      { label: 'Ir para a página Craft', href: '/craft/programming' },
    ],
  },
  {
    id: 'leitura-facil',
    kind: 'repo',
    // o nome que o próprio app mostra na tela (o repositório se chama EasyRead)
    title: 'Easy Read',
    date: '',
    // Esta e as seis seguintes: tradução da descrição do mesmo projeto em
    // /craft/programming (data/craftCode.ts), na ordem de peso de lá — o
    // roteiro pediu "projetos de código, copiar da página craft do
    // portfólio", e a coleção é em português. O Nock fica de fora porque já
    // está na coleção ('fundar-a-nock').
    description:
      'Cole um contrato, uma bula ou uma decisão judicial e receba o mesmo ' +
      'texto em linguagem simples, no nível de leitura que você escolher: do ' +
      '1º ano do fundamental até a faculdade. Mais da metade dos adultos ' +
      'brasileiros não consegue ler por completo os documentos que decidem a ' +
      'vida deles, e o Easy Read resolve isso sem cadastro, sem guardar nada ' +
      'e ainda lê o resultado em voz alta. Tudo isso com média 100 nas ' +
      'categorias do Lighthouse.',
    image: easyRead1,
    alt: 'A página do Easy Read: uma caixa vazia para o texto original à esquerda, a versão simplificada à direita e, embaixo, uma escala de nível de leitura que vai de muito fácil a jurídico.',
    link: { label: 'Ver no GitHub', href: 'https://github.com/Carloslgp/EasyRead' },
    craftId: 'leitura-facil',
    effect: 'iris',
    // Cairia em 'tower' pelo ciclo, que só cabe com foto bem vertical — esta
    // captura é quase quadrada e sangraria sobre o texto.
    layout: 'duet',
  },
  {
    id: 'este-portfolio',
    kind: 'repo',
    title: 'Este portfólio',
    date: '',
    description:
      'Este site é um projeto por si só. A página inicial é um anel 3D que ' +
      'você gira com a rolagem, e cada face abre uma seção com uma transição ' +
      'feita de uma única imagem, cortada em pedaços numa página e remontada ' +
      'na próxima.',
    image: portfolio1,
    alt: 'A home deste site: a palavra PORTFOLIO atrás do anel 3D, parado na face de Craft, refletida no chão.',
    link: { label: 'Ver no GitHub', href: 'https://github.com/Carloslgp/portfolio' },
    craftId: 'portfolio',
    effect: 'slide',
    from: 'right',
  },
  {
    id: 'o-grimoire',
    kind: 'repo',
    title: 'O Grimoire',
    date: '',
    // A frase que fechava esta descrição ("Eu tenho muitos outros projetos,
    // veja o meu GitHub") saiu: agora quem diz isso é o intervalo que abre os
    // projetos, e o link voltou a ser o do repositório.
    description:
      'Um lugar pra guardar qualquer coisa do seu jeito: livros, músicas, ' +
      'ideias, feitiços. Nada de formulários, menus ou listas suspensas: você ' +
      'digita e o grimório responde. Ele liga como uma máquina antiga, ' +
      'responde letra por letra e fica mais mal-educado a cada comando que ' +
      'você erra.',
    image: grimoire1,
    alt: 'O Grimoire inicializando em letras verdes fósforo: "Getting the rinnegan…", "Loading Mjölnir…", e um prompt pra entrar ou criar um grimório.',
    link: { label: 'Ver no GitHub', href: 'https://github.com/Carloslgp/grimoire' },
    craftId: 'grimoire',
    effect: 'tilt',
    // Cairia em 'quiet' pelo ciclo, e essa captura é BEM mais larga que alta
    // (2:1): numa moldura pequena vira uma tira ilegível. 'duet' aguenta
    // qualquer proporção, a moldura nunca passa da própria coluna.
    layout: 'duet',
  },
  {
    id: 'meta-no-data',
    kind: 'repo',
    title: 'Meta No Data',
    date: '',
    description:
      'Converta fotos HEIC e apague localização, aparelho e data antes de ' +
      'compartilhar. Tudo roda no seu navegador: sem upload, sem conta e sem ' +
      'servidor, então os arquivos nunca saem do seu dispositivo. Nasceu de ' +
      'um problema meu: o meu celular vivia me entregando fotos que eu não ' +
      'conseguia abrir em lugar nenhum.',
    image: metaNoData1,
    alt: 'A página inicial do Meta No Data: “Remova os metadados das suas fotos” em letras grandes, ao lado de um mapa do Brasil desenhado com caracteres, e embaixo a promessa de que os arquivos não saem do seu dispositivo.',
    link: { label: 'Ver no GitHub', href: 'https://github.com/Carloslgp/Meta-No-Data' },
    craftId: 'meta-no-data',
    effect: 'flip',
    // Cairia em 'edge' pelo ciclo, que só cabe com foto bem vertical — e esta
    // captura é quase duas vezes e meia mais larga que alta.
    layout: 'flip',
  },
  {
    id: 'elder-watch',
    kind: 'repo',
    title: 'Elder Watch',
    date: '',
    description:
      'Um dispositivo com ESP32 que acompanha uma pessoa idosa e avisa a ' +
      'família pelo Telegram na hora em que algo acontece. Ele reconhece uma ' +
      'queda pelo formato dela: a fração de segundo em queda livre e, logo ' +
      'depois, o impacto. Também é botão de pânico e lembrete de remédios, ' +
      'porque o tempo que alguém fica caído até ser encontrado é, muitas ' +
      'vezes, o que transforma um susto em algo grave.',
    image: elderWatch1,
    alt: 'O painel do Elder Watch: um gráfico do monitor de quedas em que a linha do movimento normal, perto de 1 g, cai para 0,6 e depois dispara acima de 2,4, que é a queda, sobre uma lista de alarmes programados para o remédio da pressão e o almoço.',
    link: { label: 'Ver no GitHub', href: 'https://github.com/Carloslgp/Elder-Watch' },
    craftId: 'elder-watch',
    effect: 'pieces',
  },
  {
    id: 'ghosty',
    kind: 'repo',
    title: 'Ghosty',
    date: '',
    description:
      'Um app de segurança pessoal disfarçado de calculadora que funciona de ' +
      'verdade, com ícone e tudo. Um código secreto abre um cofre ou dispara ' +
      'um alerta silencioso com localização e gravação; outro, o de coação, ' +
      'abre um cofre falso convincente pra quem estiver te obrigando a ' +
      'desbloquear o celular. Nada de botão vermelho de pânico entregando o ' +
      'jogo: o disfarce é a proteção.',
    image: ghosty1,
    alt: 'O Ghosty rodando no emulador de Android ao lado do código em Kotlin: a tela do cofre, com um botão vermelho de Emergência que só responde se for segurado.',
    link: { label: 'Ver no GitHub', href: 'https://github.com/Carloslgp/Ghosty-App' },
    craftId: 'ghosty',
    effect: 'grow',
    // Cairia em 'full' pelo ciclo — mas a captura é código denso, e o texto
    // branco por cima dela ficava ilegível (visto). 'flip' põe o texto no
    // papel, ao lado da foto.
    layout: 'flip',
  },
  {
    id: 'project-cars',
    kind: 'repo',
    title: 'project_cars',
    date: '',
    description:
      'Jogando Forza 6, reparei no vácuo: o carro que vem colado na traseira ' +
      'do outro ganha velocidade. Quis entender como isso funciona e fazer ' +
      'as contas eu mesmo, então construí um simulador com dois carros em 3D ' +
      'numa reta. Nada é escrito à mão: o arrasto usa a área frontal medida ' +
      'na malha de cada carro, e o de trás só ganha alívio na parte dele que ' +
      'cabe dentro do rastro do da frente.',
    image: projectCars1,
    alt: 'A simulação rodando: dois carros vermelhos numa pista escura, um bem à frente do outro, com o tempo decorrido, as duas velocidades e a distância entre eles na borda de baixo.',
    link: { label: 'Ver no GitHub', href: 'https://github.com/Carloslgp/project-cars' },
    craftId: 'project-cars',
    effect: 'slide',
    from: 'left',
    // Cairia em 'tower' pelo ciclo, e a captura é duas vezes mais larga que
    // alta — sangraria sobre o texto.
    layout: 'duet',
  },
  {
    id: 'aprender-pixel-art',
    kind: 'art',
    title: 'Aprender pixel art',
    date: '2026',
    description:
      'Bom, já falei de projetos de código, vamos falar de arte e coisas ' +
      'que eu gosto de fazer? Durante este ano, iniciei a minha jornada ' +
      'aprendendo pixel art. Por favor, olhe a minha evolução durante os meses.',
    // A moldura entra com a PRIMEIRA peça — o resto da jornada mora em
    // `evolution` (ver abaixo). É de propósito: a miniatura que se vê no
    // canva, antes de chegar, também é esta — o esboço, não o resultado.
    image: pixelart1,
    alt: 'Uma maçã em pixel art: um círculo vermelho liso, com uma mancha rosa clara onde deveria estar o brilho.',
    // 'pieces' fatiava UMA foto no espaço — a mesma técnica não serve pra
    // fatiar VÁRIAS no tempo. 'grow' é neutro o bastante pra não competir
    // com o que acontece depois que ela chega.
    effect: 'grow',
    // A mesma sequência do PIXEL_PIECES em data/craftCreative.ts (mesmos
    // arquivos, cronológica): no palco, a moldura vai passando por elas
    // conforme se rola a pausa de leitura — ver `stageOp` em field.ts.
    evolution: [
      {
        image: pixelart2,
        date: '17 abr',
        alt: 'A mesma maçã redesenhada um dia depois: contorno escuro, folha e talo verdes, sombreado em degraus do lado direito.',
      },
      {
        image: pixelart3,
        date: '2 mai',
        alt: 'Uma esfera laranja ao lado de um cilindro azul, cada um com uma transição suave entre a luz e a sombra.',
      },
      {
        image: pixelart4,
        date: '12 mai',
        alt: 'Um ladrilho de pedra cinza que se repete sem emenda, com brotos verdes entre as pedras.',
      },
      {
        image: pixelartBarrel,
        date: '9 jul',
        alt: 'Um barril de madeira visto de frente, com aduelas avermelhadas presas por cintas de metal.',
      },
      {
        image: pixelartSlime,
        date: '21 jul',
        alt: 'Uma gosma verde com uma carinha, em três tons de verde e contorno verde-escuro.',
      },
      {
        image: pixelartWolf,
        date: '2 ago',
        alt: 'Um lobo cinza deitado, de orelhas em pé e focinho claro, pintado em quatro tons de cinza.',
      },
      {
        image: pixelartMushroom,
        date: '11 ago',
        alt: 'Um cogumelo de chapéu vermelho com pintas brancas, sobre um pé cinza-claro.',
      },
      {
        image: pixelartClownfish,
        date: '19 ago',
        alt: 'Um peixe-palhaço laranja com listras brancas contornadas de preto.',
      },
      {
        image: pixelartWhale,
        date: '28 ago',
        alt: 'Uma baleia azul soltando um jato de água, com a barriga clara e o contorno escuro.',
      },
      {
        image: pixelartFox,
        date: '6 set',
        alt: 'Uma raposa laranja sentada, de peito e ponta da cauda brancos: o estado mais recente da jornada.',
      },
    ],
  },
  {
    // Metade 1/2 do parágrafo do teclado MIDI: o sonho realizado e como o
    // instrumento funciona. A frase seguinte já muda de assunto (a rotina de
    // treino) e virou a criação seguinte, com uma foto de perto do mesmo
    // teclado — é só a continuação do parágrafo.
    id: 'meu-teclado-midi',
    // É o mesmo impulso de 'aprender-pixel-art': um instrumento pra FAZER
    // música, não uma foto de posse. Junto com a próxima (a música que ele
    // ainda vai compor), as duas são a mesma jornada em 'art'.
    kind: 'art',
    title: 'Meu teclado MIDI',
    date: '',
    description:
      'Também, com o meu primeiro pagamento do Bradesco Seguros, eu ' +
      'conquistei algo muito grande para mim e me orgulho muito disso: eu ' +
      'segui um sonho que sempre foi distante na minha vida, comprar um ' +
      'teclado MIDI (Musical Instrument Digital Interface). No caso, ele é ' +
      'mudo, mas envia dados diretamente para um software no meu ' +
      'computador, que interpreta esses dados e faz o som.',
    image: tecladoMidi,
    alt: 'Teclado Arturia KeyLab Essential sobre a escrivaninha.',
    effect: 'iris',
  },
  {
    id: 'primeira-musica-autoral',
    kind: 'art',
    title: 'A primeira música autoral',
    date: '',
    description:
      'Infelizmente, no momento atual da minha vida, não tenho muito tempo ' +
      'em casa durante a semana para treinar, treino nos finais de semana, ' +
      'por isso ainda não fiz a minha primeira música autoral, mas um dia ' +
      'ela vai sair.',
    image: primeiraMusicaAutoral1,
    alt: 'As teclas do KeyLab Essential 61 vistas de perto, de lado, com os pads de bateria ao fundo.',
    effect: 'flip',
    // Cairia em 'edge' pelo ciclo, que só cabe sem sangrar sobre o texto com
    // fotos bem verticais — esta é quase quadrada (0,9:1), e a legenda
    // ficaria por cima do título (ver o comentário em 'fazer-amigos').
    // 'flip' aguenta qualquer proporção.
    layout: 'flip',
  },
  {
    id: 'colecao-de-jogos',
    kind: 'hobby',
    title: 'Coleção de jogos',
    date: '',
    description:
      'Eu também adoro jogar video games, jogo desde jogos indies até ' +
      'triple A\'s, adoro mesmo. Eu tenho até uma coleção de jogos, se liga:',
    image: colecaoDeJogos,
    alt: 'Coleção de jogos físicos de Nintendo 3DS e Switch.',
    effect: 'grow',
  },
  {
    id: 'apaixonado-por-pokemon',
    kind: 'hobby',
    title: 'Apaixonado por Pokémon',
    date: '',
    description:
      'Sempre adorei jogar video games e, atualmente, devido ao meu ' +
      'trabalho, tive a oportunidade de comprar um Nintendo Switch 2 para ' +
      'jogar os jogos de Pokémon. Sou simplesmente ' +
      'apaixonado pela franquia, tenho jogos, cartas de Pokémon e até ' +
      'pelúcias feitas pela minha namorada (pedi de presente para ela).',
    image: pokemonHallOfFame,
    alt: 'Tela de Hall da Fama em pixel art de Pokémon FireRed, com Venusaur, Ninetales, Snorlax, Lapras, Alakazam e Dragonite sob as palavras "Welcome to the HALL OF FAME!".',
    effect: 'slide',
    from: 'left',
    // Cairia em 'full' pelo ciclo: a foto cobria a tela inteira e o texto
    // ficava por cima dela, disputando com os sprites e com as setas da
    // galeria. 'flip' põe a foto menor, ao lado, e o texto no papel.
    layout: 'flip',
    // A mesma ordem do parágrafo: joguinho novo, cartas, pelúcias.
    gallery: [
      {
        image: pokemon2,
        alt: 'Tela do Pokédex no Nintendo Switch, com os 230 Pokémon capturados e vistos, os dois completos.',
      },
      {
        image: pokemon3,
        alt: 'Página de um fichário com nove cartas holográficas de Pokémon, entre elas Mega Rayquaza-EX e Gardevoir-EX.',
      },
      {
        image: pokemon1,
        alt: 'Pelúcias de crochê de Snorlax e Mew feitas pela namorada de Carlos, ao lado de miniaturas de Psyduck e Mimikyu.',
      },
    ],
  },
  {
    id: 'bonsai-ha-seis-meses',
    kind: 'hobby',
    title: 'Bonsai há seis meses',
    date: '',
    description:
      'Eu também crio um bonsai há 6 meses, olha uma foto dele aí:',
    image: bonsai1,
    alt: 'Um pequeno bonsai num vaso retangular azul-esverdeado, segurado na palma da mão diante de um papel de parede com arabescos.',
    effect: 'tilt',
    // Cairia em 'tower' pelo ciclo, que sangra sobre o texto com esta foto
    // (quadrada — mesmo motivo das outras, ver o comentário em
    // 'fazer-amigos').
    layout: 'duet',
  },
  {
    id: 'a-parede-de-fotos',
    kind: 'photo',
    title: 'A parede de fotos',
    date: '',
    description:
      'Eu adoro tirar fotos, se você ainda não viu, por favor acesse a ' +
      'minha página de fotos. Inclusive, tudo que você viu e verá no meu ' +
      'portfólio e aqui: todas as fotos foram tiradas por mim ou feitas por mim.',
    image: feetInStream,
    alt: 'Uma pedra parada no meio de um riacho raso, com os pés de quem tira a foto entrando no quadro.',
    link: { label: 'Ver a parede de fotos', href: '/photos' },
    effect: 'pieces',
  },
  {
    id: 'dom-casmurro-e-companhia',
    kind: 'hobby',
    title: 'Dom Casmurro e companhia',
    date: '',
    description:
      'Eu também adoro ler, veja alguns livros que já li e estou lendo. ' +
      'Inclusive, sou apaixonado por Dom Casmurro, do Machado de Assis.',
    image: livrosHorizontal,
    alt: 'Livros espalhados sobre a cama, entre eles Memórias Póstumas de Brás Cubas, Sapiens, O Hobbit, a Ilíada, a Odisseia e a biografia de Steve Jobs.',
    effect: 'iris',
    // Cairia em 'quiet' pelo ciclo, que deixa a foto um selo pequeno no canto
    // — e aqui os títulos dos livros são o assunto. 'duet' dá a moldura grande
    // com o texto ao lado.
    layout: 'duet',
  },
];
