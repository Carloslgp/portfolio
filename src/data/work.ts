// src/data/work.ts — o CONTEÚDO da página /work mora aqui, e só aqui.
//
// O work.astro não conhece nenhuma frase desta página — nem os rótulos dos
// dois grupos: ele percorre o que `groups()` devolve e desenha. Pra mexer no
// texto é sempre este arquivo.
//
// Por que um módulo TS e NÃO uma content collection: é o mesmo motivo de
// data/about.ts e data/songs.ts. São nove registros fixos, sem corpo em
// markdown, sem arquivo por entrada e sem glob — uma collection cobraria um
// schema, uma entrada no config e um carregamento assíncrono pra entregar
// exatamente a mesma lista. O ganho de uma collection aparece quando o
// conteúdo é ESCRITO fora do código; aqui ele é escrito aqui.
//
//   • trocar texto      → editar a string
//   • nova entrada      → mais um objeto em ENTRIES (a ORDEM da lista não
//                         importa: quem separa e ordena é `groups()`, pelo
//                         `track` e pelas datas)
//   • tirar uma entrada → apagar o objeto
//
// O que esta página NÃO recebe: projeto pessoal/criativo. Isso é /craft.

export type Kind = 'role' | 'build' | 'recognition';

/** Em qual das duas listas da página a entrada cai.
 *
 *  Não dá pra deduzir isto de `kind`: a monitoria e a presidência do Builders
 *  Club são as duas 'role' e caem em lados OPOSTOS — uma é emprego, a outra é
 *  o que eu faço além de um. Só quem escreve a entrada sabe de que lado ela
 *  está, então o campo é obrigatório de propósito: entrada nova sem lado
 *  escolhido não compila, em vez de sumir calada num dos dois grupos. */
export type Track = 'career' | 'project';

/** Uma data com a precisão que ela realmente tem.
 *
 *  'YYYY-MM' é o normal. 'YYYY' existe por causa do CBSoft, que na fonte é só
 *  "2024" — e inventar um mês pra caber num formato seria inventar um dado.
 *  Quem desenha lê a precisão da própria string (ver `stamp`) e emite o
 *  datetime na mesma medida: <time datetime="2024">, não <time datetime="2024-01">. */
export type Stamp = string; // 'YYYY-MM' | 'YYYY'

export interface Entry {
  id: string;
  kind: Kind;
  track: Track;
  weight: 1 | 2 | 3;
  title: string;
  org?: string;
  start: Stamp;
  end: Stamp | 'present';
  summary?: string;           // peso 1 e 2
  impact?: string[];          // só peso 1, no máximo 3
  stack?: string[];
  href?: string;
  badge?: string;
  logo?: string;
}

