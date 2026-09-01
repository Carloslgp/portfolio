/**
 * A ÁREA VISÍVEL e a caixa em que o navegador ancora `position: fixed` — que no
 * celular não são a mesma coisa.
 *
 * No Safari do iPhone a caixa do `fixed` acompanha o viewport GRANDE (o das
 * barras recolhidas) e começa no topo físico da tela, enquanto `dvh` acompanha o
 * viewport atual. Com as barras abertas, uma camada `position: fixed; inset: 0`
 * com `height: 100dvh` nasce então alta demais e curta demais ao mesmo tempo: a
 * UI inteira sobe pra debaixo da barra de endereço e sobra uma faixa de papel
 * vazio embaixo. É o bug que este módulo existe pra medir.
 *
 * Nada aqui é adivinhado, e nada aqui vem de uma API que possa mentir. São três
 * sondas no DOM, uma por pergunta:
 *
 *   `position: fixed; inset: 0`  → a caixa REAL onde o navegador ancora o fixed
 *   dimensionada em `dvh`        → o tamanho que o CSS já usou pra pintar
 *   `position: absolute; top: 0` → o canto do documento, ou seja, o topo do que
 *                                  se vê (numa página que não rola, é o mesmo)
 *
 * As duas últimas existem porque a `visualViewport` do Chrome no iPhone entrega
 * medidas provisórias no primeiro carregamento e não avisa quando se acerta:
 * congelar o width/height dela em px anulava o `dvh` correto, e o offsetTop dela
 * punha a página inteira no lugar errado. Ela ficou só como reserva.
 *
 * O QUE ESTE MÓDULO NÃO RESOLVE — e onde já se perdeu tempo procurando. Havia
 * um segundo desencontro, de mesma aparência, que nenhuma sonda daqui enxerga:
 * com `viewport-fit=cover` na meta, o Chrome do iPhone desenha a página uns 90px
 * acima da área visível e responde 0 em TODAS as fontes acima, inclusive nas
 * safe-areas. Não era medida errada, era o trato do `cover` sendo quebrado; a
 * cura foi tirar o `cover` (ver o comentário na meta do Layout.astro). Se a
 * queixa voltar com as três sondas concordando em zero, o problema está lá, não
 * aqui.
 */

interface Metrics {
  /** o que aparece na tela */
  width: number;
  height: number;
  /** quanto da caixa do `fixed` sobra ACIMA/À ESQUERDA do que aparece */
  top: number;
  left: number;
  /** ...e quanto sobra ABAIXO/À DIREITA */
  bottom: number;
  right: number;
}

const ZERO: Metrics = { width: 1, height: 1, top: 0, left: 0, bottom: 0, right: 0 };

/**
 * A sonda. Um elemento vazio de `position: fixed; inset: 0` é, por definição, a
 * caixa que o navegador usa pra ancorar TODO `position: fixed` da página — não
 * há API que a reporte, mas há como perguntar a ela mesma. É a única medida
 * deste arquivo que não depende de acreditar no que o navegador diz.
 */
let fixedProbe: HTMLElement | null = null;
let sizeProbe: HTMLElement | null = null;
let docProbe: HTMLElement | null = null;

function fixedBox(): DOMRect | null {
  if (!document.body) return null;

  if (!fixedProbe || !fixedProbe.isConnected) {
    fixedProbe = document.createElement('div');
    fixedProbe.setAttribute('aria-hidden', 'true');
    // Nada além do necessário: `contain` ou `transform` aqui mudariam a caixa
    // que a sonda deve reportar, e ela é a única testemunha da medida.
    fixedProbe.style.cssText = 'position:fixed;inset:0;pointer-events:none;visibility:hidden';
    document.body.appendChild(fixedProbe);
  }

  return fixedProbe.getBoundingClientRect();
}

