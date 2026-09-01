/**
 * Régua de viewport — só para diagnóstico, carregada sob demanda quando a URL
 * termina em `#vp` (ver watchViewport, em viewport.ts). Nada disto entra no
 * pacote das visitas normais: é um import dinâmico.
 *
 * Ela desenha, POR CIMA da página, onde estão as três caixas que deveriam ser a
 * mesma e às vezes não são no celular — a caixa do `position: fixed`, a área
 * realmente visível, e o que `100dvh` está valendo — e imprime os números que
 * as descrevem. Um print da tela no momento do bug diz exatamente qual delas
 * saiu do lugar.
 */

const FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';

function probeHeight(value: string): number {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;top:0;left:0;width:1px;visibility:hidden;height:${value}`;
  document.body.appendChild(el);
  const h = el.getBoundingClientRect().height;
  el.remove();
  return Math.round(h * 10) / 10;
}

function safeAreas(): string {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;visibility:hidden;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right)' +
    ' env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(el);
  const s = getComputedStyle(el);
  const out = `t${parseFloat(s.paddingTop)} r${parseFloat(s.paddingRight)}`
    + ` b${parseFloat(s.paddingBottom)} l${parseFloat(s.paddingLeft)}`;
  el.remove();
  return out;
}

/**
 * Onde uma camada caiu, em coordenadas DA RÉGUA — o mesmo sistema das linhas
 * desenhadas. `topo+altura` posto ao lado do `100dvh` do painel responde de uma
 * vez a pergunta que o print precisa responder: a camada está no lugar errado,
 * do tamanho errado, ou nos dois.
 */
function where(selector: string, box: DOMRect): string {
  const el = document.querySelector(selector);
  if (!el) return '—';
  const r = el.getBoundingClientRect();
  const n = (v: number) => Math.round(v);
  return `y${n(r.top - box.top)} h${n(r.height)}  x${n(r.left - box.left)} w${n(r.width)}`;
}

function line(color: string, label: string): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText =
    `position:absolute;left:0;right:0;height:0;border-top:2px dashed ${color};`
    + `font:700 11px ${FONT};color:${color};text-shadow:0 0 3px #000,0 0 3px #000`;
  el.textContent = label;
  return el;
}