export const ENTRIES: Entry[] = [
  {
    id: 'nock',
    track: 'career',
    kind: 'role',
    weight: 1,
    title: 'Founder & CDO',
    org: 'Nock',
    start: '2026-06',
    end: 'present',
    badge: 'PIBEP 2026',
    href: 'https://usenock.com/',
    logo: '/images/work/nock.svg',
    summary:
      'B2B lead enrichment for the Brazilian market. I work across the product as a ' +
      'generalist and increasingly on the data side. Right now I’m structuring the ' +
      'database with our CTO ahead of our first paying customers.',
    impact: [
      'Built Nock’s blog to an accessibility standard most marketing sites skip: 99 Lighthouse, dyslexia-friendly typefaces, fully navigable by screen reader',
      'Got usenock.com surfaced in Google’s AI results through SEO and GEO work',
      'Audited the product for UI failures and pulled the data behind our investor pitch, which was selected for PIBEP 2026, PUCPR’s incubation program',
    ],
    stack: ['Next.js', 'Node.js'],
  },

  {
    id: 'bradesco',
    track: 'career',
    kind: 'role',
    weight: 1,
    title: 'Data Analyst Intern',
    org: 'Bradesco Seguros',
    logo: '/images/work/bradesco-seguros.webp',
    start: '2025-11',
    end: 'present',
    summary:
      'Life insurance and private pension data at one of Brazil’s largest insurers. I ' +
      'build the analytical bases other teams make decisions from, and maintain the ' +
      'system that reaches customers at the moment they’re about to pull their money out.',
    impact: [
      'Built a one-off analysis tracking high-net-worth clients’ pension balances month over month. It was picked up as a standing monthly report for the board and the relationship team.',
      'Own the retention routine that routes withdrawal requests to agents, on one of the country’s largest private pension portfolios',
      'Build pipelines assembling analytical bases from multiple sources at 2M+ rows, feeding the monthly numbers that go to executive leadership',
    ],
    stack: ['Python', 'SQL', 'PySpark', 'Databricks'],
  },

  {
    id: 'trade-stars',
    track: 'career',
    kind: 'role',
    weight: 1,
    title: 'Web Development Intern',
    org: 'Trade Stars',
    logo: '/images/work/trade-stars.webp',
    start: '2025-05',
    end: '2025-10',
    summary:
      'I built two internal systems end to end. The first was a performance review ' +
      'platform where managers and their reports rate each other. The hard part wasn’t ' +
      'the reviews; it was that no two teams had the same shape. Some ran director → ' +
      'manager → team lead → deputy → sales rep. Others were one lead and one person. ' +
      'The data model had to handle both without special-casing either.',
    impact: [
      'Modeled reporting structures of arbitrary depth so the review flow worked for any org shape',
      'Rolled individual ratings up into team sentiment metrics for leads, with full visibility for HR and the C-suite',
      'Shipped a second app moving HR requests into self-service: time off, medical leave, resignations',
    ],
    stack: ['Next.js', 'React', 'Node.js'],
  },

  {
    id: 'fuelcheck',
    track: 'project',
    kind: 'recognition',
    weight: 2,
    title: 'Team Captain',
    org: 'FuelCheck',
    logo: '/images/work/startup-weekend.webp',
    start: '2026-08',
    end: '2026-08',
    badge: '2nd of 15, Techstars Startup Weekend Curitiba',
    summary:
      'Fuel quality monitoring for truck fleets: a hardware sensor that catches ' +
      'adulterated diesel before it reaches an engine. The idea was mine; the company ' +
      'was the team’s. We took it from problem statement through validation to a final ' +
      'pitch in 54 hours, and placed second out of 15. I built the pitch with the team ' +
      'and delivered it on stage.',
  },

  {
    id: 'builders-club',
    track: 'project',
    kind: 'role',
    weight: 2,
    title: 'President',
    org: 'Builders Club, PUCPR',
    logo: '/images/work/pucpr.webp',
    start: '2026-04',
    end: 'present',
    summary:
      'PUCPR’s developer community, meeting weekly. I speak on APIs and databases, my ' +
      'co-president runs his own sessions, and about 15 people show up each week. Most ' +
      'of the work isn’t the talks; it’s keeping a room of students building on a schedule.',
  },

  {
    id: 'study-sync',
    track: 'project',
    kind: 'build',
    weight: 2,
    title: 'Study Sync',
    start: '2025-03',
    end: '2025-06',
    badge: '1st place, class popular vote',
    summary:
      'A campus-scoped social platform, built for the Creative Experience course and ' +
      'voted first by the class. Students signed up with an institutional email, which ' +
      'unlocked every group at their university: course subjects, reading circles, ' +
      'tabletop RPG. The pitch was pulling campus life off WhatsApp, where groups are ' +
      'invisible unless someone adds you and nobody is accountable for what happens in ' +
      'them. Chat, an announcements feed, and a reporting flow that handed real ' +
      'moderation control to the university.',
    stack: ['PHP', 'MySQL', 'HTML', 'CSS'],
  },

  // Os três de peso 3. Saem juntos num bloco condensado (ver work.astro), e a
  // ordenação abaixo garante que eles fiquem CONSECUTIVOS — ver o desempate
  // por peso em `timeline()`.
  {
    id: 'monitor',
    track: 'career',
    kind: 'role',
    weight: 3,
    title: 'Academic Monitor, Business Process Modeling',
    org: 'PUCPR',
    logo: '/images/work/pucpr.webp',
    start: '2025-03',
    end: '2025-06',
  },
  {
    id: 'coach',
    track: 'project',
    kind: 'role',
    weight: 3,
    title: 'Coach, League of Legends team',
    org: 'Octa-Core',
    logo: '/images/work/octa-core.webp',
    start: '2025-03',
    end: '2025-06',
  },
  {
    id: 'cbsoft',
    track: 'project',
    kind: 'role',
    weight: 3,
    title: 'Volunteer organizer',
    org: 'CBSoft 2024 · Curitiba',
    logo: '/images/work/cbsoft.webp',
    start: '2024',
    end: '2024',
  },
];

