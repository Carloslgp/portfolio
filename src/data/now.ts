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
export const UPDATED = '2026-08';

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
 *  A nota do "Next" está fazendo o papel de estado vazio enquanto os HORIZONS
 *  não existem — é ela que impede a aba de ser uma tela em branco. Quando a
 *  lista for escrita, esta linha é a primeira coisa a trocar: no lugar de dizer
 *  que não há nada, ela passa a enquadrar o que há. */
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
    note: 'Nothing written here yet.',
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
  href?: string;
  body: string;
}

/** VAZIA por enquanto, e de propósito: as frases desta aba são as únicas do
 *  site escritas no futuro, e futuro sobre a própria vida não se terceiriza.
 *  A aba existe, a forma existe, e a lista espera.
 *
 *  Pra preencher, um objeto por horizonte — a ORDEM da lista é a ordem da
 *  página, do que já está em movimento pro que ainda é vontade. Sem ordenação
 *  automática, e aqui isso pesa mais que nos STRANDS: uma lista de futuro
 *  ordenada por data promete um cronograma, e não existe cronograma nenhum.
 *
 *    {
 *      id: 'algum-id',
 *      label: 'Shipping',
 *      title: 'A coisa',
 *      when: '2027-03',   // opcional — ver o comentário do campo acima
 *      href: 'https://…', // opcional
 *      body: 'O que é, em duas ou três frases.',
 *    }
 *
 *  Enquanto ela estiver vazia a aba mostra só a nota do PANELS, e o painel
 *  encolhe até a altura dela — que é o desenho certo pra uma lista que ainda
 *  não foi escrita, e não um defeito a esconder. */
export const HORIZONS: Horizon[] = [];

/** A última linha da página, e as duas portas que ela abre. Mesmo papel do
 *  CRAFT_NOTE em data/work.ts: o que ficou de fora daqui precisa continuar
 *  tendo endereço. */
export const NOW_NOTE =
  'This page is the short answer. The long one is split in two:';
