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

  const panel = document.createElement('pre');
  panel.style.cssText =
    `position:absolute;left:8px;right:8px;margin:0;padding:8px 10px;`
    + `font:600 11px/1.45 ${FONT};color:#fff;background:rgba(0,0,0,.82);`
    + `border:1px solid #34c759;border-radius:8px;white-space:pre;overflow:hidden`;

  root.append(boxTop, boxBottom, visTop, visBottom, dvh, panel);
  document.body.appendChild(root);

  const draw = () => {
    const v = window.visualViewport;
    const box = root.getBoundingClientRect();
    const doc = document.documentElement;
    const cs = getComputedStyle(document.body);

    // tudo em coordenadas DA RÉGUA (ou seja, da caixa do fixed)
    const vTop = v ? v.offsetTop - box.top : 0;
    const vHeight = v ? v.height : window.innerHeight;

    boxTop.style.top = '0px';
    boxBottom.style.top = `${box.height - 2}px`;
    visTop.style.top = `${vTop}px`;
    visBottom.style.top = `${vTop + vHeight - 2}px`;
    dvh.style.top = `${probeHeight('100dvh') - 2}px`;
    panel.style.top = `${vTop + 26}px`;

    const s = doc.style;
    panel.textContent = [
      `screen      ${screen.width} x ${screen.height}`,
      `inner       ${window.innerWidth} x ${window.innerHeight}`,
      `docEl.client ${doc.clientWidth} x ${doc.clientHeight}`,
      `visualVP    ${v ? Math.round(v.width) : '-'} x ${v ? Math.round(v.height) : '-'}`
        + `  off ${v ? Math.round(v.offsetLeft) : '-'},${v ? Math.round(v.offsetTop) : '-'}`
        + `  scale ${v ? v.scale.toFixed(2) : '-'}`,
      `FIXED BOX   ${Math.round(box.width)} x ${Math.round(box.height)}`
        + `  at ${Math.round(box.left)},${Math.round(box.top)}`,
      `vh/dvh/svh/lvh  ${probeHeight('100vh')} / ${probeHeight('100dvh')}`
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
      `ua          ${navigator.userAgent.slice(0, 46)}`,
    ].join('\n');
  };

  draw();
  window.addEventListener('viewport:change', draw);
  window.addEventListener('resize', draw);
  window.addEventListener('scroll', draw, { passive: true });
  window.visualViewport?.addEventListener('resize', draw);
  window.visualViewport?.addEventListener('scroll', draw);
  setInterval(draw, 500);
}
