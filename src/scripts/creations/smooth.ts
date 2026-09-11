// src/scripts/creations/smooth.ts — a rolagem suave da Coleção de Criações.
//
// O defeito que isto existe pra resolver tinha número: com a rolagem nativa e
// o `scrub: true`, 98% dos quadros durante um gesto de roda de mouse eram
// quadros PARADOS (medido: 1 dente a cada 260ms). Cada dente saltava a página
// inteira num quadro só e depois nada — e como a animação é colada no scroll,
// ela andava aos trancos junto. É o "eu rolo e para".
//
// O Lenis troca o salto por uma chegada: cada dente vira um ALVO, e a posição
// real persegue esse alvo com amortecimento exponencial (lerp). Dentes
// seguidos se somam num deslizar contínuo; parar de rolar é a página
// assentando, não freando de uma vez. (Por cima, o scrub numérico da mestra é
// um segundo amortecedor — ver SCROLL.SCRUB.)
//
// Escolhas que não são óbvias:
//
//   • o relógio é o do GSAP (gsap.ticker), e não um rAF próprio, e com
//     prioridade: o Lenis move a página ANTES de o GSAP renderizar as
//     timelines, no mesmo tique. Com dois relógios, metade dos quadros
//     mostraria a animação um quadro atrasada em relação à rolagem.
//   • o lagSmoothing do GSAP fica ligado: o Lenis lê o tempo do próprio GSAP,
//     então os relógios já concordam — e é o lagSmoothing que impede a entrada
//     (que roda no relógio) de se teletransportar depois de um engasgo.
//   • só com ponteiro fino (SMOOTH.MEDIA). No toque a inércia é a nativa.
//   • só existe no palco. Na versão simples (baixa animação, tela baixa) a
//     página é uma lista comum e rolagem suave ali seria enfeite — ou, pra
//     quem pediu menos movimento, justamente o que ela pediu pra não ter.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { viewportSize } from '../viewport';
import { SMOOTH } from './config';

export interface Smooth {
  lenis: Lenis;
  destroy(): void;
}

export function createSmooth(): Smooth | null {
  if (!window.matchMedia(SMOOTH.MEDIA).matches) return null;

  // O dente normalizado pela altura da tela (ver SMOOTH.WHEEL). Tem que ser
  // no callback virtualScroll — que o Lenis chama ANTES de desestruturar os
  // deltas — e não no wheelMultiplier, que ele copia uma vez só no construtor.
  let wheelK = 1;
  const medeRoda = () => {
    const [lo, hi] = SMOOTH.WHEEL_CLAMP;
    const r = viewportSize().height / SMOOTH.WHEEL_REF_VH;
    wheelK = SMOOTH.WHEEL * Math.min(hi, Math.max(lo, r));
  };
  medeRoda();

  const lenis = new Lenis({
    lerp: SMOOTH.LERP,
    smoothWheel: true,
    syncTouch: false,
    autoRaf: false,
    autoResize: true,
    // as âncoras #criacao-NN apontam pra criações EMPILHADAS no palco preso:
    // o alvo de todas seria o topo. Os saltos são do main.ts.
    anchors: false,
    allowNestedScroll: false,
    // saindo por um link, a inércia para: a foto do view-transition é parada
    stopInertiaOnNavigate: true,
    virtualScroll: (data) => {
      if (data.event.type === 'wheel') {
        data.deltaY *= wheelK;
        data.deltaX *= wheelK;
      }
      return true; // falso aqui descartaria o evento
    },
  });

  lenis.on('scroll', ScrollTrigger.update);

  // gsap.ticker entrega segundos; o Lenis quer milissegundos
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick, false, true);

  // O autoResize do Lenis espera 250ms; um limite velho prenderia a roda no
  // fim do pin logo depois de a tela mudar. No refresh, mede agora.
  const onRefresh = () => {
    medeRoda();
    lenis.resize();
  };
  ScrollTrigger.addEventListener('refresh', onRefresh);

  // A barra do site (LiquidScrollbar) arrasta a página com window.scrollTo, e
  // o Lenis só aceita rolagem de fora quando está parado: no meio de um
  // deslizar ele segue rumo ao alvo antigo e desfaz o arraste, quadro a
  // quadro. Pegar a barra solta o deslizar ali mesmo e o arraste manda sozinho.
  //
  // stop() + start(), e não um scrollTo imediato: o imediato manda o Lenis
  // ignorar o PRÓXIMO scroll nativo, e o do clique no trilho cai justamente
  // nessa janela — o Lenis ficaria com a posição velha e o dente de roda
  // seguinte pularia de volta pra ela. (Testado: arrastar e clicar no trilho
  // no meio de um deslizar, e rolar depois.)
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
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      gsap.ticker.remove(tick);
      lenis.destroy();
    },
  };
}