/**
 * O CANTO DO DOCUMENTO — a testemunha que faltava.
 *
 * Onde a área visível começa era deduzido de `visualViewport.offsetTop`, e essa
 * é justamente a leitura que o Chrome no iPhone entrega provisória na primeira
 * abertura. Existe uma segunda fonte para o MESMO número, e ela não depende de
 * API nenhuma: `position: absolute; top: 0` cai no canto do documento, e o
 * navegador sempre pinta o canto do documento no topo do que se vê — é a única
 * coisa que ele não pode esconder de quem não consegue rolar a página.
 *
 * A subtração contra a sonda do `fixed` dá a folga procurada, e como as duas
 * medidas saem do mesmo `getBoundingClientRect()`, qualquer divergência de
 * sistema de coordenadas entre os dois viewports se cancela no meio.
 *
 * Vale só com a página travada (ver locked()): assim que ela rola, este canto
 * anda junto com a rolagem e deixa de descrever o topo da tela. É a mesma
 * condição em que a correção é aplicada, então não há caso a mais para tratar.
 */
function documentBox(): DOMRect | null {
  if (!document.body) return null;

  if (!docProbe || !docProbe.isConnected) {
    docProbe = document.createElement('div');
    docProbe.setAttribute('aria-hidden', 'true');
    // 1×1 e absoluto: não empurra o layout de ninguém e não entra no
    // scrollHeight que o locked() consulta logo abaixo.
    docProbe.style.cssText =
      'position:absolute;top:0;left:0;width:1px;height:1px;' +
      'pointer-events:none;visibility:hidden';
    document.body.appendChild(docProbe);
  }

  return docProbe.getBoundingClientRect();
}

/**
 * O tamanho que o CSS usa desde o primeiro paint.
 *
 * A sonda usa as próprias variáveis globais para não duplicar a decisão de
 * fallback (`dvh` quando existe, `vh` nos navegadores antigos). Tamanho e
 * posição são responsabilidades separadas: ela é `fixed` só para não aumentar
 * o scrollHeight e daqui lemos exclusivamente width/height.
 */
function cssViewportBox(): { width: number; height: number } {
  const fallback = {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
  };
  if (!document.body) return fallback;

  if (!sizeProbe || !sizeProbe.isConnected) {
    sizeProbe = document.createElement('div');
    sizeProbe.setAttribute('aria-hidden', 'true');
    sizeProbe.style.cssText =
      'position:fixed;top:0;left:0;width:var(--viewport-w);height:var(--viewport-h);' +
      'pointer-events:none;visibility:hidden';
    document.body.appendChild(sizeProbe);
  }

  const box = sizeProbe.getBoundingClientRect();
  return {
    width: Number.isFinite(box.width) && box.width > 0 ? box.width : fallback.width,
    height: Number.isFinite(box.height) && box.height > 0 ? box.height : fallback.height,
  };
}

/**
 * A página está travada (não rola)?
 *
 * É a condição EXATA em que o desencontro aparece: sem rolagem, as barras do
 * Safari nunca recolhem, e a caixa do `fixed` fica maior do que se vê pra
 * sempre. Nas rotas que rolam (a /work e as outras devolvem `overflow: visible`
 * a html e body) o navegador já reposiciona o `fixed` sozinho a cada movimento
 * das barras, e corrigir por cima seria corrigir duas vezes — daí a pergunta.
 */
function locked(): boolean {
  if (!document.body) return false;

  const style = getComputedStyle(document.body);
  const hidden = style.overflowY === 'hidden' || style.overflowY === 'clip';
  if (!hidden) return false;

  // ...e sem altura de rolagem. Durante a descida do About o body volta a ser
  // `overflow: hidden` COM a página inteira dentro dele; ali a correção não
  // vale, e sem esta segunda pergunta ela piscaria no meio da coreografia.
  const doc = document.scrollingElement ?? document.documentElement;
  return doc.scrollHeight - doc.clientHeight <= 1;
}