// ——— datas ———

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** A data pronta pra desenhar: `dt` vai no atributo datetime com a MESMA
 *  precisão da fonte, `label` é o que se lê. */
export function stamp(value: Stamp): { dt: string; label: string } {
  const [year, month] = value.split('-');
  if (!month) return { dt: year, label: year };
  return { dt: value, label: `${MONTHS[Number(month) - 1]} ${year}` };
}

/** O intervalo de uma entrada, já resolvido pro template.
 *
 *  `to` é null quando não há segunda data a mostrar: ou a entrada segue aberta
 *  (`present`), ou começa e termina no mesmo ponto (o FuelCheck, que durou um
 *  fim de semana) — e nesse caso repetir "Aug 2026 — Aug 2026" só ocupa linha. */
export function range(e: Entry): {
  from: { dt: string; label: string };
  to: { dt: string; label: string } | null;
  present: boolean;
} {
  const present = e.end === 'present';
  return {
    from: stamp(e.start),
    to: present || e.end === e.start ? null : stamp(e.end),
    present,
  };
}

/** A data em número de meses, pra comparar intervalos. Sem mês, o ano inteiro
 *  conta: começa em janeiro e termina em dezembro. */
function months(value: Stamp, edge: 'start' | 'end'): number {
  const [year, month] = value.split('-');
  const m = month ? Number(month) : edge === 'start' ? 1 : 12;
  return Number(year) * 12 + m;
}

const from = (e: Entry) => months(e.start, 'start');
const to = (e: Entry) => (e.end === 'present' ? Infinity : months(e.end, 'end'));

const overlaps = (a: Entry, b: Entry) => from(a) <= to(b) && from(b) <= to(a);

// ——— os dois grupos da página ———

export type Group = { id: Track; label: string; entries: Entry[] };

/** A ordem dentro de um grupo.
 *
 *  Em curso vence terminado, mesmo quando o terminado é mais recente: o que
 *  ainda está acontecendo é o que responde "e hoje?", e mandá-lo pro meio da
 *  lista porque um fim de semana de hackathon terminou depois seria ordenar
 *  pelo relógio contra o leitor.
 *
 *  Depois disso, cada um pela data que o POSICIONA: quem segue aberto pelo
 *  início (é o "desde quando" que se procura), quem terminou pelo fim. Usar a
 *  mesma ponta para os dois faria uma das duas metades mentir. */
const byRelevance = (a: Entry, b: Entry) => {
  const open = (e: Entry) => (e.end === 'present' ? 1 : 0);
  const anchor = (e: Entry) => (e.end === 'present' ? from(e) : to(e));
  return open(b) - open(a) || anchor(b) - anchor(a) || from(b) - from(a);
};

/**
 * As duas listas que a página desenha, na ordem em que ela as desenha.
 *
 * O rótulo mora aqui e não no template pelo mesmo motivo de todo o resto do
 * arquivo: é frase da página. "Projects & communities" é mais largo que
 * "Projects" de propósito — o grupo abriga a presidência do Builders Club e o
 * CBSoft, que não são projetos de ninguém, e um rótulo curto demais os
 * classificaria errado só para caber.
 */