export function initViewportDebug(): void {
  if (document.querySelector('[data-vp-debug]')) return;

  // A régua vive na MESMA caixa que ela mede: `inset: 0` sem correção nenhuma,
  // pra que a linha "fixed box" seja literalmente a borda deste elemento.
  const root = document.createElement('div');
  root.setAttribute('data-vp-debug', '');
  root.setAttribute('aria-hidden', 'true');
  root.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;pointer-events:none;'
    + 'outline:2px solid #ff3b30;outline-offset:-2px';

  const boxTop = line('#ff3b30', ' fixed box top');
  const boxBottom = line('#ff3b30', ' fixed box bottom');
  const visTop = line('#34c759', ' visible top');
  const visBottom = line('#34c759', ' visible bottom');
  const dvh = line('#ffcc00', ' 100dvh');
  const docTop = line('#0a84ff', ' document top');

  const panel = document.createElement('pre');
  panel.style.cssText =
    `position:absolute;left:8px;right:8px;margin:0;padding:8px 10px;`
    + `font:600 11px/1.45 ${FONT};color:#fff;background:rgba(0,0,0,.82);`
    + `border:1px solid #34c759;border-radius:8px;white-space:pre;overflow:hidden`;

  // A MESMA sonda que o medidor usa pra achar o topo do que se vê: um absoluto
  // no canto do documento. Ela é o segundo palpite sobre o mesmo número que a
  // visualViewport dá, e o print só serve se mostrar os dois lado a lado.
  const origin = document.createElement('div');
  origin.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;visibility:hidden';

  root.append(boxTop, boxBottom, visTop, visBottom, dvh, docTop, panel);
  document.body.append(root, origin);

  const draw = () => {
    const v = window.visualViewport;
    const box = root.getBoundingClientRect();
    const doc = document.documentElement;
    const cs = getComputedStyle(document.body);

    // tudo em coordenadas DA RÉGUA (ou seja, da caixa do fixed)
    const vTop = v ? v.offsetTop - box.top : 0;
    const vHeight = v ? v.height : window.innerHeight;
    const dvhH = probeHeight('100dvh');
    const oTop = origin.getBoundingClientRect().top - box.top;

    boxTop.style.top = '0px';
    boxBottom.style.top = `${box.height - 2}px`;
    visTop.style.top = `${vTop}px`;
    visBottom.style.top = `${vTop + vHeight - 2}px`;
    dvh.style.top = `${dvhH - 2}px`;
    docTop.style.top = `${oTop}px`;

    // width/height pertencem à folha CSS; top/right/bottom/left são publicados
    // inline pelo medidor. O estilo computado mostra as duas fontes juntas.
    const s = getComputedStyle(doc);
    panel.textContent = [
      `screen      ${screen.width} x ${screen.height}`,
      `inner       ${window.innerWidth} x ${window.innerHeight}`,
      `docEl.client ${doc.clientWidth} x ${doc.clientHeight}`,
      `visualVP    ${v ? Math.round(v.width) : '-'} x ${v ? Math.round(v.height) : '-'}`
        + `  off ${v ? Math.round(v.offsetLeft) : '-'},${v ? Math.round(v.offsetTop) : '-'}`
        + `  scale ${v ? v.scale.toFixed(2) : '-'}`,
      `FIXED BOX   ${Math.round(box.width)} x ${Math.round(box.height)}`
        + `  at ${Math.round(box.left)},${Math.round(box.top)}`,
      // As duas respostas para "onde começa o que se vê". Divergiram: a de
      // baixo é a que o medidor usa, a de cima é a que ele deixou de usar.
      `TOPO  visual ${Math.round(vTop)}   documento ${Math.round(oTop)}`,
      `vh/dvh/svh/lvh  ${probeHeight('100vh')} / ${dvhH}`
        + ` / ${probeHeight('100svh')} / ${probeHeight('100lvh')}`,
      `safe-area   ${safeAreas()}`,
      `--viewport  w${s.getPropertyValue('--viewport-w') || '-'}`
        + ` h${s.getPropertyValue('--viewport-h') || '-'}`,
      `            t${s.getPropertyValue('--viewport-top') || '-'}`
        + ` b${s.getPropertyValue('--viewport-bottom') || '-'}`
        + ` l${s.getPropertyValue('--viewport-left') || '-'}`
        + ` r${s.getPropertyValue('--viewport-right') || '-'}`,
      `inset attr  ${doc.hasAttribute('data-viewport-inset')}`,
      `body ovf    ${cs.overflowY}   scrollY ${Math.round(window.scrollY)}`,
      `doc scroll  ${doc.scrollHeight} / ${doc.clientHeight}`,
      // Onde as camadas de fato CAÍRAM. Os números acima explicam a causa;
      // estes dizem se ela chegou a produzir efeito, e em qual camada.
      `.loader     ${where('.loader', box)}`,
      `.gate       ${where('.gate', box)}`,
      `.theme      ${where('.theme', box)}`,
      `#scene      ${where('#scene', box)}`,
      `ua          ${navigator.userAgent.slice(0, 46)}`,
    ].join('\n');

    // Depois do texto, porque depende da altura que ele acabou de dar ao painel.
    // E NÃO se guia pela visualViewport: se ela é quem está mentindo, o print
    // sairia sem o painel — que é a única coisa que o print precisa mostrar. A
    // faixa de `dvh` é a medida que o CSS já provou pintar.
    panel.style.top = `${Math.max(8, dvhH / 2 - panel.offsetHeight / 2)}px`;
  };

  draw();
  window.addEventListener('viewport:change', draw);
  window.addEventListener('resize', draw);
  window.addEventListener('scroll', draw, { passive: true });
  window.visualViewport?.addEventListener('resize', draw);
  window.visualViewport?.addEventListener('scroll', draw);
  setInterval(draw, 500);
}