function measure(): Metrics {
  if (typeof window === 'undefined') return ZERO;

  const { width, height } = cssViewportBox();
  const flat: Metrics = { width, height, top: 0, left: 0, bottom: 0, right: 0 };

  // Perguntar ANTES de medir: fora da página travada a correção não vale de
  // qualquer forma, e a pergunta poupa duas leituras de layout por evento nas
  // rotas que rolam — que são as que mais disparam eventos.
  if (!locked()) return flat;

  const visual = window.visualViewport;
  if (visual && Math.abs(visual.scale - 1) >= 0.01) return flat;

  const box = fixedBox();
  if (!box) return flat;

  // Onde a área visível COMEÇA dentro da caixa do `fixed`. O canto do documento
  // é a fonte primária porque não pode ficar provisório (ver documentBox); a
  // visualViewport continua como reserva para quando a sonda não existir.
  const doc = documentBox();
  const origin = doc
    ? { top: doc.top - box.top, left: doc.left - box.left }
    : visual
      ? { top: visual.offsetTop - box.top, left: visual.offsetLeft - box.left }
      : { top: 0, left: 0 };

  // Distribui a sobra da caixa fixed sem jamais produzir uma geometria
  // contraditória: top + height + bottom precisa continuar igual à altura da
  // caixa. Isso também contém uma leitura provisória fora dos limites. O
  // tamanho vem do CSS, não de visual.width/height, porque esses dois podem
  // estar provisórios no cold start do Chrome iOS.
  const slackY = Math.max(0, box.height - height);
  const slackX = Math.max(0, box.width - width);
  const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
  const top = clamp(origin.top, slackY);
  const left = clamp(origin.left, slackX);
  const bottom = slackY - top;
  const right = slackX - left;

  const off = (n: number) => (n > 0.5 ? Math.round(n * 100) / 100 : 0);
  const shift = { top: off(top), left: off(left), bottom: off(bottom), right: off(right) };

  const any = shift.top || shift.left || shift.bottom || shift.right;
  if (!any) return flat;

  return { width, height, ...shift };
}

/**
 * A última medida. Existe por causa de quem pergunta: o carrossel chama
 * `viewportSize()` a cada pointermove e a cada quadro da emenda, e `measure()`
 * lê o retângulo da sonda — ou seja, força layout. Quem escreve o cache é o
 * `syncViewportVars`, que já roda em todo evento que pode ter mudado a medida.
 */
let cache: Metrics | null = null;

function current(): Metrics {
  return cache ?? (cache = measure());
}

/** O tamanho da área visível — o que a cena WebGL e as emendas medem. */
export function viewportSize(): { width: number; height: number } {
  const m = current();
  return { width: m.width, height: m.height };
}

/** Onde a área visível COMEÇA dentro da caixa do `fixed`. Zero fora do bug. */
export function viewportOffset(): { top: number; left: number } {
  const m = current();
  return { top: m.top, left: m.left };
}

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

let written = '';

/**
 * Publica apenas a POSIÇÃO em variáveis CSS. O tamanho continua em `dvh` no
 * global.css e nunca é congelado num px vindo de `visualViewport`.
 */
export function syncViewportVars(): void {
  // Timers são desacelerados em segundo plano e alguns WebViews chegam a
  // devolver 0×0 nesse estado. A retomada visível já chama refreshViewport().
  if (typeof document === 'undefined' || document.hidden) return;

  const root = document.documentElement;

  // Limpa valores deixados por uma versão anterior durante HMR/navegação. Em
  // produção normalmente não há nada inline, mas a garantia custa só esta
  // verificação e mantém a folha CSS como única dona do tamanho.
  if (root.style.getPropertyValue('--viewport-w')) root.style.removeProperty('--viewport-w');
  if (root.style.getPropertyValue('--viewport-h')) root.style.removeProperty('--viewport-h');

  const m = (cache = measure());
  const stamp = `${m.width}|${m.height}|${m.top}|${m.left}|${m.bottom}|${m.right}`;
  // Um ouvinte que dispara a cada quadro enquanto as barras animam não pode
  // pagar um recálculo de estilo quando nada de fato mudou.
  if (stamp === written) return;
  written = stamp;

  root.style.setProperty('--viewport-top', px(m.top));
  root.style.setProperty('--viewport-left', px(m.left));
  root.style.setProperty('--viewport-bottom', px(m.bottom));
  root.style.setProperty('--viewport-right', px(m.right));
  root.toggleAttribute('data-viewport-inset', !!(m.top || m.left || m.bottom || m.right));

  window.dispatchEvent(new CustomEvent('viewport:change'));
}

