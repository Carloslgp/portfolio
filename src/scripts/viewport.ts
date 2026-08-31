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
 * Nada aqui é adivinhado: uma sonda `position: fixed; inset: 0` devolve a caixa
 * REAL do navegador, e a visualViewport devolve o que de fato aparece. A
 * diferença entre as duas vira variável CSS, e o zoom de pinça é ignorado de
 * propósito — dar zoom não pode redimensionar a cena.
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
let probe: HTMLElement | null = null;

function fixedBox(): DOMRect | null {
  if (!document.body) return null;

  if (!probe || !probe.isConnected) {
    probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    // Nada além do necessário: `contain` ou `transform` aqui mudariam a caixa
    // que a sonda deve reportar, e ela é a única testemunha da medida.
    probe.style.cssText = 'position:fixed;inset:0;pointer-events:none;visibility:hidden';
    document.body.appendChild(probe);
  }

  return probe.getBoundingClientRect();
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

  const visual = window.visualViewport;
  const zoomed = visual ? Math.abs(visual.scale - 1) >= 0.01 : false;

  const width = Math.max(1, visual && !zoomed ? visual.width : window.innerWidth);
  const height = Math.max(1, visual && !zoomed ? visual.height : window.innerHeight);

  if (!visual || zoomed) return { width, height, top: 0, left: 0, bottom: 0, right: 0 };

  const box = fixedBox();
  if (!box) return { width, height, top: 0, left: 0, bottom: 0, right: 0 };

  // A sonda vem em coordenadas do viewport de layout; offsetTop/offsetLeft
  // levam a área visível pro MESMO sistema. Daí é subtração.
  const top = visual.offsetTop - box.top;
  const left = visual.offsetLeft - box.left;
  const bottom = box.bottom - (visual.offsetTop + height);
  const right = box.right - (visual.offsetLeft + width);

  const off = (n: number) => (n > 0.5 ? Math.round(n * 100) / 100 : 0);
  const shift = { top: off(top), left: off(left), bottom: off(bottom), right: off(right) };

  const any = shift.top || shift.left || shift.bottom || shift.right;
  if (!any || !locked()) return { width, height, top: 0, left: 0, bottom: 0, right: 0 };

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
 * Publica a medida em variáveis CSS. É daqui que sai a caixa das camadas de
 * tela cheia e a régua dos cantos da UI (ver o `inset:` das camadas e os
 * `calc()` do .intro/.hud/.theme no index.astro). O `dvh` do global.css só
 * cobre a pintura anterior a este módulo.
 */
export function syncViewportVars(): void {
  if (typeof document === 'undefined') return;

  const m = (cache = measure());
  const stamp = `${m.width}|${m.height}|${m.top}|${m.left}|${m.bottom}|${m.right}`;
  // Um ouvinte que dispara a cada quadro enquanto as barras animam não pode
  // pagar um recálculo de estilo quando nada de fato mudou.
  if (stamp === written) return;
  written = stamp;

  const root = document.documentElement;
  root.style.setProperty('--viewport-w', px(m.width));
  root.style.setProperty('--viewport-h', px(m.height));
  root.style.setProperty('--viewport-top', px(m.top));
  root.style.setProperty('--viewport-left', px(m.left));
  root.style.setProperty('--viewport-bottom', px(m.bottom));
  root.style.setProperty('--viewport-right', px(m.right));
  root.toggleAttribute('data-viewport-inset', !!(m.top || m.left || m.bottom || m.right));

  window.dispatchEvent(new CustomEvent('viewport:change'));
}

let watching = false;

/** Mantém as variáveis acima em dia com o navegador. Idempotente. */
export function watchViewport(): void {
  if (typeof window === 'undefined' || watching) return;
  watching = true;

  let frame = 0;
  const sync = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(syncViewportVars);
  };

  // O iOS reporta o tamanho ANTIGO enquanto as barras ainda animam, e de novo
  // logo depois de virar a tela. Uma leitura atrasada pega o valor assentado;
  // sem ela a página fica com a medida do estado que acabou de sair.
  let settle = 0;
  const syncAndSettle = () => {
    sync();
    clearTimeout(settle);
    settle = window.setTimeout(sync, 400);
  };

  const start = () => {
    syncViewportVars();
    syncAndSettle();
    if (location.hash === '#vp') {
      import('./viewportDebug').then((m) => m.initViewportDebug()).catch(() => {});
    }
  };

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });

  window.addEventListener('resize', syncAndSettle);
  window.addEventListener('orientationchange', syncAndSettle);
  // voltar pra aba/página pela bfcache restaura um layout medido noutro estado
  window.addEventListener('pageshow', syncAndSettle);
  window.addEventListener('load', syncAndSettle);

  // Sem ouvir o `scroll` do window: quem avisa que a área visível ANDOU dentro
  // da caixa do fixed — o movimento das barras — é o scroll da visualViewport,
  // e o do documento só repetiria o aviso cobrando uma leitura de layout por
  // quadro nas rotas que rolam.
  const visual = window.visualViewport;
  visual?.addEventListener('resize', syncAndSettle);
  visual?.addEventListener('scroll', sync);

  // abrir o About destrava a rolagem (body.is-about → overflow-y: auto), e a
  // correção precisa sair de cena no mesmo instante
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(sync);
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  }
  if (typeof MutationObserver !== 'undefined' && document.body) {
    new MutationObserver(sync).observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
  }
}