export function groups(): Group[] {
  const specs: { id: Track; label: string }[] = [
    { id: 'career', label: 'Career' },
    { id: 'project', label: 'Projects & communities' },
  ];

  return specs.map(({ id, label }) => ({
    id,
    label,
    entries: ENTRIES.filter((e) => e.track === id).sort(byRelevance),
  }));
}

// ——— ordem (ver §3 do briefing) ———

export type SegmentId = 'now' | 'before';

/** O ano que POSICIONA a entrada no seu segmento: em "Now" a lista corre pelo
 *  início, em "Before" pelo fim. É esse ano que o marcador da linha anuncia —
 *  usar o outro faria o marcador contradizer a própria ordenação. */
function anchorYear(e: Entry, segment: SegmentId): number {
  return Number((segment === 'now' ? e.start : e.end).slice(0, 4));
}

/** Uma pista da calha: de qual entrada ela é e quais LINHAS ela atravessa. */
export type Lane = { id: string; first: number; last: number; index: number };

export type Row = {
  entry: Entry;
  /** posição da linha dentro do segmento, já contando as linhas do bloco
   *  condensado uma a uma — é a régua das pistas */
  row: number;
  /** o ano aparece nesta linha? (só quando muda, e nunca dentro do condensado) */
  year: number | null;
  /** a pista desta entrada, se ela convive com alguma outra */
  lane: Lane | null;
};

export type Segment = {
  id: SegmentId;
  label: string;
  rows: Row[];
  /** quantas pistas o segmento chega a ter ao mesmo tempo — é o que dimensiona
   *  a calha no CSS (--lanes) */
  lanes: number;
  /** todas as pistas do segmento, pra cada linha saber quem passa por ela */
  tracks: Lane[];
};

/**
 * As pistas de simultaneidade.
 *
 * O eixo vertical da página é ORDEM, não tempo: um cargo de dois anos e um fim
 * de semana ocupam a altura do card que cada um pede. Então a pista não mede
 * duração — ela responde "quem estava correndo junto com quem": desce do nó da
 * própria entrada até a última linha com que ela se sobrepõe. Onde três pistas
 * correm lado a lado, três coisas aconteciam ao mesmo tempo, e a data dentro de
 * cada card diz quando.
 *
 * Quem não convive com ninguém NÃO ganha pista: um toco de uma linha só não
 * informa nada e vira sujeira ao lado do nó.
 *
 * A atribuição é gulosa pela ordem da página — a primeira pista livre. Como
 * cada pista é liberada assim que a entrada dona dela acaba, o número de
 * pistas simultâneas é o número de coisas simultâneas, e não o total de
 * entradas do segmento.
 */
function lanesFor(rows: { entry: Entry; row: number }[]): Lane[] {
  const lanes: Lane[] = [];
  // por pista, a última linha que ela ainda ocupa
  const busy: number[] = [];

  for (const { entry, row } of rows) {
    const partners = rows.filter((r) => r.entry.id !== entry.id && overlaps(entry, r.entry));
    if (!partners.length) continue;

    const last = Math.max(row, ...partners.map((p) => p.row));

    let index = busy.findIndex((until) => until < row);
    if (index === -1) index = busy.length;
    busy[index] = last;

    lanes.push({ id: entry.id, first: row, last, index });
  }

  return lanes;
}

/**
 * A página inteira, ordenada e medida — é isto que o work.astro desenha.
 *
 * "Now" (o que segue aberto) vem antes de "Before" mesmo quando o Before tem
 * data mais recente: em curso vence terminado. Dentro de cada segmento:
 *
 *   • Now    → por início, mais recente primeiro
 *   • Before → por fim, mais recente primeiro
 *
 * O desempate do Before é por PESO, e ele não é cosmético: Study Sync, a
 * monitoria e o coach terminam todos em 2025-06, e é o peso que impede um
 * card de peso 2 de cair no meio dos três de peso 3 — que precisam ficar
 * consecutivos pra virarem um bloco condensado só (§4). Empatados os dois,
 * vale a ordem de ENTRIES (Array.sort é estável desde o ES2019).
 */
