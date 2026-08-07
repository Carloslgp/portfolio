// src/scripts/reel.ts — liga a fita 3D do About ao DOM em volta dela.
//
// A divisão é a mesma do resto do site: o Reel.ts não conhece HTML nenhum (ele
// só avisa qual foto está de frente) e este arquivo não sabe como uma fita se
// dobra. O que passa entre os dois é um índice.
//
// Duas decisões moram aqui:
//   • os DADOS saem da lista de fallback que já está na página, e não de uma
//     cópia em JSON — um conteúdo só, e o caminho sem JS é o que o navegador já
//     tinha desenhado;
//   • o 3D só nasce quando o carrossel entra na tela. Ele fica no meio de uma
//     página longa, depois de vários parágrafos: montar renderer e baixar seis
//     texturas na abertura do About seria pagar por algo que pode nunca ser
//     visto — e ainda por cima competindo com o estilhaço, que roda justamente
//     nesse instante.
import { Reel, type ReelItem } from '../components/carousel/Reel';
import { reducedMotion } from './motion';

export function initReels() {
  document.querySelectorAll<HTMLElement>('[data-reel]').forEach(mount);
}

const pad = (n: number) => String(n).padStart(2, '0');

function mount(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-reel-canvas]');
  const fallback = root.querySelector<HTMLElement>('[data-reel-fallback]');
  const titleEl = root.querySelector<HTMLElement>('[data-reel-title]');
  const countEl = root.querySelector<HTMLElement>('[data-reel-count]');
  const prev = root.querySelector<HTMLButtonElement>('[data-reel-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-reel-next]');
  if (!canvas || !fallback || !titleEl || !countEl || !prev || !next) return;

  const items: ReelItem[] = [...fallback.querySelectorAll('li')].flatMap((li) => {
    const img = li.querySelector('img');
    const title = li.querySelector('[data-reel-item-title]')?.textContent?.trim();
    return img && title ? [{ src: img.src, title, alt: img.alt }] : [];
  });
  if (!items.length) return;

  // Antes de qualquer outra coisa: a lista sai da tela agora, enquanto as <img>
  // dela ainda são lazy e não foram baixadas. Se ela só saísse depois que o
  // WebGL subisse, cada foto viria duas vezes pela rede.
  root.classList.add('is-js');

  const reel = new Reel(canvas, items, {
    reduced: reducedMotion(),
    onActive(i) {
      titleEl.textContent = items[i].title;
      countEl.textContent = `${pad(i + 1)} / ${pad(items.length)}`;
      canvas.setAttribute('aria-label', items[i].title);
      // a fita tem pontas: nos extremos o botão diz que não há para onde ir
      prev.disabled = i === 0;
      next.disabled = i === items.length - 1;
    },
  });

  prev.addEventListener('click', () => reel.step(-1));
  next.addEventListener('click', () => reel.step(1));

  let started = false;
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && !started) {
        started = true;
        reel.init()
          .then(() => root.classList.add('is-live'))
          .catch((err) => {
            // sem WebGL, ou uma foto que não veio: a lista volta a ser o
            // carrossel. Ela nunca saiu do documento, só estava escondida.
            console.warn('[reel] 3D indisponível — ficando com a lista', err);
            root.classList.remove('is-js');
          });
      }
      reel.setVisible(entry.isIntersecting);
    }
    // margem: começa a carregar um pouco antes de aparecer, pra fita não
    // acender na cara de quem está rolando
  }, { rootMargin: '250px 0px' });

  io.observe(root);
}
