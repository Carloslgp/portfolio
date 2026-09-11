// src/scripts/smoothScroll.ts — a rolagem suave das páginas de TEXTO.
//
// A home e a Coleção de Criações já tinham a delas, cada uma pelo seu motivo
// (lá a rolagem move uma cena, e a animação colada nela precisa de quadros
// contínuos). Estas páginas aqui não movem cena nenhuma — e mesmo assim
// sofrem do mesmo defeito, que é do INPUT e não da animação: um dente de roda
// de mouse chega a cada ~260ms, salta a página de uma vez e depois nada. Entre
// dois dentes a tela está parada. É o "eu rolo e para".
//
// O Lenis troca o salto por uma chegada: cada dente vira um ALVO e a posição
// real persegue esse alvo com amortecimento exponencial. Dentes seguidos se
// somam num deslizar só, e parar de rolar é a página assentando.
//
// O que este módulo NÃO é: uma cópia do creations/smooth.ts. Aquele amarra o
// Lenis ao relógio do GSAP porque lá existe uma timeline presa ao scroll que
// tem de renderizar no MESMO tique em que a página anda. Aqui não há timeline
// — só texto — então o rAF do próprio Lenis basta, e a página não paga os
// ~70KB do GSAP por um relógio que ela não usa.
import Lenis from 'lenis';

/** Só com ponteiro fino. No toque o Lenis não entra: mesmo com syncTouch
 *  desligado ele põe ouvintes de touchmove não-passivos no window, e a inércia
 *  nativa do iOS e do Android já é contínua — é a que o dedo conhece. */
const MEDIA = '(hover: hover) and (pointer: fine)';

/** O amortecimento. O lenis.mjs converte isto em λ = LERP·60 por segundo, o
 *  que dá a MESMA constante de tempo em 60, 120 ou 165Hz.
 *
 *  0.1 (~167ms) e não os 0.075 da Coleção: lá a rolagem é a linha do tempo de
 *  um filme e pode ser lenta de propósito; aqui ela é leitura, e quem rola uma
 *  lista de projetos está procurando algo. Acima disto volta o degrau entre
 *  dentes; abaixo, a página começa a parecer que escorrega depois do gesto. */
const LERP = 0.1;

export interface SmoothScroll {
  lenis: Lenis;
  destroy(): void;
}

/**
 * Liga a rolagem suave no documento inteiro.
 *
 * Devolve `null` — e não um objeto inerte — quando a página não deve tê-la:
 * quem chama não precisa guardar nada nesse caso, e um `null` explícito deixa
 * claro no ponto de chamada que existem telas sem Lenis nenhum.
 *
 * @param reduced a escolha de baixa animação já resolvida por quem chama (o
 *   portão da home tem prioridade sobre o prefers-reduced-motion do sistema —
 *   ver motion.ts), porque rolagem suave é movimento que ninguém pediu.
 */
export function initSmoothScroll(reduced = false): SmoothScroll | null {
  if (reduced || !window.matchMedia(MEDIA).matches) return null;

  const lenis = new Lenis({
    lerp: LERP,
    smoothWheel: true,
    syncTouch: false,
    autoRaf: true,
    autoResize: true,
    // um link para #project-xyz desliza até lá em vez de teletransportar
    anchors: true,
    // saindo por um link, a inércia para: a foto do view-transition é parada
    stopInertiaOnNavigate: true,
  });

  // A barra do site (LiquidScrollbar) arrasta a página com window.scrollTo, e
  // o Lenis só aceita rolagem de fora quando está parado: no meio de um
  // deslizar ele segue rumo ao alvo antigo e desfaz o arraste, quadro a
  // quadro. Pegar a barra solta o deslizar ali mesmo e o arraste manda sozinho.
  //
  // stop() + start(), e não um scrollTo imediato: o imediato manda o Lenis
  // ignorar o PRÓXIMO scroll nativo, e o do clique no trilho cai justamente
  // nessa janela. (Mesma correção do creations/smooth.ts.)
  const bar = document.querySelector<HTMLElement>('[data-liquid-scrollbar]');
  const release = () => {
    if (lenis.isScrolling !== 'smooth') return;
    lenis.stop();
    lenis.start();
  };
  bar?.addEventListener('pointerdown', release, { capture: true });

  return {
    lenis,
    destroy: () => {
      bar?.removeEventListener('pointerdown', release, { capture: true });
      lenis.destroy();
    },
  };
}