export function timeline(): Segment[] {
  const byStartDesc = (a: Entry, b: Entry) => from(b) - from(a);
  const byEndDesc = (a: Entry, b: Entry) => to(b) - to(a) || a.weight - b.weight;

  const specs: { id: SegmentId; label: string; entries: Entry[] }[] = [
    {
      id: 'now',
      label: 'Now',
      entries: ENTRIES.filter((e) => e.end === 'present').sort(byStartDesc),
    },
    {
      id: 'before',
      label: 'Before',
      entries: ENTRIES.filter((e) => e.end !== 'present').sort(byEndDesc),
    },
  ];

  return specs.map(({ id, label, entries }) => {
    const indexed = entries.map((entry, row) => ({ entry, row }));
    const tracks = lanesFor(indexed);
    const byId = new Map(tracks.map((l) => [l.id, l]));

    let previous: number | null = null;

    const rows: Row[] = indexed.map(({ entry, row }) => {
      const year = anchorYear(entry, id);
      // O ano só aparece quando muda — e dentro do bloco condensado nunca, que
      // é onde ele viraria um rótulo por linha em vez de um marco na linha.
      const mark = entry.weight === 3 || year === previous ? null : year;
      if (entry.weight !== 3) previous = year;

      return { entry, row, year: mark, lane: byId.get(entry.id) ?? null };
    });

    return {
      id,
      label,
      rows,
      lanes: tracks.reduce((max, l) => Math.max(max, l.index + 1), 0),
      tracks,
    };
  });
}

/** Onde a pista está NESTA linha. `null` = a pista não passa por aqui. */
export type LaneCell = 'start' | 'through' | 'end' | 'solo' | null;

export function laneCell(lane: Lane, row: number): LaneCell {
  if (row < lane.first || row > lane.last) return null;
  if (lane.first === lane.last) return 'solo';
  if (row === lane.first) return 'start';
  if (row === lane.last) return 'end';
  return 'through';
}

/** A linha final da página. Uma frase e um link, e é tudo o que o /craft ganha
 *  daqui: o que é feito por gosto não divide página com o que é feito por
 *  contrato — mas também não pode ficar sem porta. */
export const CRAFT_NOTE = 'The things I build for no one but myself live on';

/** As pistas que passam por uma linha, já na ordem das colunas da calha —
 *  `null` é coluna vazia, e ela precisa existir pra as pistas não deslizarem
 *  de coluna de uma linha pra outra. */
export function laneRow(segment: Segment, row: number): LaneCell[] {
  const cells: LaneCell[] = Array(segment.lanes).fill(null);
  for (const lane of segment.tracks) cells[lane.index] = laneCell(lane, row);
  return cells;
}

/**
 * As pistas no VÃO logo acima de uma linha.
 *
 * Existe por causa do rótulo do bloco condensado, que ocupa altura entre a
 * entrada anterior e a primeira linha do bloco. Sem isto as pistas que só
 * estão de passagem morriam em cima do rótulo e recomeçavam embaixo dele — um
 * corte branco bem no ponto em que quatro coisas se encontram, que é
 * exatamente o que a calha existe pra mostrar.
 *
 * Só passagem: uma pista que COMEÇA nesta linha começa no nó dela, embaixo do
 * rótulo, e não pode ser desenhada antes de existir.
 */
export function laneRowAbove(segment: Segment, row: number): LaneCell[] {
  const cells: LaneCell[] = Array(segment.lanes).fill(null);
  for (const lane of segment.tracks) {
    if (lane.first < row && lane.last >= row) cells[lane.index] = 'through';
  }
  return cells;
}
