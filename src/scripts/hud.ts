// src/scripts/hud.ts — os dois cantos do topo: a hora daqui, à esquerda, e as
// frases que se revezam, à direita. Nada aqui toca a cena; é texto que respira
// sozinho. Quem decide QUANDO os dois aparecem é o main.ts (classe .is-in),
// junto com a linha do topo.
import { scrambleOnHover } from './scramble';

// Curitiba segue o mesmo fuso de São Paulo. Deixar o nome da zona (e não um
// offset fixo tipo -03:00) é o que faz isto sobreviver a um eventual retorno do
// horário de verão: a tabela é do navegador, não nossa.
const TZ = 'America/Sao_Paulo';

const QUOTES = [
  'Rewrite your own destiny',
  'He who has a why to live can bear almost any how',
  'No act of kindness is ever wasted',
  'True courage is fighting for what you love',
  'Become who you are',
  'Be kind, for everyone you meet is fighting a hard battle',
];

const HOLD = 7000;   // tempo com a frase parada na tela
const FADE = 700;    // casa com a transição do .quote em index.astro

export function initHud() {
  initClock();
  initQuotes();
}

// Relógio de Curitiba para QUALQUER visitante: o Intl formata a partir do
// instante universal, então o relógio local de quem acessa nunca entra na
// conta — de Nova York ou de Tóquio, sai a mesma hora que aqui.
function initClock() {
  const el = document.querySelector<HTMLElement>('[data-clock-time]');
  if (!el) return;

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const tick = () => {
    el.textContent = fmt.format(new Date());

    // O próximo passo é agendado para a virada do minuto, e não 60s corridos
    // depois: assim o relógio não fica devendo quase um minuto toda vez que a
    // aba dorme e o timer atrasa.
    setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
  };

  tick();
}

// Troca de frase por crossfade. O texto só muda com o span já invisível, senão
// a substituição apareceria no meio do fade como um salto de altura.
function initQuotes() {
  const el = document.querySelector<HTMLElement>('[data-quote]');
  if (!el) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // o hover desta é ligado aqui, e não pelo initScramble(): guardar o handle é
  // o que permite abortar a decifração quando a frase vai ser trocada
  const scramble = scrambleOnHover(el);

  // começa em uma frase aleatória: quem volta ao site não bate sempre na mesma
  let i = Math.floor(Math.random() * QUOTES.length);
  el.textContent = QUOTES[i];

  setInterval(() => {
    if (document.hidden) return;   // aba escondida: não gasta frase no vazio

    // com o ponteiro em cima, quem está lendo manda: trocar a frase debaixo do
    // cursor tiraria a leitura no meio (e brigaria com a decifração rodando)
    if (el.matches(':hover')) return;

    i = (i + 1) % QUOTES.length;

    if (reduced) {
      el.textContent = QUOTES[i];
      return;
    }

    el.classList.add('is-out');
    setTimeout(() => {
      scramble.cancel();           // rede de segurança: nada de escrever a frase velha por cima da nova
      el.textContent = QUOTES[i];
      el.classList.remove('is-out');
    }, FADE);
  }, HOLD + FADE);
}