/*
 * O Chrome no iPhone pode entregar a medida provisória da janela durante a
 * primeira abertura e NÃO emitir outro resize quando termina de acomodar as
 * barras. Se essa leitura única virar px nas variáveis acima, a página fica
 * congelada curta até o app ser fechado e aberto — quando focus/pageshow fazem
 * uma nova leitura.
 *
 * As amostras abaixo cobrem justamente essa acomodação tardia. São só seis
 * leituras distribuídas em três segundos (não um polling por frame), e toda
 * nova mudança reinicia a sequência a partir do estado mais recente.
 */
const SETTLE_DELAYS = [0, 100, 300, 700, 1500, 3000] as const;
let syncFrame = 0;
let settleTimers: number[] = [];

function queueViewportSync(): void {
  if (typeof window === 'undefined' || document.hidden) return;
  cancelAnimationFrame(syncFrame);
  syncFrame = requestAnimationFrame(syncViewportVars);
}

/**
 * Mede agora e de novo enquanto a UI do navegador termina de se posicionar.
 * Também é chamada por loading.ts depois que o portão perde foco e sai do DOM:
 * no Chrome iOS essa mudança visual nem sempre vem acompanhada de resize.
 */
export function refreshViewport(): void {
  if (typeof window === 'undefined') return;

  settleTimers.forEach((timer) => clearTimeout(timer));
  settleTimers = [];

  SETTLE_DELAYS.forEach((delay) => {
    if (delay === 0) {
      queueViewportSync();
      return;
    }
    settleTimers.push(window.setTimeout(queueViewportSync, delay));
  });
}

let watching = false;

/** Mantém as variáveis acima em dia com o navegador. Idempotente. */
export function watchViewport(): void {
  if (typeof window === 'undefined' || watching) return;
  watching = true;

  const start = () => {
    // As sondas nascem AQUI, e não na primeira medida: `syncViewportVars` sai
    // pela porta dos fundos quando o documento está oculto (uma aba aberta em
    // segundo plano é o caso comum no celular), e sem elas os observadores
    // abaixo não teriam o que observar — a rede de segurança inteira ficaria
    // desarmada até um recarregamento.
    fixedBox();
    documentBox();
    cssViewportBox();

    observe();
    syncViewportVars();
    refreshViewport();
    if (location.hash === '#vp') {
      import('./viewportDebug').then((m) => m.initViewportDebug()).catch(() => {});
    }
  };

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });

  window.addEventListener('resize', refreshViewport);
  window.addEventListener('orientationchange', refreshViewport);
  // voltar pra aba/página pela bfcache restaura um layout medido noutro estado
  window.addEventListener('pageshow', refreshViewport);
  window.addEventListener('load', refreshViewport);
  // No iOS, reabrir o Chrome nem sempre restaura a página via pageshow; focus
  // e visibilitychange cobrem essa retomada sem depender do caminho escolhido.
  window.addEventListener('focus', refreshViewport);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshViewport();
  });

  // Sem ouvir o `scroll` do window: quem avisa que a área visível ANDOU dentro
  // da caixa do fixed — o movimento das barras — é o scroll da visualViewport,
  // e o do documento só repetiria o aviso cobrando uma leitura de layout por
  // quadro nas rotas que rolam.
  const visual = window.visualViewport;
  visual?.addEventListener('resize', refreshViewport);
  visual?.addEventListener('scroll', queueViewportSync);
  visual?.addEventListener('scrollend', refreshViewport);
}

/**
 * Os observadores. Rodam depois das sondas existirem (ver start), senão o mais
 * importante deles não teria alvo.
 *
 * O do `body` cobre abrir o About, que destrava a rolagem (body.is-about →
 * overflow-y: auto) e precisa tirar a correção de cena no mesmo instante.
 */
function observe(): void {
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(queueViewportSync);
    observer.observe(document.documentElement);
    observer.observe(document.body);
    // `dvh` pode se acomodar sem um resize nativo no Chrome iOS. Esta é a
    // testemunha direta da medida CSS, então observá-la atualiza também o
    // cache/WebGL sem depender do evento que o navegador omitiu.
    if (sizeProbe) observer.observe(sizeProbe);
  }
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(queueViewportSync).observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
  }
}
