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
//   • trocar texto        → editar a string
//   • novo fio            → mais um objeto em STRANDS (a ordem da lista É a
//                           ordem da página; não há ordenação automática aqui,
//                           de propósito — quem sabe o que é mais importante
//                           agora é quem escreve)
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
  'Everything below was true the last time I touched this page. The time above ' +
  'it is not decoration — it is the actual clock in Curitiba, which is where I ' +
  'am while you read this.';

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

/** A última linha da página, e as duas portas que ela abre. Mesmo papel do
 *  CRAFT_NOTE em data/work.ts: o que ficou de fora daqui precisa continuar
 *  tendo endereço. */
export const NOW_NOTE =
  'This page is the short answer. The long one is split in two:';
